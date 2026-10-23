"""Compare frozen result-follow-up replays with both unchanged offline evaluators."""

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
from clinical_discovery import evaluate as clinical
from evaluate_investigation import evaluate as legacy


def score(output):
    frozen = json.loads((output / "evaluation-hashes.json").read_text())
    assert all(
        hashlib.sha256((ROOT / p).read_bytes()).hexdigest() == h
        for p, h in frozen.items()
    ), "Frozen evaluation inputs changed"
    results = []
    for phase in ["before", "after"]:
        for case in ["CASE-001", "CASE-002", "CASE-003", "CASE-005"]:
            directory = output / phase / case
            path = directory / "report.json"
            report = json.loads(path.read_text())
            key = ROOT / "evaluation" / case / "answer-key.json"
            stored = json.loads((directory / "score.json").read_text())
            old = legacy(path, key)
            assert old == stored["score"]
            new = clinical(
                path,
                key,
                ROOT / "evaluation/clinical-discovery/v1" / f"{case}.json",
                ROOT / "data/cases" / case / "case.json",
                tools_path=directory / "tools.json",
            )
            workflows = [
                f
                for f in report["verified_findings"]
                if f.get("relationship")
                and f["relationship"]["relationship_type"] == "result_followup"
            ]
            tools = json.loads((directory / "tools.json").read_text())["items"]
            required = {
                s
                for f in json.loads(key.read_text())["expected_findings"]
                for s in f["required_source_ids"]
            }
            results.append(
                {
                    "phase": phase,
                    "case_id": case,
                    "legacy": old,
                    "multi_domain": new,
                    "status": report["status"],
                    "tool_calls": stored["tool_calls"],
                    "unsupported_verified_findings": stored[
                        "unsupported_verified_findings"
                    ],
                    "failed_evidence_checks": stored["failed_evidence_checks"],
                    "relationships": [
                        {
                            "finding_id": f["id"],
                            "claim": f["claim"],
                            "source_ids": sorted(
                                {a["source"]["id"] for a in f["anchors"]}
                            ),
                            "required_sources_missing_in_this_relationship": sorted(
                                required - {a["source"]["id"] for a in f["anchors"]}
                            ),
                            "workflow": f["relationship"]["result_workflow"],
                            "tool_trace_ids": [
                                t["id"] for t in tools if t["agent"] == "contradiction"
                            ],
                        }
                        for f in workflows
                    ],
                }
            )
    (output / "comparison.json").write_text(json.dumps(results, indent=2) + "\n")
    for r in results:
        print(
            r["phase"],
            r["case_id"],
            r["status"],
            r["legacy"]["discovery_grade"],
            [d["outcome"] for d in r["multi_domain"]["discoveries"]],
            "result relationships",
            len(r["relationships"]),
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", type=Path, default=ROOT / "docs/evaluation/artifacts/phase2-04"
    )
    score(parser.parse_args().output)
