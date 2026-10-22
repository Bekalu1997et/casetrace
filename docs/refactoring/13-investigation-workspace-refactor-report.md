# Refactor 09 — Investigation workbench and evidence inspection

Date: 2026-10-22. Branch: `refator/casetrace-mvp`.
Starting commit: `8a74467818aa74a1db919e13625ce5f5d2c26672`.
Initial working tree clean; Refactor 08 is present in code and report 12.

Status: implementation and automated integration checks delivered; visual/browser
acceptance remains incomplete. Automatic approval review rejected starting the
local Next.js server with `pnpm.cmd start --port 13309`. The returned reason was
`blocked by policy`; no more specific reason was supplied. No alternative server
startup was attempted. New browser tests are provided but were not run. Application
screenshots, viewport/keyboard journeys and print pagination are not claimed.

No commit, push, reset, canonical case/asset change, evaluator change, schema
migration or normal development-database write was performed. Test imports use
`%TEMP%/casetrace-r09/browser.db` and a copied assets directory. Replays and unit
integration tests use separate temporary databases.

## A. Previous investigation experience and implementation map

The existing workspace already loaded persisted state/findings, recovered ordered
history, reconnected SSE, compared original sources, filtered findings, displayed
hypotheses and printed persisted reports. Refactor 08 supplied a paginated history
API and reliable hospital source navigation. These were retained.

| Area | Before | Change / retained boundary | Coverage |
| --- | --- | --- | --- |
| Directory | Embedded recent history only | Dedicated paginated directory, exact patient/case/status filters | Component filters, paging, empty/error |
| Launch | Patient/case launch control | Imported patient selection and inventory, reuse original launch | Inventory selection; existing idempotency tests |
| Workbench | Context/agent rail, tabbed center, source panel | Stage rail, recent real activity, context inventory, findings navigator, collapsible panels | Existing workspace tests plus stage tests |
| Activity | Generic expandable event history | Individual executions, bounded history, tools inspector | Repeated attempts, failures, scoped audit tests |
| Adaptive work | Task/lead events not presented as a product view | Task/lead projection, IDs, parent/dependencies, requested actions, follow-up status | Handoffs, deduplication, source navigation |
| Timeline | Source/time fields, category/date filters | Finding focus, related comparison and cited encounter links | Existing timestamp/filter tests |
| Evidence | In-workspace source inspector | Dedicated explorer with finding membership and anchor restoration | Direct links, foreign/unavailable finding, comparison refresh |
| Report | Persisted findings/timeline/hypotheses and print | Objective, explorer link, unique source index, collapsible audit, print CSS | Persisted report tests, source-index deduplication |

The existing SourcePanel, SourceHighlight, RecordCard, DocumentAsset, Hypotheses,
FindingCard, InvestigationTimeline, transport and reconciliation hooks are reused.

## B. Updated frontend architecture

Routes:

```text
/investigations                        InvestigationDirectory
/investigations/new                    NewInvestigation -> StartInvestigation
/investigations/[id]                   InvestigationWorkspace
/investigations/[id]/evidence          EvidenceExplorer
/investigations/[id]/report            InvestigationReportView
```

Feature modules own composition. Central clients own transport/runtime validation;
shared UI does not import feature modules. `useInvestigation` remains the single
owner of each mounted workbench/explorer's authoritative REST state and SSE
activity. `useResource` retains scoped cancellation for history, inventory and
audit reads. No additional state library or dependency was added.

## C. Investigation navigation and creation

The global navigation now links to the directory. Its table shows persisted run,
patient/case, objective, lifecycle status/current stage, creation/start/completion
times and report links for completed states. Pagination uses backend limit/offset;
the only creation order advertised is the backend's newest-first order. Filters
are exact identifiers/status and reset pagination. Zero results and errors differ.

New Investigation searches and pages actual imported patients. Selection persists
while reviewing the inventory and launch objective. It reuses StartInvestigation's
submission lock, stable idempotency key, retry behavior and confirmed backend-ID
navigation. Existing chart/case launch controls remain. There is no per-request
strategy selector; execution remains server-configured.

## D. Workbench layout

The desktop grid contains clinical context/workflow, central investigation content,
and findings/evidence. The header shows objective context, patient/case/run,
created/started/completed times, persisted progress and connection state, with
directory, explorer and report actions. ClinicalContext reads actual category
counts from the existing hospital summary API. The workflow rail shows observed
stage events in first-observed chronology, including failed/skipped outcomes and
their last recorded timestamps. It does not fill unobserved stages as completed.

Recent activity is visible above the center tabs. Tabs cover Findings, Timeline,
Activity, Tasks & leads and Hypotheses. The right panel offers actual findings
before a source is selected. Context/evidence use native keyboard-operable
disclosures; below 1280px the panels stack instead of compressing three columns.
These are implemented layout rules, not a claim of completed viewport acceptance.

## E. Agent, task, lead and tool activity

Role summaries remain separate from individual executions, keyed by the actual
agent_run_id. Starts/ends and tool-call counts are correlated by persisted IDs;
terminal failure information remains visible. The event list initially renders
the most recent 50 events with a control to reveal earlier records and an explicit
shown/total count. Earlier audit events remain in the recovered history.

Task/lead rows merge events by their stable ID. They expose recorded objectives,
assigned/source agent, parent/originating task, dependencies, decision, reason,
attempts, errors, requested tool names and source/result references. A lead can
show its associated follow-up task's recorded outcome through lead_id. Approval
alone never means execution completed. Duplicate/rejected leads are not invented
as completed work. Baseline runs show an explicit absence of adaptive records.

ToolInspector uses the new paginated audit read model. It shows execution/agent
IDs, role/attempt, persisted status/times/duration, safe scalar parameters, returned
source references and errors. It explicitly states that full result payloads are
unavailable. The registry historically retains only a limited safe argument set
and filter fingerprint: omitted original search parameters are not reconstructed.
Requested task actions are explicitly distinguished from actual audited calls.

## F. SSE and recovery

The existing transport/parser and bounded reconnect policy were retained. REST
remains authoritative; SSE delivers activity; backfill restores committed history.
Existing tests cover split frames, unknown events, deduplication, reconnection,
terminal-state preservation and stale scopes. The new inventory read is mocked
independently in the existing stream-count test so it still measures SSE calls.

A real isolated API run was captured at
`data/runtime/refactor09/actual-{state,report,events,tools}.json`, with creation,
history-before/after and `actual-stream.sse`. These are ignored local artifacts.
Run `INV-1c0d2a77f8d04de0948c463ce7a109a7` completed with 51 real tool calls.
This API acceptance capture is separate from browser acceptance.

## G. Evidence Explorer and chronology

The dedicated explorer has a findings navigator, selected finding/verification
card, relationship filter, source anchors and original record/comparison area.
It restores exact anchors by reading persisted finding membership, preserving
field, quote, character offsets, relationship, version/hash and encounter. A source
outside the selected finding, or an unavailable finding, blocks that source view.
All record fetching still uses patient-scoped hospital reads.

URLs carry identifiers only. Single-source selection uses source/source_type;
multi-source selection uses repeated compare parameters containing [type,id]
pairs. Repeated IDs with opaque punctuation survive remount. Anchors/clinical text
are never copied into URLs. Finding links retain the finding ID. Original-source
views provide workbench, explorer and report return navigation.

Timeline additions allow focusing actual sources cited by a finding, opening its
comparison and navigating to encounters explicitly present in those anchors.
Existing named timestamps/category/date controls remain. No temporal contradiction
is inferred from proximity. The existing timeline ordering policy still places
date-only records within the date sequence; its precision disclaimer remains.
Resolving mixed day/instant partial-order presentation is a remaining limitation.

## H. Verification and hypotheses

Finding cards retain actual classification/check messages, alternatives and
limitations. Statuses receive distinct proposed/verified/unresolved/rejected card
treatments. No checklist or clinical conclusion is generated in the browser.
Source panels display cited relationship, encounter, exact field/excerpt and
version/hash. Existing Unicode code-point span validation remains unchanged.

Hypothesis comparison retains actual supporting/opposing anchors, verdict,
alternatives, missing evidence and limitations. It explicitly distinguishes an
investigation explanation from diagnosis/probability. A valid citation does not
turn a hypothesis into a verified medical conclusion.

Original PDFs/images continue through the existing registered-asset viewers.
Structured offsets are not PDF pixel coordinates, and archived source versions
remain unavailable. Missing/currently changed sources retain existing notices.

## I. Investigation report and export

The report continues to use the persisted report, not new frontend conclusions.
It shows identity/objective/status/generated time and recorded execution mode,
executive summary, verified/unresolved/rejected findings with comparisons and
checks, reconstructed chronology, hypotheses, limitations, and execution provenance.
Actual laboratory/medication observations remain in their persisted finding cards.
An added unique source index includes referenced finding/hypothesis/timeline sources,
deduplicated by type and ID, with hospital links and source inspection actions.

Execution history is collapsible and excluded from print, while evidence IDs remain
visible. Print CSS adds A4 margins, heading/page-break rules and printable source
tables without scrolling clips. Browser print/PDF remains the export mechanism.
No PDF export pipeline was added. Final print output/pagination has not been inspected.

## J. Prototype fidelity

The supplied index, patient-chart, investigation-workbench and investigation-report
HTML prototypes were rendered in headless installed Edge. Workbench/report images
were visually inspected. Reference screenshots:

- `apps/web/test-results/r09-prototype-index.png`
- `apps/web/test-results/r09-prototype-patient-chart.png`
- `apps/web/test-results/r09-prototype-investigation-workbench.png`
- `apps/web/test-results/r09-prototype-investigation-report.png`

The implementation follows the prototype's neutral bordered surfaces, compact
headers, workflow rail, observable activity, evidence cards, source comparisons
and restrained teal/status accents while preserving the existing navy app shell.
Prototype identities, counts and findings were not copied into production data.
App-to-prototype screenshot comparison remains outstanding; no pixel-fidelity or
presentation-ready visual acceptance claim is made.

## K. Accessibility and responsiveness

Implemented native details/summary inspection, labeled fields/selects, semantic
table headers, textual status badges, pressed-state controls, focus styles,
status/error announcements and responsive stacking. Existing reduced-motion rules
remain. The added browser journey specifies 1440/1024/768/390 overflow checks and
keyboard expansion, but it was not run. Screen-reader, contrast, full keyboard,
mobile-panel usability and print acceptance remain outstanding.

## L. Backend changes and compatibility

One additive read endpoint: `GET /api/investigations/{id}/tools`, limit 1–100,
offset >=0. The existing InvestigationQueries service resolves run ownership and
joins only tool/agent rows for that run. Typed ToolAudit/ToolAuditPage DTOs expose
an explicit scalar argument allowlist, original source identities and audit fields.
Nested/unknown argument fields are dropped; no planning context, raw tool response,
environment variables, prompts or evaluator data are exposed. This is the existing
trusted-local authorization model, not new production authentication.

OpenAPI comparison: every pre-existing path and schema is exactly equal. Only the
tools path and its DTOs are added. Snapshots reside at
`data/runtime/refactor09/openapi-{before,after}.json`. No migration, execution,
provider, clinical tool, agent, source, verifier or scoring logic changed.

## M. Executed validation

Commands ran on the local Windows toolchain using the existing lockfiles.

| Check | Actual result |
| --- | --- |
| Fresh pre-change frontend `pnpm.cmd test` | 70 passed |
| Fresh backend baseline `uv run --locked pytest -q` | 276 passed, 1 existing Windows privilege skip |
| Updated frontend `pnpm.cmd test` | 84 passed across 9 files |
| Frontend `pnpm.cmd typecheck` / `pnpm.cmd lint` | Passed |
| Production `NEXT_PUBLIC_API_URL=http://localhost:18309 pnpm.cmd build` | Passed; 19 application routes plus not-found |
| Updated full backend `uv run --locked pytest -q` | 277 passed, 1 skipped |
| Focused audit suite, after adding two real replay cases | 3 passed; one overlaps the full-suite result |
| `uv run --locked ruff check app tests` | Passed |
| `uv run --locked ruff format --check app tests` | Passed |
| `uv run --locked mypy app` | Passed, 93 source files |
| Isolated `alembic current` / `alembic check` | 0004_investigation; no new operations |
| `python -m app.hospital.cli validate CASE-001 --format text` | Valid, 26 assets; date/unknown precision retained |
| OpenAPI comparison | All previous paths and schemas identical |
| Real isolated HTTP investigation/history/events/stream/tools/report capture | Completed; 51 audited calls |
| Offline prototype rendering | 4 HTML pages captured; workbench/report visually reviewed |
| New and existing application browser E2E | Not run: server start rejected by policy |
| Final app screenshots, print/PDF pagination | Not verified |
| `git diff --check` | Passed |

The backend full run collected before the two additional CASE-001 audit cases
were added; those were executed separately. There is one existing Starlette/httpx
deprecation warning. Intermediate failures were fixed: missing fixture metadata,
nullable time typing, test query typing, and an SSE test counting the added summary
read as a stream request. These intermediate runs are not reported as passes.

New backend tests validate run scoping, absent runs, pagination bounds/exhaustion,
argument redaction, failures, durations, repeated attempts, and both real CASE-001
audits against persisted tool event IDs/references. New frontend tests cover
directory/patient selection, task/lead deduplication, workflow outcomes, audit
validation/failures, evidence membership/restoration, comparison refresh, repeated
executions and source-index deduplication. Existing hospital/Unicode/SSE tests pass.

## N. CASE-001 regression

Executed `evaluate_system.py --repeats 1` into fresh output directories, with
`--strategy baseline --reasoning legacy` and
`--strategy adaptive_rules --reasoning structured`. Each runner uses an isolated
migrated database and freezes its report before evaluator access.

| Metric | Legacy | Structured adaptive |
| --- | ---: | ---: |
| Terminal state | completed | completed |
| Verified findings | 13 | 13 |
| Unresolved findings | 0 | 4 |
| Independently valid anchors | 137/137 | 139/139 |
| Strict discovery | 1/1 | 1/1 |
| Deterministic support | 13/13 | 13/13 |
| Accurate timeline sources | 81/81 | 82/82 |
| Tool calls / error events | 51 / 0 | 57 / 0 |

Outputs: `%TEMP%/casetrace-r09/{legacy,structured}-benchmark/`.
Canonical import fingerprint remains
`efd631aa419fa7d93c5abad31dc14217b1ca155100d8ae1b4cc2e032841933d4`.
These match the prior R08 benchmarks; they are deterministic synthetic regression
results, not clinical or live-model quality validation.

## O. Remaining issues

- Browser acceptance is blocked by the server-start approval rejection. The added
  E2E journey, both configured browser suites, application screenshot comparison,
  four viewport checks, final keyboard checks and print inspection remain undone.
- Visual alignment is implemented but cannot yet be called presentation-ready.
- The timeline's mixed date-only/instant ordering policy is unchanged and requires
  a deliberate partial-order presentation improvement. No time of day is displayed
  for date-only records.
- Event-derived task/lead status is the latest recorded activity. Lead completion
  is shown through its follow-up task, not invented as a separate persisted event.
- Tool audit data does not contain complete original inputs/results. The allowlist
  and explicit availability notice intentionally preserve that limitation.
- The raw event history remains fully recovered in memory; only rendering is
  bounded. Extremely large investigations need measured history-window work.
- No archived-source reader, PDF-coordinate citations, production authentication,
  live-provider assessment or clinical expert validation was introduced.

## P. Next milestone readiness

Run the provided workbench journey and existing browser suite against each isolated
legacy/structured API configuration when local server execution is permitted.
Inspect the resulting app/prototype comparisons, all four viewports and report PDF
pages; correct any observed density, focus or overflow issues before demo signoff.
Retain strict discovery and independent source checks. Then measure activity-heavy
rendering, review clinical wording with an expert and perform explicitly labeled
live-provider acceptance separately from deterministic regression.

The code is reviewable; Refactor 09 visual/browser acceptance is not complete.

## File inventory

34 repository files created or modified; no files moved or deleted.

- `apps/api/app/api/routes/investigations.py`
- `apps/api/app/orchestration/queries.py`
- `apps/api/app/schemas/audit.py`
- `apps/api/tests/test_investigation_audit.py`
- `apps/web/app/globals.css`
- `apps/web/app/investigations/[investigationId]/evidence/page.tsx`
- `apps/web/app/investigations/new/page.tsx`
- `apps/web/app/investigations/page.tsx`
- `apps/web/components/layout/workspace-navigation.tsx`
- `apps/web/features/evidence/components/evidence-explorer.tsx`
- `apps/web/features/evidence/components/hospital-source.tsx`
- `apps/web/features/evidence/components/source-panel.tsx`
- `apps/web/features/evidence/hooks/use-evidence-selection.ts`
- `apps/web/features/investigations/components/activity-summary.tsx`
- `apps/web/features/investigations/components/agent-activity.tsx`
- `apps/web/features/investigations/components/clinical-context.tsx`
- `apps/web/features/investigations/components/directory.tsx`
- `apps/web/features/investigations/components/finding-card.tsx`
- `apps/web/features/investigations/components/new-investigation.tsx`
- `apps/web/features/investigations/components/report.tsx`
- `apps/web/features/investigations/components/source-index.tsx`
- `apps/web/features/investigations/components/task-activity.tsx`
- `apps/web/features/investigations/components/tool-inspector.tsx`
- `apps/web/features/investigations/components/workflow.tsx`
- `apps/web/features/investigations/components/workspace.tsx`
- `apps/web/features/timeline/components/investigation-timeline.tsx`
- `apps/web/lib/api/tool-audit.ts`
- `apps/web/tests/e2e/workbench.spec.ts`
- `apps/web/tests/evidence-explorer.test.tsx`
- `apps/web/tests/workbench.test.tsx`
- `apps/web/tests/workspace.test.tsx`
- `docs/frontend-architecture.md`
- `docs/frontend-backend-contract.md`
- `docs/refactoring/13-investigation-workspace-refactor-report.md`
