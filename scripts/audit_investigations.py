"""Offline six-patient replay. Freeze inputs before execution; score only frozen reports."""

# ruff: noqa: E402

import argparse
import asyncio
import hashlib
import json
import sys
import tempfile
import time
from pathlib import Path

from sqlalchemy import func, select

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from evaluate_system import migrate

from app.composition import build_engine
from app.core.config import Settings
from app.core.database import Database
from app.evidence.verification import EvidenceVerifier
from app.hospital.adapter import SimulatedHospitalAdapter
from app.hospital.asset_service import LocalAssetReader
from app.hospital.assets import LocalAssetStorage
from app.hospital.ingestion import ingest
from app.hospital.validation import validate_case
from app.models.hospital import Patient
from app.orchestration.store import InvestigationStore
from app.schemas.investigation import Candidate, CreateInvestigation, SourceRef

CASES = [f"CASE-{n:03}" for n in range(1, 7)]


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, default=str) + "\n", encoding="utf-8")


def inventory():
    paths = {ROOT / "scripts/evaluate_investigation.py", ROOT / "evaluation/README.md"}
    for case in CASES:
        paths.update((ROOT / "data/cases" / case).rglob("*"))
        paths.update((ROOT / "data/assets/cases" / case).rglob("*"))
        paths.update((ROOT / "evaluation" / case).rglob("*"))
    return {
        str(p.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(paths)
        if p.is_file()
    }


async def replay(output, phase, settings):
    database = Database(settings)
    await database.initialize()
    store = InvestigationStore(database)
    clinical = SimulatedHospitalAdapter(database, LocalAssetReader(settings.resolved_asset_path))
    summaries, coverage = [], []
    try:
        for case in CASES:
            validated = validate_case(
                ROOT / "data/cases" / case / "case.json",
                LocalAssetStorage(settings.resolved_asset_path),
            )
            async with database.session() as session:
                await ingest(session, validated)
            write(
                output / phase / case / "validation.json",
                validated.report.as_dict()
                if hasattr(validated.report, "as_dict")
                else str(validated.report),
            )
        async with database.session() as session:
            patient_count = await session.scalar(select(func.count()).select_from(Patient))
            assert patient_count == 6, "Six distinct imported patients are required"
        write(
            output / phase / "database-checks.json",
            {
                "patient_count": patient_count,
                "migrated_fresh_database": True,
                "development_database_used": False,
            },
        )
        # All patients coexist: source ownership is checked independently below.
        for index, case in enumerate(CASES, 1):
            patient = f"SYN-{index:03}"
            identifier, _ = await store.create(CreateInvestigation(patient_id=patient), None)
            started = time.perf_counter()
            await build_engine(store, settings).execute(identifier)
            seconds = time.perf_counter() - started
            report = await store.report(identifier)
            directory = output / phase / case
            report_path = directory / "report.json"
            write(report_path, report.model_dump(mode="json"))
            events = await store.events(identifier, 0, 10000)
            tools = await store.queries.tools(identifier, 1000, 0)
            write(directory / "events.json", [e.model_dump(mode="json") for e in events])
            write(directory / "tools.json", tools.model_dump(mode="json"))
            # Evaluation files are first opened after the persisted report is frozen.
            from evaluate_investigation import evaluate

            key_path = ROOT / "evaluation" / case / "answer-key.json"
            score = evaluate(report_path, key_path)
            key = json.loads(key_path.read_text(encoding="utf-8"))
            verifier = EvidenceVerifier(clinical, patient, settings.investigation_reasoning)
            invalid = 0
            for finding in report.verified_findings:
                verdict, _ = await verifier.verify(
                    Candidate.model_validate(
                        {k: getattr(finding, k) for k in Candidate.model_fields}
                    )
                )
                invalid += verdict.status != "verified"
            summary = {
                "case_id": case,
                "investigation_id": identifier,
                "seconds": seconds,
                "status": report.status,
                "score": score,
                "tool_calls": tools.total,
                "unsupported_verified_findings": invalid,
                "failed_evidence_checks": sum(
                    c.status == "failed"
                    for f in report.verified_findings
                    + report.rejected_findings
                    + report.unresolved_findings
                    for c in f.verification.checks
                ),
                "execution_config": report.execution_config,
            }
            summaries.append(summary)
            write(directory / "score.json", summary)
            required = {s for f in key["expected_findings"] for s in f["required_source_ids"]}
            canonical = json.loads(
                (ROOT / "data/cases" / case / "case.json").read_text(encoding="utf-8")
            )
            sources = {
                r["id"]: (kind, r)
                for kind, rows in canonical.items()
                if isinstance(rows, list)
                for r in rows
                if isinstance(r, dict) and "id" in r
            }
            mapping = {
                "documents": "document",
                "observations": "observation",
                "medications": "medication",
                "diagnostic_reports": "diagnostic_report",
                "clinical_events": "clinical_event",
                "encounters": "encounter",
                "referrals": "referral",
            }
            for source_id in sorted(required):
                kind, row = sources[source_id]
                source = await clinical.resolve(
                    patient, SourceRef(type=mapping[kind], id=source_id)
                )
                assert source.data["patient_id"] == patient
                foreign_denied = False
                try:
                    await clinical.resolve(f"SYN-{index % 6 + 1:03}", source.source)
                except Exception as exc:
                    from app.hospital.errors import HospitalError

                    if not isinstance(exc, HospitalError):
                        raise
                    foreign_denied = True
                assert foreign_denied, source_id
                calls = [t for t in tools.items if any(s.id == source_id for s in t.source_refs)]
                findings = (
                    report.verified_findings + report.unresolved_findings + report.rejected_findings
                )
                cited = [f for f in findings if any(a.source.id == source_id for a in f.anchors)]
                verified = [f for f in cited if f.status == "verified"]
                coverage.append(
                    {
                        "case_id": case,
                        "source_id": source_id,
                        "source_type": mapping[kind],
                        "encounter_id": row.get("encounter_id"),
                        "exists": True,
                        "retrievable": True,
                        "cross_patient_denied": foreign_denied,
                        "required_for": [
                            f.get("id", f.get("type"))
                            for f in key["expected_findings"]
                            if source_id in f["required_source_ids"]
                        ],
                        "planned": "not_observable",
                        "requested": bool(calls),
                        "retrieved": bool(calls),
                        "considered": "not_observable",
                        "cited": bool(cited),
                        "verified": bool(verified),
                        "included_in_final_report": bool(verified),
                        "evaluator_matched": source_id in score["required_sources_cited"],
                        "failure_stage": "none"
                        if verified
                        else "consolidation_or_linking"
                        if calls
                        else "retrieval_or_planning",
                        "supporting_trace_ids": [t.id for t in calls] + [f.id for f in cited],
                    }
                )
            print(
                case,
                score["discovery_grade"],
                score["required_source_coverage"],
                flush=True,
            )
        write(output / phase / "summary.json", summaries)
        write(output / phase / "coverage.json", coverage)
    finally:
        await database.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--phase", choices=["before", "after"], required=True)
    args = parser.parse_args()
    frozen = args.output / "hashes.json"
    current = inventory()
    if frozen.exists():
        assert json.loads(frozen.read_text()) == current, "Frozen inputs changed"
    else:
        assert args.phase == "before", "Establish baseline first"
        write(frozen, current)
    assert not (args.output / args.phase).exists(), "Refuse to overwrite audit"
    with tempfile.TemporaryDirectory(prefix="casetrace-audit-") as temporary:
        settings = Settings(
            app_env="test",
            database_url=f"sqlite+aiosqlite:///{Path(temporary) / 'audit.db'}",
            investigation_strategy="baseline",
            investigation_reasoning="legacy",
        )
        migrate(settings)
        asyncio.run(replay(args.output, args.phase, settings))
    assert inventory() == current, "Inputs changed during replay"
    write(
        args.output / args.phase / "integrity.json",
        {"unchanged": True, "files": len(current)},
    )


if __name__ == "__main__":
    main()
