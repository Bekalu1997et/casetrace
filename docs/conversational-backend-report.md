# Backend implementation report — 2026-10-24

Implemented on `feature/data-generation`, as requested after branch clarification.
Changes are packaged into separate provider, investigation, conversation and
documentation commits. No frontend redesign, canonical case change or answer-key
change was performed.

## Implemented behavior

- Official asynchronous OpenAI Responses provider with structured proposals,
  configurable models, both key conventions, bounded context/output, timeout,
  transient retries and sanitized failures. Strict wire values are validated as
  existing candidate/anchor types before independent verification.
- Existing timeline, medication reconciliation, laboratory/result-follow-up and
  diagnostic challenger paths are reused. Added focused follow-up/hypothesis
  objectives and laboratory participation in medication objectives. Adaptive
  source reuse avoids redundant follow-up reads while preserving observable
  provenance handoffs. Laboratory original-document budget accommodates CASE-001.
- English narration projects committed REST/SSE events. Completion includes real
  verified/unresolved counts. Reports persist readable summaries derived from
  existing findings and hypotheses. Failed inference is labeled as deterministic
  fallback and completed specialist results are retained.
- Persistent patient/run-scoped chat, revalidated source anchors, bounded clinical
  service retrieval, validated citation/finding IDs, recent conversational context,
  safe evidence fallback and linked investigations through the existing scheduler.
- Migration upgrade/downgrade is tested on isolated SQLite databases. No transaction
  remains open while waiting for inference. Finalized investigation versions and
  SSE cursors are unchanged by chat.

The OpenAI implementation follows the official
[Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs).

## Changed files

Provider and configuration:

- `.env.example`, `apps/api/pyproject.toml`, `apps/api/uv.lock`
- `apps/api/app/core/config.py`, `app/composition.py`, `app/main.py`
- `apps/api/app/llm/openai.py`, `llm/proposals.py`, `llm/context.py`,
  `llm/prompts/conversation.py`

Investigation execution and presentation (paths relative to `apps/api/app`):

- `agents/specialists.py`, `clinical/longitudinal.py`, `evidence/longitudinal.py`
- `orchestration/engine.py`, `supervisor.py`, `planner.py`, `activity.py`,
  `commands.py`, `queries.py`, `reporting.py`, `narration.py`
- `schemas/investigation.py`
- `core/error_types.py`, `hospital/errors.py`, `evidence/verification.py`
  (neutral shared error boundary, typing and import-order corrections)

Conversation storage and API:

- `apps/api/app/schemas/chat.py`, `services/conversations.py`,
  `orchestration/conversations.py`, `models/investigation.py`,
  `api/routes/investigations.py`
- `apps/api/alembic/versions/0005_investigation_chat.py`

Tests and documentation:

- `apps/api/tests/test_conversations.py`, `test_adaptive.py`, `test_foundation.py`,
  `test_investigation.py`, `test_result_followup.py`
- `docs/backend-architecture.md`, `frontend-backend-contract.md`,
  `multi-agent-architecture.md`, `conversational-backend.md`,
  `conversational-backend-report.md`

Existing test expectations now reflect the new migration head, medication/lab
planning, honest inference-failure labeling and the existing distinction between
completed review and unresolved clinical questions. Source/verification assertions
and evaluation fixtures are preserved. Architecture tests exposed an existing
agent import of hospital errors; the error type now lives in a neutral core module
with the old hospital import retained as a compatibility re-export.

## API, environment and frontend handoff

See [the integration contract](conversational-backend.md) for exact request and
response fields, GET/POST chat routes, focus/objective mapping, example payloads,
environment variable names, migration/startup commands, citation rendering,
activity grouping, REST/SSE recovery and following linked investigation runs.

Additional events are `evidence.reused` and `model.failed`. Existing event types,
numeric sequences, stored payloads and reconnect behavior remain supported.

## Validation and practical limits

- `uv run --locked pytest -q --tb=short`: **485 passed, 1 skipped**, 309.76 seconds.
- Final targeted run of conversation/provider tests and existing provider-failure
  regression: **11 passed**, 29.88 seconds, after the final inference-fallback change.
- Focused architecture, adaptive workflow, real tool-audit and conversation run:
  **70 passed**, including both adaptive CASE-001 reasoning modes.
- `uv run --locked ruff check .`: passed.
- `uv run --locked mypy`: passed, 118 source files.
- `git diff --check`: passed. Canonical `data/` and evaluator files have no changes.
- CASE-001 baseline and adaptive end-to-end tests preserve the verified chronology
  discovery and evaluator-required source references. Evaluation reads answer keys
  only after runtime report finalization.
- Conversation migration downgrade/re-upgrade, persistence/history, fabricated and
  cross-patient citation rejection, scoped linked runs, Responses parsing/error
  handling, context limits, and existing REST/SSE replay were exercised.

The suite emitted the existing Starlette/httpx TestClient deprecation warning.

The live smoke attempt could not confirm inference. A subsequent bounded
connectivity request reached OpenAI but returned `AuthenticationError` (HTTP 401).
No credential value or provider response body was displayed. Set a valid local
`OPENAI_API_KEY` (or `LLM_API_KEY`) and `LLM_PROVIDER=openai` before the live demo.
Automated provider tests use mocks and do not spend model tokens.

Extraction and planning remain controlled and vocabulary bounded. Focus launches
a supported workflow rather than arbitrary new research procedures. Citation
validation establishes identity, source freshness and anchor integrity; it cannot
prove every model interpretation. Unresolved findings and provisional hypotheses
must remain visibly distinct from verified observations. Chat has bounded lexical
retrieval, local application scope, commit-ordered concurrent responses and no
POST retry idempotency. There is no new authentication platform or clinical
diagnosis/treatment capability.
