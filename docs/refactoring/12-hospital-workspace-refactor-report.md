# Refactor 08 - Hospital workspace, case library and original clinical sources

Date: 2026-10-21. Branch: `refator/casetrace-mvp`.
Starting commit: `f7a5299a7211a7a53df2eb544c0f9ae45ee2a893`; initial working tree clean.
Refactor 07 was present. No commit, push, reset, case regeneration, evaluator edit,
asset deletion, migration edit or development database write was performed.

## A. Previous hospital experience

The existing routes were overview, patient directory/chart, investigation workbench
and report. PatientRecord selected generic RecordSectionView cards locally; sections
had no dedicated URLs. RecordCard, DocumentAsset, ImagingAssets, patient search,
source ownership checks, scoped cancellable reads and Unicode-aware evidence
highlighting already worked. Overview checked connectivity and embedded patients,
but had no real case metrics or persisted investigation discovery. The shell
truthfully described case-library availability as deferred.

| Area | Existing foundation | Implemented missing behavior | Validation |
| --- | --- | --- | --- |
| Overview | API connectivity, patient search | Real inventory, featured imported case, persisted recent runs | Component and real-browser metrics |
| Cases | Maintenance discovery only | Neutral paged public catalog and case overview | Readiness/filter/negative API tests, browser |
| Chart | Generic section cards | Shared identity, summary, dedicated navigation | Scope/loading tests, browser refresh |
| Encounters | Scoped lists/details and association APIs | History table and associated-record workspace | Patient/encounter negatives, browser |
| Timeline | Named-time hospital projection | Dedicated filtered clinical chronology | API encounter filter, browser |
| Labs | Observations and numeric series API | Source-linked table, compatible observed-point chart and precise series table | Unit rejection, zero values, browser |
| Medications | Orders/history and source references | Clinical table, recorded-status filter, prescription links | Record-source tests, browser |
| Documents | Text and verified asset route | Filtered library, stable detail URL, contextual viewer | Search/scoping tests, actual PDF browser |
| Imaging | Study/asset/report APIs | Study directory, paged image selection, pan/zoom/original | Selection component tests, real imagery |
| Evidence | SourcePanel and exact offsets | Finding-to-hospital links, persisted anchor context, return navigation | Foreign-run/source negatives, existing Unicode suite, browser |

Historical tests were not assumed to pass: pre-edit Vitest ran 55 tests successfully;
pre-edit backend pytest ran 271 passed / 1 skipped. OpenAPI was saved before edits.
There was no pre-edit screenshot capture of the working application. The supplied
index and patient-chart HTML prototypes were subsequently opened in a real browser.

## B. Implemented hospital architecture

Routes remain thin server compositions:

```text
/ -> Hospital Overview
/cases -> Case Library
/cases/[caseId] -> Case overview + scoped history
/patients -> Searchable imported patient directory
/patients/[patientId] -> Shared ChartLayout + longitudinal overview
  /timeline
  /encounters
  /encounters/[encounterId]
  /labs
  /medications
  /documents
  /documents/[documentId]
  /imaging
  /source?source=...&source_type=...&investigation=...&finding=...
/investigations/[id] and /report -> existing workbench/report
```

Feature hooks own scoped reads through useResource and the centralized transport.
Patient layout shares identity and summary reads across clinical navigation.
ClinicalList loads only the selected paged resource; encounter detail composes
patient+encounter-filtered resources only after validating the encounter owner.
RecordLinks under features/records owns cross-record navigation independently of
patient presentation. Existing generic cards remain useful evidence fallbacks;
the older embedded PatientRecord component is retained for compatibility, while
App Router uses ChartLayout/ChartOverview and dedicated clinical routes.

API adapters add explicit typed encounter, observation, medication, document and
imaging interfaces alongside the generic fallback. Parsers check scope, numeric
values, dates, source IDs, statuses, catalog/history envelopes and laboratory units.
No TanStack Query, alternate event store or competing fetch implementation exists.
The dashboard's patient directory supplies its unfiltered authoritative total to
its parent; it does not issue a duplicate patient-page request for that metric.

## C. Backend API extensions

| Addition | Shape / filters | Compatibility |
| --- | --- | --- |
| GET /api/hospital/v1/cases | Standard hospital collection; limit 1-100, offset, exact case_id/status/modality | New route |
| GET /api/hospital/v1/cases/{case_id} | Standard resource envelope | New route |
| GET /api/investigations | items,total,limit,offset; exact patient_id/case_id/RunStatus | New method on existing POST path |
| Document collection q | Literal case-insensitive title/text substring, combined filters before paging | Optional query addition; non-document collections reject nonempty q |
| Timeline encounter_id | Apply the already declared filter to original encounter associations | Corrects previously ignored filter; unfiltered projection unchanged |

CaseOverview contains case_id, version, patient_id, display_name, status, imported,
dataset_status, counts, modalities and latest_encounter_at. `imported` distinguishes
persisted-patient availability from canonical validation status; a valid canonical
patient identity does not imply that its chart can be opened. The DTO deliberately
contains no case-answer title, diagnosis label, summary from an answer key,
validator diagnostics, manifest paths, hashes or evaluation annotations.

History returns id, patient_id, case_id, objective, status, created_at, nullable
started_at/completed_at/current_stage. It queries committed persisted rows through
InvestigationQueries, with descending creation time and stable ID ties. It neither
schedules work nor alters lifecycle/idempotency behavior. No schema migration.

OpenAPI comparison: 39 -> 41 paths, five new read-model schemas, new GET history,
and optional q in the shared hospital filter declarations. All existing response
schemas, required fields, operation IDs and preexisting parameters compare equal.
Removing only q from changed old operations gives exact operation equality.
The shared filter declaration exposes q on all hospital collections; it is supported
only on documents and rejected elsewhere, rather than silently ignored.
Snapshots/comparison are under `%TEMP%/casetrace-r08/openapi-{before,after}.json`
and `openapi-comparison.json`. Contracts are updated in hospital-api.md and
frontend-backend-contract.md. Original clinical/source DTOs and hashes are unchanged.

## D. Case library

Imported projections come from HospitalRepository/ClinicalRecordService. In local
development/test, a separate maintenance-readiness step uses existing validated
clinical discovery. The read session is released before off-thread file validation
and asset hashing; a test asserts that no transaction remains open at that boundary.
Production lists imported metadata without reading canonical or evaluator files.

Local statuses are imported, available_not_imported, invalid, missing_assets,
source_conflict and not_present. Only actual canonical directories and imported
records appear in the unfiltered list. An exact absent-case request produces a
truthful local not_present result; production unknown cases return 404. Unsafe
identifiers are rejected and canonical directory symlinks are excluded. Missing
maintenance inputs do not erase a persisted imported chart. Source conflicts or
invalid canonical inputs disable library launch while preserving imported browsing.

Cards show real category counts and modalities; case detail adds inventory,
encounter coverage, dataset state and patient association. Exact case-ID and status
filters run on the server. Canonical-only cases have no chart/launch action.
Cases 002-010 were not manufactured or advertised as imported. Public-neutral
canonical display fields are allowlisted; raw validator/evaluator output is not
returned. This is logical runtime omission, not a claim of OS-level sandboxing.

## E. Patient and encounter views

ChartLayout supplies synthetic identity, DOB, recorded sex, case link, encounter
count/latest encounter, investigation launch and persistent clinical navigation.
Overview shows actual counts and small source-grounded collections: encounters,
clinical events, reports, documents, laboratory results and medication records.
Assessments, symptoms and referrals remain available in a separate expandable
section. Missing data remains explicitly absent; no AI clinical summary is generated.

Encounter history displays type, department, clinician, interval and status.
Encounter detail validates the patient owner before loading associated events,
notes, observations, orders, reports, imaging and referrals. Lists use actual
encounter IDs, never title/date similarity joins. Source documents link back to
encounters. The timeline preserves primary timestamp meaning plus named timestamp
maps; category, encounter and inclusive clinical-date filters are functional.
Clinical-date filters explicitly use UTC day boundaries, as shown in the controls.

## F. Laboratory and medication views

Laboratory columns retain numeric/text values, units, recorded reference bounds,
specimen and result timestamps, source report and encounter. Zero is preserved.
Selecting an analyte code fetches its complete backend numeric series, independent
of the current results page. Units must match; inconsistent units fail visibly.
Observed points use actual collection instants; missing collection times remain
in the precise table and are not plotted at invented coordinates. There are no
interpolated observed measurements or automatic unit conversions. The chart and
exact-value table link to original observations. Qualitative results remain in
the record table. No diagnosis/causal or invented abnormality label is generated.

Medication tables preserve separate order/start/end times, date-only precision,
dose/unit, route, frequency, generic name, status, prescriber and source prescription.
Only documented API statuses are offered. Separate contradictory source entries
remain separate. No order is presented as proof of administration/adherence and
no temporal medication-lab association is called causal.

## G. Multimodal document experience

The document library supports backend text/title search, exact document type,
encounter and clinical-date bounds with pagination. Stable patient-scoped detail
URLs survive refresh. Desktop layout shows encounter documents, original artifact
and separately labeled structured text, then metadata/source relationships.
Context/metadata panels collapse into native keyboard-operable details on narrower
screens; original text remains readable. The viewer never reconstructs missing
artifacts or substitutes another patient's document. MIME mismatch, checksum/
retrieval failure, missing originals and unsupported preview states are visible.
HTML originals remain download-only. Assets are fetched only when explicitly opened.

Original PDFs use **pdfjs-dist 6.4.299**, added because native embedding cannot
provide consistent application-controlled page counts/navigation/zoom. The approach
uses [PDF.js rendering APIs](https://mozilla.github.io/pdf.js/examples/).
The renderer is dynamically imported after original-open. Prebuild/predev copies
the matching locked worker to public/pdf.worker.min.mjs; generated bytes are ignored
by Git and lint. No remote CDN or alternate asset endpoint is used. The dedicated
PDF chunk is approximately 456 KB and worker approximately 1.26 MB before compression;
these are lazy resources, not claimed as initial-page payload. No before/after
full-bundle measurement was captured.

The viewer decodes actual page count and provides previous/next, bounded page
input, 75-200% zoom, fit to width, open original, download, busy/error states and
cancellation/cleanup. Canvas content is accompanied by separately labeled readable
structured text. Native PDF actions/annotations are not used to produce findings.
CASE-001's original PDFs are single-page; a separate two-page administrative viewer
control is provisioned through ordinary validation/import in isolated test storage.
Real browser testing exercises both pages and zoom on its actual registered bytes.
The control has no clinical assertions and never changes CASE-001.

## H. Imaging experience

Imaging tables retain modality, body region, performed/reported times, status,
report and encounter references. Each study loads registered metadata with paging;
previous/next image selection resets the previous asset viewer. Only the selected
opened asset obtains a temporary object URL. Zoom, scroll/pointer pan, full-size
original and download are available. Recorded report text stays in its original
document, separate from the image. Images are labeled illustrative synthetic
imagery, not diagnostic DICOM. No frontend pixel interpretation or invented
radiology finding exists.

## I. Evidence navigation

Hospital and investigation views use the same SourceRef type/id, original DTOs and
existing patient-scoped resolver. Finding links include only patient/source/run/
finding identifiers. The hospital view retrieves the persisted run/finding, checks
patient ownership and actual anchor membership, then passes anchors to the existing
SourcePanel/SourceHighlight. A foreign run/source fails visibly before rendering
evidence. Report return links retain source selection; refresh reconstructs anchor
context from persisted state. No quote, medical text or private prompt enters URLs.

Python code-point offsets continue using the original Unicode-aware exact-span
checks. Field/quote mismatch retains existing unavailable/changed-source notices.
Text offsets are never invented PDF pages/coordinates. Unsupported precise location
falls back to the original field/excerpt, explicitly distinguished from precise PDF
highlighting. Current-source/version caveats remain visible; archived versions are
not claimed. REST and SSE investigation ownership/reconnection remain unchanged.

## J. Design fidelity

The supplied index and patient-chart HTML were opened in headless Edge and compared
with screenshots. The hospital implementation follows their dark navy sidebar,
neutral work surface, restrained teal labels, blue actions, bordered metric cards,
patient identity/navigation, clinical tables and contextual viewer hierarchy.
Prototype patient names, fake statistics, difficulty labels, mystery titles and
sample activities were not copied. The workbench design remains Refactor 09 scope.
This is substantial layout/design alignment, not a pixel-identical reproduction.

Screenshot roots (ignored local test outputs):
- apps/web/test-results/r08-final-legacy/
- apps/web/test-results/r08-final-structured/
- apps/web/test-results/r08-prototype-overview.png and r08-prototype-patient.png

The hospital journey exports hospital-overview.png, case-overview.png,
patient-chart.png, encounter-detail.png, original-pdf.png, laboratory-trend.png,
medications.png, imaging-viewer.png, source-anchor.png and mobile variants.
The two-page control exports two-page-original-pdf.png. Existing investigation
journeys export comparisons, reports and print PDFs. Screenshots were visually
inspected; source data remains synthetic. Earlier screenshots reflect intermediate
states; final output directories take precedence.

## K. Accessibility and responsiveness

Browser overflow checks cover 1440, 1024, 768 and 390 widths on cases, labs,
document detail and imaging. The established suite also exercises keyboard
skip-to-content, focus, navigation expansion and mobile navigation. Native controls,
semantic table headers, labeled inputs, focusable overflow regions, text statuses,
collapsible viewer metadata and reduced-motion styles remain available. Busy/error
states are announced; source identity is not communicated solely by color.

Wide clinical tables scroll within their own regions; phones do not compress source
text into unreadable columns. PDF/image reading regions scroll when zoomed.
These checks do not constitute a full screen-reader, WCAG or clinical usability audit.

## L. Executed validation

Final validation results are recorded below; intermediate failures are not counted
as passes. Final visual review also corrected case-area breadcrumbs and backward image pagination.
Early issues included a control-modality test expectation missing OTHER,
reusing one mocked Response body for multiple requests, a browser navigation timing
assumption, exact select-label matching, generated-worker lint inclusion and a
nullable max() type annotation. Each was corrected and the affected checks rerun.
Encoding artifacts introduced by a PowerShell pipeline were corrected in UI labels.

| Check | Result |
| --- | --- |
| Frontend pnpm.cmd typecheck / lint | Pass |
| Frontend pnpm.cmd test | 70 passed, 7 files |
| Frontend pnpm.cmd build | Pass, 17 page patterns including not-found |
| Backend Ruff / formatting / mypy | Pass |
| Backend full pytest | 276 passed, 1 skipped (existing Windows symlink privilege), 1 existing deprecation warning |
| Focused workspace + clinical-data tests | 33 passed |
| Alembic current / check, isolated migrated DB | 0004_investigation head; no new upgrade operations |
| Normal CASE-001 validation | Valid, 26 assets; original date-only/unknown information retained |
| Legacy real-browser suite | 5 passed |
| Structured adaptive real-browser suite | 5 passed |
| OpenAPI compatibility comparison | Additive; existing response schemas exactly equal |
| git diff --check | Pass |

New backend coverage includes canonical-only/imported/invalid/missing-assets/
conflicting/absent cases, public allowlist, real counts, pagination/filtering,
production filesystem exclusion, transaction release, persisted run discovery,
status validation, clinical document search, timeline encounter scope and missing
resources. Existing suites retain tool permissions, immutable ingestion, source
integrity, assets, migrations, evidence and investigation lifecycle coverage.

New frontend tests check real data-driven metrics, readiness/action gating,
case filters/detail, shared patient navigation, record filtering and zero values,
source links, wrong encounter/run/finding rejection, original/text distinction,
PDF transitions/zoom, incompatible units and image identity changes. Existing
Unicode, changed-span, SSE reconnection/deduplication and API error tests remain.

Browser commands used WEB_TEST_URL=http://localhost:13308,
API_TEST_URL=http://localhost:18308, an explicit installed Edge executable,
HOSPITAL_CONTROL_SMOKE=1 and PDF_CONTROL_SMOKE=1. Structured runs additionally
use REASONING_TEST=structured and a rules-provider API configured with
INVESTIGATION_STRATEGY=adaptive_rules / INVESTIGATION_REASONING=structured.
No LLM-backed clinical-quality claim is inferred from deterministic tests.

Integration storage is under `%TEMP%/casetrace-r08`: separate browser.db and
structured.db, copied synthetic assets, original control and administrative PDF
control. Legacy and structured offline evaluation use their own temporary migrated
databases. The active development runtime database was neither seeded nor reset.
Task-owned API/web servers are stopped after validation. The pre-existing
next-start/standalone warning remains; Docker and standalone deployment packaging
were not independently exercised.

Performance observations are local single runs, not load benchmarks. The final legacy journey measured 905 ms to overview inventory and 953 ms to actual
PDF-ready state; structured measured 495 ms and 951 ms respectively. Each hospital
journey records those observations in performance.json. Targeted
patient/clinical queries preserve cancellation and paging. No original PDF or image
is preloaded from a record listing. Catalog readiness currently validates local
canonical inputs per request; larger archives need a separate measured optimization.

## M. CASE-001 regression

| Metric | Legacy baseline | Structured adaptive |
| --- | ---: | ---: |
| Terminal state | completed | completed |
| Verified findings | 13 | 13 |
| Unresolved findings | 0 | 4 |
| Independently valid anchors | 137/137 | 139/139 |
| Strict discovery | 1/1 | 1/1 |
| Deterministic finding support | 13/13 | 13/13 |
| Accurate timeline sources | 81/81 | 82/82 |
| Tool calls / error events | 51 / 0 | 57 / 0 |

These match Refactor 07's reported benchmarks, measured again using evaluate_system.py
--repeats 1 with --strategy baseline --reasoning legacy and --strategy adaptive_rules
--reasoning structured. Reports are under `%TEMP%/casetrace-r08/{legacy,structured}-benchmark`.
Clinical support/semantic hypothesis quality remains pending expert review.
The clinical import fingerprint remains
`efd631aa419fa7d93c5abad31dc14217b1ca155100d8ae1b4cc2e032841933d4`.
Git confirms no changes under canonical data/assets, evaluator files, reasoning,
agent/tool logic, evidence verifier, ORM models or Alembic revisions.

## N. Remaining limitations

- Timeline primary projection remains instant-only. Date-only and unknown records
  stay accessible in their original sections; no approximate instant is fabricated.
- There is no canonical PDF-page/region anchor contract or archived-version reader.
  Structured text highlights do not claim precise PDF highlighting.
- Canvas PDF viewing has no selectable PDF text layer; the separate structured text
  remains readable. Complex multilingual PDF fonts/forms/annotations were not audited.
- Case overview does not invent difficulty, diagnoses or an AI history narrative.
  It reports neutral inventories. Modality filtering is available in the API;
  the library UI exposes case identifier and availability filters.
- Laboratory charts are numeric/code-based and refuse mixed units; no clinical
  abnormality flag is invented when the DTO has no recorded flag. Qualitative
  measurements remain in the table. No conversion, causality or clinical diagnosis.
- Date controls apply inclusive UTC day bounds, not assumed local clinical dates.
- Read-model totals are independent REST reads, not a transactionally atomic
  cross-domain dashboard snapshot. Catalog paging follows neutral projection and
  local validation; large-archive optimization is deferred.
- No production authentication, OS sandbox, DICOM PACS, new agents, new clinical
  algorithms, new cases 002-010 or clinical validation was introduced.

## O. Refactor 09 readiness

1. Reuse existing persisted history for a dedicated /investigations inventory;
   add management behavior only through an explicitly approved lifecycle contract.
2. Build /investigations/[id]/evidence using SourceSelection, RecordLinks and
   persisted anchor retrieval, preserving run/patient/field membership and Unicode
   offsets. Do not create a second citation identity or event store.
3. Keep useInvestigation as the single REST/SSE owner; retain reconciliation,
   ordered activity, unknown future event support and terminal-state behavior.
4. Redesign workbench/activity/evidence/report hierarchy against the supplied
   prototypes without altering verified findings, strengths or backend execution.
5. Treat PDF-page coordinates, archived source retrieval and richer semantic
   assessment as separate versioned contracts; do not infer them from text offsets.
6. Retain both rules-mode browser journeys and frozen CASE-001 independent scores;
   perform separate live-provider, clinical/expert and full assistive-technology
   validation before making broader quality claims.

## File inventory

41 files created and 34 modified; no files moved or deleted. Generated workers, test databases, screenshots and
benchmark exports remain ignored. The following repository files were created or
modified in this milestone.

### Created

- `apps/api/app/hospital/catalog.py`
- `apps/api/tests/test_hospital_workspace.py`
- `apps/web/app/cases/[caseId]/page.tsx`
- `apps/web/app/cases/page.tsx`
- `apps/web/app/patients/[patientId]/documents/[documentId]/page.tsx`
- `apps/web/app/patients/[patientId]/documents/page.tsx`
- `apps/web/app/patients/[patientId]/encounters/[encounterId]/page.tsx`
- `apps/web/app/patients/[patientId]/encounters/page.tsx`
- `apps/web/app/patients/[patientId]/imaging/page.tsx`
- `apps/web/app/patients/[patientId]/labs/page.tsx`
- `apps/web/app/patients/[patientId]/layout.tsx`
- `apps/web/app/patients/[patientId]/medications/page.tsx`
- `apps/web/app/patients/[patientId]/source/page.tsx`
- `apps/web/app/patients/[patientId]/timeline/page.tsx`
- `apps/web/features/cases/components/case-library.tsx`
- `apps/web/features/cases/hooks/use-cases.ts`
- `apps/web/features/dashboard/hooks/use-overview.ts`
- `apps/web/features/documents/components/document-detail.tsx`
- `apps/web/features/documents/components/image-preview.tsx`
- `apps/web/features/documents/components/pdf-preview.tsx`
- `apps/web/features/documents/hooks/use-viewer-panels.ts`
- `apps/web/features/encounters/components/encounter-detail.tsx`
- `apps/web/features/encounters/hooks/use-encounter.ts`
- `apps/web/features/evidence/components/hospital-source.tsx`
- `apps/web/features/evidence/hooks/use-hospital-anchor.ts`
- `apps/web/features/imaging/hooks/use-imaging-assets.ts`
- `apps/web/features/investigations/components/history.tsx`
- `apps/web/features/investigations/hooks/use-history.ts`
- `apps/web/features/laboratory/components/lab-trend.tsx`
- `apps/web/features/patients/components/chart-layout.tsx`
- `apps/web/features/patients/components/chart-overview.tsx`
- `apps/web/features/patients/components/clinical-list.tsx`
- `apps/web/features/patients/hooks/use-chart.ts`
- `apps/web/features/records/components/record-links.tsx`
- `apps/web/features/records/navigation.ts`
- `apps/web/lib/api/catalog.ts`
- `apps/web/scripts/pdf-worker.mjs`
- `apps/web/tests/e2e/hospital-workspace.spec.ts`
- `apps/web/tests/hospital-workspace.test.tsx`
- `docs/refactoring/12-hospital-workspace-refactor-report.md`
- `scripts/hospital_workspace_smoke_seed.py`

### Modified

- `.gitignore`
- `.skill/frontend-development/component-patterns.md`
- `.skill/hospital-system/SKILL.md`
- `apps/api/app/api/routes/hospital.py`
- `apps/api/app/api/routes/investigations.py`
- `apps/api/app/hospital/discovery.py`
- `apps/api/app/hospital/repository.py`
- `apps/api/app/hospital/service.py`
- `apps/api/app/orchestration/queries.py`
- `apps/api/app/schemas/investigation.py`
- `apps/web/app/globals.css`
- `apps/web/app/patients/[patientId]/page.tsx`
- `apps/web/components/layout/workspace-navigation.tsx`
- `apps/web/eslint.config.mjs`
- `apps/web/features/dashboard/components/overview.tsx`
- `apps/web/features/documents/components/document-asset.tsx`
- `apps/web/features/evidence/components/source-panel.tsx`
- `apps/web/features/imaging/components/imaging-assets.tsx`
- `apps/web/features/investigations/components/finding-card.tsx`
- `apps/web/features/investigations/components/report.tsx`
- `apps/web/features/investigations/components/workspace.tsx`
- `apps/web/features/patients/components/patient-directory.tsx`
- `apps/web/lib/api/hospital.ts`
- `apps/web/package.json`
- `apps/web/pnpm-lock.yaml`
- `apps/web/tests/e2e/foundation.spec.ts`
- `apps/web/tests/e2e/hospital.spec.ts`
- `apps/web/tests/e2e/investigation.spec.ts`
- `apps/web/tests/foundation.test.tsx`
- `apps/web/types/hospital.ts`
- `docs/frontend-architecture.md`
- `docs/frontend-backend-contract.md`
- `docs/hospital-api.md`
- `docs/local-development.md`
