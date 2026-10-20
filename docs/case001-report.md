# CASE-001 generation and verification report

Date: October 21, 2026. All clinical material is synthetic and not for clinical use.

## A. Clinical case summary

Daniel M. is a fictional 47-year-old man followed over seven visits from January
8 to July 22, 2026. Persistent cough progresses alongside weight loss, an
inflammatory-marker trend and an unresolved right basal opacity. Reflux symptoms,
lisinopril exposure and documentation from different encounters provide plausible
investigative alternatives. The chart does not establish a final diagnosis.
The complete expected interpretation stays in the offline evaluation package.

## B. Generated files

- `data/cases/CASE-001/case.json`: canonical clinical input, using existing schemas.
- `data/cases/CASE-001/manifest.json`: source hash, asset hashes/sizes, page counts,
  source versions, timestamps and record links.
- `data/assets/cases/CASE-001/documents/DOC-001-01.pdf` through `DOC-001-23.pdf`:
  12 clinical/intake/administrative/disposition notes, five laboratory reports,
  three radiology reports and three prescription/instruction documents.
- `data/assets/cases/CASE-001/imaging/IMG-001-01.png` through `IMG-001-03.png`:
  explicitly educational location diagrams, with synthetic labels.
- `evaluation/CASE-001/answer-key.json`: clinical blueprint, expected discrepancy,
  source anchors, alternative explanations, follow-up counterevidence and rubric.
- `scripts/generate_case001.py`, `scripts/validate_case001.py` and
  `apps/api/tests/test_case001.py`: reproducible authoring and acceptance checks.

Only maintenance dependencies were added, in the optional `case-data` group.
The application schemas, migrations, endpoints and runtime dependencies were
not changed. The existing ingestion implementation was reused.

## C. Dataset statistics

| Record or asset | Count |
| --- | ---: |
| Patient | 1 |
| Encounters | 7 |
| Clinical/intake/administrative/disposition notes | 12 |
| Laboratory observations | 25 |
| Medication records | 7 |
| Radiology reports / imaging studies | 3 / 3 |
| PDFs / PDF pages | 23 / 23 |
| Educational PNGs | 3 |
| Clinical timeline events | 8 |
| Diagnostic reports (laboratory and radiology) | 8 |
| Referrals | 2 |
| Diagnoses / symptoms | 3 / 1 |

## D. Ground-truth readiness

The expected primary finding has resolving clinical source IDs and exact literal
quote/field anchors. Its chronology is reproducible from investigation-visible
records. The evaluator checks competing interpretations and an apparent follow-up
gap resolved by an independently recorded completed study. It requires uncertainty
about medication contribution and underlying disease.

The answer key is separate from clinical inputs and registered assets. Tests
confirmed no evaluation objects in imported tables or hospital responses, and no
answer-key asset route. The Docker build allowlist excludes evaluation files.
Local OS-level ACL isolation was not provisioned or verified.

## E. Validation results

Commands below ran in Ubuntu WSL from `apps/api`, with
`UV_PROJECT_ENVIRONMENT=/home/zenthrix/.cache/casetrace-case001-venv` and uv
0.11.17 / Python 3.12.0. Each successful command exited **0**.

| Command | Actual result |
| --- | --- |
| `uv sync --group case-data` | Locked maintenance environment installed |
| `uv run --locked --group case-data python ../../scripts/generate_case001.py` | Case and 26 assets generated |
| `uv run --locked --group case-data python ../../scripts/validate_case001.py` | Valid; all 23 PDF pages decoded/rendered, three PNGs decoded |
| `uv run --locked python -m app.hospital.cli validate CASE-001` | Valid; 26 assets |
| `uv run --locked --group case-data pytest -q` | 45 passed, one deprecation warning, 81.55 seconds |
| `uv run --locked --group case-data pytest -q tests/test_case001.py` | Final manifest/validator changes rechecked: six passed, one warning, 17.10 seconds |
| `ruff check . ../../scripts/generate_case001.py ../../scripts/validate_case001.py` | Passed |
| `ruff format --check . ../../scripts/generate_case001.py ../../scripts/validate_case001.py` | 40 files formatted correctly |
| `mypy` | No issues in 31 application source files |

Acceptance checks include byte-for-byte regeneration of clinical inputs,
evaluation keys and every asset; source and asset tampering rejection; exact
ground-truth anchor resolution; laboratory text/value agreement; chronological
checks; rollback and API retrieval. All PDFs were also visually inspected through
a contact sheet, with full-size laboratory and radiology/clinical preview
artifacts generated locally. The educational diagram was visually inspected.

An initial Windows `uv run --locked python --version` exited **1** before a test
could launch: uv could not remove the existing `.venv/lib64` path (access denied).
Subsequent work used the isolated WSL environment. Pytest's one warning is the
existing Starlette/httpx TestClient deprecation; no dependency migration was
included. Frontend/browser acceptance was not run for this dataset-only change.

## F. Database and API verification

The existing CLI migrated and imported a fresh retained verification database:
`data/runtime/case001-verification-20261021.db` (ignored by Git). The normal
`data/runtime/casetrace.db` was not seeded or migrated by this work.

With `DATABASE_URL=sqlite+aiosqlite:////mnt/c/Users/HP/casetrace/data/runtime/case001-verification-20261021.db`:

1. `uv run --locked alembic upgrade head`: exit 0.
2. `uv run --locked python -m app.hospital.cli import CASE-001`: exit 0, `imported`.
3. Repeat identical import: exit 0, `unchanged`.

FastAPI TestClient requests against that retained database returned the patient,
seven encounters, 25 observations, seven medication records, 23 documents,
three imaging studies and eight diagnostic reports. All 26 registered asset
downloads returned 200 and matched manifest SHA-256 values. These were real ASGI
route/service/database calls, not mocked responses or a browser session.

The automated acceptance test separately migrated temporary file databases,
confirmed foreign-key/integrity checks, and proved that conflicting downstream
IDs roll back the entire import, including its new dataset and patient rows.

## G. Outstanding issues

No critical structural, reference, asset or ingestion validation errors remain.
Independent expert review of clinical plausibility is pending. The PNGs are
educational diagrams, not diagnostic scans. CT and spirometry are pending in the
fictional clinical record, so no results or later outcome were fabricated.
Local process isolation and a blind tool/agent investigation replay remain
unverified. Passing dataset checks is not a claim of clinical diagnostic accuracy
or a completed investigation engine.

## H. Next engineering step

Complete independent clinical review and freeze this case version, then implement
P2-06/P2-07: scoped clinical tool adapters and persisted audit outcomes over the
existing hospital services. Resolve the Phase 3 evidence/finding contracts before
implementing deterministic contradiction verification or investigation agents.
Keep CASE-002 through CASE-010 gated on CASE-001 acceptance.

See [dataset reproduction and clinical references](case001-dataset.md).
