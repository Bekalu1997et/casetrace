# Phase 4 implementation report

## A. Implementation summary

Implemented browser investigation launch, a live investigation workspace and an
evidence-backed report on the existing Next/TypeScript/Tailwind/shadcn foundation.
The dashboard searches actual imported patients. Existing chart sections and
safe document/image previews are preserved. Findings, hypotheses, timelines,
activity and reports come from real APIs; production components contain no
synthetic successful investigation fixtures or evaluator-file reads.

## B. Completed pages

`/` and `/patients`: patient discovery/search, pagination and actual backend
availability. `/patients/[patientId]`: clinical browsing and investigation context
confirmation. `/investigations/[investigationId]`: persisted state/progress, agents,
findings, timeline, history, hypotheses and evidence. The nested `/report` route
renders backend summary/results, uncertainty, evidence, chronology, execution mode
and provenance, with browser printing. Direct routes and refresh work.

## C. Component architecture

Centralized `lib/api/investigations.ts` validates required nested response fields;
`lib/api/hospital.ts` resolves allowlisted original sources and checks patient/ID
ownership. `useInvestigation` owns server state and live reconciliation.
`lib/sse/investigation-stream.ts` owns framing and event merge behavior.
`useEvidenceSelection` stores display-only source identity in URLs. Small domain
components implement activity, timeline, hypotheses, findings, status and evidence.
Existing Button and source-record/asset components remain in use.

## D. Investigation experience

Two separate live CASE-001 browser executions reached completed reports through
the dashboard/chart/launch flow. The browser inspected the real timeline
contradiction, compared source records, selected timeline evidence, reviewed
persisted tool history, reloaded the workspace and opened the generated report.
Validation explicitly used backend rules mode; it did not claim live LLM inference.

## E. Evidence verification UX

Finding citations retrieve original hospital records rather than reconstructing
documents from findings. Cited fields/excerpts, relationships, source IDs, encounter
metadata, original timestamp semantics, verification checks and uncertainty remain
visible. Comparison groups fields by source and emphasizes primary sources while
retaining contextual citations. Current-record versus investigation-time version
limits are stated. Unsupported/missing sources fail visibly. The client never
labels source existence alone as a verified clinical interpretation.

## F. Live updates

REST snapshots are authoritative. SSE provides actual activity; unknown event
names survive, stable IDs deduplicate replay and sequences order history.
Disconnect retains content, reconciles REST, backfills events and reconnects from
the cursor. Refreshes coalesce without overlapping. Terminal snapshots stop live
transport and restore final history. Navigation/unmount aborts work and timers.
There is no polling transport competing with SSE and no fabricated progress.

## G. Actual validation

| Command / check | Result |
| --- | --- |
| `uv run --locked alembic upgrade head` in `apps/api` | Passed |
| `uv run --locked python -m app.hospital.cli validate CASE-001` | Valid; 26 assets |
| `uv run --locked python -m app.hospital.cli import CASE-001` | Existing import unchanged; actual hospital records returned |
| `uv run --locked --group case-data pytest -q` | 55 passed, 1 skipped; existing Windows symlink privilege skip |
| `pnpm.cmd test` | 33 passed across 4 files |
| `pnpm.cmd typecheck` | Passed after correcting nullable record access |
| `pnpm.cmd lint` | Passed after removing an unused test import |
| `pnpm.cmd build` | Optimized production build passed |
| `pnpm.cmd exec playwright test` with installed Edge | 2 passed, 1 intentional control-fixture skip |
| Earlier standalone live investigation browser check | Passed |
| `git diff --check` | Passed; Git reported existing Windows line-ending normalization notice |

Browser tests assert backend completion and verified findings, compare source
records, restore persisted state/source selection after refresh, open timeline
and report evidence, and compare report title with the actual backend response.
Desktop/mobile screenshots and print output were generated. Desktop/mobile
captures were visually inspected; no horizontal overflow or browser exception
occurred. Print output was generated, not independently reviewed page by page.

Initial test failures were fixed: existing chart component tests needed a Next
router mock after launch integration; lint found an unused test import; nested
field rendering required explicit nullable access. No failed check is suppressed.
Playwright's browser download timed out; installed Edge provided the working
browser. Backend emitted an existing Starlette/httpx deprecation warning.

## H. Files modified

- Frontend routes: dashboard, existing chart and new investigation/report routes.
- Components: layout, patient search/launch, findings, evidence inspector/comparison,
  clinical timeline, agent activity, hypotheses, workspace/report and status panels.
- Integration: shared hospital/investigation clients, SSE transport, investigation
  and source-selection hooks; stylesheet responsive, status and print behavior.
- Tests: chart router setup, new workspace/component/transport/recovery tests and
  live CASE-001 Playwright journey. Next generated `apps/web/AGENTS.md` locally;
  its version-specific documentation guidance was read and followed.
- Documentation: Phase 4 development/report, frontend architecture/contract,
  README and demo runbook.
- Backend/persistence: no application or migration changes; no secrets changed.

## I. Scope and limitations

No investigation-list API exists, so no fictitious recent-run inventory or counts
are displayed. The required four-screen journey uses the existing routes. There
is no cancellation/resume API, archived-version endpoint, PDF page/offset locator,
or server PDF export. Imaging-asset tool references resolve through patient-scoped
study/asset listings before preview; unknown future source kinds fail visibly.
Comparison selection is transient; a selected
individual source is shareable/reloadable. Long source histories/reports use
ordinary lists rather than virtualization; CASE-001 remains responsive.

The browser verification used explicitly deterministic rules mode. Provider/model
quality, real medical validity, broad semantic reasoning and production identity/
authorization were not newly validated. Evaluation remains outside runtime.

## J. Phase 5 readiness

The actual CASE-001 browser journey is ready for final evaluation/demo hardening.
Remaining work includes separate evaluation/calibration, configured live-provider
acceptance, operator reset/backup rehearsal, archived-source/version policy,
print pagination review and broader browser/accessibility testing. Additional
cases and production authorization remain outside Phase 4's requested scope.
