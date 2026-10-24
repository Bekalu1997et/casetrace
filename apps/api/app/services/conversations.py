"""Grounded conversation over an existing patient-scoped investigation."""

from typing import Any, Protocol, TypeVar
from uuid import uuid4

from pydantic import BaseModel

from app.clinical.ports import ClinicalSource
from app.core.config import Settings
from app.core.provenance import now
from app.llm.prompts.conversation import CHAT_PROMPT
from app.llm.provider import ProviderError
from app.orchestration.conversations import ConversationRepository
from app.orchestration.store import InvestigationStore
from app.schemas.chat import (
    ChatAnswer,
    ChatCitation,
    ChatMessage,
    ChatRequest,
    ChatResponse,
)
from app.schemas.investigation import CreateInvestigation, Finding
from app.services.conversation_context import ConversationContext, serialized_size
from app.services.conversation_fallback import record_excerpts
from app.services.investigations import InvestigationService

Output = TypeVar("Output", bound=BaseModel)


class ConversationProvider(Protocol):
    async def generate(
        self, task: str, evidence: dict[str, Any], schema: type[Output], instructions: str
    ) -> Output: ...


OBJECTIVES = {
    "all": "full_record_investigation",
    "timeline": "timeline_investigation",
    "medication": "medication_investigation",
    "followup": "followup_investigation",
    "hypothesis": "hypothesis_investigation",
}


class ConversationService:
    def __init__(
        self,
        store: InvestigationStore,
        investigations: InvestigationService,
        clinical: ClinicalSource,
        settings: Settings,
        provider: ConversationProvider | None = None,
    ):
        self.store, self.investigations = store, investigations
        self.clinical, self.settings, self.provider = clinical, settings, provider
        self.repository = ConversationRepository(store.persistence)

    async def context(
        self, public_id: str, body: ChatRequest
    ) -> tuple[dict[str, Any], list[ChatCitation], list[Finding], list[str]]:
        return await ConversationContext(
            self.store, self.clinical, self.settings, self.repository
        ).build(public_id, body)

    async def send(self, public_id: str, body: ChatRequest) -> ChatResponse:
        state = await self.store.snapshot(public_id)
        conversation_id = f"CHAT-{public_id}"
        user = ChatMessage(
            id=f"MSG-{uuid4().hex}",
            conversation_id=conversation_id,
            role="user",
            content=body.message,
            created_at=now(),
        )
        assistant = ChatMessage(
            id=f"MSG-{uuid4().hex}",
            conversation_id=conversation_id,
            role="assistant",
            content="",
            created_at=now(),
        )
        if body.mode == "investigate":
            focus: str = body.focus
            if focus == "all":
                text = body.message.lower()
                focus = next(
                    (
                        f
                        for f, keywords in {
                            "medication": ("medication", "drug", "treatment"),
                            "timeline": ("timeline", "chronology"),
                            "followup": ("follow-up", "followup", "referral"),
                            "hypothesis": ("hypothesis", "diagnosis"),
                        }.items()
                        if any(word in text for word in keywords)
                    ),
                    "all",
                )
            request = CreateInvestigation.model_validate(
                {"patient_id": state["patient_id"], "objective": OBJECTIVES[focus]}
            )
            # Creation uses the existing scheduler; the finalized parent is never reopened.
            created = await self.investigations.create(request, user.id)
            assistant.new_investigation_id = created.investigation_id
            assistant.content = f"A new {focus} investigation was accepted for this patient."
            assistant.execution_mode = "scheduled"
        else:
            context, citations, selected, limits = await self.context(public_id, body)
            answer: ChatAnswer | None = None
            if self.provider:
                try:
                    if serialized_size(context) > self.settings.investigation_max_context_chars:
                        raise ProviderError("MODEL_CONTEXT_BUDGET_EXCEEDED")
                    answer = await self.provider.generate(
                        "conversation", context, ChatAnswer, CHAT_PROMPT
                    )
                except ProviderError as exc:
                    limits.append(f"Live answer unavailable ({exc}); source-backed fallback shown.")
            else:
                limits.append("No live conversational model configured; stored evidence shown.")
            allowed_citations = {c.id for c in citations}
            allowed_findings = {f.id for f in selected}
            if answer and (
                not set(answer.citation_ids) <= allowed_citations
                or not set(answer.finding_ids) <= allowed_findings
                or (not answer.citation_ids and context["intents"] != ["status"])
            ):
                answer = None
                limits.append("The model answer failed citation validation and was discarded.")
            if answer:
                assistant.content = answer.answer
                assistant.citations = [c for c in citations if c.id in answer.citation_ids]
                assistant.finding_ids = answer.finding_ids
                limits.extend(answer.limitations)
                assistant.execution_mode = "openai"
            else:
                assistant.content = (
                    "Live conversation is unavailable. Here is stored evidence for review."
                )
                if "status" in context["intents"]:
                    run = context["investigation"]
                    assistant.content += (
                        f" The investigation is {run['status']}; "
                        f"current stage: {run['progress']['current_stage']}."
                    )
                if selected:
                    assistant.content += " Stored findings for review: " + " ".join(
                        f"[{f.status}] {f.claim}" for f in selected[:3]
                    )
                    assistant.citations = citations
                    assistant.finding_ids = [f.id for f in selected[:3]]
                elif context["records"]:
                    assistant.content += "\n\n" + record_excerpts(context)
                    assistant.citations = citations
                else:
                    assistant.content += (
                        " No accessible clinical evidence was retrieved for this question."
                    )
            assistant.limitations = list(dict.fromkeys(limits))
        assistant.created_at = now()
        await self.repository.save_pair(public_id, [user, assistant])
        return ChatResponse(
            conversation_id=conversation_id,
            investigation_id=public_id,
            user_message=user,
            assistant_message=assistant,
        )
