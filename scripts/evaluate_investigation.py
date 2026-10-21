"""Offline post-run evaluation only. Never import this module into app runtime."""

import argparse
import json
from pathlib import Path


def evaluate(report_path: Path, key_path: Path) -> dict:
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report["status"] not in {"completed", "completed_with_limitations"}:
        raise ValueError("Only finalized reports may be evaluated")
    key = json.loads(key_path.read_text(encoding="utf-8"))
    verified = report["verified_findings"]
    conflicts = [f for f in verified if f["type"] == "timeline_contradiction"]
    cited = {a["source"]["id"] for f in verified for a in f["anchors"]}
    required = {id_ for f in key["expected_findings"] for id_ in f["required_source_ids"]}
    detected = sum(
        any(
            len(
                {a["source"]["id"] for a in conflict["anchors"]}
                & {a["source_id"] for a in expected["anchors"]}
            )
            >= 2
            for conflict in conflicts
        )
        for expected in key["expected_findings"]
    )
    anchors = [a for f in verified for a in f["anchors"]]
    passed = sum(
        all(c["status"] == "passed" for c in f["verification"]["checks"]) for f in verified
    )
    return {
        "case_id": key["case_id"],
        "dataset_version": key["dataset_version"],
        "execution_mode": report["execution_mode"],
        "completed": True,
        "record_contradictions_detected": len(conflicts),
        "expected_discovery_detected": detected == len(key["expected_findings"]),
        "expected_discoveries_detected": detected,
        "verified_findings": len(verified),
        "verified_anchors": len(anchors),
        "failed_verification_checks_in_verified_findings": len(verified) - passed,
        "required_sources_cited": sorted(required & cited),
        "required_sources_missing": sorted(required - cited),
        "required_source_coverage": f"{len(required & cited)}/{len(required)}",
        "unresolved_findings": len(report["unresolved_findings"]),
        "limitations": [
            "Detection is record-level, not a clinical diagnosis.",
            "Coverage is across all verified findings, not necessarily one consolidated finding.",
            "No semantic clinical quality or diagnostic probability metric is claimed.",
            "Anchor validity is established by independent runtime verifier and integration tests; "
            "this evaluator summarizes their recorded results.",
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    parser.add_argument("key", type=Path)
    args = parser.parse_args()
    print(json.dumps(evaluate(args.report, args.key), indent=2))
