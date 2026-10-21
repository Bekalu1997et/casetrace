"""Explicit specialists over the tool registry; no database, filesystem or provider SDK."""

from uuid import UUID

from app.agents import analysis
from app.schemas.investigation import AgentResult, Candidate, SourceRecord, ToolResult
from app.tools.ports import ToolExecutor


class Specialist:
    def __init__(self, tools: ToolExecutor, name: str, execution_id: UUID):
        self.tools, self.name, self.execution_id = tools, name, execution_id

    async def call(self, tool: str, **args: object) -> ToolResult:
        return await self.tools.execute(
            self.name,
            self.execution_id,
            tool,
            {
                "patient_id": self.tools.patient_id,
                **args,
            },
        )

    async def collect(self, tool: str, **args: object) -> list[SourceRecord]:
        records = []
        offset = 0
        while True:
            page = await self.call(tool, limit=100, offset=offset, **args)
            records.extend(page.records)
            if not page.has_more:
                return records
            offset += len(page.records)
            if not page.records:
                raise ValueError("PAGINATION_STALLED")


class RetrievalAgent(Specialist):
    async def run(self) -> list[SourceRecord]:
        patient = await self.call("get_patient")
        manifest = patient.records
        for tool in [
            "get_encounters",
            "search_documents",
            "get_lab_results",
            "get_medication_history",
            "get_imaging_studies",
            "get_diagnostic_reports",
        ]:
            records = await self.collect(tool)
            # Manifest records are identifiers, not an indiscriminate agent context dump.
            manifest.extend(records)
        return manifest


class TimelineAgent(Specialist):
    async def run(self) -> tuple[AgentResult, list[SourceRecord]]:
        events = await self.collect("build_patient_timeline")
        encounters = await self.collect("get_encounters")
        notes = []
        for hit in await self.collect("search_clinical_notes"):
            notes.extend((await self.call("get_clinical_note", record_id=hit.source.id)).records)
        events.sort(key=lambda r: (str(r.data.get("occurred_at") or "~"), r.source.id))
        return AgentResult(
            candidates=analysis.contradictions(notes, events)
        ), events + encounters + notes


class LaboratoryAgent(Specialist):
    async def run(self) -> tuple[AgentResult, list[SourceRecord]]:
        records = await self.collect("get_lab_results")
        return AgentResult(candidates=analysis.lab_changes(records)), records


class MedicationAgent(Specialist):
    async def run(self) -> tuple[AgentResult, list[SourceRecord]]:
        records = await self.collect("get_medication_history")
        candidates = analysis.medication_observations(records)
        documents = {}
        for record, candidate in zip(records, candidates, strict=True):
            document_id = record.data.get("source_document_id")
            if document_id:
                if document_id not in documents:
                    documents[document_id] = (
                        await self.call("get_document", record_id=document_id)
                    ).records[0]
                item = analysis.anchor(documents[document_id], "text_content")
                item.relationship = "contextualizes"
                candidate.anchors.append(item)
        return AgentResult(candidates=candidates), records + list(documents.values())


class ContradictionInvestigator(Specialist):
    async def followups(self) -> AgentResult:
        records = await self.collect("get_referrals")
        return AgentResult(candidates=analysis.followups(records))

    async def retrieve_candidates(self, candidates: list[Candidate]) -> None:
        # Targeted original-source retrieval and a deliberate correction search.
        seen = set()
        mapping = {
            "document": "get_document",
            "observation": "get_lab_result",
            "encounter": "get_encounter",
            "medication": None,
        }
        for candidate in candidates:
            for anchor in candidate.anchors:
                key = (anchor.source.type, anchor.source.id)
                tool = mapping.get(anchor.source.type)
                if tool and key not in seen:
                    await self.call(tool, record_id=anchor.source.id)
                    seen.add(key)
        await self.collect("search_documents", query="correction")
