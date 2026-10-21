# Refactor 04 — Clinical tools and targeted retrieval

Starting branch: `refator/casetrace-mvp`. Commit:
`e7b2a569886fd28348077fd48439cd3cb26da275`. Initial tree clean.
No commit/push, canonical data edits, evaluation edits, or runtime database reset.

## A. Original tool inventory and implementation matrix

All tools originally used ToolInput and ToolResult. Detail calls used record_id;
comparison required record_id/other_id despite the documented analyte form.
Every row requires direct valid, invalid, missing/empty, scoped and provenance tests.

| Tool | Original status | Intended inputs / missing behavior | Scope |
| --- | --- | --- | --- |
| get_patient | Fully compliant basic lookup | patient_id | patient.read |
| search_patient | Incorrectly implemented | selected patient + query; previously ignored query | patient.read |
| get_encounters | Partial | period, department, encounter_type, pagination | encounter.read |
| get_encounter | Partial | exact encounter_id alias missing | encounter.read |
| search_clinical_notes | Partial | query, type, encounter, department, period; filters missing | document.read |
| get_clinical_note | Partial | exact document_id alias missing | document.read |
| get_lab_results | Partial | name/code, status, encounter, period | observation.read |
| get_lab_result | Partial | exact observation_id alias missing | observation.read |
| compare_lab_results | Incorrectly implemented | pair or analyte; numeric analysis and code checks missing | observation.read |
| get_medication_history | Partial | drug, status, encounter, period | medication.read |
| get_medication | Partial | exact medication_id alias missing | medication.read |
| search_documents | Partial | query, type, encounter, department, period; snippet provenance ambiguous | document.read |
| get_document | Partial | exact document_id alias missing | document.read |
| get_diagnostic_reports | Partial | type, study, encounter, period | diagnostic_report.read |
| get_diagnostic_report | Partial | exact report_id alias missing | diagnostic_report.read |
| get_imaging_studies | Partial | modality, body region, encounter, period; exact study selection | imaging_study.read |
| get_imaging_asset_metadata | Partial | exact imaging_asset_id alias missing | imaging_asset.read |
| get_imaging_report | Partial | exact imaging_study_id alias missing; verify association | document.read |
| get_referrals | Partial | status, receiving department, encounter, period | referral.read |
| build_patient_timeline | Partial | include, period, encounter, pagination; originally events only | clinical_event.read |

All twenty names existed; none was an absent registration or empty stub. Basic
resolution, role allowlists, audit, result size, timeouts and budgets already
worked. Missing optional fields were rejected, rather than supported; search
discarded the full DTO while retaining its hash without marking the projection.

## B. Tool architecture

Before: clinical.py handled every operation, registry published one generic input
model and descriptions, and list retrieval resolved every projected DTO again.
After: clinical.py retains the source facade, name/operation table, list/detail
handlers and compatibility dispatch; inputs.py owns argument contracts;
documents.py, laboratory.py and timeline.py own substantive search/comparison/
aggregation behavior; results.py owns envelopes and source/result validation.
Registry remains the only production execution policy/audit boundary. It publishes
each input schema, explicit description, result schema, role scope and authorized
timeline categories. There are no placeholder ownership modules.

Dependencies remain tools -> ClinicalSource -> SimulatedHospitalAdapter ->
hospital service/repository. Tools and agents have no SQLAlchemy/session/raw-case
dependency. Specialist reasoning and call sites did not change. No new dependency,
public endpoint, physical table, migration, provider or cache was introduced.

## C. Typed contracts and complete final matrix

Shared inputs: registry supplies the selected patient when omitted. P means
inclusive aware start_at/end_at, limit 1–100 (default 20), offset 0–10000. E means
optional exact encounter association. D means optional returned-source version/hash
preconditions. All detail selectors retain record_id and accept the listed alias;
both together fail. Models reject unknown arguments, invalid identifiers, naive or
inverted time bounds, invalid enums and incompatible selection forms.

Output R is the unchanged ToolResult envelope with original typed DTO data,
source identity/version/hash and retrieval time. S is R with marked search-hit
data and a separate representation hash. C adds structured numeric analysis to R;
T adds named-time/precision projection to R. No returned source ID is invented.

The final status **implemented/tested** means the executable contract in
agent-tools.md, not every future product aspiration in illustrative examples.
Compatibility limits are explicit below and in section I.

| Tool | Input model; selector and optional filters | Output | Final status / direct coverage |
| --- | --- | --- | --- |
| get_patient | PatientInput; selected patient_id | R patient | Implemented/tested |
| search_patient | PatientSearchInput; query | R patient | Implemented/tested; selected-patient search only |
| get_encounters | EncounterInput; P, department, encounter_type, status | R encounters | Implemented/tested |
| get_encounter | EncounterDetailInput; encounter_id, D | R encounter | Implemented/tested |
| search_clinical_notes | DocumentSearchInput; query, P, E, document_type, department | S documents | Implemented/tested; document alias retained |
| get_clinical_note | DocumentInput; document_id, E, D | R document | Implemented/tested; document alias retained |
| get_lab_results | LabInput; P, E, test_name, test_code, status | R observations | Implemented/tested |
| get_lab_result | ObservationInput; observation_id, E, D | R observation | Implemented/tested |
| compare_lab_results | ComparisonInput; record_id/other_id OR test_name/test_code | C observations | Implemented/tested |
| get_medication_history | MedicationInput; P on ordered_at, E, medication_name, status | R medications | Implemented/tested |
| get_medication | MedicationDetailInput; medication_id, E, D | R medication | Implemented/tested |
| search_documents | DocumentSearchInput; query, P, E, document_type, department | S documents | Implemented/tested |
| get_document | DocumentInput; document_id, E, D | R document | Implemented/tested |
| get_diagnostic_reports | ReportInput; P, E, report_type, imaging_study_id | R reports | Implemented/tested |
| get_diagnostic_report | ReportDetailInput; report_id, E, D | R report | Implemented/tested |
| get_imaging_studies | ImagingInput; P, E, modality, body_region, imaging_study_id | R studies | Implemented/tested |
| get_imaging_asset_metadata | AssetInput; imaging_asset_id, E via parent, D | R asset metadata | Implemented/tested |
| get_imaging_report | ImagingReportInput; imaging_study_id, E, D on returned document | R document | Implemented/tested |
| get_referrals | ReferralInput; P, E, status, department (receiving) | R referrals | Implemented/tested |
| build_patient_timeline | TimelineInput; P, E, include | T original sources | Implemented/tested; event default and authorized categories |

Original actual ToolInput accepted patient_id, record_id, other_id, query (<=200),
test_name, start_at/end_at, limit 1–100 and offset 0–10000 for every tool. Optional
fields could therefore be accepted and ignored on inappropriate operations. All
now have meaningful per-tool contracts; the old ToolInput remains for compatible
direct Python callers through validated dispatch, not registry catalog inputs.

## D. Retrieval improvements and compatibility

Keep ClinicalSource injectable, registry authoritative, source DTO fingerprints
unchanged, and public HTTP contracts stable. Retain existing successful call forms.
Typed tool models reject unknown arguments and contradictory selectors. Exact
identifier aliases are explicit, never heuristic. Registry supplies selected
patient context for historical detail examples without patient_id.

Search remains deterministic case-insensitive substring matching, without semantic
ranking. Clinical-note names remain document aliases for existing specialists;
document_type explicitly narrows them. Patient search only searches the selected
patient's ID, synthetic MRN and display name; it cannot discover another patient.

Timeline defaults to events for compatibility; explicit include selects original
source records and a separate temporal projection. Date-only times remain dates;
instant range filters exclude unknown/date-only primary times. Medication filtering
uses ordered_at (order chronology), preserving start/end literals separately.
Referral department means referred_department. No care-completion inference.

Exact analyte and medication names/body region are case-insensitive equalities;
codes/IDs/enums/departments remain exact. Document title/text search uses literal
case-insensitive substring matching, stable source-ID order and score=1. Search
metadata filters run before pagination. Empty queries retain manifest discovery.
Encounter/observation/order/report/study/referral lists sort chronologically with
ID ties and unknowns last; public hospital sort semantics are unchanged.

Comparison accepts an exact distinct pair or selects an analyte's earliest/latest
from a bounded series. The whole selected series must have compatible codes (or
exact names only when both codes are absent), units, numeric values and collection
times. Invalid collection/result intervals fail DTO validation. No conversion or
clinical significance is inferred. Original values and named timestamps are kept;
Decimal arithmetic produces signed change and percentage (null at zero baseline).

Explicit timeline include merges original sources and produces a separate typed
projection. Date-only records are grouped separately after instants; unknowns last.
Neither is treated as an invented instant. Primary-time range filters exclude them.
Timeline role gains medication-history read, as required by documented chronology;
category authorization prevents access to referrals, imaging, reports, diagnoses
or symptoms through this aggregation role. The catalog advertises allowed groups.

## E. Security, permissions and audit

Persisted actor/run identity is checked before a tool row is created. Unknown,
foreign or mislabelled actors fail without fabricated activity. Valid actors have
real start/result commits, with failure codes for rejected schema/permission/
patient/budget/timeout/size/provenance requests. Audit still records tool, agent,
investigation, execution ID, start/end, duration, status and actual source IDs.
Allowlisted IDs/pagination and argument fingerprints omit narrative search text,
document contents and unknown arguments. Successful completion follows actual
handler execution and output validation. Ordered SSE activity is preserved.

Registry enforces patient scope, role allowlists, per-agent/global budgets and
timeouts. Nested timeline reads require corresponding role permissions. Original
DTO validation rejects wrong patients, invalid identity/hash/version, malformed
timestamps, unsupported metadata, duplicate references and inconsistent paging.
Asset ownership resolves through the parent study; explicit encounter associations
and version/hash preconditions fail closed. Prompts and documents cannot alter
these policies. No arbitrary file, HTTP or SQL capability is introduced.

## F. Provenance and cross-record relationships

Original source DTO fingerprints are unchanged. source_version/source_hash on
search hits identify the resolved original, while representation_hash identifies
the returned snippet projection. Hit identity/title/type/time and excerpt are
checked against the original. Snippets are not original-source anchors; exact
retrieval and the existing deterministic verifier remain required.

Medication/observation/event source_document_id, study report_document_id and
diagnostic report document/observation/study links remain original relationships.
Encounter associations can be used for targeted retrieval. Documents retain
clinical text, author, MIME, asset availability, source identity, version/hash and
named timestamps. Existing approved document/image content routes use stable IDs;
binary integrity stays behind AssetReader, with no unrestricted server paths.
Image metadata retains synthetic labels; no agent receives pixels in this phase.

## G. Tests and regression results

## G–J. Verification and remaining work

Baseline replay: completed, 13 verified findings, 108/108 valid anchors, 13/13
deterministic support, 81/81 accurate timeline sources, 52 calls, zero error events,
strict discovery 0/1 and partial 1/1. Artifacts: ignored
data/runtime/refactor04-before. OpenAPI saved before edits.

New test_tools.py directly invokes all twenty names against both SQLite and a
separate DTO-only adapter (40 per-tool cases). Every name has valid invocation,
output/provenance checks, wrong-patient rejection, missing patient, unsupported
argument and invalid identifier coverage. Exact selectors also have missing-record
checks. Twenty additional model cases validate unsupported/hostile arguments.
There are no tools covered only by end-to-end investigation tests.

Additional scenarios cover every supported list filter, combinations, inclusive
bounds, pagination/deduplication, empty results, ordering and invalid bounds;
lab trends and pair/analyte comparisons; medication-to-source retrieval;
symptom search and original note chronology; imaging/report/diagnostic association;
referral history; and timeline source/precision preservation. Negative controls
include incompatible codes/units, qualitative values, missing/bad times, absent
observations, duplicate selections, zero baseline, stale references, wrong encounter,
unauthorized categories, budgets, timeouts, oversized output and corrupt sources.
Persisted audit tests check actor spoofing, ordered events, completion durations,
source references, sanitized arguments and accurate success/failure states.

| Executed check | Result |
| --- | --- |
| Starting full backend pytest | 100 passed, 1 skipped |
| Focused new tool suite | 70 passed |
| Ruff lint / format check | Pass; 89 Python files formatted |
| mypy | Pass; 76 application files |
| Full backend pytest before final audit case | 169 passed, 1 skipped |
| Final full backend pytest | 170 passed, 1 skipped; 91.87 seconds |
| Alembic upgrade/current/downgrade/upgrade/check | Included in full foundation suite |
| Normal CASE-001 validation | Pass, 26 registered assets |
| Offline CASE-001 acceptance | Pass, 23 PDF pages rendered |
| Hospital API / asset / evidence / investigation regression | Included in full backend suite |
| Frontend typecheck / lint | Pass |
| Frontend Vitest | 33 passed |
| Frontend production build | Pass; isolated-browser and normal-origin builds also passed |
| Browser Playwright | 3 passed, installed Edge, one worker, 13.9 seconds |
| OpenAPI comparison | Exactly equal to pre-change document |
| git diff --check | Pass |

Browser tests used newly migrated browser.db and copied assets under ignored
data/runtime/refactor04-browser, including canonical and control imports. Tested
connectivity/retry/mobile layout, chart/lab/medication/asset/chronology navigation,
and actual CASE-001 investigation, side-by-side evidence, refresh, source inspector,
report and print generation. Both task-owned servers were stopped. Normal frontend
build was restored afterward; no development database was used or reset.

The one platform skip is the existing Windows symlink-privilege test; Starlette's
existing httpx deprecation warning remains. No browser policy block occurred.

## H. CASE-001 comparison, OpenAPI and resource measurements

| Metric | Before | After |
| --- | --- | --- |
| Terminal state | completed | completed |
| Verified findings / record contradictions | 13 / 1 | 13 / 1 |
| Valid anchors | 108/108 | 108/108 |
| Deterministically supported findings | 13/13 | 13/13 |
| Accurate report timeline sources | 81/81 | 81/81 |
| Tool calls / error events | 52 / 0 | 52 / 0 |
| Strict discovery / partial discovery | 0/1 / 1/1 | 0/1 / 1/1 |

Ignored artifacts: data/runtime/refactor04-before and refactor04-after. Logical
report equality passes after removing generated investigation/finding IDs and
generated report/finding timestamps and normalizing collection order. Original
clinical timestamps, values, anchors and claims are included. Timeline sequence
is also exactly equal without normalization. The strict contextual-anchor mismatch
is intentionally unchanged; no benchmark or answer-key edits occurred.

OpenAPI was saved from the unmodified application, then compared as parsed JSON
against the new create_app().openapi(): exact equality. Tool-only additive fields
and schemas are not public endpoint DTO changes. No source-navigation routes or
frontend sources changed.

Measured old HEAD adapter and new adapter against the same isolated imported DB,
with exact returned SourceRecord equality. SQL counts include BEGIN statements:

| 100-limit request | Old statements / transactions | New statements / transactions | Single-run elapsed old / new |
| --- | --- | --- | --- |
| 25 observations | 78 / 26 | 4 / 1 | 68.5 ms / 5.1 ms |
| 23 documents | 210 / 24 | 164 / 23 | 188.6 ms / 166.7 ms |

List retrieval reuses projected DTOs and obtains versions in one bounded query,
instead of reopening/reprojecting every source. Asset descriptors still release
read transactions before filesystem verification. The timing sample is local,
warm-process and single-run; query counts are the more reproducible result, not
a scale benchmark. Investigation latency was 5.45 s before / 6.95 s after while
other checks ran concurrently; no overall speedup is claimed.

## I. Remaining limitations and modified files

- Patient search remains selected-patient only. Broader discovery needs a separate
  authorized pre-investigation identity capability; prompts cannot widen scope.
- Clinical-note names retain document-alias behavior for specialist compatibility;
  use document_type for narrower searches. Automatic clinical note classification
  or semantic search is not implemented.
- Timeline defaults to events and role scopes constrain explicit include. Broader
  categories require an approved role expansion. Mixed-precision temporal reasoning
  and medication period overlap filtering are not implemented; order filtering
  uses ordered_at, never assumed start/administration times.
- Pagination is bounded at the tool boundary, but the local hospital service still
  materializes a patient's collection before filtering/paging. Large-document
  search resolves originals on each returned page to validate provenance. Version/
  descriptor reads remain on document paths; no caching or full SQL pushdown.
- Document source hashes identify DTOs. Binary hashes are verified internally but
  not published as new tool metadata; page/span locators, OCR, amended/archive
  source resolution and pixel analysis are separate capabilities.
- Missing referral completion/documentation never proves missed care. Referrals
  have no standalone source-document field in the current canonical schema.
- An identical uncoded test name is the conservative fallback, not a terminology
  service. No unit conversions, clinical significance or inferred diagnosis.
- Audit retains source IDs and correlated execution events, but evidence rows
  still have no originating tool-call foreign key; that lineage migration remains
  separate. Same-user filesystem isolation, live-provider generalization and
  independent expert clinical assessment are not established by these tests.

Created: app/tools/{inputs,results,documents,laboratory,timeline}.py,
tests/test_tools.py (paths under apps/api), and this report. Modified:
apps/api/app/tools/{clinical,registry}.py, app/schemas/investigation.py,
app/hospital/{adapter,repository,service}.py; docs/{agent-tools,backend-architecture}.md;
.skill/hospital-system/SKILL.md. No application frontend, canonical case, manifest,
asset, evaluation, lockfile or migration files changed. Ignored local verification
scripts/artifacts are not deliverable source changes. Historical reports preserved.

## J. Refactor 05 readiness

Ready for bounded tool selection using the published per-tool schemas and
descriptions, compatible specialists, scoped aggregation, deterministic comparison,
validated source projections and real audit. Preserve the 52-call baseline while
evaluating deliberate planning changes; do not add duplicate activity for display.

Prerequisites for broader orchestration: define stage outcome semantics, choose a
tool-to-evidence lineage migration, retain per-category authorization, specify
mixed-precision reasoning and amendments before using them, and measure bounded
retrieval on larger fixtures before SQL pushdown/caching. Strict discovery and
semantic clinical quality need their own milestone; they were not silently solved
by this retrieval refactor. No adaptive planner or new reasoning algorithm added.
