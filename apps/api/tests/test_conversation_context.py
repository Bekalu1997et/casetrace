"""Conversation intent, persisted references, activity and bounded original evidence."""

from unittest.mock import AsyncMock, patch

import pytest
from test_conversations import AnswerProvider, Scheduler
from test_investigation import setup_case

from app.composition import build_engine
from app.llm.provider import ProviderError
from app.schemas.chat import ChatAnswer, ChatRequest
from app.schemas.investigation import CreateInvestigation
from app.services.conversation_context import intents, search_terms, serialized_size
from app.services.conversations import ConversationService
from app.services.investigations import InvestigationService


@pytest.mark.parametrize(
    "question,expected",
    [
        ("Tell me about this patient's case.", {"overview"}),
        ("Who is this patient?", {"overview"}),
        ("Summarize the clinical history.", {"overview"}),
        ("What happened over time?", {"timeline"}),
        ("Could medications explain the abnormal laboratory result?", {"medication", "laboratory"}),
        ("Was the abnormal result addressed later?", {"laboratory", "followup", "timeline"}),
        ("What evidence challenges the working diagnosis?", {"hypothesis", "evidence"}),
        ("What have you found so far?", {"status"}),
        ("Why is that important?", {"evidence"}),
        ("Show me the earlier record.", {"timeline"}),
    ],
)
def test_question_routing(question, expected):
    assert expected <= set(intents(question, "all"))


def test_focused_terminology_search():
    assert search_terms("Could metformin overlap with creatinine changes?") == [
        "metformin",
        "creatinine",
    ]
    assert search_terms("Tell me about this patient's case.") == []


async def test_overview_and_medication_lab_sources_without_completed_investigation(tmp_path):
    settings, database, store = await setup_case(tmp_path, canonical=True)
    try:
        engine = build_engine(store, settings)
        parent, _ = await store.create(CreateInvestigation(patient_id="SYN-001"), None)
        scheduler = Scheduler()
        provider = AnswerProvider()
        chat = ConversationService(
            store, InvestigationService(store, scheduler), engine.clinical, settings, provider
        )
        result = await chat.send(parent, ChatRequest(message="Tell me about this patient's case."))
        context = provider.context
        types = {r["source"]["source"]["type"] for r in context["records"]}
        assert {"patient", "encounter", "document", "observation", "medication"} <= types
        assert context["investigation"]["patient_id"] == "SYN-001"
        assert context["investigation"]["status"] == "queued"
        assert context["findings"] == []
        assert result.assistant_message.execution_mode == "openai"
        assert not scheduler.ids
        assert len(context["citations"]) <= 20
        assert len(context["records"]) <= 32
        assert "ground_truth" not in str(context)
        await chat.send(
            parent, ChatRequest(message="Could medications overlap with abnormal labs?")
        )
        assert {"medication", "laboratory"} <= set(provider.context["intents"])
        observations = [
            r["source"]["data"]
            for r in provider.context["records"]
            if r["source"]["source"]["type"] == "observation"
        ]
        assert observations
        assert all(
            "unit" in r and "reported_at" in r and "specimen_collected_at" in r
            for r in observations
        )
        offline = ConversationService(
            store, InvestigationService(store, scheduler), engine.clinical, settings
        )
        fallback = await offline.send(parent, ChatRequest(message="Tell me about this case."))
        assert "Live conversation is unavailable" in fallback.assistant_message.content
        assert "Patient:" in fallback.assistant_message.content
        assert "Observation:" in fallback.assistant_message.content
        assert "Medication:" in fallback.assistant_message.content
        linked = await chat.send(
            parent,
            ChatRequest(
                message="Investigate medication overlap with laboratory abnormalities.",
                mode="investigate",
                focus="medication",
            ),
        )
        child = linked.assistant_message.new_investigation_id
        assert child in scheduler.ids
        await engine.execute(child)
        assert (await store.snapshot(child))["status"] in {
            "completed",
            "completed_with_limitations",
        }
        assert (await store.report(child)).investigation_id == child
        assert (await store.snapshot(parent))["status"] == "queued"
        assert not (await chat.repository.history(child)).items
        child_context, _, _, _ = await chat.context(
            child, ChatRequest(message="What did you find?")
        )
        assert child_context["report"]
    finally:
        await database.dispose()


async def test_saved_references_revalidated_after_service_recreation_and_staleness(tmp_path):
    settings, database, store = await setup_case(tmp_path, canonical=True)
    try:
        engine = build_engine(store, settings)
        parent, _ = await store.create(CreateInvestigation(patient_id="SYN-001"), None)
        await engine.execute(parent)
        investigations = InvestigationService(store, Scheduler())
        provider = AnswerProvider()
        chat = ConversationService(store, investigations, engine.clinical, settings, provider)
        first = await chat.send(parent, ChatRequest(message="What is the main contradiction?"))
        assert first.assistant_message.citations
        source = first.assistant_message.citations[0].anchor.source
        restored = ConversationService(store, investigations, engine.clinical, settings, provider)
        await restored.send(parent, ChatRequest(message="Why is that important?"))
        assert any(
            r["source"]["source"] == source.model_dump() for r in provider.context["records"]
        )
        assert provider.context["history"][-1]["citation_map"]
        assert provider.context["report"]
        await restored.send(parent, ChatRequest(message="Show me the earlier source."))
        assert "timeline" in provider.context["intents"]
        assert provider.context["history"]
        # Persisted references are not trusted when source bytes/versions have changed.
        original_resolve = engine.clinical.resolve

        async def stale(patient, ref):
            record = await original_resolve(patient, ref)
            if ref == source:
                record.source_hash = "f" * 64
            return record

        with patch.object(engine.clinical, "resolve", side_effect=stale):
            context, citations, _, limits = await restored.context(
                parent, ChatRequest(message="Why is that important?")
            )
        assert any("stale" in limit for limit in limits)
        assert not any(
            c.anchor.source == source and c.anchor.source_hash != "f" * 64 for c in citations
        )
        assert all(
            value in {c.id for c in citations}
            for m in context["history"]
            for value in m["citation_map"].values()
        )
    finally:
        await database.dispose()


async def test_running_status_uses_committed_activity_and_candidate_status(tmp_path):
    settings, database, store = await setup_case(tmp_path)
    try:
        engine = build_engine(store, settings)
        parent, _ = await store.create(CreateInvestigation(patient_id="PAT-CONTROL"), None)
        await store.transition(parent, "running", "test start")
        await store.agent_start(parent, "timeline")
        await store.record(parent, "records.retrieved", {"record_count": 2})
        provider = AnswerProvider()
        chat = ConversationService(
            store, InvestigationService(store, Scheduler()), engine.clinical, settings, provider
        )
        context, _, _, _ = await chat.context(
            parent, ChatRequest(message="What is running right now?")
        )
        assert context["investigation"]["status"] == "running"
        assert context["investigation"]["agents"][0]["status"] == "running"
        assert context["activity"][-1]["type"] == "records.retrieved"
        assert "report" not in context
        # Status answers may omit clinical citations; no source-based claim is implied.
        provider.generate = AsyncMock(
            return_value=ChatAnswer(
                answer="The timeline agent is running; no verified findings are available yet.",
                citation_ids=[],
                finding_ids=[],
                limitations=[],
            )
        )
        response = await chat.send(parent, ChatRequest(message="What is running right now?"))
        assert response.assistant_message.execution_mode == "openai"
        assert not response.assistant_message.citations
        completed, _ = await store.create(CreateInvestigation(patient_id="PAT-CONTROL"), None)
        await engine.execute(completed)
        findings = await store.findings(completed)
        candidate = findings[0].model_copy(
            update={"status": "proposed", "investigation_id": parent}
        )
        candidate.verification = candidate.verification.model_copy(
            update={"status": "inconclusive"}
        )
        with patch.object(store, "findings", AsyncMock(return_value=[candidate])):
            context, _, _, _ = await chat.context(
                parent, ChatRequest(message="Is that finding verified?")
            )
        assert context["findings"][0]["status"] == "proposed"
    finally:
        await database.dispose()


async def test_budgets_provider_failure_and_latest_events(tmp_path):
    settings, database, store = await setup_case(tmp_path)
    try:
        engine = build_engine(store, settings)
        parent, _ = await store.create(CreateInvestigation(patient_id="PAT-CONTROL"), None)
        await engine.execute(parent)
        provider = AnswerProvider()
        chat = ConversationService(
            store, InvestigationService(store, Scheduler()), engine.clinical, settings, provider
        )
        settings.investigation_max_context_chars = 12000
        context, citations, _, limits = await chat.context(
            parent, ChatRequest(message="Tell me about this case.")
        )
        assert serialized_size(context) <= 12000
        assert len(citations) <= 20
        tail = await store.queries.recent_events(parent, 3)
        all_events = await store.events(parent, 0, 1000)
        assert tail == all_events[-3:]
        assert context["limitations"]
        provider.generate = AsyncMock(side_effect=ProviderError("MODEL_HTTP_401"))
        response = await chat.send(parent, ChatRequest(message="Tell me about this case."))
        assert response.assistant_message.execution_mode == "deterministic_rules"
        assert "Live conversation is unavailable" in response.assistant_message.content
        assert any("MODEL_HTTP_401" in x for x in response.assistant_message.limitations)
        assert (await chat.repository.history(parent)).total == 2
        # An impossibly small budget rejects inference instead of oversending context.
        settings.investigation_max_context_chars = 1000
        provider.generate.reset_mock()
        response = await chat.send(parent, ChatRequest(message="x" * 2000))
        provider.generate.assert_not_awaited()
        assert any(
            "MODEL_CONTEXT_BUDGET_EXCEEDED" in x for x in response.assistant_message.limitations
        )
    finally:
        await database.dispose()
