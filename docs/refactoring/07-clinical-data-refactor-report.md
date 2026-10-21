# Refactor 03 — Clinical data, multimodal integrity and ingestion

Date: 2026-10-21. Starting commit:
`6c7888616e1e94dda1e03ce550897548eeec8a9f`.
The starting working tree was clean on `refator/casetrace-mvp`.
The existing branch was retained. No commit, push, reset, canonical data edit,
asset regeneration, evaluation change, migration change or development database
reset was performed. All import/investigation checks used isolated databases.

## A. Clinical data inventory

Inventory of the actual CASE-001 v1.0 canonical case and its frozen manifest:

| Category | Count |
| --- | ---: |
| Synthetic patient | 1 |
| Encounters | 7 |
| Clinical events | 8 |
| Observations | 25 |
| Medication records | 7 |
| Documents / original PDFs | 23 / 23 |
| Imaging studies / illustrative PNGs | 3 / 3 |
| Referrals | 2 |
| Diagnoses | 3 |
| Symptoms | 1 |
| Diagnostic reports | 8 |
| Registered assets / bytes | 26 / 170,187 |

There are 90 array records plus the patient. All scoped non-encounter records
have encounter associations. Imaging assets link to studies rather than carrying
a duplicate patient/encounter field. All 8 clinical events, 25 observations and
7 medication records have source-document links. Source report associations and
manifest reverse links validate. No duplicate IDs or broken source links were
found. All three studies are X_RAY. Images are educational location diagrams,
not diagnostic studies. PDFs have 23 total pages, each rendered by acceptance.

Document types: four progress notes; one consultation, emergency, specialist and
discharge note each; two nursing and two administrative notes; five laboratory
reports; three radiology reports; three prescriptions. Observations comprise
five each with g/dL, 10^9/L, mg/L, mg/dL and mmol/L units. Existing unit-sensitive
series behavior is retained; no conversions or invented values were introduced.

Structured diagnoses/symptom records coexist with authored assessments, plans,
reported history and radiology interpretation in document text. The latter remain
source assertions, not newly extracted structured clinical facts. Notes provide
title, author, encounter, clinical/authored time and original PDF; separate
narrative sections, assessment and plan fields do not exist in the public DTO.
Radiology findings/impression remain report narrative/conclusion. Medication
adherence, review/acknowledgment times, completed follow-up times and detailed
reconciliation context are not invented where absent. Referrals, diagnoses and
symptoms have encounter links but no standalone source-document field in their
current canonical types. Their provenance gap is documented, not guessed.

There are ten date-only medication start/end values and three date-only
symptom/diagnosis values. Validation reports 13 DATE_PRECISION and 8 TIME_UNKNOWN
observations, zero warnings/errors for the frozen case. Missing timestamps remain
missing. Intentional clinical discrepancies are preserved; no source assertion
was reconciled to the answer key.

## B. Data architecture

The existing case.json plus manifest.json arrangement is retained. It is small,
versioned and sufficient; modularizing the frozen clinical case would add risk
without a demonstrated benefit. The importer owns interpretation; frontend code
continues consuming hospital APIs.

Before: one maintenance validator checked typed structure/references/signatures;
frozen manifest verification was only in the offline CASE-001 evaluator tooling.
After: diagnostics/report types, canonical preflight, a separate reusable manifest
validator, and maintenance discovery have explicit responsibilities. Parsing and
Pydantic structural validation precede independent relationship/time/asset checks.
The importer maps the validated case and persists all rows in one transaction.
The original public DTO and asset-byte hashes remain separate from the dataset
fingerprint. No ETL framework or dependency was added.

Access remains ClinicalTools -> ClinicalSource -> SimulatedHospitalAdapter ->
hospital service/repository; registered bytes pass through AssetReader. Agents
never import the maintenance discovery/validation modules or receive case files,
manifest editor fields, evaluator annotations or answer keys.

## C. Schema and diagnostic decisions

No canonical clinical schema, physical tables or migration revisions changed.
Existing nonempty version labels are retained rather than inventing a new version
grammar. ClinicalModel rejects unknown fields/nonfinite numbers; timezone-aware
instants, enums and existing observation/medication validators remain authoritative.

ValidationReport carries counts, assets_checked, status and diagnostics with
case_id, file, record_type, record_id, field, code, description and severity.
Relationship/asset errors accumulate after successful structural parsing;
structurally invalid objects return contextual Pydantic diagnostics first.
Rejected raw values and editor/evaluation sections are not dumped in reports.
The CLI supports --format json (default) and --format text; invalid validation
exits 2. The compatibility scripts/validate_case.py wrapper remains usable.

Manifest presence is optional for existing generic/control cases, with an explicit
MANIFEST_ABSENT warning. A present manifest is binding: identity/version, exact
case bytes, counts, asset membership/uniqueness, paths, MIME, size, SHA-256,
patient/source version and document encounter/imaging study relationships must
agree. Declared reverse source links must equal actual canonical links. No
manifest or source file is rewritten to resolve a failed check.

## D. Temporal model

Existing rules retain explicit offsets, encounter intervals, specimen/result
ordering, reference interval ordering and matching-precision medication intervals.
New conservative checks reject inverted performed/reported imaging intervals,
negative medication doses, dataset update-before-create and birth-after-encounter.
Invalid positive image dimensions are also rejected. Cross-encounter document
references, authored-before-event notes and appointment-before-order referrals
produce review warnings; none automatically repair or reinterpret source facts.
No causality or specialist plausibility rule was added.

The existing hospital timeline retains its primary timestamp/time meaning/order.
A compatible extension adds encounter_id, named original timestamps and primary
time_precision=instant. A missing/date-only primary timestamp is still omitted
from this instant-only projection; retrieve the original record to see it. Other
named dates never substitute for clinical occurrence. Timestamp maps retain date
strings/nulls and original offsets. Investigation timeline and contradiction
rules remain unchanged. Future mixed-precision temporal reasoning remains R04+.

## E. Multimodal architecture

LocalAssetStorage still constrains paths to cases/<case_id>, rejects traversal,
absolute/Windows paths and evaluator directories, verifies file existence and
MIME signatures, and computes size/SHA-256. Runtime AssetReader checks registered
size/hash after releasing the database session. Manifest verification now catches
changed files even when their signatures remain valid before import.

The database already retains registered IDs, ownership via document/study,
storage keys, MIME, bytes, checksums and synthetic labels. Existing image metadata
retains dimensions and illustrative designation. MIME controls preview/download;
HTML remains download-only. PDF page counts remain in the maintenance manifest;
the public metadata DTO was not broadened to copy unverified editor metadata.
Deep page rendering, image decoding/dimensions and synthetic labels remain the
offline acceptance gate using existing case-data dependencies. Ordinary preflight
verifies signatures/hashes, not full decoder validity. No PDF appearance or pixel
content changed.

## F. Ingestion and provenance

Extracted import_fingerprint is shared by importer and readiness discovery. Its
compact sorted JSON over typed clinical payload plus sorted asset SHA-256 values
is byte-for-byte compatible with the previous implementation. CASE-001 remains:
`efd631aa419fa7d93c5abad31dc14217b1ca155100d8ae1b4cc2e032841933d4`.
Import results add deterministic import_id (existing dataset UUID5 identity) and
source_hash. This identifies a logical import, not a fabricated import-attempt log.

UUID5 mapping, source_version=1, original payloads, document text hashes, asset
hashes, source/encounter links and transactional dependency order are unchanged.
Reimport of identical content is unchanged; a changed same-version fingerprint
raises ImportConflict. Invalid preflight never opens a write transaction; later
integrity errors roll back dataset and dependent rows together. Canonical files
are never modified. Global external-ID uniqueness still prevents replacing
existing source records through a version bump. Amendment/history support needs
an approved contract/migration, not silent overwrite.

## G. API and case-library readiness

Existing patient listing/summary powers imported-case browsing; encounter detail
and records associations power chart drill-down. Observation source_document_id,
units/reference intervals and collection/result times support laboratory trends.
Medication source documents and dose/route/frequency/status support history.
Document text/metadata plus registered asset route support original-source
viewing. Studies, report links, image metadata/content support illustrative imaging.
Investigation anchors resolve to those same original DTOs and version/hash checks.
Timeline entries now additionally carry encounter and named time context.

Maintenance discover checks actual canonical presence/validation and persisted
(case_id, version) fingerprints. It distinguishes not_present, invalid,
missing_assets, available_not_imported, imported and source_conflict. It creates
no missing database, imports nothing, fabricates no cases and reads no evaluator
keys. Existing databases must already be migrated. A directory/identity mismatch
is invalid. CASE-002 through CASE-010 are absent, not ready placeholders.

A public case catalog is deliberately deferred: runtime deployments exclude raw
case/manifest files. It requires an approved publication/ownership contract for
safe catalog metadata. No new public endpoint was introduced. Rich structured
note sections, exact PDF locators, public page-count/checksum/capability metadata,
archived source resolution and date-only timeline items remain explicit contract
gaps. This phase makes no frontend redesign or extra clinical content claims.

## H. Executed checks

Starting tree: full backend **72 passed, 1 skipped**; isolated evaluation matched
R02. Final verification:

| Command / check | Result |
| --- | --- |
| `uv run ruff check .` from apps/api | Pass |
| `uv run ruff format --check .` from apps/api | Pass, 83 files |
| `uv run mypy` from apps/api | Pass, 71 application files |
| `uv run --project apps/api pytest apps/api/tests -q` | 100 passed, 1 skipped; 116.02 seconds |
| Focused new clinical-data suite | 28 passed |
| New clinical-data plus architecture suite | 35 passed |
| Normal CASE-001 validation and JSON/text CLI | Pass, 26 assets |
| Offline CASE-001 acceptance | Pass, all 23 PDF pages rendered |
| Isolated import/no-op, deterministic clean import, rollback, conflict tests | Pass in full suite |
| Alembic upgrade/current/downgrade/upgrade/check | Pass in full suite |
| `discover CASE-001` / `discover CASE-010`, isolated imported DB | imported / not_present |
| OpenAPI compatibility comparison | Only three optional TimelineEntry additions |
| `git diff --check` | Pass |

The relevant repository skills were used; `.skill/validation/` does not exist.

Frontend `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd test` and
`pnpm.cmd build` passed: **33 tests**. A second build with an isolated API origin
also passed while preparing browser E2E. No frontend sources changed.

`uv run --project apps/api --group case-data python scripts/validate_case001.py`
passed with 26 assets and all 23 PDF pages rendered. Normal clinical validation
also passes without evaluator access. The full suite includes isolated Alembic
upgrade/current/downgrade/upgrade/check, import determinism/idempotency/rollback,
hospital assets/APIs, adapter substitution, tool/agent boundary and investigations.

OpenAPI was compared with HEAD by loading the original schemas in a separate
process. Removing only encounter_id, timestamps and time_precision additions
from TimelineEntry yields exact document equality. Paths, operation IDs, errors,
source DTOs, investigation schemas and required fields are unchanged.

Browser preparation used copied assets and a newly migrated database under
ignored data/runtime/refactor03-browser, with control-case import/idempotency and
CASE-001 import verified. Automatic approval review rejected the web launch/E2E
command with “blocked by policy.” No bypass was attempted; browser E2E was not
executed for this milestone. The isolated API process is no longer running.

An initial browser setup command used incompatible relative uv --directory and
--project paths; migration did not run and the isolated seed failed. Corrected
commands ran from apps/api and succeeded without deleting any database. One
redirected evaluation shell returned exit 1 because PowerShell treated a dependency
stderr deprecation warning as NativeCommandError; its completed artifacts and
metrics were verified independently. A final direct-process replay is recorded
below. Ruff initially hit a BOM-related renderer panic on a newly written test;
UTF-8 normalization and rerunning formatting/lint resolved it without tool updates.

## I. CASE-001 regression

| Metric | R02 / starting | Refactor 03 |
| --- | --- | --- |
| Terminal state | completed | completed |
| Verified findings | 13 | 13 |
| Record chronology discrepancies | 1 | 1 |
| Valid anchors | 108/108 | 108/108 |
| Independently supported findings | 13/13 | 13/13 |
| Accurate investigation timeline sources | 81/81 | 81/81 |
| Strict / partial discovery | 0/1 / 1/1 | 0/1 / 1/1 |
| Tool calls / failed events | 52 / 0 | 52 / 0 |

Ignored artifacts: data/runtime/refactor03-before and refactor03-after. Full
logical report equality passed after excluding only generated IDs and generated
creation/verification/report timestamps and normalizing list order. Clinical
values, timestamps, findings and anchors are included. No benchmark, answer key
or inference behavior changed. The contextual “cough” strict-discovery mismatch
remains intentionally unresolved.

Final replay artifacts are in ignored data/runtime/refactor03-final. Running
evaluate_system.py through a direct Python subprocess returned exit **0** and
reconfirmed all metrics above. Frontend production output was rebuilt with the
normal local environment after the isolated browser preparation build.

## J. Files and outstanding limitations

Created: apps/api/app/hospital/{diagnostics,discovery,manifest}.py,
apps/api/tests/test_clinical_data.py and this report. Modified:
apps/api/app/hospital/{validation,cli,ingestion,schemas,service}.py;
docs/{case-schema,hospital-api,frontend-backend-contract,local-development}.md.
No files moved/deleted, no dependencies added. No runtime DB or sidecars tracked.

Implementation retained already-correct transaction/mapping/storage behavior
rather than replacing it. No new catalog API, clinical fields, asset metadata
endpoint, bulk loader or historical source platform was added. Their absence is
an explicit scope/compatibility decision, not a completed capability. Automated
validation establishes machine-checkable integrity, not expert clinical accuracy.
Independent expert review and live-provider generalization remain unverified.
One Windows symlink security test requires Developer Mode/privileges and skips;
all other path/integrity checks execute. Existing Starlette/httpx deprecation
warning remains. Browser E2E needs an environment where its launch is permitted.

## K. Refactor 04 prerequisites

1. Keep the frozen clinical case, manifest, answer key, DTO fingerprint algorithm,
   source IDs and baseline metrics as regression fixtures.
2. Define retrieval semantics over existing ClinicalSource/SourceResolver ports;
   preserve patient scope and immutable original DTO resolution.
3. Specify and test search-hit versus original-source fingerprint behavior before
   using snippets as exact anchors; do not weaken exact quote/value verification.
4. Extend sanitized audit arguments, pagination completeness and targeted source
   manifests with contract tests; retain ScopedToolExecutor and bounded budgets.
5. Specify provenance for tool execution -> retrieved source -> evidence without
   exposing private prompts or raw deliberation.
6. Decide a safe published case-catalog contract before rendering unimported cases
   in a browser; add schema/API tests if approved.
7. Treat mixed-precision comparison, archived amendments and clinical reasoning
   improvements as separately specified work. Do not silently repair the strict
   benchmark expectation in a retrieval-infrastructure refactor.
