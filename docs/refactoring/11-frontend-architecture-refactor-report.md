# Refactor 07 - Frontend architecture and application foundation

Date: 2026-10-21. Branch: `refator/casetrace-mvp`.
Starting commit: `a13f825006221f89b0cfceddcbb79f1c12529993`.
Initial working tree was clean. No commit or push was made.

## A. Previous frontend architecture

The application already had five working page patterns: overview, patient list,
patient chart, investigation workspace and report. All used real API responses.
Routes were already short except the dashboard composition. Domain components
lived under `components/`, while all hooks shared one folder. The investigation
presentation module owned status/time formatting used by timeline and findings.
The evidence selection hook imported its model from the source renderer, which
also owned grouping, source-type mapping, retrieval and rendering. This made
navigation changes require presentation imports and made independent tests harder.
The report mixed persisted snapshot/history retrieval with report composition.

The API transport already normalized JSON errors and cancelled timed requests,
but asset and SSE requests separately constructed base URLs and fetch options.
REST and SSE validated events independently. SSE CRLF normalization was performed
per chunk and could miss a CRLF separator split between chunks. Reconnects retried
404/configuration/invalid-response failures forever. Switching investigation IDs
could briefly expose old snapshot/findings. Activity rendering scanned all events
for every row. Optional R06 offsets/hypothesis uncertainty existed on the wire but
were absent from TypeScript, validation and presentation.

The shell always marked Overview active, lacked a responsive navigation control,
and had no page-context breadcrumb foundation. Existing focus/print/reduced-motion
styles were retained. The directory rendered a second h1 when embedded in Overview.
Existing generic record cards remain useful fallbacks, not inherently an error
because of their size. Specialized clinical screens remain deferred.

## B. Target and implemented architecture

`app` -> feature composition -> feature hooks -> typed domain API adapters ->
shared transport/runtime validation -> FastAPI. Shared components have no feature
imports. Existing server pages remain Server Components; interactive views remain
Client Components. The shell accepts server-composed children and imports only
small client navigation controls. No global client-side application conversion.

| Owner | Implemented responsibility |
| --- | --- |
| dashboard | Overview composition and connectivity entry point |
| patients | Search/directory, patient identity, chart sections and paging |
| records | Shared original clinical record card; no patient-chart dependency |
| investigations | Creation/idempotency, workspace, findings, activity, hypotheses, report and lifecycle hooks |
| evidence | Selection/grouping, URL state, scoped source retrieval, source inspection and exact span highlighting |
| timeline | Existing temporal display, ordering, filtering and source selection |
| documents | Existing original asset preview/download and URL cleanup |
| imaging | Existing study asset listing and synthetic-image presentation |
| components/layout | Shell, responsive navigation and workspace breadcrumb foundation |
| components/shared | Environment label, status/time/panel and loading/empty/error patterns |
| lib | Typed API transport/adapters, scoped reads, validation, formatting and single SSE reader |
| types | Single public hospital/investigation/API contract source |

This request explicitly supersedes R01's advice against feature-tree migration.
Only existing functionality moved; no empty features or placeholder routes exist.
API adapters deliberately remain together in `lib/api` because they represent the
two existing contract namespaces and are shared across features. No barrel layer
or competing DTO model was introduced.

## C. File migration map

All paths below are relative to `apps/web`.

| Previous path | Final path / split |
| --- | --- |
| app/page.tsx content | features/dashboard/components/overview.tsx; route composes it |
| components/patients/{patient-directory,patient-record,record-section}.tsx | features/patients/components/ with the same filenames |
| components/patients/record-card.tsx | features/records/components/record-card.tsx |
| components/investigations/{workspace,start-investigation,report,agent-activity,hypotheses}.tsx | features/investigations/components/ with the same filenames |
| components/findings/finding-card.tsx | features/investigations/components/finding-card.tsx |
| components/investigations/presentation.tsx | components/shared/presentation.tsx; text formatting in lib/formatters/text.ts |
| components/evidence/source-panel.tsx | features/evidence/components/source-panel.tsx; navigation model/grouping in features/evidence/navigation.ts; retrieval in hooks/use-source.ts; span presentation in components/source-highlight.tsx |
| components/timeline/investigation-timeline.tsx | features/timeline/components/investigation-timeline.tsx |
| components/documents/document-asset.tsx | features/documents/components/document-asset.tsx |
| components/documents/imaging-assets.tsx | features/imaging/components/imaging-assets.tsx |
| hooks/use-evidence-selection.ts | features/evidence/hooks/use-evidence-selection.ts |
| hooks/use-investigation.ts | features/investigations/hooks/use-investigation.ts |
| hooks/use-hospital-data.ts | lib/api/use-resource.ts; renamed useResource because reports/evidence also consume it |
| report retrieval inside report.tsx | features/investigations/hooks/use-report.ts |
| API investigation parser functions | lib/validation/investigation.ts; timestamp checks in lib/validation/time.ts |

Old implementations are removed only after migrating their behavior and imports.
No compatibility re-export forest remains. Tests retain their organization and
assertions; imports follow migrated modules. Retained/modified infrastructure:
`app/globals.css`, existing page files, `components/layout/app-shell.tsx`,
`lib/api/{client,hospital,investigations}.ts`, `lib/sse/investigation-stream.ts`,
`types/investigation.ts`. New infrastructure: `workspace-navigation.tsx`, shared
`environment-banner.tsx` and `resource-state.tsx`. New tests:
`architecture.test.ts`, `modernization.test.tsx`; browser foundation coverage
expanded. README, frontend architecture and the two relevant local skill guides
are updated; historical reports are retained.

## D. Shared application shell

Real links remain Overview and Patient records. Hospital records and investigation
entry paths are explained truthfully; case library/system activity are explicitly
unavailable, without inert links, fake counts or nonfunctional search.
Navigation tracks the current pathname, marks the active page, and provides
workspace/report context. Existing detailed patient/run breadcrumbs remain in
feature views. The sidebar can collapse on desktop; tablet/mobile start collapsed.
One keyboard-operable control exposes expanded state and the controlled nav ID.
Viewport subscription cleans up and keeps displayed state and aria-expanded aligned.
Skip-to-content targets focusable main; focus styling covers links, buttons,
inputs, selects and summaries. Existing reduced-motion and report print behavior
remain. Environment text includes both SYNTHETIC DATA - DEMONSTRATION ENVIRONMENT
(rendered with an em dash) and SYNTHETIC DEMO - NOT FOR CLINICAL USE.
No prototype clinical values were copied.

## E. API architecture

`fetchApi` centralizes base URL, no-store policy, cancellation and ordinary 8-second
timeouts for JSON/assets; SSE uses the same transport with its long-lived signal.
`request` owns JSON parsing, shared error envelopes, headers and parser failures.
Cancellation and timeout are distinguished from connectivity errors. Asset MIME
allowlists, download-only HTML, blob revocation and synthetic labels are retained.
Hospital adapters verify patient/source ownership; investigation adapters check
returned run/finding identity. Validation preserves offsets and optional hypothesis
alternatives/limitations, checks paired offset bounds and explicit statuses, and
validates instant timezone/date literals without rewriting them. REST/SSE use the
same event parser, including run scope and integer cursor checks. Unknown future
event names remain accepted. This is incremental runtime validation, not a new
schema-generator dependency or a claim of exhaustive typed hospital DTO coverage.

## F. Server-state management

Decision: retain the existing scoped, cancellable read mechanism, renamed useResource.
No TanStack Query dependency, persistent cache or second store was added. The
current chart mounts one selected record section; source panels own their scoped
reads; report reads are composed in useReport. Explicit retries refetch rather than
invalidate a cache. There is no cross-route deduplication/caching guarantee.
A query cache is a later option once specialized clinical views share queries;
its invalidation, identity scope and lifecycle need a separate coherent adoption.

useInvestigation remains the single REST/activity integration owner. REST provides
snapshot/findings, history is backfilled before SSE, events merge by ID in sequence
order, and stream activity schedules REST refresh. Persisted state stays visible on
transient disconnect. Terminal REST snapshots stop streams; terminal history is
restored. Automatic transient retry backs off from 2.5 seconds to a 30-second cap,
with at most five scheduled reconnects. Permanent 4xx (except 408/429), validation,
configuration and scope errors stop automatic reconnect; explicit refresh remains.
Cleanup aborts requests and clears refresh/reconnect timers. Returned snapshots,
findings and events are scoped to the requested run. No progress is fabricated.

## G. Evidence navigation

SourceSelection, source-type mapping and anchor grouping live in evidence/navigation.
The evidence hook retains existing `source`/`source_type` query keys, opaque IDs,
encoded URLs and identifier-only privacy. Selection replaces URL state while
preserving Next history metadata; popstate restores source selection. Comparisons
retain existing grouping of decisive sources with all their cited fields.
useSource enforces patient scope through the API adapters and existing asset
resolution path. Unavailable/unsupported sources have visible retry/error states.

Optional R06 offsets are Unicode code-point indices, as produced by Python.
SourceHighlight uses Array.from, checks exact quote equality against the current
field, and marks only that span. Missing offsets fall back to the original field.
Changed/malformed spans show an unavailable message rather than guessing locations.
Version/hash/current-field mismatch notices remain; matching text is not a claim
that the current DTO fingerprint was reverified. No PDF page/coordinate is inferred.
Hypothesis alternatives and limitations render only when supplied.

## H. Executed validation

Baseline: `pnpm.cmd test` 33 passed; typecheck, lint and production build passed.
Initial `pnpm` PowerShell wrapper was blocked by local script execution policy;
installed `pnpm.cmd` worked without changing policy. An accidental root-directory
check invocation had no manifest; checks were rerun from apps/web. First intermediate
refactor run exposed lint warnings and one environment-label encoding regression;
these were corrected and rerun. No failed intermediate check is counted as a pass.

Final validation (apps/web unless stated otherwise):

| Command | Result |
| --- | --- |
| `pnpm.cmd typecheck` | Pass |
| `pnpm.cmd lint` | Pass, zero warnings |
| `pnpm.cmd test` | 55 passed across 6 files, including 2 architectural boundary/DAG checks |
| `NEXT_PUBLIC_API_URL=http://localhost:18307 pnpm.cmd build` | Pass; existing five page patterns unchanged |
| `WEB_TEST_URL=http://localhost:13307 API_TEST_URL=http://localhost:18307 HOSPITAL_CONTROL_SMOKE=1 REASONING_TEST=legacy pnpm.cmd exec playwright test --workers=1 --output=test-results/r07-legacy` | 3 passed, 19.8 seconds; deterministic legacy rules |
| Same browser command with `REASONING_TEST=structured`, structured API and `--output=test-results/r07-structured` | 3 passed, 24.9 seconds; structured adaptive rules; confirms supplied offsets exist |
| `git diff --check` | Pass |
| Real health/patient/encounter/observation/document API snapshots | Captured successfully |
| OpenAPI snapshot | 39 paths; identical across legacy and structured configurations; API source unchanged from starting commit |

Frontend tests cover old assertions plus shared states/navigation/environment,
Unicode spans and field fallback, malformed offsets and optional hypothesis fields,
invalid/timezone-free dates, shared REST/SSE event scope validation, split CRLF,
invalid stream JSON, permanent failure stop, transient retry bounds, unmount cleanup,
scoped read cancellation, changed run identity and encoded source URL/popstate.
Browser checks cover keyboard skip-to-main, mobile menu activation/navigation,
1440/1024/768/390 width overflow, source assets, live backend investigation,
comparison, timeline, activity, refresh, evidence deep links, report and print PDF.
Desktop/mobile overview, hospital, comparison and report screenshots were inspected.
These checks are not a full assistive-technology audit.

One intermediate keyboard E2E assertion held a locator named Expand navigation
after the button correctly changed to Collapse navigation. The assertion was fixed
and the complete suite rerun. Initial browser runs inherited the configured model
provider and truthfully rendered a provider-failure limitation. Final deterministic
comparisons explicitly set `LLM_PROVIDER=rules`; no provider settings file was edited.
The existing next-start/standalone warning appeared; actual browser serving passed,
but standalone packaging/deployment was not separately validated.

Backend `uv run --locked pytest -q`: 271 passed, 1 skipped, 1 existing Starlette/httpx
deprecation warning, 259.95 seconds. No backend source was changed.

Initial legacy browser run: 2 passed, 1 control-fixture test skipped because its
provisioning flag was absent; the fixture was then provisioned for complete reruns.
CASE-001 start, comparison, timeline source, real activity, refresh, report, evidence,
mobile and print passed. There was no pre-edit browser screenshot capture; screenshots
represent the migrated application. Production build retains the same route table.

Integration runs use separate migrated `legacy.db` and `structured.db` under
`%TEMP%/casetrace-r07-validation`, with copied synthetic assets and the existing
pipeline control fixture. They never use the development runtime database.
Real API/OpenAPI responses are saved in that directory. Browser screenshots/print
artifacts are Playwright outputs. API/data/evaluator trees remain unchanged from HEAD.

## I. Compatibility

Existing URLs `/`, `/patients`, `/patients/[patientId]`,
`/investigations/[investigationId]`, and its `/report` remain intact. IDs are still
opaque/encoded; query source links and report links are preserved. Hospital requests
remain `/api/hospital/v1`; investigations remain `/api/investigations`. No backend
endpoint, request schema, clinical fixture, ground truth, migration, reasoning rule
or evaluator criterion changed. Runtime source/anchor values are never invented.
Independent system replays were also executed from apps/api:

- `uv run --locked python ../../scripts/evaluate_system.py --output C:/Users/hp/AppData/Local/Temp/casetrace-r07-validation/legacy-benchmark --repeats 1 --strategy baseline --reasoning legacy`
- The same command with `structured-benchmark --strategy adaptive_rules --reasoning structured`.

| Mode | Exact discovery | Verified | Unresolved | Independently valid anchors | Tool calls | Error events |
| --- | --- | --- | --- | --- | --- | --- |
| Legacy baseline | 1/1 | 13 | 0 | 137/137 | 51 | 0 |
| Structured adaptive | 1/1 | 13 | 4 | 139/139 | 57 | 0 |

These match R06's measured outcomes. Deterministic support is 13/13 in both;
timeline source accuracy is 81/81 and 82/82 respectively. Clinical support and
hypothesis quality still require expert review; this is development evaluation.
The offline runner uses isolated temporary databases and only scores exported
results after finalization. It does not expose evaluator inputs to the frontend.
Browser success alone is not used as an exact-anchor evaluation score.

## J. Remaining frontend specification gaps

The complete prototype visual design, specialty hospital tables/charts, full PDF
page/coordinate navigation, imaging pan/zoom, encounter detail and patient subroutes
remain Refactor 08 work. Full investigation console redesign, evidence-explorer
route, investigation inventory, source-index polish and richer report experience
remain Refactor 09. No authentication or global search workflow was introduced.
Generic ClinicalRecord remains the fallback for hospital sections. There is no
cross-route server-data cache or virtualization. The activity start-event lookup
is now indexed once per render instead of a scan for every row; no measured
bundle/latency improvement or comprehensive performance benchmark is claimed.

## K. Exact Refactor 08 prerequisites

| Deferred route/view | Owner | Contract / prerequisite | Milestone |
| --- | --- | --- | --- |
| /cases and /cases/[caseId] | cases (create when implemented) | Add approved neutral case metadata/list/readiness API; no evaluator labels; no existing public case directory endpoint | 08 |
| Patient encounter detail | patients / encounters | Use existing patient encounter list and scoped encounter detail; define linked document/observation composition | 08 |
| Patient timeline/labs/medications subroutes | timeline / labs / medications | Existing scoped hospital lists/timeline; introduce typed parsers/view models preserving units and time precision before specialized views | 08 |
| Patient documents and /documents/[documentId] | documents | Existing document detail/asset contracts; supply patient ownership context, metadata and original MIME handling | 08 |
| Patient imaging | imaging | Existing study list/detail/assets/content and ownership resolution; no invented image coordinates | 08 |
| /investigations inventory | investigations | Requires approved paged investigation-list contract; patient chart initiation remains supported | 09 |
| /investigations/[id]/evidence | evidence | Existing run-scoped anchors and hospital resolution; reuse SourceSelection and source query keys | 09 |
| Expanded report/workbench | investigations | Existing persisted snapshots/reports/events; preserve new optional fields and single SSE owner | 09 |

Reuse the shared shell, scoped reads, navigation model and contract tests. Add only
real supported routes, then link them from navigation. Any query library adoption
must replace an owning lifecycle rather than mirror server data in another store.

Task-owned API/web servers were stopped after validation. Temporary databases,
OpenAPI/API snapshots and replay summaries remain outside version control; browser
artifacts remain under the ignored `apps/web/test-results/r07-{legacy,structured}`.
