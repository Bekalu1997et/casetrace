"""uv run python -m app.hospital.cli {validate,import} CASE-001."""

import argparse
import asyncio
import json
import sys

from pydantic import TypeAdapter

from app.core.config import load_settings
from app.core.database import Database
from app.hospital.assets import LocalAssetStorage
from app.hospital.ingestion import ImportConflict, ingest
from app.hospital.schemas import Identifier
from app.hospital.validation import CaseValidationError, validate_case


async def run(action: str, case_id: str) -> dict[str, object]:
    TypeAdapter(Identifier).validate_python(case_id)
    settings = load_settings()
    path = settings.casetrace_root / "data" / "cases" / case_id / "case.json"
    validated = validate_case(path, LocalAssetStorage(settings.resolved_asset_path))
    if validated.clinical.case_id != case_id:
        raise CaseValidationError(f"{path}: case_id does not match directory")
    if action == "validate":
        return {"case_id": case_id, "status": "valid", "assets": len(validated.assets)}
    database = Database(settings)
    try:
        await database.initialize()
        async with database.session() as session:
            return await ingest(session, validated)
    finally:
        await database.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate/import canonical synthetic clinical records"
    )
    parser.add_argument("action", choices=["validate", "import"])
    parser.add_argument("case_id")
    args = parser.parse_args()
    try:
        print(json.dumps(asyncio.run(run(args.action, args.case_id))))
    except (CaseValidationError, ImportConflict, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2) from exc


if __name__ == "__main__":
    main()
