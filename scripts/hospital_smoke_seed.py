"""Seed the separate pipeline control into an explicitly isolated smoke database."""

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

from app.core.config import load_settings  # noqa: E402
from app.core.database import Database  # noqa: E402
from app.hospital.assets import LocalAssetStorage  # noqa: E402
from app.hospital.ingestion import ingest  # noqa: E402
from app.hospital.validation import validate_case  # noqa: E402


async def main() -> None:
    settings = load_settings()
    directory = Path(sys.argv[1]).resolve()
    if Path(str(settings.resolved_database_url.database)).parent != directory:
        raise ValueError(
            "Smoke database must be inside the explicitly selected temporary directory"
        )
    if settings.resolved_asset_path != directory / "assets":
        raise ValueError("Smoke assets must be isolated")
    asset = settings.resolved_asset_path / "cases" / "CONTROL-001" / "control.txt"
    asset.parent.mkdir(parents=True, exist_ok=True)
    asset.write_text("SYNTHETIC — NOT FOR CLINICAL USE. Pipeline control.\n")
    source = ROOT / "apps" / "api" / "tests" / "fixtures" / "control-case.json"
    validated = validate_case(source, LocalAssetStorage(settings.resolved_asset_path))
    database = Database(settings)
    try:
        await database.initialize()
        async with database.session() as session:
            print(json.dumps(await ingest(session, validated)))
        async with database.session() as session:
            print(json.dumps(await ingest(session, validated)))
    finally:
        await database.dispose()


if __name__ == "__main__":
    asyncio.run(main())
