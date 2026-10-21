"""One serialized, version-guarded persistence boundary; no external waits in transactions."""

import asyncio
import hashlib
import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID, uuid4

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Database
from app.hospital.repository import HospitalRepository
from app.hospital.service import ClinicalRecordService, HospitalError
from app.models import investigation as db
from app.schemas.investigation import ActivityEvent, CreateInvestigation, Finding, Report

TERMINAL = {"completed", "completed_with_limitations", "failed", "cancelled"}
TRANSITIONS = {
    "queued": {"running", "failed", "cancelled"},
    "running": TERMINAL,
}


def now() -> datetime:
    return datetime.now(UTC)


def digest(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode()
    ).hexdigest()


class RunConflict(HospitalError):
    def __init__(self) -> None:
        super().__init__("INVESTIGATION_CONFLICT", 409)


class InvestigationStore:
    def __init__(self, database: Database):
        self.database = database
        self.lock = asyncio.Lock()

    async def find(self, session: AsyncSession, public_id: str) -> db.Investigation:
        run = await session.scalar(
            select(db.Investigation).where(
                db.Investigation.external_id == public_id,
            )
        )
        if run is None:
            raise HospitalError("INVESTIGATION_NOT_FOUND")
        return run

    @asynccontextmanager
    async def mutation(
        self,
        public_id: str,
        event: str,
        payload: dict[str, Any],
        *,
        terminal: bool = False,
    ) -> AsyncIterator[tuple[AsyncSession, db.Investigation]]:
        async with self.lock, self.database.session() as session, session.begin():
            run = await self.find(session, public_id)
            if not terminal and run.status in TERMINAL:
                raise RunConflict()
            old_version, old_status = run.version, run.status
            yield session, run
            # The explicit CAS remains authoritative even with the process-local lock.
            with session.no_autoflush:
                result = await session.execute(
                    update(db.Investigation)
                    .where(
                        db.Investigation.id == run.id,
                        db.Investigation.version == old_version,
                        db.Investigation.status == old_status,
                    )
                    .values(version=old_version + 1)
                    .execution_options(synchronize_session=False)
                )
            if result.rowcount != 1:  # type: ignore[attr-defined]
                raise RunConflict()
            session.add(
                db.InvestigationEvent(
                    investigation_id=run.id,
                    sequence=old_version + 1,
                    event_type=event,
                    payload=payload,
                    occurred_at=now(),
                )
            )

    async def create(
        self,
        request: CreateInvestigation,
        key: str | None,
    ) -> tuple[str, bool]:
        async with self.lock, self.database.session() as session, session.begin():
            if key:
                existing = await session.scalar(
                    select(db.Investigation).where(
                        db.Investigation.idempotency_key == key,
                    )
                )
                if existing:
                    patient = await ClinicalRecordService(HospitalRepository(session)).patient(
                        request.patient_id,
                    )
                    if existing.patient_id != patient.id or existing.question != request.objective:
                        raise RunConflict()
                    return existing.external_id, False
            service = ClinicalRecordService(HospitalRepository(session))
            patient = await service.patient(request.patient_id)
            dataset = await service.repository.dataset(patient)
            public_id = f"INV-{uuid4().hex}"
            run = db.Investigation(
                external_id=public_id,
                patient_id=patient.id,
                dataset_id=patient.dataset_id,
                question=request.objective,
                idempotency_key=key,
                status="queued",
                created_at=now(),
                context={
                    "patient_id": request.patient_id,
                    "case_id": dataset.case_id,
                    "dataset_version": dataset.dataset_version,
                    "dataset_hash": dataset.seed_hash,
                    "limitations": [],
                    "timeline": [],
                    "hypotheses": [],
                    "current_stage": "queued",
                    "completed_stages": 0,
                },
            )
            session.add(run)
            await session.flush()
            return public_id, True

    async def transition(self, public_id: str, target: str, reason: str) -> None:
        payload: dict[str, Any] = {"to_state": target, "reason": reason}
        event = "investigation.started" if target == "running" else f"investigation.{target}"
        async with self.mutation(public_id, event, payload) as (session, run):
            if target not in TRANSITIONS.get(run.status, set()):
                raise RunConflict()
            payload["from_state"] = run.status
            if target in {"failed", "cancelled"}:
                for model in [db.AgentExecution, db.ToolCall, db.InvestigationStage]:
                    await session.execute(
                        update(model)
                        .where(
                            cast(Any, model).investigation_id == run.id,
                            cast(Any, model).status == "running",
                        )
                        .values(
                            status="failed",
                            **(
                                {"completed_at": now(), "error_code": reason}
                                if model is db.ToolCall
                                else {"ended_at": now()}
                            ),
                        )
                    )
            run.status = target
            if target == "running":
                run.started_at = now()
            else:
                run.ended_at = now()

    async def record(self, public_id: str, event: str, payload: dict[str, Any]) -> None:
        async with self.mutation(public_id, event, payload):
            pass

    async def stage(self, public_id: str, key: str, done: bool = False) -> None:
        async with self.mutation(
            public_id,
            "stage.completed" if done else "stage.started",
            {
                "stage": key,
            },
        ) as (session, run):
            if done:
                row = await session.scalar(
                    select(db.InvestigationStage).where(
                        db.InvestigationStage.investigation_id == run.id,
                        db.InvestigationStage.stage_key == key,
                    )
                )
                if row is None or row.status != "running":
                    raise RunConflict()
                row.status, row.ended_at = "completed", now()
            else:
                session.add(
                    db.InvestigationStage(
                        investigation_id=run.id,
                        stage_key=key,
                        status="running",
                        started_at=now(),
                    )
                )
            run.context = {
                **run.context,
                "current_stage": key,
                "completed_stages": run.context["completed_stages"] + int(done),
            }

    async def context(self, public_id: str, **values: Any) -> None:
        async with self.mutation(public_id, "investigation.updated", {}) as (_, run):
            run.context = {**run.context, **values}

    async def agent_start(self, public_id: str, name: str) -> UUID:
        execution_id = uuid4()
        async with self.mutation(
            public_id,
            "agent.started",
            {
                "agent": name,
                "agent_run_id": str(execution_id),
            },
        ) as (session, run):
            row = db.AgentExecution(
                id=execution_id,
                investigation_id=run.id,
                agent_key=name,
                status="running",
                started_at=now(),
            )
            session.add(row)
            await session.flush()
            return row.id

    async def agent_end(
        self,
        public_id: str,
        agent_id: UUID,
        error: str | None = None,
    ) -> None:
        async with self.mutation(
            public_id,
            "agent.failed" if error else "agent.completed",
            {
                "agent_run_id": str(agent_id),
                "error_code": error,
            },
        ) as (session, run):
            row = await session.get(db.AgentExecution, agent_id)
            if row is None or row.investigation_id != run.id or row.status != "running":
                raise RunConflict()
            row.status, row.ended_at = "failed" if error else "completed", now()
            row.task_summary = {"error_code": error} if error else {}

    async def tool_start(
        self,
        public_id: str,
        agent_id: UUID,
        name: str,
        args: dict[str, Any],
        agent_name: str,
    ) -> UUID:
        call_id = uuid4()
        async with self.mutation(
            public_id,
            "tool.started",
            {
                "agent_run_id": str(agent_id),
                "tool": name,
                "tool_execution_id": str(call_id),
            },
        ) as (session, run):
            actor = await session.get(db.AgentExecution, agent_id)
            if (
                run.status != "running"
                or actor is None
                or actor.investigation_id != run.id
                or actor.status != "running"
                or actor.agent_key != agent_name
            ):
                raise RunConflict()
            row = db.ToolCall(
                id=call_id,
                investigation_id=run.id,
                agent_execution_id=agent_id,
                tool_name=name,
                sanitized_args=args,
                status="running",
                started_at=now(),
            )
            session.add(row)
            await session.flush()
            return row.id

    async def tool_end(
        self,
        public_id: str,
        call_id: UUID,
        refs: list[dict[str, Any]],
        error: str | None = None,
    ) -> None:
        async with self.mutation(
            public_id,
            "tool.failed" if error else "tool.completed",
            {
                "tool_execution_id": str(call_id),
                "source_refs": refs,
                "record_count": len(refs),
                "error_code": error,
            },
        ) as (session, run):
            row = await session.get(db.ToolCall, call_id)
            if row is None or row.investigation_id != run.id:
                raise RunConflict()
            row.status = "failed" if error else "succeeded"
            row.completed_at, row.error_code, row.result_refs = now(), error, refs
            row.duration_ms = int((row.completed_at - row.started_at).total_seconds() * 1000)

    async def save_finding(self, public_id: str, finding: Finding) -> None:
        async with self.mutation(
            public_id,
            f"finding.{finding.status}",
            {
                "finding_id": finding.id,
            },
        ) as (session, run):
            key = digest(
                {
                    "rule": finding.rule,
                    "anchors": [a.model_dump(mode="json") for a in finding.anchors],
                }
            )
            existing = await session.scalar(
                select(db.Finding).where(
                    db.Finding.investigation_id == run.id,
                    db.Finding.logical_key == key,
                )
            )
            if existing:
                return
            row = db.Finding(
                investigation_id=run.id,
                logical_key=key,
                status=finding.status,
                body=finding.model_dump(mode="json"),
            )
            session.add(row)
            await session.flush()
            # Invalid anchors remain in rejected proposal audit only, never the evidence registry.
            if finding.verification.status == "rejected":
                return
            for anchor in finding.anchors:
                evidence = db.EvidenceRef(
                    investigation_id=run.id,
                    anchor=anchor.model_dump(mode="json"),
                    retrieved_at=now(),
                )
                session.add(evidence)
                await session.flush()
                session.add(
                    db.FindingEvidenceLink(
                        finding_id=row.id,
                        evidence_ref_id=evidence.id,
                        relationship=anchor.relationship,
                        validation_status=finding.verification.status,
                    )
                )

    async def finalize(self, public_id: str, report: Report) -> None:
        async with self.mutation(
            public_id,
            "investigation.completed",
            {
                "status": report.status,
            },
        ) as (session, run):
            if run.status != "running" or report.status not in {
                "completed",
                "completed_with_limitations",
            }:
                raise RunConflict()
            run.status, run.ended_at = report.status, now()
            session.add(
                db.Report(
                    investigation_id=run.id,
                    status="ready",
                    body_json=report.model_dump(mode="json"),
                    generated_at=now(),
                )
            )

    async def snapshot(self, public_id: str) -> dict[str, Any]:
        async with self.database.session() as session:
            run = await self.find(session, public_id)
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
                "agents": [
                    {
                        "name": a.agent_key,
                        "status": a.status,
                        "started_at": a.started_at,
                        "completed_at": a.ended_at,
                    }
                    for a in agents
                ],
                "finding_summary": {
                    s: sum(f.status == s for f in findings)
                    for s in ["proposed", "verified", "rejected", "unresolved"]
                },
                **{k: run.context.get(k, []) for k in ["timeline", "hypotheses", "limitations"]},
            }

    async def events(self, public_id: str, after: int, limit: int = 100) -> list[ActivityEvent]:
        async with self.database.session() as session:
            run = await self.find(session, public_id)
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
        async with self.database.session() as session:
            run = await self.find(session, public_id)
            rows = await session.scalars(
                select(db.Finding)
                .where(
                    db.Finding.investigation_id == run.id,
                )
                .order_by(db.Finding.id)
            )
            return [Finding.model_validate(row.body) for row in rows]

    async def report(self, public_id: str) -> Report:
        async with self.database.session() as session:
            run = await self.find(session, public_id)
            row = await session.scalar(
                select(db.Report).where(db.Report.investigation_id == run.id)
            )
            if row is None:
                raise HospitalError("REPORT_NOT_READY", 409)
            return Report.model_validate(row.body_json)

    async def recover(self) -> None:
        async with self.database.session() as session:
            pending = list(
                await session.scalars(
                    select(db.Investigation.external_id).where(
                        db.Investigation.status.in_(["queued", "running"]),
                    )
                )
            )
        for public_id in pending:
            await self.transition(public_id, "failed", "PROCESS_INTERRUPTED; retry with a new run")
        # Close interrupted audit entries without inventing successful results.
        async with self.lock, self.database.session() as session, session.begin():
            for model in [db.AgentExecution, db.ToolCall, db.InvestigationStage]:
                await session.execute(
                    update(model)
                    .where(cast(Any, model).status == "running")
                    .values(
                        status="failed",
                        **(
                            {"completed_at": now(), "error_code": "PROCESS_INTERRUPTED"}
                            if model is db.ToolCall
                            else {"ended_at": now()}
                        ),
                    )
                )
