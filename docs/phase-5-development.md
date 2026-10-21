# Phase 5 evaluation and demo operations

Run commands from `apps/api` unless stated otherwise. Use one API process. Keep the normal development database unchanged.

## Repeatable evaluation

```powershell
uv run --locked --group case-data python ../../scripts/validate_case001.py
uv run --locked python ../../scripts/evaluate_system.py --output ../../data/runtime/evaluation-new --repeats 3
```

The output directory must not exist. The runner creates a temporary migrated database, validates/imports CASE-001, starts the real application lifespan, creates investigations through HTTP and polls persisted REST state. It saves completed reports and event histories before importing the separate answer-key scorer. It independently resolves anchors and verifies deterministic propositions and timeline fields. Temporary databases are removed; exported reports remain. This uses FastAPI TestClient, not a network/browser substitute. Browser testing is a separate gate.

`--live` loads the configured provider/model/key from local settings and refuses missing configuration. It never substitutes successful mocked responses. No credentials are written into reports. Token usage is not currently measured. A provider failure may produce a truthful report with limitations; inspect status and error events.

Scoring formulas use counts and denominators. Citation validity is matching source version/hash, encounter, field value and quote / all verified finding anchors. Deterministic support is successfully reverified, unchanged rendered propositions / verified findings. Unsupported verified finding rate is failed deterministic reverifications / verified findings. Timeline accuracy is projections whose named timestamp and timestamp map match original DTOs / report timeline entries. These checks assess consistency, not independent clinical accuracy. Clinical support, hypothesis balance and uncertainty calibration require expert review.

Exact discovery requires every expected source plus each expected field/value/quoted passage and a verified contradiction touching expected anchors. Partial discovery requires at least two expected anchor source IDs in a verified contradiction. Matching source IDs alone cannot earn exact credit. A broad contextual citation can therefore receive partial credit even when its full source contains a relevant passage. This is development evaluation, not held-out evaluation. Do not tune runtime prompts against hidden answers during a run.

## Dedicated demo reset

Stop all API processes/workers using the demo database first. `--offline` acknowledges this operational prerequisite; it is not an OS process interlock. Only this absolute database filename is accepted:

```powershell
uv run --locked python ../../scripts/demo_reset.py --database C:/Users/hp/casetrace/data/runtime/demo/casetrace-demo.db --dry-run
uv run --locked python ../../scripts/demo_reset.py --database C:/Users/hp/casetrace/data/runtime/demo/casetrace-demo.db --confirm --offline
```

Reset validates source inputs first, retains a SQLite backup of existing audit history beside the target, applies migrations, refuses active queued/running investigations, transactionally clears only investigation-domain tables, checks SQLite integrity/foreign keys and idempotently imports CASE-001. It never deletes database files, sidecars, source fixtures or assets. Clinical rows remain immutable. Relative targets, other databases, symlinks and junction paths are rejected. Backup retention is manual. Changed imported fixture versions fail rather than silently overwriting sources; restore the retained backup while offline if necessary.

Start the demo API in a dedicated terminal:

```powershell
$env:DATABASE_URL='sqlite+aiosqlite:///C:/Users/hp/casetrace/data/runtime/demo/casetrace-demo.db'
$env:LLM_PROVIDER='rules'
$env:CORS_ALLOWED_ORIGINS='["http://localhost:3015"]'
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8015
```

From `apps/web`, in a separate terminal:

```powershell
$env:NEXT_PUBLIC_API_URL='http://localhost:8015'
pnpm.cmd build
pnpm.cmd start --port 3015
```

Verify `http://localhost:8015/api/health` and the dashboard at `http://localhost:3015`. The public API base is compiled at build time. Do not reuse a build configured for another API. Existing ports 8000/3000 may belong to another development session; do not terminate it.

Browser test from `apps/web`:

```powershell
$env:WEB_TEST_URL='http://localhost:3015'
$env:API_TEST_URL='http://localhost:8015'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
pnpm.cmd exec playwright test tests/e2e/investigation.spec.ts --workers=1
```

Omit the executable override when Playwright Chromium is installed. The release test uses the actual API and demo SQLite database. Stop the dedicated server before reset, repeat reset and rerun the browser test. Do not reset the normal development database.

## Isolation and limitations

Runtime tools have patient scopes and no evaluator namespace; allowlisted ingestion excludes answer metadata. Production packaging excludes raw cases/evaluator files. A local process running as the repository owner can still read evaluator files: tool boundaries are not filesystem isolation. Use a separate runtime account/container with only approved runtime assets and database mounted for enforced separation. No production clinical identity/authorization or multi-user SQLite readiness is claimed. Clinical plausibility remains pending expert review.
