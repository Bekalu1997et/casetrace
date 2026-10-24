# Investigation conversation backend

The existing engine, supervisor, clinical tools and independent verifier remain
authoritative. OpenAI proposes candidates through the official asynchronous
Responses API. Structured output uses a strict wire schema and is validated again
as AgentResult; source values use JSON strings on the wire. Model verdicts never
establish verification. Provider failure preserves deterministic findings and adds
a limitation. Reports identify OpenAI only after successful inference.

## Run locally

From `apps/api`, run `uv sync --locked` and
`uv run --locked alembic upgrade head`, then the existing validation/import and
uvicorn commands in phase-4-development.md. Migration `0005_chat` adds only
investigation conversation messages. It does not change source records or require
resetting investigations. Use one API process.

Configure the root `.env` (all values below are examples, never credentials):

```dotenv
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=<your-key>
INVESTIGATION_STRATEGY=adaptive_rules
INVESTIGATION_REASONING=structured
```

`OPENAI_API_KEY` takes precedence over `LLM_API_KEY`. Existing Gemini settings
remain supported. `OPENAI_MODEL=gpt-4o-mini` supplies the OpenAI default when
`LLM_MODEL` is empty. Existing timeout, retry, context, output-token, tool-call,
candidate, task and concurrency budgets still apply. Rules mode remains available
with `LLM_PROVIDER=rules`. Chat in rules mode explicitly returns stored evidence
and uncertainty rather than claiming live model inference. Responses use
`store=False`; only the local conversation is persisted.

## Capabilities and focus

Full adaptive investigations select existing specialists from available evidence.
Medication analysis reuses reconciliation, symptom association and cross-specialist
laboratory questions. Medication objectives now also schedule the laboratory
specialist so temporal questions can consume its evidence without widening the
medication role's tool permissions. Follow-up objectives schedule laboratory and
referral/result review. Hypothesis objectives reuse the full evidence plan and
diagnostic challenger. Existing generic `followup` tasks remain targeted retrieval
handoffs, distinct from the public `followup_investigation` objective.

The clinical extraction vocabulary remains deliberately bounded. Documentation
gaps do not prove care was missed, orders do not establish adherence, and temporal
associations do not establish causality. Unsupported interpretations remain
unresolved. Focus selects a supported workflow; free text does not create arbitrary
new tools, diagnostic methods or scheduler actions.

## Chat API

`GET /api/investigations/{id}/chat?after=0&limit=100` returns
`{conversation_id, investigation_id, items, total, has_more}` in persisted order.
`after` is a zero-based message count cursor; advance it by the number received.
One conversation has the stable identity `CHAT-{investigation_id}`. Empty history
is valid; an unknown investigation returns the shared 404 error envelope.

`POST /api/investigations/{id}/chat` accepts:

```json
{"message":"Explain the timeline contradiction.","mode":"ask","focus":"timeline"}
```

`message` is nonblank, at most 2,000 characters. Defaults are `mode=ask` and
`focus=all`. Modes: `ask`, `investigate`. Focus: `timeline`, `medication`,
`followup`, `hypothesis`, `all`. Unknown fields and invalid values return 422.

The typed response is `{conversation_id, investigation_id, user_message,
assistant_message}`. Each message contains `id`, `conversation_id`, `role`,
`content`, `created_at`, `citations`, `finding_ids`, `limitations`,
`new_investigation_id`, and `execution_mode`. Assistant execution mode is
`openai`, `deterministic_rules`, or `scheduled`. A citation has `id` (e.g. `C1`)
and the existing `anchor` with source type/ID, version/hash, encounter, field,
expected value and optional exact quote/character offsets.

Ask retrieves relevant persisted findings, compact timeline/hypothesis context,
up to six recent messages and bounded original clinical records through the
patient-scoped clinical service. It revalidates anchors against original sources
before exposing a citation catalog. The model selects catalog IDs, not new
anchors. Unknown citations/findings or an uncited model answer discard the entire
answer and return a labeled deterministic evidence fallback. Citation validation
establishes source integrity; it cannot prove every natural-language interpretation.
The provider enforces a final serialized context budget, including history.

For `mode=investigate`, an explicit focus maps to an existing supported objective.
When focus is all, a small keyword mapping can select medication, timeline,
follow-up or hypothesis work; otherwise the full objective is used. The existing
InvestigationService schedules a new patient-scoped run. The assistant message
persists its ID, linking it to the parent conversation. The parent investigation
and its event cursor stay unchanged. Conversations save each user/assistant pair
atomically after inference; no database transaction is held during model work.
Overlapping requests have commit ordering; they are not serialized through inference.
POST retries are not idempotent; clients should prevent duplicate submission.

## Frontend integration

1. Continue loading REST investigation state, findings and report. Connect to the
   existing `/stream`; retain numeric SSE IDs, deduplicate by sequence and reconnect
   with Last-Event-ID or `after`. Reconcile REST state after reconnect.
2. Events retain every existing field and add `message` and `execution_status`.
   These are projections of committed events; no extra narrated events are inserted.
   Group by payload `agent_run_id`, `agent` and task IDs. Tool completions now include
   tool and agent-run identity. Existing source references/finding IDs remain in payload.
3. Display event.message as English activity. Unknown events remain tolerated.
   Example: an actual `verification.started` event adds
   `"message":"Checking the proposed finding against original source records.",
   "execution_status":"started"`. The additive `evidence.reused` event identifies a
   follow-up task consuming an original source already retrieved in this run. Its
   payload contains task/agent/run IDs and source identity/version/hash; it is not
   presented as a fresh tool execution. The verifier still independently resolves
   originals. A `model.failed` event reports a failed optional proposal step without
   discarding completed deterministic review. Neither event contains raw model text.
4. Load chat history on refresh. Send POST with explicit mode/focus. Render assistant
   content and limitations, then attach clickable citation chips to the existing
   evidence inspector using citation.anchor. Keep finding status visible.
5. For scheduled work, read `assistant_message.new_investigation_id`, load that run's
   REST state and connect to its existing SSE endpoint. Keep the parent chat intact.
6. Report.summary adds investigation_summary, key_discoveries, supporting_evidence,
   competing_interpretations, unresolved_questions and conclusion. Existing headline,
   description and structured report fields remain available after refresh.

No authentication platform is added. Isolation is patient/run scoping within the
existing local application, not user-level access control. No canonical case or
evaluation answer key is modified by this feature.
