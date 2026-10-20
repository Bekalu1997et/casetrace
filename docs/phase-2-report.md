# Phase 2 implementation report — 2026-10-20

## A. Implementation summary

Implemented the hospital data foundation on `develop/casetrace-mvp`, without
committing or pushing. This is a working generic clinical pipeline and chart,
verified with a separate synthetic control case. **Phase 2 acceptance remains
incomplete because canonical CASE-001 files and assets are absent.** No clinical
story, patient identity or hidden answer was invented to fill that gap.

The existing Phase 1 lifecycle, health, SQLite configuration, pnpm/uv lockfiles,
Tailwind and shadcn/ui remain in use. No LLM, agent investigation, orchestration,
evidence ranking or report-generation features were added.

## B. CASE-001 audit

`data/cases/CASE-001/` and `data/assets/` were empty at inspection and remain
empty. Consequently no source manifest/version, patient demographics, encounters,
notes, observations, medication records, diagnostic reports, images, referrals,
chronology or private evaluation key can be validated or imported. There are no
existing record IDs, values, timestamp relationships or file references to audit.
This is absence of evidence, not a successful CASE-001 validation.

The architecture examples are illustrative and disagree on patient identity;
they were not used as canonical records. `tests/fixtures/control-case.json` is
explicitly a separate synthetic pipeline control with no clinical mystery. It
includes an evaluator sentinel solely to verify non-disclosure. Tests create
assets in temporary directories; no control patient is seeded into the normal
runtime database.

Current input support is canonical-envelope JSON (`case.json`), not YAML. The
case-field mapping and restrictions are explicit in CONTRACT_DECISIONS.md and
case-schema.md. Import validation checks supported clinical fields, relationships,
known clinical instants and referenced asset bytes. It does not establish medical
plausibility or validate a missing hidden clinical answer/evaluation graph.

## C. Database implementation

- `0002_hospital`: case_datasets, patients, encounters, clinical_events, lab_orders,
  lab_results, medication_events, clinical_documents, document_versions, assets,
  imaging_studies, imaging_assets, referrals.
- `0003_clinical_reports`: diagnoses, symptoms, diagnostic_reports,
  report_observations.
- UUID5 internal identities preserve canonical public resource IDs; unique dataset
  versions and public IDs prevent duplicate or silently remapped evidence.
- Foreign keys, including composite encounter/source-document patient scope,
  preserve relationships. Import validation also checks report/observation/study
  scope; explicit dependency-order flushes and one transaction provide rollback.
- The shared UTC type rejects naive instants and restores aware UTC values from
  SQLite. Validated source payloads preserve original offsets and date precision;
  medication order/start/end and event/documentation times stay distinct.
- Document versions retain text hashes; registered filesystem assets retain MIME,
  size, checksum and synthetic labels. Current-version resolution checks document
  ownership. Amendments/in-place source updates are deliberately not implemented.
- Dataset seeded_at records actual UTC maintenance time. Determinism comparisons
  exclude that operational time while comparing clinical fields, IDs and links.

Migrations were generated, reviewed and applied only to isolated databases.
The existing runtime database and its sidecars were not reset or migrated.

## D. Hospital APIs

All routes below use the canonical `/api/hospital/v1` prefix and are implemented:

| Routes | Behavior |
| --- | --- |
| `GET /patients`, `/patients/{patient_id}` | Search/list and detail |
| `GET /patients/{patient_id}/summary` | Actual source-record counts |
| Patient collections and resource details for `encounters`, `clinical-events`, `observations`, `medications`, `documents`, `imaging-studies`, `referrals`, `diagnoses`, `symptoms`, `diagnostic-reports` | Typed clinical responses, pagination, stable ordering and missing-record errors |
| `GET /encounters/{encounter_id}/records` | Related source IDs |
| `GET /patients/{patient_id}/observations/series` | Numeric series; incompatible units refused |
| `GET /patients/{patient_id}/documents/search` | Clinical substring retrieval, no evaluator ranking |
| `GET /documents/{document_id}/asset` | Registered clinical file only |
| `GET /imaging-studies/{study_id}/assets` and `/report` | Image metadata and linked report |
| `GET /imaging-assets/{asset_id}/content` | Registered synthetic image bytes |
| `GET /patients/{patient_id}/timeline` | Deterministic known-instant chronology and source refs |

Hospital success/error envelopes use Pydantic models and request IDs. Binary
responses use checked asset metadata. Path traversal, symlink escapes, unsupported
media, missing files and mismatched bytes fail closed. Database read transactions
are released before asset I/O. Raw filesystem paths and evaluation sections are
not public API fields. `/api/health` retains Phase 1 behavior.

No new authentication system was added. This is trusted local demo access;
API/DB non-disclosure tests do not prove OS-level isolation for a process with
permission to read the source checkout. Deployment must keep source/evaluation
files outside runtime mounts, as described in the existing container policy.

## E. Frontend integration

`/patients` shows actual imported patients, with empty/error/loading states.
`/patients/[patientId]` shows demographic identity and sections for encounters,
laboratory values/units/reference ranges, medication history, notes/document
assets, imaging, referrals, diagnoses, symptoms, diagnostic reports and chronology.

API access is centralized. Patient changes cancel stale requests; sections are
paginated. Clinical narratives render as text; PDF/images have previews and
original download links, HTML is download-only. Missing document assets display
an error without removing the clinical record. No abnormal indicators or clinical
claims are invented where the source contract has no such field.

Chrome checks exercised real Next.js-to-FastAPI communication and verified both
desktop and 390px layouts. Screenshots are retained under ignored `test-results/`.
Source-reference display is a Phase 2 record surface; full investigation evidence
navigation/anchors remain Phase 3 work.

## F. Validation results

Verification used an isolated native WSL copy at `/tmp/casetrace-phase2`, with the
same source files and lockfiles. Linux dependencies were installed there rather
than sharing the checkout's Windows dependency layout.

| Actual command/check | Result |
| --- | --- |
| Baseline `uv run --locked pytest -q` | Exit 0, 13 tests passed (also passed in the checkout) |
| Baseline `pnpm test` in isolated copy | Exit 0, 5 tests passed |
| `uv sync --locked` | Exit 0, Python 3.12 environment installed |
| `pnpm install --frozen-lockfile` | Exit 0, no lockfile changes |
| Phase 2 `uv run --locked pytest -q` | 39 tests passed; includes migration upgrade/downgrade/check, validation, deterministic imports, rollback/retry, relationships, asset integrity and API non-disclosure |
| `uv run --locked ruff check .` | Exit 0 |
| `uv run --locked ruff format --check .` | Exit 0 |
| `uv run --locked mypy` | Exit 0, 31 source files |
| `pnpm test` | Exit 0, 15 tests passed |
| `pnpm typecheck`, `pnpm lint`, `NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm build` | Exit 0 |
| Live health/API/Next.js startup, isolated Alembic migration and control import twice | Health connected; import statuses imported then unchanged |
| Playwright foundation and hospital checks, installed Windows Chrome against WSL servers | Exit 0, 2 passed; no API mocking |
| `uv run --locked python -m app.hospital.cli validate CASE-001` | Exit 2: canonical case.json is absent; expected unresolved source blocker |

Failures encountered and resolved/limited:

- Initial WSL launch required sandbox escalation; subsequent WSL execution worked.
- The checkout frontend tests initially failed before execution due to a missing
  platform native binding. A native-filesystem install resolved this.
- An offline pnpm install lacked cached tarballs; a frozen online install passed.
- A node_modules symlink outside the validation workspace prevented a Turbopack
  build; installing dependencies within that workspace resolved it.
- Early implementation test/type failures were corrected, including migration-head
  assertions and a banner encoding regression.
- Linux Playwright launch failed before tests because its browser download was
  incomplete. The slow download was stopped after the installed Windows Chrome
  fallback passed both browser tests. A complete Linux-browser smoke run is not
  claimed.
- One upstream Starlette/httpx deprecation warning remains. Docker execution and
  canonical CASE-001 end-to-end acceptance were not performed.

## G. Files modified

- Backend: app models/types, hospital schemas/validation/ingestion/repository/
  clinical and asset services/CLI, hospital routes, API registration and typed
  hospital error responses.
- Persistence: Alembic revisions 0002 and 0003; existing 0001 unchanged.
- Frontend: patient routes, directory/chart/record cards, document/image viewers,
  loading/error hook, centralized hospital client/types, shell navigation and
  overview copy; shared client recognizes hospital request IDs.
- Tests/data: separate control fixture, hospital integration tests, updated
  foundation migration expectation, frontend component tests and hospital browser
  test. Canonical `data/cases` and `data/assets` unchanged.
- Developer workflow: Make maintenance targets, validate/seed wrappers, isolated
  hospital smoke script/helper, Docker build inclusion for frontend hooks.
- Documentation: contract decisions, source provenance contract, database/case/
  hospital/frontend alignment notes, local development continuation, Phase 2
  commands and this report. No unrelated architecture rewrite or skill changes.

## H. Next development milestone

Before Phase 3 investigation implementation:

1. Supply and freeze the approved canonical CASE-001 chronology, structured
   records, multimodal artifacts and physically isolated private answer key.
2. Validate/import that exact case twice, inspect every decisive source link,
   and pass canonical browser/hospital acceptance. Add YAML parsing if the actual
   approved sources use YAML rather than the supported JSON serialization.
3. Finalize remaining P0-02 investigation status/SSE envelope and evidence anchor
   decisions. Add tool scope/audit contracts over these read-only clinical services.
4. Establish evaluator/runtime filesystem isolation in the intended deployment.
   Then implement deterministic evidence verification and the bounded workflow.

The four future capabilities remain timeline contradiction, medication mystery,
missed follow-up and hypothesis challenger. No unsupported discovery was embedded
into the control fixture or user interface.
