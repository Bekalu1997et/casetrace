# Conversational intelligence implementation

Implemented on `feature/chat-interface`, 24 October 2026, preserving the conversation
workspace and existing hospital, evidence, provider and scheduler boundaries.

## Behavior and files

- `apps/api/app/services/conversation_context.py` assembles bounded, patient-scoped
  context. Deterministic multi-label intent routing handles overview, timeline,
  medication/laboratory comparison, follow-up, hypothesis, evidence and status
  questions. Original DTOs preserve timestamps, units, associations and provenance.
  Broad questions no longer depend on whole-question document substring matches.
- Recent persisted history contributes up to eight messages. Saved assistant anchors
  are revalidated and mapped into the current citation catalog; prior finding IDs
  prioritize relevant findings. Original sources accompany those references so the
  model can compare dates and explain earlier records after refresh. User text does
  not grant source access. This is bounded recent memory, not exhaustive conversation
  recall or guaranteed semantic reference resolution.
- `apps/api/app/orchestration/queries.py` adds a bounded latest-event read. Context
  includes actual run status, agents, finding counts, twelve recent activity events,
  and an available terminal report. Chat does not wait for completion, mutate the
  parent's investigation, or hold a database transaction during inference.
- `apps/api/app/llm/prompts/conversation.py` requires direct natural answers,
  continuity, original-source citations, uncertainty and careful distinction between
  hypotheses, candidate findings and verified findings. No provider/API schema was
  replaced. Strict Responses output parsing and existing sanitized provider errors,
  token/time/retry budgets and `store=False` are retained.
- `apps/api/app/services/conversations.py` retains atomic saved message pairs,
  rejects fabricated citation/finding IDs, enforces the serialized context budget,
  and permits citation-free operational status answers only for status-only intent.
  `conversation_fallback.py` provides labeled readable source excerpts when no
  validated live answer exists. Citation validation establishes source integrity;
  it does not independently prove every model-generated interpretation.
- Explicit Investigate mode continues to schedule through InvestigationService.
  Ask never schedules. `linked-investigation.tsx` uses the existing scoped REST/SSE
  hook to display the actual child ID/status and separate connection lifecycle.
  `conversation.tsx` and `workspace.tsx` add comparison of two distinct cited sources
  in the existing inspector. The UI layout and truthful pending state are retained.
- API schemas, source fixtures, answer keys, database schema, migrations and dependency
  lockfiles remain unchanged. The documented POST remains non-idempotent; clients
  lock submission and never automatically retry it. Optional chat streaming is deferred.

## Automated and browser validation

`apps/api/tests/test_conversation_context.py` covers routing, real CASE-001 overview
sources, laboratory units/timestamp semantics, medication/laboratory retrieval,
restored conversation references, earlier-source context, stale hash omission,
actual running agent/activity state, candidate status, bounded serialized context,
sanitized provider failures, fallback excerpts and independently completed linked work.
Existing conversation tests retain persistence, fabricated citation rejection,
cross-patient source rejection, API validation and Responses API mock coverage.

Frontend coverage adds linked IDs/status and original-source comparisons. The
controlled Chromium check exercises history, citation inspector and responsive
layout at 1440, 1280, 1024 and 390 pixels. The real local API/browser CASE-001 check
verifies persisted chat after refresh, original evidence navigation, a linked run
that actually completes, and availability of its own report.

Validation results:

- `uv run --locked pytest -q`: 502 passed, 1 skipped; existing Starlette/httpx
  deprecation warning. Final focused conversation run: 25 passed.
- `uv run --locked ruff check .`: passed.
- `uv run --locked mypy`: passed (120 application source files).
- `pnpm.cmd typecheck` and `pnpm.cmd lint`: passed.
- `pnpm.cmd test`: 90 passed across 10 files.
- `pnpm.cmd build`: production build passed.
- Controlled Chromium conversation scenario: passed at all four viewport widths.
- Real local API/Chromium CASE-001 scenario: passed in rules mode, including child
  completion and report retrieval. The resulting screenshot was visually inspected.
- `git diff --check`: passed. No commit, branch switch or fixture reset was performed.

## Live-model acceptance gap

The settings inspection loaded `LLM_PROVIDER=rules`, model default `gpt-4o-mini`,
and no OpenAI or generic model key. No credentials were printed or modified.
Consequently the real API/browser check exercised explicitly labeled deterministic
fallback, not OpenAI inference. A live model-backed multi-turn exchange remains an
unresolved demo blocker. Configure an authorized key and OpenAI provider, restart
the API, then repeat the seven-turn demonstration from the request. Mocked Responses
success/error tests are not evidence of live model availability or conversational quality.

Other limits: first/last category sampling can omit intermediate clinical events;
terminology routing is lightweight rather than a semantic search engine; snapshot
activity may advance while a reply is generated. No causal or diagnostic authority
is added by this work.
