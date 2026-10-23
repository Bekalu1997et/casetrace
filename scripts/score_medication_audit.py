"""Offline comparison of frozen medication audit reports with both unchanged scorers."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
from clinical_discovery import evaluate as clinical
from evaluate_investigation import evaluate as legacy


def score():
    output = ROOT / "docs/evaluation/artifacts/phase2-03"
    results = []
    for phase in ["before", "after"]:
        for case in ["CASE-001", "CASE-002", "CASE-005"]:
            directory = output / phase / case
            report = json.loads((directory / "report.json").read_text(encoding="utf-8"))
            original_key = ROOT / "evaluation" / case / "answer-key.json"
            new = clinical(
                directory / "report.json",
                original_key,
                ROOT / "evaluation/clinical-discovery/v1" / f"{case}.json",
                ROOT / "data/cases" / case / "case.json",
                tools_path=directory / "tools.json",
            )
            old = legacy(directory / "report.json", original_key)
            stored = json.loads((directory / "score.json").read_text())
            assert old == stored["score"]
            relationships = [
                f
                for f in report["verified_findings"]
                if f.get("relationship")
                and f["relationship"]["relationship_type"]
                == "medication_reconciliation"
            ]
            results.append(
                {
                    "phase": phase,
                    "case_id": case,
                    "legacy": old,
                    "multi_domain": new,
                    "status": report["status"],
                    "tool_calls": stored["tool_calls"],
                    "unsupported_verified_findings_on_independent_recheck": stored[
                        "unsupported_verified_findings"
                    ],
                    "failed_evidence_checks": stored["failed_evidence_checks"],
                    "verified_medication_relationships": [
                        {
                            "finding_id": f["id"],
                            "claim": f["claim"],
                            "source_ids": sorted(
                                {a["source"]["id"] for a in f["anchors"]}
                            ),
                            "assertions": [
                                {
                                    "source_id": a["anchor"]["source"]["id"],
                                    "origin": a["origin"],
                                    "value": a["value"],
                                    "event_time_field": a["event_time_field"],
                                    "documentation_time_field": a[
                                        "documentation_time_field"
                                    ],
                                    "timestamps": a["timestamps"],
                                }
                                for a in f["relationship"]["assertions"]
                            ],
                        }
                        for f in relationships
                    ],
                    "medication_relationships_rejected": sum(
                        bool(f.get("relationship"))
                        and f["relationship"]["relationship_type"]
                        == "medication_reconciliation"
                        for f in report["rejected_findings"]
                    ),
                    "unresolved_cross_specialist_questions": sum(
                        f["title"] == "Medication and laboratory documentation overlap"
                        for f in report["unresolved_findings"]
                    ),
                }
            )
    (output / "comparison.json").write_text(
        json.dumps(results, indent=2) + "\n", encoding="utf-8"
    )
    for result in results:
        print(
            result["phase"],
            result["case_id"],
            result["status"],
            result["legacy"]["discovery_grade"],
            [d["outcome"] for d in result["multi_domain"]["discoveries"]],
            "medication relationships",
            len(result["verified_medication_relationships"]),
        )


if __name__ == "__main__":
    score()
