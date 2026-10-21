"""Offline reset of the dedicated demo database only; preserve sources and backup audits."""

# ruff: noqa: E402
import argparse
import asyncio
import json
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
from evaluate_system import migrate, seed
from sqlalchemy import delete, select, text

from app.core.config import Settings
from app.core.database import Database
from app.hospital.assets import LocalAssetStorage
from app.hospital.validation import validate_case
from app.models import investigation as investigation_models
from app.models.base import Base
from app.models.investigation import Investigation


def approved_target(path):
    target = path.resolve()
    approved = ROOT / "data/runtime/demo/casetrace-demo.db"
    linked = any(p.is_symlink() or p.is_junction() for p in [path, *path.parents])
    if not path.is_absolute() or target != approved.resolve() or linked:
        raise ValueError(f"Only explicit absolute demo target accepted: {approved}")
    return target


async def clear(settings):
    database = Database(settings)
    try:
        await database.initialize()
        async with database.session() as session:
            active = await session.scalar(
                select(Investigation.id)
                .where(Investigation.status.in_(["queued", "running"]))
                .limit(1)
            )
            if active:
                raise ValueError("Active investigations exist; reset refused")
            counts = {}
            domain_tables = {
                value.__table__.name
                for value in vars(investigation_models).values()
                if isinstance(value, type)
                and value.__module__ == investigation_models.__name__
                and hasattr(value, "__table__")
            }
            for table in reversed(Base.metadata.sorted_tables):
                if table.name in domain_tables:
                    result = await session.execute(delete(table))
                    counts[table.name] = result.rowcount
            await session.commit()
        async with database.session() as session:
            if (await session.execute(text("PRAGMA integrity_check"))).scalar() != "ok":
                raise ValueError("SQLite integrity check failed")
            if (await session.execute(text("PRAGMA foreign_key_check"))).all():
                raise ValueError("SQLite foreign key check failed")
        return counts
    finally:
        await database.dispose()


def reset(path, confirm=False, offline=False):
    target = approved_target(path)
    if not confirm:
        return {
            "target": str(target),
            "dry_run": True,
            "action": "Backup database; migrate; clear derived runs; validate/import CASE-001",
        }
    if not offline:
        raise ValueError("Stop the API/workers, then acknowledge with --offline")
    # Validate immutable inputs before touching derived state.
    validate_case(ROOT / "data/cases/CASE-001/case.json", LocalAssetStorage(ROOT / "data/assets"))
    target.parent.mkdir(parents=True, exist_ok=True)
    backup = None
    if target.exists():
        backup = target.with_name(f"backup-{datetime.now(UTC).strftime('%Y%m%dT%H%M%S%f')}.db")
        with sqlite3.connect(target) as source, sqlite3.connect(backup) as destination:
            source.backup(destination)
    settings = Settings(app_env="development", database_url=f"sqlite+aiosqlite:///{target}")
    migrate(settings)
    counts = asyncio.run(clear(settings))
    imported = asyncio.run(seed(settings))
    return {
        "target": str(target),
        "backup": str(backup) if backup else None,
        "deleted_derived_rows": counts,
        "import": imported,
        "mode": "deterministic_rules",
        "api_readiness": "Start API on this target and check /api/health; not tested by reset",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True, type=Path)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run", action="store_true")
    group.add_argument("--confirm", action="store_true")
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    print(json.dumps(reset(args.database, args.confirm, args.offline), indent=2))
