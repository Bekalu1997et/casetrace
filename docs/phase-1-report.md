# Phase 1 implementation report

Date: 2026-10-20. Branch: `develop/casetrace-mvp`. Starting tree was clean.
No commit, push, reset or staging operation was performed.

## A. Implemented scope

FastAPI application factory and lifespan; root-based Pydantic settings; structured
JSON application/request logs and request IDs; safe shared error envelopes;
configured CORS; contract-defined database-aware `/api/health` endpoint.

SQLite async engine/session factory with absolute URL resolution, file WAL,
every-connection FK/busy-timeout settings, explicit transaction hooks, shutdown
disposal, declarative model base and async Alembic environment. Baseline revision
`0001_foundation` creates version tracking without speculative domain tables.

Next.js App Router/TypeScript shell with existing design tokens, Tailwind and a
shadcn-compatible button primitive/configuration. Loading/error/not-found states,
typed centralized API client, runtime health validation and real connection panel
with retry. No fake records, counts, investigation activity or LLM integration.

Root environment examples, editor/line-ending policy, Make targets, optional API/web
Dockerfiles and Compose with persistent runtime and read-only assets. Runtime build
context excludes case bundles and evaluator keys. Backend/component/browser tests
and WSL setup/smoke helpers are included.

## B. Files

| Group | Files |
| --- | --- |
| Backend | `apps/api/pyproject.toml`, `uv.lock`, `.python-version`, `app/main.py`, `app/__main__.py`, core settings/database/errors/logging, API dependencies/health route, health service, schemas and model base |
| Persistence | `apps/api/alembic.ini`, async `alembic/env.py`, revision template and `versions/0001_foundation.py` |
| Frontend | `apps/web/package.json`, lockfile, TypeScript/Next/ESLint/PostCSS/Vitest/Playwright configs, components.json, root routes/styles/layout, shell/status/button components, API client/types/utilities, `.env.example` |
| Tests | `apps/api/tests/test_foundation.py`, `apps/web/tests/setup.ts`, component/client tests and real-backend Playwright smoke |
| Infrastructure | `.editorconfig`, `.gitattributes`, `.node-version`, `.env.example`, `.dockerignore`, Makefile, Compose, application Dockerfiles, `scripts/wsl-toolchain.sh`, `wsl-env.sh`, `web-check.sh`, `foundation-smoke.sh` |
| Documentation | README, AGENTS bootstrap status, development-stack status, demo-runbook status, `IMPLEMENTATION_INVENTORY.md`, `local-development.md`, this report |

Existing clinical data, source documents, skills and HTML prototypes are unchanged.

## C. Decisions and deferred work

Use the exact existing health contract (`status: ok`, `version: 1.0.0`,
`database: connected`), independently of package version 0.1.0. Health requires only
SQLite, not clinical tables, cases or providers. API errors retain the shared
code/message/request_id envelope.

Use one engine per lifespan and a short session per operation; Alembic reuses the
same configuration/connection factory. No startup create_all. The initial migration
is an explicit empty baseline because P0-02 remains open for domain DTOs and IDs.
No approved architecture contract or clinical schema was silently changed.

Actual design references live under `docs/casetrace-ui-design`; top-level design
files are empty. Installed skills live under `.skill`; a separate validation skill
and evidence contract are missing. See the inventory for precise boundaries.

## D. Execution evidence

The local foundation has passing validation. Docker execution remains unverified.
Commands below ran against this checkout or an explicitly identified copy of its
source with separate platform-specific dependencies.

| Command / check | Actual result |
| --- | --- |
| WSL `uv python pin 3.12`, `uv sync` | Exit 0; CPython 3.12.0 environment and lockfile installed |
| Initial WSL `uv run pytest -q` | Exit 0, 12 passed; one upstream Starlette/httpx deprecation warning |
| Native fallback `uv sync --locked --python 3.12` | Exit 0; isolated temporary Windows venv, CPython 3.12.13 |
| `docker compose config --quiet` | Pre-launch failure, exit 1: Docker command absent; also absent in WSL |
| PyYAML Compose parse and two-service/mount assertions | Exit 0; static validation only, not Docker validation |
| `git diff --check` | Exit 0 |
| Final `uv run --locked ruff check .` and `ruff format --check .` | Exit 0; 22 Python files formatted |
| Final native `uv run --locked mypy` (external cache directory) | Exit 0; no issues in 19 source files |
| Final native `uv run --locked pytest -q` | Exit 0; 13 passed, one upstream Starlette/httpx deprecation warning |
| WSL `uv run --locked alembic upgrade head`, `alembic current` | Exit 0; repository runtime initialized at `0001_foundation (head)` |
| Read-only development database revision / integrity query | Exit 0; revision `0001_foundation`, `PRAGMA integrity_check` returned `ok` |
| Isolated Alembic upgrade/current/downgrade/upgrade/check | Exit 0 inside pytest; tested root and API command directories |
| Native Windows `pnpm install` | Exit 0; pnpm 10.34.0, source copy under `%TEMP%/casetrace-phase1-web-20261020` |
| Native-filesystem WSL `pnpm install`, then `pnpm install --frozen-lockfile` | Exit 0; source copy under `~/.cache/casetrace-phase1-validation/apps/web` |
| WSL `pnpm lint`, `pnpm typecheck`, `pnpm test` | Exit 0; zero lint warnings, TypeScript passed, 5 tests passed |
| Windows direct ESLint and TypeScript invocations | Exit 0; same source as the checkout |
| WSL `NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm build` | Exit 0; Next.js 16.4.2 production build, static `/` and `/_not-found` |
| Windows production build via Next CLI | Exit 0; compilation, TypeScript and static generation passed |
| Real backend + Next dev + Playwright through installed Chrome | Exit 0; 1 browser test passed, API/database connected, retry and mobile overflow checks passed |
| Web source byte comparison against Windows validation copy | 27 files matched, zero differences; excludes generated dependency/build files |

Native Linux checks used a source copy to avoid `/mnt/c` dependency I/O. The web
lockfile from successful installation is present in the checkout; API checks used
the checkout itself. No test/build result is attributed to the earlier interrupted
installs. A frozen reinstall in the checkout uses the native Linux package store
while keeping generated modules ignored by Git.

WSL was interrupted during installation/checks by a host upgrade. A subsequent
launch failed with MSI 1618 / `ERROR_INSTALL_ALREADY_RUNNING`; WSL later recovered.
Interrupted commands returned exit 1 without application diagnostics and are not
counted as successful checks. Frontend registry retries and partial installs were
resumed. A native Windows Vitest attempt failed before tests with a worker-start
timeout; the supported WSL run subsequently passed all 5 tests. An early mypy
Pydantic-plugin attempt reported an internal tool error; the loader now uses a
typed settings override interface and root-specific model configuration without
that plugin, and the final mypy run passes. One ESLint anonymous-export warning
was corrected before the final zero-warning lint run.

Earlier backend attempts on the degraded/interrupted host also hit the migration
test's 30-second subprocess timeout (12 passed, 1 failed in those attempts). The
later full native run passed all 13 tests with the same migration assertions and
timeout; migrations were not skipped or weakened to obtain the passing result.

Web install warnings: ESLint 9.39.5 is deprecated upstream; migration to a later
major can be reviewed separately with Next compatibility. pnpm skips the optional
`unrs-resolver` build script; installed native packages resolved successfully and
lint/build pass. No blanket script approval was enabled.

The browser test used real local HTTP services with a temporary migrated database,
not mocked health results. Logs are under
`%TEMP%/casetrace-browser-bjrwd9ta`; desktop/mobile screenshots are under the
Windows validation copy's `test-results`. They were visually inspected. The smoke
processes were stopped after the test. Automated lifespan tests verify disposal;
the native browser harness used forced process cleanup and does not independently
prove graceful server shutdown.

## E. Acceptance status

| Definition-of-done item | Result |
| --- | --- |
| pnpm and uv installation, lockfiles | Passed |
| FastAPI and Next startup, documented health, real frontend connectivity | Passed |
| SQLite initialization, migrations and session handling | Passed |
| Backend tests, frontend tests, TypeScript, lint and production build | Passed |
| Environment and development documentation | Provided |
| Optional Docker configuration | Static YAML passed; Docker CLI/build/run blocked and explicitly reported |
| Architecture contracts preserved | No clinical/API/SSE contract changed |
| No tracked databases/secrets/build output | Git status and ignore checks verified; nothing staged or committed |

Docker build/start/health/persistence across restart remain unverified because Docker
is unavailable. This is a local-foundation delivery with an explicit optional
container validation gap, not a claim of complete container validation.

## F. Outstanding limits

P0-02 domain contract conflicts, missing evidence contract, domain tables, seeding,
clinical APIs, tools, investigations, authentication and full hospital UI are outside
this foundation implementation. No CASE-001 end-to-end investigation claim is made.

## G. Next development task

Complete P0-02 with an approved contract decision document for public IDs/resource
mappings, distinct clinical time fields and timezone precision, lifecycle enum
mapping, SSE envelope and evidence anchors. Then freeze CASE-001 chronology and
isolated answer key (Phase 2a), and implement P2-01 domain models/migration against
that frozen schema before importing records.
