"""Compatibility maintenance entrypoint: uv run python ../../scripts/seed_case.py CASE-001."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))
from app.hospital.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.argv.insert(1, "import")
    main()
