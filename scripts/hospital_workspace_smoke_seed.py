"""Provision a two-page synthetic PDF control in an explicitly isolated test database.

Run with the existing case-data dependency group. Never targets development data.
"""

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.core.config import load_settings  # noqa: E402
from app.core.database import Database  # noqa: E402
from app.hospital.assets import LocalAssetStorage  # noqa: E402
from app.hospital.ingestion import ingest  # noqa: E402
from app.hospital.validation import validate_case  # noqa: E402


async def main() -> None:
    settings = load_settings()
    directory = Path(sys.argv[1]).resolve()
    if Path(str(settings.resolved_database_url.database)).parent != directory:
        raise ValueError("An explicitly isolated test database is required")
    if settings.resolved_asset_path != directory / "assets":
        raise ValueError("Test assets must be isolated")
    from reportlab.pdfgen.canvas import Canvas

    target = directory / "assets/cases/PDF-VIEWER-CONTROL/control.pdf"
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        pdf = Canvas(str(target), invariant=True)
        for page in [1, 2]:
            pdf.drawString(72, 760, "SYNTHETIC VIEWER CONTROL - NOT FOR CLINICAL USE")
            pdf.drawString(72, 720, f"Pagination control page {page} of 2. No clinical assertions.")
            pdf.showPage()
        pdf.save()
    instant = "2026-01-01T00:00:00Z"
    source = directory / "pdf-control.json"
    source.write_text(
        json.dumps(
            {
                "case_id": "PDF-VIEWER-CONTROL",
                "version": "1.0",
                "status": "ready",
                "created_at": instant,
                "updated_at": instant,
                "patient": {
                    "id": "SYN-PDF-CONTROL",
                    "synthetic_identifier": "SYN-PDF-CONTROL",
                    "display_name": "Synthetic PDF viewer control",
                    "date_of_birth": "1990-01-01",
                    "sex": "unknown",
                },
                "documents": [
                    {
                        "id": "DOC-PDF-CONTROL",
                        "patient_id": "SYN-PDF-CONTROL",
                        "document_type": "administrative_note",
                        "title": "Two-page viewer control",
                        "mime_type": "application/pdf",
                        "text_content": "Synthetic pagination control. No clinical assertions.",
                        "storage_path": "cases/PDF-VIEWER-CONTROL/control.pdf",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    validated = validate_case(source, LocalAssetStorage(settings.resolved_asset_path))
    database = Database(settings)
    try:
        await database.initialize()
        async with database.session() as session:
            print(json.dumps(await ingest(session, validated)))
    finally:
        await database.dispose()


if __name__ == "__main__":
    asyncio.run(main())
