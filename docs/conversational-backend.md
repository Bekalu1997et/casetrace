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

Ask routes questions deterministically to overview, timeline, medication, laboratory,
follow-up, hypothesis, evidence and operational-status intents. Multiple intents
can apply to a medication/laboratory comparison. Broad questions retrieve patient
identity and a compact cross-domain selection instead of searching the whole question.
Clinical terminology searches use at most two terms and two document hits per term;
hits are independently resolved through the patient-scoped clinical source.

Context reuses the latest saved assistant references before selecting up to four
relevant findings and bounded original records. Up to eight saved messages contribute
continuity, including finding IDs and a mapping from previous response-local citation
IDs to the current validated catalog. Only saved assistant anchors are eligible for
reuse; user-supplied IDs never grant access. Each reused anchor is revalidated for
patient scope, version, hash, encounter and exact field/quote. Missing or stale anchors
are omitted. Original record DTOs preserve chronology, values, units and associations.

Category retrieval reads at most the first two and last two records (the overview
keeps one from each end). This is a bounded selection, not exhaustive clinical review.
There are at most 32 original records and 20 citation anchors. Finding selection
reserves catalog capacity for original clinical context. The full serialized provider
payload, including history/catalog/state, is checked against the configured character
budget. Whole optional items are removed without truncating exact anchors. Context
that still cannot fit is rejected before inference, with an explicit fallback.

Each question reads persisted investigation status, objective, agent states, finding
counts and the latest 12 actual activity events. A terminal run can contribute its
stored report summary. No chat request starts agents in Ask mode or holds a database
transaction across inference. Candidate status stays distinct from verification.
Operational status-only answers may omit clinical citations; clinical answers must
select catalog citations. Unknown citation/finding IDs or uncited clinical answers
are discarded completely. Validation establishes source integrity, not correctness
of every natural-language interpretation. Prompt rules require direct answers,
conversation continuity, uncertainty, and separate hypotheses from verified findings.

Provider errors expose only sanitized codes. Without a validated live answer,
responses explicitly identify stored evidence: persisted findings or readable original
record excerpts and their citation actions, rather than pretending to be model output.
The existing Responses API schema, timeouts, retry/output budgets and `store=False`
remain unchanged.

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

## Conversation workspace

`/investigations/{id}` now opens a conversation with a persistent bottom composer.
The frontend loads all saved history pages and appends only persisted POST results,
deduplicated by message ID. Ask is the default; Investigate sends the exact focus
and links to the separate run returned by the API. Parent events stay scoped to the
parent investigation. Responses remain safe plain text, preserving paragraph and
list formatting without executing HTML. Deterministic responses are labeled.

Investigation activity, findings, timeline and hypotheses are separate, collapsed
artifacts below the thread, never fabricated chat messages. The existing REST/SSE
owner retains cursor, reconnect and deduplication behavior. Event messages and
execution statuses are visible in execution details. Citation chips open the
existing patient-scoped SourcePanel with the original anchor, version/hash and
field highlighting; closing restores conversation width. Smaller screens use an
overlaid inspector with Escape dismissal and focus return.

Chat submissions have a 180-second client timeout; ordinary reads retain their
existing timeout. No POST is retried automatically. Pending submissions are
locked; input clears only on success and edits made while waiting are preserved.
On an uncertain failure, refresh history before deciding to resend because POST
is not idempotent. The composer supports Enter, Shift+Enter and IME composition.


## Conversational intelligence integration

The conversation retains Prompt 01's layout. Citation chips still open SourcePanel;
"Compare cited records" opens two distinct originals in the same inspector. Linked
run cards display the real run ID, persisted status and connection state through a
separate instance of the existing REST/SSE hook. Each child has its own event cursor;
the parent thread and activity remain scoped to the parent. The child link opens its
own conversation and report. Pending text describes the actual unanswered request.
No chat streaming endpoint or artificial progress was added.
