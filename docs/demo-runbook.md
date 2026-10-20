# CASETRACE — Demo runbook

Status: planned full-demo procedure. Phase 1 application startup, baseline migration and foundation checks exist; see [local development](local-development.md). Case seeding, investigations and reset commands below remain planned and must not be presented as working.

## Data separation and preflight

Keep canonical synthetic CASE-001–CASE-010 inputs in `data/cases/`, generated PDFs/images in their existing asset locations, imported structured source records in SQLite, derived investigations in investigation tables, and evaluation answers in separate offline files unavailable to runtime. Seeds import only an explicitly validated clinical projection; never expose the whole answer-key-bearing bundle to an agent. Complete and validate CASE-001 before scaling.

Use [development stack and SQLite operations](development-stack.md) for toolchain setup, absolute paths, WAL, connection configuration, backup and recovery. Record the selected case manifest version/hash and Alembic revision. Confirm synthetic labels, asset hashes, decisive source availability, hospital API access and configured model availability without revealing the expected answer. The database must be reconstructible from frozen fixtures plus reviewed migrations/seeds; source fixtures alone cannot recover lost investigation history.

## Planned local startup and tests

After Phase 1 provides manifests and entrypoints, run from `apps/api`:

```sh
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, from `apps/web`, after the named scripts exist:

```sh
pnpm install
pnpm dev
```

Stop each server with Ctrl+C. Planned checks are `uv run pytest` from `apps/api` and `pnpm lint`, `pnpm test`, `pnpm build` from `apps/web`. CI uses `uv sync --locked`, `uv run --locked pytest` and `pnpm install --frozen-lockfile`. These commands have not been executed against an application in this repository.

Planned root-level commands after scripts and their argument contracts are implemented:

```sh
uv run --project apps/api python scripts/validate_case.py --case CASE-001
uv run --project apps/api python scripts/seed_case.py --case CASE-001
uv run --project apps/api python scripts/demo_preflight.py --case CASE-001
uv run --project apps/api python scripts/demo_reset.py --case CASE-001 --dry-run
uv run --project apps/api python scripts/demo_reset.py --case CASE-001 --confirm
```

Validation is a hard prerequisite to seeding. CLI flags are proposed, not existing contracts. `seed_all_cases.py` remains planned and gated behind CASE-001 acceptance.

## Deterministic reset

1. Require an explicit synthetic demo environment (`APP_ENV=demo`), verify the resolved absolute database path and selected case/dataset, and refuse test/production or mismatched targets.
2. Stop accepting new runs, end or cancel active runs according to the state machine, stop all workers, close sessions and archive retained audit data and a consistent backup. Never reset while a worker can write.
3. Under exclusive maintenance, transactionally clear only selected derived investigation rows in FK-safe order: reports, finding/evidence links, findings, evidence, tool/agent/stage runs, events and investigations, including optional lease/cache state. Preserve immutable imported clinical rows and canonical files. Report deletion counts and rollback on failure.
4. Validate the frozen case, apply required migrations, and run idempotent seed tooling to verify or restore missing imported records. A changed fixture hash/version must fail or use an explicit versioned import; do not silently overwrite source records.
5. Verify source counts/IDs, timestamps and asset checksums against the manifest, foreign-key integrity, migration revision, no active leases and no stale results. Record reset time, dataset hash, result and archive location.
6. Restart services, run the actual CASE-001 retrieval → timeline/specialists → targeted contradiction retrieval → deterministic verification → report path, and open the decisive evidence. Archive and reset that smoke run to return to the presentation starting state. Repeat reset/run twice and compare source identity and core verified findings, allowing documented nondeterministic prose.

A full rebuild is a separate explicit synthetic-demo maintenance mode: back up and archive the existing database first, create a new file through Alembic, then validate/seed frozen cases and verify hashes. Never delete canonical cases, assets or evaluator keys; never remove live WAL/SHM files as a reset operation.

## Failure recovery

Use persisted REST state and events to distinguish failed/partial/interrupted runs. Reconcile retries with existing idempotency/attempt keys; never label a replay as a fresh investigation. For database recovery follow the backup/restore procedure in the shared stack policy, including integrity and foreign-key checks. If an LLM is unavailable, disclose any recorded fallback and preserve the failed run's audit. Complete report/evidence acceptance is a real end-to-end gate, not a frontend animation.

Optional Docker startup remains planned until Dockerfiles and Compose services exist. It needs API/web only, persistent writable runtime storage, approved read-only source/asset mounts and one API process. `docker compose down` must preserve runtime state; reset uses the same maintenance procedure, not volume deletion.
