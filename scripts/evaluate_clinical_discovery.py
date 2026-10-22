"""Evaluate a frozen finalized report without running agents or modifying inputs."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/api"))
from clinical_discovery import evaluate

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("report", "key", "spec", "case"):
        parser.add_argument(name, type=Path)
    parser.add_argument("--review", type=Path)
    parser.add_argument("--tools", type=Path)
    args = parser.parse_args()
    print(
        json.dumps(
            evaluate(
                args.report, args.key, args.spec, args.case, args.review, args.tools
            ),
            indent=2,
        )
    )
