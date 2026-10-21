"""Explicit permissions, patient scope, budgets, audit and bounded tool execution."""

import asyncio
from typing import Any
from uuid import UUID

from app.hospital.service import HospitalError
from app.orchestration.store import InvestigationStore
from app.schemas.investigation import ToolInput, ToolResult
from app.tools.clinical import TOOL_SPECS, ClinicalTools, dispatch

PERMISSIONS = {
    "retrieval": {
        "get_patient",
        "search_patient",
        "get_encounters",
        "search_documents",
        "get_lab_results",
        "get_medication_history",
        "get_imaging_studies",
        "get_imaging_asset_metadata",
        "get_diagnostic_reports",
    },
    "timeline": {
        "get_encounters",
        "get_encounter",
        "build_patient_timeline",
        "search_clinical_notes",
        "search_documents",
        "get_document",
        "get_clinical_note",
        "get_lab_results",
    },
    "laboratory": {
        "get_lab_results",
        "get_lab_result",
        "compare_lab_results",
        "search_documents",
        "get_document",
    },
    "medication": {"get_medication_history", "get_medication", "search_documents", "get_document"},
    "contradiction": {
        "get_encounters",
        "get_encounter",
        "search_documents",
        "get_document",
        "get_clinical_note",
        "get_lab_results",
        "get_lab_result",
        "get_diagnostic_reports",
        "get_diagnostic_report",
        "get_imaging_studies",
        "get_imaging_report",
        "get_referrals",
    },
    "synthesis": set(),
}


class ToolRegistry:
    def __init__(
        self,
        store: InvestigationStore,
        clinical: ClinicalTools,
        public_id: str,
        patient_id: str,
        *,
        max_calls: int = 100,
        max_per_agent: int = 30,
        timeout: float = 15,
        max_chars: int = 100000,
    ):
        self.store, self.clinical = store, clinical
        self.public_id, self.patient_id = public_id, patient_id
        self.max_calls, self.max_per_agent = max_calls, max_per_agent
        self.timeout, self.max_chars = timeout, max_chars
        self.calls = 0
        self.agent_calls: dict[str, int] = {}

    def catalog(self, agent: str) -> list[dict[str, Any]]:
        return [
            {
                "name": name,
                "description": f"Retrieve patient-scoped {TOOL_SPECS[name][0]} "
                "evidence from the hospital; does not establish a clinical conclusion.",
                "input_schema": ToolInput.model_json_schema(),
                "output_schema": ToolResult.model_json_schema(),
                "scope": f"{TOOL_SPECS[name][0]}.read",
            }
            for name in sorted(PERMISSIONS.get(agent, set()))
        ]

    async def execute(
        self,
        agent: str,
        agent_id: UUID,
        name: str,
        raw: dict[str, Any],
    ) -> ToolResult:
        # Never log arbitrary unvalidated payloads (which could contain secrets).
        call_id = await self.store.tool_start(
            self.public_id,
            agent_id,
            name[:100],
            {
                key: value
                for key, value in raw.items()
                if key in {"patient_id", "record_id", "other_id", "limit", "offset"}
                and isinstance(value, (str, int))
            },
            agent,
        )
        try:
            args = ToolInput.model_validate(raw)
            if name not in PERMISSIONS.get(agent, set()) or name not in TOOL_SPECS:
                raise HospitalError("TOOL_NOT_PERMITTED", 403)
            if args.patient_id != self.patient_id:
                raise HospitalError("PATIENT_SCOPE_VIOLATION", 403)
            # No await between testing and incrementing shared budgets.
            if self.calls >= self.max_calls or self.agent_calls.get(agent, 0) >= self.max_per_agent:
                raise HospitalError("TOOL_BUDGET_EXCEEDED", 409)
            self.calls += 1
            self.agent_calls[agent] = self.agent_calls.get(agent, 0) + 1
            async with asyncio.timeout(self.timeout):
                result = await dispatch(self.clinical, name, args)
            if len(result.model_dump_json()) > self.max_chars:
                raise HospitalError("TOOL_RESULT_TOO_LARGE", 409)
        except BaseException as exc:
            code = exc.code if isinstance(exc, HospitalError) else type(exc).__name__
            await self.store.tool_end(self.public_id, call_id, [], code)
            raise
        await self.store.tool_end(
            self.public_id, call_id, [ref.model_dump() for ref in result.source_refs]
        )
        return result
