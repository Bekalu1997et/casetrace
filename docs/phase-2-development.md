# Phase 2 hospital development

Use the Phase 1 uv/pnpm toolchain in [local development](local-development.md).
Read [contract decisions](CONTRACT_DECISIONS.md) for IDs, persistence mappings,
source immutability and the remaining CASE-001 gate.

From the repository root, after installing dependencies:

```sh
cd apps/api
uv run --locked alembic upgrade head
uv run --locked python -m app.hospital.cli validate CASE-001
uv run --locked python -m app.hospital.cli import CASE-001
uv run --locked python -m app
```

The compatibility scripts are `uv run --locked python ../../scripts/validate_case.py
CASE-001` and `uv run --locked python ../../scripts/seed_case.py CASE-001` from
`apps/api`. Root Make targets are `make validate-case`, `make seed-case`, with
optional `CASE=<id>`. Import is an offline maintenance operation; stop runtime
writers first. Do not run concurrent seed processes. A transaction encloses all
clinical inserts, with assets validated before it begins. No canonical source
file is changed. An unchanged reimport reports `status: unchanged`; changed
content for the same case/version exits 2. A conflicting public resource ID
also exits 2 and rolls back the entire import.

Required inputs are `data/cases/CASE-001/case.json` using the canonical case
schema and referenced assets beneath `ASSET_STORAGE_PATH/cases/CASE-001/`.
The checkout currently has neither CASE-001 records nor assets. These commands
therefore fail with a precise missing-file error until approved canonical data
is supplied. No example patient from a design document is used as a substitute.
YAML parsing and in-place amendment imports remain unimplemented.

In another terminal:

```sh
cd apps/web
pnpm dev
```

Visit `/patients` and select the API-provided patient. The empty state is expected
until a case is imported. The chart includes encounters, observations, medication
history, notes/documents, imaging metadata/images, referrals, diagnoses, symptoms,
diagnostic reports and known-instant chronology. Clinical dates retain source
precision/offset; no abnormal flag or causal inference is generated in the UI.
Unknown values display as not documented. Notes render as text, HTML assets are
download-only, and PDF/image previews retain a download option. Missing assets
show errors without dropping the clinical record.

Inspect imported data through `http://localhost:8000/docs`, the versioned patient
list/detail/summary routes, and their clinical collections. Asset URLs use
registered source IDs only. The API does not expose raw source/evaluation files.
Runtime Docker mounts must exclude cases/answer keys and expose only clinical
assets; API/DB exclusion does not establish OS-level isolation for a local process
that can otherwise read the repository.

## Verification

```sh
cd apps/api
uv run --locked pytest -q
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked mypy
cd ../web
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

All database tests use temporary files and real Alembic migrations. The checked-in
`tests/fixtures/control-case.json` is a separate explicitly synthetic pipeline
control, not a CASE-001 fixture. Tests create attachment bytes under temporary
asset roots, check image/MIME/hash integrity, import rollback, deterministic
identifiers, cross-patient constraints, chronology and answer-key non-disclosure.
They do not mutate canonical cases or the normal runtime database.

For the full live browser/API control flow in WSL (with uv/pnpm on PATH):

```sh
source scripts/wsl-env.sh  # when using the repository's optional toolchain
cd apps/web
pnpm exec playwright install chromium
cd ../..
bash scripts/hospital-smoke.sh
```

This starts real API/Next.js processes on ports 18302/13302, migrates a unique
`/tmp` database, imports only the control fixture twice, and runs both Playwright
checks. Override `HOSPITAL_SMOKE_API_PORT` and `HOSPITAL_SMOKE_WEB_PORT` if needed.
It stops its own processes on exit and prints the retained temporary data/log
location. It builds the web app with the temporary API URL; rebuild before using
the normal API again. An installed compatible browser can be selected using
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. This control check cannot establish the
missing CASE-001 narrative, canonical multimodal assets or intended mystery.

## Recovery and troubleshooting

- Missing `case.json`: provision the canonical source; do not substitute generated
  clinical evidence or copy an unrelated case into CASE-001.
- Validation exits 2: inspect the file/record/field in stderr. Fix the source under
  its authoring workflow, validate again, then import. Unknown clinical fields,
  naive instants, broken references and unsafe paths fail closed.
- Missing/mismatched asset: place the approved bytes under the configured asset
  root with the exact case-relative key and declared MIME. A changed asset hash
  cannot silently overwrite an already imported case/version.
- Missing tables: run Alembic against the same settings/root/database URL as API
  and importer. Never repair migrations using ad-hoc create_all or SQL inserts.
- Browser/API failure: verify NEXT_PUBLIC_API_URL, explicit CORS origin and the
  real health response. Rebuild when changing the public URL.
- Dependency platform failure: never share Windows/Linux node_modules or venvs.
  Install in a native-filesystem validation copy with the same lockfiles.
- Reset safely: stop API/workers first and preserve the database together with its
  sidecars per the SQLite recovery policy. Prefer a fresh explicit DATABASE_URL,
  migrate, then reimport canonical records. No broad delete/reset command or
  automatic mutation of the existing runtime database is provided.
