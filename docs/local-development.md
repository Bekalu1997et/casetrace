# Phase 1 local development

Use Ubuntu WSL, Python 3.12, uv 0.11.17, Node 24.22.0 and pnpm 10.34.0.
The API and web lockfiles select exact dependency versions. Install uv using its
official installer and Node through your preferred version manager. If needed,
`bash scripts/wsl-toolchain.sh` installs a checksum-verified Node binary and pnpm
under your user directory; then `source scripts/wsl-env.sh`. That helper currently
targets Linux x64 only. Do not share Windows and Linux node_modules or virtualenvs.

For best WSL performance keep the checkout on its native Linux filesystem. This
run encountered very slow dependency linking on `/mnt/c`; the report identifies
the native-filesystem source copy used for checks. A Windows installer also
temporarily interrupted WSL; interrupted checks were rerun.

From the repository root:

```sh
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
make install
make migrate
make api
# In a second terminal:
make web
```

Open http://localhost:3000. The connection panel calls the real
`http://localhost:8000/api/health` from the browser, including the database check.
No cases or provider credentials are required. The expected JSON is
`{"status":"ok","version":"1.0.0","database":"connected"}`.
Stop servers with Ctrl+C. Startup creates the SQLite directory and configures
connections; migrations remain an explicit maintenance command, never create_all.

## Settings

The API loads root `.env` independently of the working directory. Process environment
overrides that file; explicit settings overrides used by tests take precedence.

| Variable | Default / meaning |
| --- | --- |
| `CASETRACE_ROOT` | Optional absolute checkout root containing `apps/api`; inferred from config.py otherwise |
| `APP_ENV` | `development`; also `test` and `production` |
| `API_HOST`, `API_PORT` | `127.0.0.1`, `8000`; used by `make api` |
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/runtime/casetrace.db`; relative file resolves against root |
| `SQLITE_BUSY_TIMEOUT_MS` | `5000`, integer 0–60000, applied on every connection |
| `ASSET_STORAGE_PATH` | `./data/assets`, resolved against root; no asset API in Phase 1 |
| `CORS_ALLOWED_ORIGINS` | JSON list, initially `["http://localhost:3000"]`; exact origins, no wildcard |
| `LOG_LEVEL` | `INFO`; structured request IDs, status and duration, no request bodies |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000`; browser-visible origin in web `.env.local` |

`FRONTEND_URL` is retained as a descriptive example for existing contracts;
`CORS_ALLOWED_ORIGINS` controls CORS. Next.js loads its own `.env.local` under
`apps/web`, not root `.env`. Never copy backend secrets into it. The public URL is
embedded at web build time: rebuild when changing it. It must be browser-reachable,
not a Docker service hostname. The shared API client has no implicit localhost
fallback and performs no network requests during the production build.

The normal database is file-backed with WAL. Memory databases use StaticPool and
skip WAL. Connections enforce foreign keys and busy timeout; SQLAlchemy explicitly
owns BEGIN so DDL and savepoints roll back correctly. Sessions close on success,
failure or cancellation; writes require an explicit short `session.begin()`.
Nothing in Phase 1 performs inference or holds sessions across external calls.

## Validation

```sh
make test
make lint
make typecheck
make build
# Optional browser check, with both applications running:
cd apps/web
pnpm exec playwright install chromium
pnpm exec playwright test
```

An existing Chromium browser can be selected explicitly with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` instead of downloading one. The Windows
validation used installed Chrome with an isolated Playwright profile.

Backend tests use unique temporary file databases and never the development DB.
They cover lifecycle, settings precedence, path independence, PRAGMAs on two
connections, FK rejection, rollback, savepoints, memory policy and Alembic
upgrade/downgrade/check from different directories. Frontend tests cover rendering,
connection failure/retry, response validation and error-envelope handling. The
Playwright check exercises real browser/API connectivity and a narrow viewport.

## Optional Docker

```sh
docker compose config --quiet
docker compose up --build
docker compose down
```

Only API and web run. The API applies migrations before serving with one process;
`data/runtime` is a writable bind mount, retained on shutdown. Assets are mounted
read-only. Cases and evaluation keys are excluded from image build context and
runtime mounts. No case data is required yet. The web image is a production build;
rebuild after edits, or use local `make web` for hot reload. Ports are 3000 and 8000
(host API port can be changed through `API_PORT`; update the browser URL as well).

## Migration scope and next gate

Revision `0001_foundation` establishes Alembic version tracking only. There are no
hospital or investigation tables yet. This is deliberate: P0-02 still has public
ID/resource mapping, timestamp, enum and evidence-contract questions to resolve.
Do not autogenerate domain tables until those decisions are recorded. The next
dependency-ready task is that contract audit, then Phase 2a CASE-001 chronology and
evaluator isolation, followed by P2-01 domain migrations.

## Phase 2 continuation

Hospital models, clinical import commands and patient chart are now implemented;
see [Phase 2 development](phase-2-development.md) and
[contract decisions](CONTRACT_DECISIONS.md). The earlier domain-table gate above
is historical Phase 1 context. CASE-001 acceptance and Phase 3 investigation
contracts remain separate open gates.
