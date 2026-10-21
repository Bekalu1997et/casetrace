"""Offline Phase 5 API runner. Freeze outputs before importing the answer-key scorer."""

# ruff: noqa: E402
import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
from fastapi.testclient import TestClient

from app.core.config import Settings, load_settings
from app.core.database import Database
from app.evidence.verification import EvidenceVerifier
from app.hospital.assets import LocalAssetStorage
from app.hospital.ingestion import ingest
from app.hospital.validation import validate_case
from app.main import create_app
from app.schemas.investigation import Candidate, SourceRef
from app.tools.clinical import ClinicalTools


def migrate(settings):
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT / "apps/api",
        env={**os.environ, "DATABASE_URL": str(settings.resolved_database_url)},
        check=True,
        capture_output=True,
    )


async def seed(settings):
    started = time.perf_counter()
    validated = validate_case(
        ROOT / "data/cases/CASE-001/case.json", LocalAssetStorage(settings.resolved_asset_path)
    )
    database = Database(settings)
    try:
        await database.initialize()
        async with database.session() as session:
            result = await ingest(session, validated)
        return {
            "seconds": time.perf_counter() - started,
            "result": result,
            "assets": len(validated.assets),
        }
    finally:
        await database.dispose()


async def independently_check(settings, report):
    database = Database(settings)
    try:
        tools = ClinicalTools(database, settings.resolved_asset_path)
        verifier = EvidenceVerifier(tools, "SYN-001")
        findings, anchors, temporal = [], [], []
        for finding in report["verified_findings"]:
            candidate = Candidate.model_validate({k: finding[k] for k in Candidate.model_fields})
            result, claim = await verifier.verify(candidate)
            findings.append(result.status == "verified" and claim == finding["claim"])
            for a in candidate.anchors:
                source = await tools.resolve("SYN-001", a.source)
                anchors.append(
                    source.source_hash == a.source_hash
                    and source.source_version == a.source_version
                    and source.data.get(a.field) == a.expected
                    and source.data.get("encounter_id") == a.encounter_id
                    and (a.quote is None or a.quote in source.data[a.field])
                )
        for event in report["timeline"]:
            source = await tools.resolve("SYN-001", SourceRef.model_validate(event["source"]))
            temporal.append(
                source.data.get(event["timestamp_type"]) == event["timestamp"]
                and all(source.data.get(k) == v for k, v in event["timestamps"].items())
            )
        return {
            "citation_validity": {"passed": sum(anchors), "total": len(anchors)},
            "deterministic_support": {"passed": sum(findings), "total": len(findings)},
            "unsupported_verified_findings": {
                "count": len(findings) - sum(findings),
                "total": len(findings),
            },
            "timeline_source_accuracy": {"passed": sum(temporal), "total": len(temporal)},
            "clinical_support_and_hypothesis_quality": "pending expert review",
        }
    finally:
        await database.dispose()


def run(output, repeats, live=False):
    output.mkdir(parents=True, exist_ok=False)
    results = []
    with tempfile.TemporaryDirectory(prefix="casetrace-phase5-") as directory:
        overrides = dict(
            app_env="test", database_url=f"sqlite+aiosqlite:///{Path(directory) / 'test.db'}"
        )
        settings = load_settings(**overrides) if live else Settings(**overrides)
        if live and (
            settings.llm_provider != "gemini" or not settings.llm_api_key or not settings.llm_model
        ):
            raise ValueError("Live evaluation requires configured Gemini provider, model and key")
        migrate(settings)
        imported = asyncio.run(seed(settings))
        startup = time.perf_counter()
        with TestClient(create_app(settings)) as client:
            startup = time.perf_counter() - startup
            for index in range(repeats):
                started = time.perf_counter()
                response = client.get("/api/health")
                response.raise_for_status()
                health_ms = (time.perf_counter() - started) * 1000
                client.get("/api/hospital/v1/patients/SYN-001").raise_for_status()
                created = client.post("/api/investigations", json={"patient_id": "SYN-001"})
                created.raise_for_status()
                identifier = created.json()["investigation_id"]
                deadline = time.monotonic() + settings.investigation_timeout_seconds + 15
                while time.monotonic() < deadline:
                    state = client.get(f"/api/investigations/{identifier}").json()
                    if state["status"] not in {"queued", "running"}:
                        break
                    time.sleep(0.1)
                elapsed = time.perf_counter() - started
                response = client.get(f"/api/investigations/{identifier}/report")
                response.raise_for_status()
                report = response.json()
                path = output / f"run-{index + 1}.json"
                path.write_text(json.dumps(report, indent=2), encoding="utf-8")
                events = client.get(f"/api/investigations/{identifier}/events?limit=1000").json()
                (output / f"events-{index + 1}.json").write_text(
                    json.dumps(events, indent=2), encoding="utf-8"
                )
                checks = asyncio.run(independently_check(settings, report))
                # Import/load answer key only after the persisted report has been frozen.
                from evaluate_investigation import evaluate

                results.append(
                    {
                        "id": identifier,
                        "seconds": elapsed,
                        "health_ms": health_ms,
                        "report_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                        "score": evaluate(path, ROOT / "evaluation/CASE-001/answer-key.json"),
                        "independent_checks": checks,
                        "tool_calls": sum(e["type"] == "tool.started" for e in events["items"]),
                        "error_events": sum(e["type"].endswith(".failed") for e in events["items"]),
                    }
                )
        summary = {
            "mode": "live" if live else "deterministic_rules",
            "model": settings.llm_model if live else None,
            "startup_seconds": startup,
            "import": imported,
            "runs": results,
            "limitations": [
                "Development evaluation; not held-out clinical validation.",
                "Local process filesystem permissions are not a sandbox.",
                "Token usage and browser responsiveness are not measured here.",
            ],
        }
        (output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--repeats", default=3, type=int, choices=range(1, 11))
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    run(args.output, args.repeats, args.live)
