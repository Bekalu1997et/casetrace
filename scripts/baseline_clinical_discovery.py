"""Score existing frozen six-case reports; never execute investigations."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
from clinical_discovery import evaluate, sha
from evaluate_investigation import evaluate as legacy


def inventory_check(path):
    expected = json.loads(path.read_text())
    changed = [name for name, value in expected.items() if sha(ROOT / name) != value]
    if changed:
        raise ValueError(f"Frozen inputs changed: {changed}")
    return len(expected)


def run(output: Path, phase: str):
    frozen = ROOT / "docs/evaluation/artifacts/phase2-01/frozen-hashes.json"
    count = inventory_check(frozen)
    output.mkdir(parents=True, exist_ok=False)
    results = []
    for n in range(1, 7):
        case = f"CASE-{n:03}"
        source = ROOT / "docs/evaluation/artifacts/generalization" / phase / case
        key = ROOT / "evaluation" / case / "answer-key.json"
        result = {
            "case_id": case,
            "frozen_phase": phase,
            "legacy": legacy(source / "report.json", key),
            "multi_domain": evaluate(
                source / "report.json",
                key,
                ROOT / "evaluation/clinical-discovery/v1" / f"{case}.json",
                ROOT / "data/cases" / case / "case.json",
                tools_path=source / "tools.json",
            ),
        }
        (output / f"{case}.json").write_text(
            json.dumps(result, indent=2) + "\n", encoding="utf-8"
        )
        results.append(result)
    assert results[0]["legacy"]["discovery_grade"] == "exact"
    summary = {
        "frozen_inputs_verified": inventory_check(frozen),
        "frozen_inputs_before": count,
        "results": [
            {
                "case_id": r["case_id"],
                "legacy_grade": r["legacy"]["discovery_grade"],
                "discoveries": [
                    {k: d[k] for k in ("finding_key", "outcome", "reason")}
                    for d in r["multi_domain"]["discoveries"]
                ],
            }
            for r in results
        ],
    }
    (output / "summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--phase", choices=["before", "after"], default="after")
    args = parser.parse_args()
    print(json.dumps(run(args.output, args.phase), indent=2))
