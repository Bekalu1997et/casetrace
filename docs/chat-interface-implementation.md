# Conversation-first workspace implementation

Implemented on `feature/chat-interface`, 24 October 2026. Backend algorithms,
database schemas, source records and REST/SSE routes are unchanged.

## Interaction

The investigation route opens a conversation with saved messages and a persistent
composer. Suggested prompts fill the draft. Ask/Investigate and focus selectors
send the existing chat contract. Enter submits; Shift+Enter preserves multiline
input. IME composition does not submit. Pending requests are locked, edits survive
while pending, and failures preserve the draft without automatic POST retries.
History pagination and message-ID deduplication restore persisted conversations.
Assistant text is rendered safely as plain text, with original paragraph/list
formatting. Deterministic fallback and limitations remain explicit.

Activity, findings, timeline and hypotheses are separate disclosures, collapsed
by default. The tool audit inspector mounts only after activity is expanded.
Agent details show real event messages, execution statuses, timestamps and source
references. The existing investigation hook still owns REST/SSE reconciliation.
Finding cards retain verification, comparison and original-source actions; Ask
about finding fills the composer. Reports remain available through their route.

Citation chips pass validated anchors to the existing SourcePanel. It retrieves
patient-scoped original records and highlights supported exact passages or fields,
including source version/hash metadata. The inspector closes fully and returns
focus; smaller screens use a drawer with Escape dismissal. The global navigation
is reused. The shell and composer fit the viewport, including 390px mobile.

Investigate responses link to the actual new run. Parent conversation and SSE
cursors remain intact. No tool activity, findings or assistant messages are
fabricated, and no token streaming is simulated.

## Files

- `apps/web/features/investigations/components/workspace.tsx`: conversation layout,
  collapsed artifacts, source inspector, failure feedback.
- `components/conversation.tsx` and `hooks/use-conversation.ts` in that feature:
  messages, composer, pagination, cancellation and submission lifecycle.
- `apps/web/lib/api/chat.ts`, `apps/web/types/chat.ts`: typed, runtime-validated chat.
- `apps/web/lib/api/client.ts`: optional per-request timeout; chat uses 180 seconds.
- `apps/web/lib/validation/investigation.ts`, `apps/web/types/investigation.ts`:
  optional activity text/status validation and shared anchor validation.
- `agent-activity.tsx`, `finding-card.tsx`: activity fields and conversational finding action.
- `apps/web/app/globals.css`: responsive conversation and inspector presentation.
- `apps/web/tests/conversation.test.tsx`, `workspace.test.tsx`: conversation behavior
  and existing stream recovery coverage with chat history mocked independently.
- `apps/web/tests/e2e/conversation.spec.ts`: controlled browser workflow at
  1440, 1280, 1024 and 390px; composer viewport, history, links and source highlights.
- `apps/web/tests/e2e/conversation-live.spec.ts`: opt-in real backend workflow.
- Existing `investigation.spec.ts` and `workbench.spec.ts` browser scenarios now
  use the conversation disclosures rather than removed dashboard tabs.
- `docs/conversational-backend.md`: frontend behavior and recovery notes.

## Validation

Lint, TypeScript, the full 88-test Vitest suite and production build passed.
A subsequent focused run passed all five conversation tests, including the added
finding-to-composer test. Chromium
validated controlled API interaction at all four requested widths, including
history restoration, activity expansion, exact cited-field highlighting and
closing evidence. Screenshots were visually inspected at desktop and mobile.
The real CASE-001 browser workflow also passed: saved answer restored after
refresh, an original document citation opened and highlighted, and Investigate
scheduled a separate timeline run linked from the parent conversation. Both
updated legacy browser scenarios also passed against the local rules-mode backend,
covering tool audit, source comparison, earlier-event pagination, report navigation,
refresh and report export.

Run controlled browser checks with a local web server:
`pnpm exec playwright test tests/e2e/conversation.spec.ts --workers=1`.
For live checks, additionally start the seeded backend and set `RUN_LIVE_CHAT=1`
before running `conversation-live.spec.ts`. That check writes synthetic chat
messages and schedules a real investigation; it may call the configured provider.

## Limits

Responses use safe plain text rather than a Markdown library. No token streaming
is available from the existing HTTP chat endpoint. The real backend returned a
deterministic evidence fallback during validation; this confirms fallback honesty,
not successful external model inference. SSE reconnect behavior is covered by the
existing component/integration suite; no intentional live network interruption
was performed. Existing local secrets and runtime data are not committed.
