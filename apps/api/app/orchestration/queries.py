"""Read-only frontend projections over committed state."""

from typing import Any

from sqlalchemy import select

from app.hospital.errors import HospitalError
from app.models import investigation as db
from app.orchestration.persistence import InvestigationPersistence
from app.schemas.investigation import ActivityEvent, Finding, Report


class InvestigationQueries:
    def __init__(self, persistence: InvestigationPersistence):
        self.persistence = persistence

    async def snapshot(self, public_id: str) -> dict[str, Any]:
        async with self.persistence.database.session() as session:
            run = await self.persistence.find(session, public_id)
            agents = list(
                await session.scalars(
                    select(db.AgentExecution)
                    .where(
                        db.AgentExecution.investigation_id == run.id,
                    )
                    .order_by(db.AgentExecution.started_at)
                )
            )
            findings = list(
                await session.scalars(
                    select(db.Finding).where(
                        db.Finding.investigation_id == run.id,
                    )
                )
            )
            # Repeated specialist tasks retain all audit rows, with one public role summary.
            summaries: dict[str, dict[str, Any]] = {}
            for agent in agents:
                previous = summaries.get(agent.agent_key)
                summaries[agent.agent_key] = {
                    "name": agent.agent_key,
                    "status": agent.status,
                    "started_at": previous["started_at"] if previous else agent.started_at,
                    "completed_at": agent.ended_at,
                }
            for agent in agents:
                if agent.status == "running":
                    summaries[agent.agent_key]["status"] = "running"
                    summaries[agent.agent_key]["completed_at"] = None
            return {
                "id": public_id,
                "patient_id": run.context["patient_id"],
                "case_id": run.context["case_id"],
                "objective": run.question,
                "status": run.status,
                "created_at": run.created_at,
                "started_at": run.started_at,
                "completed_at": run.ended_at,
                "version": run.version,
                "progress": {
                    "current_stage": run.context["current_stage"],
                    "completed_stages": run.context["completed_stages"],
                    "total_stages": 5,
                    "percent": 20 * run.context["completed_stages"],
                },
                "agents": list(summaries.values()),
                "finding_summary": {
                    s: sum(f.status == s for f in findings)
                    for s in ["proposed", "verified", "rejected", "unresolved"]
                },
                **{k: run.context.get(k, []) for k in ["timeline", "hypotheses", "limitations"]},
            }

    async def events(self, public_id: str, after: int, limit: int = 100) -> list[ActivityEvent]:
        async with self.persistence.database.session() as session:
            run = await self.persistence.find(session, public_id)
            rows = await session.scalars(
                select(db.InvestigationEvent)
                .where(
                    db.InvestigationEvent.investigation_id == run.id,
                    db.InvestigationEvent.sequence > after,
                )
                .order_by(db.InvestigationEvent.sequence)
                .limit(limit)
            )
            return [
                ActivityEvent(
                    id=f"EVT-{row.id.hex}",
                    investigation_id=public_id,
                    sequence=row.sequence,
                    type=row.event_type,
                    timestamp=row.occurred_at,
                    payload=row.payload,
                )
                for row in rows
            ]

    async def findings(self, public_id: str) -> list[Finding]:
        async with self.persistence.database.session() as session:
            run = await self.persistence.find(session, public_id)
            rows = await session.scalars(
                select(db.Finding)
                .where(
                    db.Finding.investigation_id == run.id,
                )
                .order_by(db.Finding.id)
            )
            return [Finding.model_validate(row.body) for row in rows]

    async def report(self, public_id: str) -> Report:
        async with self.persistence.database.session() as session:
            run = await self.persistence.find(session, public_id)
            row = await session.scalar(
                select(db.Report).where(db.Report.investigation_id == run.id)
            )
            if row is None:
                raise HospitalError("REPORT_NOT_READY", 409)
            return Report.model_validate(row.body_json)
