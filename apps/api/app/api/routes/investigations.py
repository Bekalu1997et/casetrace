"""HTTP contracts only. Workers and durable state live below the route boundary."""

import asyncio
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Header, Query, Request
from fastapi.responses import StreamingResponse

from app.hospital.errors import HospitalError
from app.orchestration.store import TERMINAL, InvestigationStore
from app.schemas.investigation import (
    CreateInvestigation,
    CreationResponse,
    EventPage,
    Finding,
    FindingPage,
    InvestigationState,
    Report,
)
from app.services.investigations import InvestigationService

router = APIRouter(prefix="/api/investigations", tags=["Investigations"])


def store_for(request: Request) -> InvestigationStore:
    return request.app.state.investigation_store  # type: ignore[no-any-return]


@router.post("", response_model=CreationResponse, status_code=202)
async def create(
    body: CreateInvestigation,
    request: Request,
    idempotency_key: Annotated[str | None, Header(max_length=100)] = None,
) -> CreationResponse:
    service: InvestigationService = request.app.state.investigation_service
    return await service.create(body, idempotency_key)


@router.get("/{investigation_id}", response_model=InvestigationState)
async def state(investigation_id: str, request: Request) -> InvestigationState:
    return InvestigationState.model_validate(await store_for(request).snapshot(investigation_id))


@router.get("/{investigation_id}/events", response_model=EventPage)
async def events(
    investigation_id: str,
    request: Request,
    after: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
) -> EventPage:
    items = await store_for(request).events(investigation_id, after, limit)
    return EventPage(items=items, total=len(items))


@router.get("/{investigation_id}/findings", response_model=FindingPage)
async def findings(investigation_id: str, request: Request) -> FindingPage:
    items = await store_for(request).findings(investigation_id)
    return FindingPage(items=items, total=len(items))


@router.get("/{investigation_id}/findings/{finding_id}", response_model=Finding)
async def finding(investigation_id: str, finding_id: str, request: Request) -> Finding:
    for item in await store_for(request).findings(investigation_id):
        if item.id == finding_id:
            return item
    raise HospitalError("FINDING_NOT_FOUND")


@router.get("/{investigation_id}/report", response_model=Report)
async def report(investigation_id: str, request: Request) -> Report:
    return await store_for(request).report(investigation_id)


@router.get("/{investigation_id}/stream")
async def stream(
    investigation_id: str,
    request: Request,
    after: int = Query(default=0, ge=0),
    last_event_id: Annotated[str | None, Header()] = None,
) -> StreamingResponse:
    store = store_for(request)
    await store.snapshot(investigation_id)  # Resolve before committing stream headers.
    if last_event_id:
        if not last_event_id.isdecimal():
            raise HospitalError("INVALID_EVENT_CURSOR", 422)
        after = max(after, int(last_event_id))

    async def generate() -> AsyncIterator[str]:
        cursor = after
        while not await request.is_disconnected():
            page = await store.events(investigation_id, cursor)
            for event in page:
                yield (
                    f"id: {event.sequence}\nevent: {event.type}\n"
                    f"data: {event.model_dump_json()}\n\n"
                )
                cursor = event.sequence
            if page:
                continue  # Drain persisted tail even after terminal state.
            state = await store.snapshot(investigation_id)
            if state["status"] in TERMINAL:
                # Requery after observing terminal state to avoid losing its final event.
                tail = await store.events(investigation_id, cursor)
                if not tail:
                    break
                continue
            yield ": keepalive\n\n"
            await asyncio.sleep(0.5)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
