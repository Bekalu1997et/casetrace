"""Run the real worker on an already imported patient; no evaluator imports."""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/api"))

from app.composition import build_engine  # noqa: E402
from app.core.config import load_settings  # noqa: E402
from app.core.database import Database  # noqa: E402
from app.orchestration.store import InvestigationStore  # noqa: E402
from app.schemas.investigation import CreateInvestigation  # noqa: E402


async def run(patient_id: str, output: Path) -> None:
    settings = load_settings()
    database = Database(settings)
    try:
        await database.initialize()
        store = InvestigationStore(database)
        identifier, _ = await store.create(CreateInvestigation(patient_id=patient_id), None)
        await build_engine(store, settings).execute(identifier)
        report = await store.report(identifier)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(report.model_dump_json(indent=2), encoding="utf-8")
        print(
            f"{identifier}: {report.status}; {report.execution_mode}; "
            f"verified={len(report.verified_findings)}; report={output}"
        )
    finally:
        await database.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("patient_id")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    asyncio.run(run(args.patient_id, args.output))
