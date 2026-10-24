"""Bounded conversational retrieval; all originals remain patient-scoped DTOs."""

import json
import re
from typing import Any

from app.clinical.ports import ClinicalSource
from app.core.config import Settings
from app.evidence.verification import EvidenceVerifier
from app.hospital.errors import HospitalError
from app.orchestration.conversations import ConversationRepository
from app.orchestration.store import TERMINAL, InvestigationStore
from app.schemas.chat import ChatCitation, ChatRequest
from app.schemas.investigation import Candidate, Finding, SourceRecord
from app.schemas.provenance import Anchor, SourceRef, SourceType


def intents(question: str, focus: str) -> list[str]:
    """Multi-label routing permits medication/lab comparisons without another model call."""
    text = question.lower()
    routes = {
        "status": (
            r"right now|so far|yet\b|being checked|reviewed|running|progress|working|verified\??$"
        ),
        "medication": r"medicat|drug|prescri|administ|treatment",
        "laboratory": r"laborator|\blabs?\b|abnormal|result|values?",
        "timeline": (
            r"timeline|chronolog|before|after|earlier|later|next|over time|"
            r"symptom|contradict|disagree"
        ),
        "followup": r"follow.?up|addressed|referral|missing",
        "hypothesis": r"hypothes|diagnos|explain|challenges|working explanation",
        "evidence": r"evidence|source|records? disagree|finding|\bwhy\b|\bthat\b|\bthose\b",
    }
    result = [name for name, pattern in routes.items() if re.search(pattern, text)]
    if focus != "all" and focus not in result:
        result.insert(0, focus)
    return result or ["overview"]


def serialized_size(context: dict[str, Any]) -> int:
    return len(json.dumps({"task": "conversation", "evidence": context}, ensure_ascii=False))


def search_terms(question: str) -> list[str]:
    generic = set(
        "tell about this that these those patient case clinical medical history summarize "
        "what which when where could would should does have happened going important "
        "before after earlier later documented records record sources source evidence "
        "medication medications laboratory labs results result values timeline symptoms "
        "finding findings contradiction changes changed explain explain why show review "
        "diagnosis working hypothesis hypotheses follow addressed available during "
        "their with were been from more overlap abnormal whether difference mistake "
        "understand most just please further deeply investigation investigate".split()
    )
    return list(
        dict.fromkeys(
            word for word in re.findall(r"\b[a-z]{4,}\b", question.lower()) if word not in generic
        )
    )[:2]


class ConversationContext:
    def __init__(
        self,
        store: InvestigationStore,
        clinical: ClinicalSource,
        settings: Settings,
        repository: ConversationRepository,
    ):
        self.store, self.clinical, self.settings, self.repository = (
            store,
            clinical,
            settings,
            repository,
        )

    async def build(
        self,
        public_id: str,
        body: ChatRequest,
    ) -> tuple[dict[str, Any], list[ChatCitation], list[Finding], list[str]]:
        state = await self.store.snapshot(public_id)
        patient = state["patient_id"]
        page = await self.repository.history(public_id, limit=1)
        recent = await self.repository.history(public_id, after=max(0, page.total - 8), limit=8)
        routes = intents(body.message, body.focus)
        limits = ["Answers use bounded accessible synthetic records; no clinical decisions."]
        context: dict[str, Any] = {
            "question": body.message,
            "focus": body.focus,
            "intents": routes,
            "investigation": {
                key: state[key]
                for key in (
                    "id",
                    "patient_id",
                    "objective",
                    "status",
                    "version",
                    "progress",
                    "agents",
                    "finding_summary",
                )
            },
            "history": [],
            "findings": [],
            "records": [],
            "citations": [],
            "timeline": [],
            "hypotheses": [],
            "activity": [],
            "limitations": [],
        }
        # State includes datetimes. Materialize JSON before budgeting, never pass sessions.
        context = json.loads(json.dumps(context, default=str))
        citations: list[ChatCitation] = []
        selected: list[Finding] = []
        originals: dict[tuple[str, str], SourceRecord] = {}
        verifier = EvidenceVerifier(self.clinical, patient, self.settings.investigation_reasoning)
        budget = self.settings.investigation_max_context_chars

        async def add(anchor: Anchor) -> str | None:
            existing = next((c.id for c in citations if c.anchor == anchor), None)
            if existing:
                return existing
            if len(citations) >= 20:
                limits.append("Additional original evidence exceeded the chat citation budget.")
                return None
            probe = Candidate(
                type="clinical_relationship",
                title="Citation validation",
                claim="Citation validation",
                claim_kind="hypothesis",
                rule="interpretation",
                anchors=[anchor],
            )
            verification, _ = await verifier.verify(probe)
            if verification.status == "rejected":
                limits.append("A stale or inaccessible evidence reference was omitted.")
                return None
            citation = ChatCitation(id=f"C{len(citations) + 1}", anchor=anchor)
            citations.append(citation)
            return citation.id

        async def resolve(source: SourceRef) -> None:
            key = (source.type, source.id)
            if key in originals or len(originals) >= 32:
                return
            try:
                originals[key] = await self.clinical.resolve(patient, source)
            except HospitalError:
                limits.append("An original source was inaccessible in this patient scope.")

        # IDs from user text never become retrieval instructions. Only saved assistant
        # anchors are reused, and each is independently validated against current sources.
        remembered: set[str] = set()
        for message in reversed(recent.items):
            if message.role != "assistant":
                continue
            remembered.update(message.finding_ids)
            for citation in message.citations[:8]:
                if await add(citation.anchor):
                    await resolve(citation.anchor.source)
            if remembered or originals:
                break

        findings = await self.store.findings(public_id)
        preferred = set()
        for route, types in {
            "timeline": {"timeline_contradiction", "documentation_delay"},
            "laboratory": {"laboratory_change"},
            "medication": {"medication_change"},
            "followup": {"missing_evidence"},
        }.items():
            if route in routes:
                preferred.update(types)
        words = set(re.findall(r"[a-z]{3,}", body.message.lower()))
        findings.sort(
            key=lambda f: (
                f.id not in remembered,
                f.type not in preferred,
                f.status != "verified",
                -len(words & set(re.findall(r"[a-z]{3,}", (f.title + " " + f.claim).lower()))),
                f.id,
            )
        )
        for finding in findings[:4]:
            if len(citations) + len(finding.anchors) > 12:
                continue
            ids = [value for anchor in finding.anchors if (value := await add(anchor))]
            if ids and len(ids) == len(finding.anchors):
                selected.append(finding)
                context["findings"].append(
                    {
                        "id": finding.id,
                        "title": finding.title,
                        "status": finding.status,
                        "claim": finding.claim,
                        "claim_kind": finding.claim_kind,
                        "verification": finding.verification.model_dump(),
                        "citation_ids": ids,
                        "limitations": finding.limitations,
                    }
                )
                for anchor in finding.anchors:
                    await resolve(anchor.source)

        await resolve(SourceRef(type="patient", id=patient))
        # Search individual clinical terminology, never the whole natural-language
        # question. Search hits are leads; independently resolve originals before use.
        if "overview" not in routes and routes != ["status"]:
            for term in search_terms(body.message):
                try:
                    hits, _ = await self.clinical.search_documents(
                        patient, term, {"limit": 2, "offset": 0}
                    )
                    for hit in hits[:2]:
                        await resolve(SourceRef(type="document", id=hit.id))
                except HospitalError:
                    limits.append("Document search was unavailable; retained evidence was used.")
        categories: list[SourceType] = []
        mapping: dict[str, list[SourceType]] = {
            "overview": [
                "encounter",
                "document",
                "observation",
                "medication",
                "diagnosis",
                "symptom",
            ],
            "timeline": ["clinical_event", "encounter", "document", "symptom"],
            "medication": ["medication", "observation", "document"],
            "laboratory": ["observation", "diagnostic_report", "document", "encounter"],
            "followup": ["observation", "referral", "diagnostic_report", "encounter", "document"],
            "hypothesis": ["diagnosis", "symptom", "document", "observation"],
            "evidence": [],
            "status": [],
        }
        for route in routes:
            categories.extend(mapping[route])
        for category in dict.fromkeys(categories):
            try:
                rows, total = await self.clinical.records(
                    category, patient, {"limit": 2, "offset": 0}
                )
                if total > 2:
                    tail, _ = await self.clinical.records(
                        category, patient, {"limit": 2, "offset": max(2, total - 2)}
                    )
                    rows.extend(tail)
                # Overview reserves room for every domain rather than filling the
                # entire catalog with one long record category.
                if "overview" in routes and len(rows) > 2:
                    rows = [rows[0], rows[-1]]
                for row in rows[:4]:
                    if len(originals) < 32:
                        originals.setdefault((row.source.type, row.source.id), row)
                if total > 4:
                    limits.append(f"Only a bounded selection of {category} records was reviewed.")
            except HospitalError:
                limits.append(f"Retrieval of {category} records was unavailable.")

        for record in originals.values():
            field = next(
                (
                    key
                    for key in (
                        "text_content",
                        "description",
                        "display_name",
                        "test_name",
                        "medication_name",
                        "name",
                        "status",
                        "id",
                    )
                    if record.data.get(key) is not None
                ),
                None,
            )
            if field is None:
                continue
            anchor = Anchor(
                source=record.source,
                source_version=record.source_version,
                source_hash=record.source_hash,
                encounter_id=record.data.get("encounter_id"),
                field=field,
                expected=record.data[field],
            )
            # Full source DTO preserves every distinct timestamp, unit and record association.
            citation_id = next(
                (c.id for c in citations if c.anchor.source == record.source), None
            ) or await add(anchor)
            if citation_id:
                context["records"].append(
                    {"citation_id": citation_id, "source": record.model_dump(mode="json")}
                )

        for message in recent.items:
            # Citation IDs are response-local. Map previous IDs to today's validated catalog.
            refs = {
                old.id: current.id
                for old in message.citations
                for current in citations
                if old.anchor == current.anchor
            }
            context["history"].append(
                {
                    "role": message.role,
                    "content": message.content[:1500],
                    "citation_map": refs,
                    "finding_ids": [f.id for f in selected if f.id in message.finding_ids],
                    "execution_mode": message.execution_mode,
                }
            )
        context["timeline"] = state["timeline"][:10]
        context["hypotheses"] = state["hypotheses"][:3]
        # A bounded latest-event query avoids replaying an unbounded investigation trace.
        context["activity"] = [
            e.model_dump(mode="json") for e in await self.store.queries.recent_events(public_id, 12)
        ]
        if state["status"] in TERMINAL:
            try:
                report = await self.store.report(public_id)
                context["report"] = {"summary": report.summary, "limitations": report.limitations}
            except HospitalError:
                limits.append("No final report is available for this investigation.")
        context["citations"] = [c.model_dump(mode="json") for c in citations]
        context["limitations"] = state["limitations"][:10] + list(dict.fromkeys(limits))

        def prune_catalog() -> None:
            used = {r["citation_id"] for r in context["records"]}
            used.update(c for f in context["findings"] for c in f["citation_ids"])
            context["citations"] = [c.model_dump(mode="json") for c in citations if c.id in used]
            for message in context["history"]:
                message["citation_map"] = {
                    old: current
                    for old, current in message["citation_map"].items()
                    if current in used
                }
                message["finding_ids"] = [
                    identity
                    for identity in message["finding_ids"]
                    if any(f["id"] == identity for f in context["findings"])
                ]

        prune_catalog()
        # Budget the actual serialized wire payload, including catalog, history and state.
        # Remove whole items rather than truncate JSON or exact evidence anchors.
        for key in (
            "report",
            "hypotheses",
            "timeline",
            "activity",
            "records",
            "history",
            "findings",
        ):
            while serialized_size(context) > budget and context.get(key):
                if isinstance(context[key], list):
                    # Keep the most recent conversational turns when trimming memory.
                    context[key].pop(0 if key == "history" else -1)
                else:
                    del context[key]
                prune_catalog()
                if "Some context was omitted to respect the answer context budget." not in limits:
                    limits.append("Some context was omitted to respect the answer context budget.")
            if serialized_size(context) <= budget:
                break
        # Keep only citation/finding identities that the model actually received.
        finding_ids = {f["id"] for f in context["findings"]}
        selected = [f for f in selected if f.id in finding_ids]
        used = {r["citation_id"] for r in context["records"]}
        used.update(c for f in context["findings"] for c in f["citation_ids"])
        citations = [c for c in citations if c.id in used]
        context["citations"] = [c.model_dump(mode="json") for c in citations]
        context["limitations"] = list(dict.fromkeys(context["limitations"] + limits))
        # Small configured budgets may not fit even the question and state. The provider
        # rejects them safely; never silently shorten the user's question.
        return context, citations, selected, list(dict.fromkeys(limits))
