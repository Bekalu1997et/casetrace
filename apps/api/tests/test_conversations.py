"""Real SQLite conversation isolation, citations, linked work and Responses wire tests."""

import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient
from openai import APIConnectionError, AuthenticationError
from test_investigation import setup_case

from app.composition import build_engine
from app.core.config import Settings
from app.hospital.errors import HospitalError
from app.llm.context import proposal_context
from app.llm.openai import OpenAIProvider
from app.llm.proposals import Proposals
from app.llm.provider import ProviderError
from app.main import create_app
from app.orchestration.narration import project
from app.orchestration.planner import initial_plan
from app.schemas.chat import ChatAnswer, ChatRequest
from app.schemas.investigation import AgentResult, CreateInvestigation
from app.schemas.planning import InvestigationContext, SourceIdentity
from app.services.conversations import ConversationService
from app.services.investigations import InvestigationService


class Scheduler:
    def __init__(self):
        self.ids = []

    def schedule(self, public_id):
        self.ids.append(public_id)


class AnswerProvider:
    def __init__(self, fabricated=False):
        self.fabricated = fabricated
        self.context = None

    async def generate(self, task, evidence, schema, instructions):
        self.context = evidence
        return schema(
            answer="The records contain a discrepancy requiring review.",
            citation_ids=["FABRICATED"] if self.fabricated else [evidence["citations"][0]["id"]],
            finding_ids=[],
            limitations=["No causal conclusion is established."],
        )


@pytest.mark.parametrize("fabricated", [False, True])
async def test_grounded_chat_persistence_isolation_and_linked_work(tmp_path, fabricated):
    settings, database, store = await setup_case(tmp_path)
    scheduler = Scheduler()
    try:
        engine = build_engine(store, settings)
        parent, _ = await store.create(CreateInvestigation(patient_id="PAT-CONTROL"), None)
        await engine.execute(parent)
        version = (await store.snapshot(parent))["version"]
        provider = AnswerProvider(fabricated)
        chat = ConversationService(
            store, InvestigationService(store, scheduler), engine.clinical, settings, provider
        )
        result = await chat.send(parent, ChatRequest(message="What changed?", focus="timeline"))
        assert result.assistant_message.citations
        assert result.assistant_message.execution_mode == (
            "deterministic_rules" if fabricated else "openai"
        )
        if fabricated:
            assert any("discarded" in x for x in result.assistant_message.limitations)
            assert "FABRICATED" not in result.model_dump_json()
        history = await chat.repository.history(parent)
        assert [m.role for m in history.items] == ["user", "assistant"]
        assert history.total == 2
        assert (await store.snapshot(parent))["version"] == version
        other, _ = await store.create(CreateInvestigation(patient_id="PAT-CONTROL"), None)
        assert not (await chat.repository.history(other)).items
        linked = await chat.send(
            parent, ChatRequest(message="Investigate medications further.", mode="investigate")
        )
        child = linked.assistant_message.new_investigation_id
        assert child in scheduler.ids
        assert (await store.snapshot(child))["objective"] == "medication_investigation"
        assert (await store.snapshot(parent))["version"] == version
        assert (await chat.repository.history(parent)).total == 4
        with pytest.raises(HospitalError):
            await chat.send("INV-absent", ChatRequest(message="hello"))
        with TestClient(create_app(settings)) as client:
            response = client.get(f"/api/investigations/{parent}/chat")
            assert response.status_code == 200
            assert response.json()["total"] == 4
            assert (
                client.post(
                    f"/api/investigations/{parent}/chat",
                    json={
                        "message": "Investigate follow-up",
                        "mode": "investigate",
                        "focus": "followup",
                    },
                ).status_code
                == 200
            )
            assert client.get("/api/investigations/INV-absent/chat").status_code == 404
            assert (
                client.post(
                    f"/api/investigations/{parent}/chat", json={"message": "   "}
                ).status_code
                == 422
            )
    finally:
        await database.dispose()


async def test_openai_responses_and_errors():
    settings = Settings(llm_provider="openai", openai_api_key="test-only", llm_model="gpt-4o-mini")
    answer = ChatAnswer(
        answer="Insufficient evidence.",
        citation_ids=[],
        finding_ids=[],
        limitations=["Missing evidence."],
    )
    client = AsyncMock()
    client.__aenter__.return_value = client
    client.responses.parse.return_value = SimpleNamespace(status="completed", output_parsed=answer)
    with patch("app.llm.openai.AsyncOpenAI", return_value=client) as factory:
        provider = OpenAIProvider(settings)
        assert await provider.generate("conversation", {}, ChatAnswer, "test") == answer
        assert client.responses.parse.call_args.kwargs["store"] is False
        assert factory.call_args.kwargs["max_retries"] == 1
        client.responses.parse.return_value = SimpleNamespace(
            status="completed", output_parsed=Proposals(candidates=[], limitations=["No evidence."])
        )
        assert (await provider.propose("timeline", {})).limitations == ["No evidence."]
        client.responses.parse.return_value = SimpleNamespace(
            status="incomplete", output_parsed=None
        )
        with pytest.raises(ProviderError, match="MODEL_INVALID_OUTPUT"):
            await provider.generate("conversation", {}, ChatAnswer, "test")
        client.responses.parse.side_effect = APIConnectionError(
            request=httpx.Request("POST", "https://example.com")
        )
        with pytest.raises(ProviderError, match="MODEL_UNAVAILABLE"):
            await provider.generate("conversation", {}, ChatAnswer, "test")
        client.responses.parse.side_effect = AuthenticationError(
            "private provider body",
            response=httpx.Response(401, request=httpx.Request("POST", "https://example.com")),
            body=None,
        )
        with pytest.raises(ProviderError, match="^MODEL_HTTP_401$"):
            await provider.generate("conversation", {}, ChatAnswer, "test")
    settings.openai_api_key = ""
    settings.llm_api_key = ""
    with pytest.raises(ProviderError, match="MODEL_CONFIGURATION_MISSING"):
        await provider.propose("timeline", {})
    settings.llm_api_key = "fallback-test-key"
    with pytest.raises(ProviderError, match="MODEL_CONTEXT_BUDGET_EXCEEDED"):
        await provider.propose("timeline", {"text": "x" * 100001})


def test_event_projection_does_not_create_activity():
    assert "Timeline" in project("agent.started", {"agent": "timeline"})[0]
    assert "3" in project("tool.completed", {"record_count": 3})[0]
    assert project("future.event", {}) == ("Future event.", "event")


async def test_proposal_wire_values_and_bounded_context(tmp_path):
    import json

    settings, database, store = await setup_case(tmp_path)
    try:
        engine = build_engine(store, settings)
        parent, _ = await store.create(CreateInvestigation(patient_id="PAT-CONTROL"), None)
        await engine.execute(parent)
        findings = await store.findings(parent)
        context = proposal_context("full_record_investigation", findings, [], 1000)
        assert len(json.dumps(context)) < 1000
        assert context["limitations"]
        anchor = findings[0].anchors[0]
        wire = Proposals.model_validate(
            {
                "candidates": [
                    {
                        "type": findings[0].type,
                        "title": "Test proposal",
                        "claim": "Recorded field.",
                        "claim_kind": "hypothesis",
                        "rule": "interpretation",
                        "anchors": [
                            {
                                **anchor.model_dump(exclude={"expected", "char_start", "char_end"}),
                                "expected_json": json.dumps(anchor.expected),
                            }
                        ],
                        "alternatives": [],
                        "limitations": [],
                    }
                ],
                "limitations": [],
            }
        )
        assert wire.validated().candidates[0].anchors[0].expected == anchor.expected
        wire.candidates[0].anchors[0].expected_json = "invalid JSON"
        with pytest.raises(ValueError):
            wire.validated()
    finally:
        await database.dispose()


async def test_cross_patient_sources_cannot_enter_chat(tmp_path):
    settings, database, store = await setup_case(tmp_path)
    try:
        engine = build_engine(store, settings)
        parent, _ = await store.create(CreateInvestigation(patient_id="PAT-CONTROL"), None)
        await engine.execute(parent)
        findings = await store.findings(parent)
        assert findings
        # Simulate a corrupted persisted finding pointing outside the patient scope.
        foreign = findings[0].model_copy(deep=True)
        for anchor in foreign.anchors:
            anchor.source.id = "FOREIGN-PATIENT-RECORD"
        with patch.object(store, "findings", AsyncMock(return_value=[foreign])):
            chat = ConversationService(
                store,
                InvestigationService(store, Scheduler()),
                engine.clinical,
                settings,
                AnswerProvider(True),
            )
            response = await chat.send(parent, ChatRequest(message="Explain evidence."))
        # Accessible local originals may still support a partial answer.
        assert all(
            c.anchor.source.id != "FOREIGN-PATIENT-RECORD"
            for c in response.assistant_message.citations
        )
        assert not response.assistant_message.finding_ids
        assert "FOREIGN-PATIENT-RECORD" not in response.model_dump_json()
    finally:
        await database.dispose()


def test_chat_migration_roundtrip(tmp_path):
    from test_hospital import migrate

    settings = Settings(database_url=f"sqlite+aiosqlite:///{tmp_path / 'migration.db'}")
    migrate(settings)
    for command in (["downgrade", "0004_investigation"], ["upgrade", "head"]):
        result = subprocess.run(
            [sys.executable, "-m", "alembic", *command],
            cwd=Path(__file__).resolve().parents[1],
            env={**os.environ, "DATABASE_URL": str(settings.resolved_database_url)},
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert result.returncode == 0, result.stderr


@pytest.mark.parametrize(
    "objective,expected",
    [
        ("followup_investigation", {"laboratory", "referrals"}),
        ("hypothesis_investigation", {"timeline", "laboratory", "medication", "referrals"}),
    ],
)
def test_focused_objectives_reuse_existing_specialists(objective, expected):
    context = InvestigationContext(
        investigation_id="INV-test",
        patient_id="PAT-test",
        objective=objective,
        manifest=[
            SourceIdentity(type=kind, id=f"SRC-{i}", version=1, hash="a" * 64)
            for i, kind in enumerate(["document", "observation", "medication"])
        ],
    )
    assert {t.task_type for t in initial_plan(context, "discovery")} == expected


async def test_provider_failure_preserves_completed_specialist_results(tmp_path):
    settings, database, store = await setup_case(tmp_path)
    provider = SimpleNamespace(
        mode="openai", propose=AsyncMock(side_effect=ProviderError("MODEL_HTTP_401"))
    )
    try:
        parent, _ = await store.create(CreateInvestigation(patient_id="PAT-CONTROL"), None)
        with patch(
            "app.agents.specialists.ContradictionInvestigator.followups",
            AsyncMock(return_value=AgentResult(limitations=["Retained specialist review."])),
        ):
            await build_engine(store, settings, provider).execute(parent)
        report = await store.report(parent)
        assert "Retained specialist review." in report.limitations
        assert report.execution_mode == "deterministic_rules"
        assert any(e.type == "model.failed" for e in await store.events(parent, 0, 1000))
    finally:
        await database.dispose()
