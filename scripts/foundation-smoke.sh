#!/usr/bin/env bash
# Run from WSL with native Node/pnpm/uv on PATH after installing dependencies.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
smoke_dir="$(mktemp -d -t casetrace-smoke-XXXXXXXX)"
export DATABASE_URL="sqlite+aiosqlite:///$smoke_dir/smoke.db"
export APP_ENV=test API_HOST=127.0.0.1 API_PORT=8000
api_pid=""
web_pid=""
cleanup() {
  if [[ -n "$web_pid" ]]; then kill "$web_pid" 2>/dev/null || true; wait "$web_pid" 2>/dev/null || true; fi
  if [[ -n "$api_pid" ]]; then kill "$api_pid" 2>/dev/null || true; wait "$api_pid" 2>/dev/null || true; fi
  echo "Smoke logs and isolated database: $smoke_dir"
}
trap cleanup EXIT
cd "$repo_root/apps/api"
uv run --locked alembic upgrade head
uv run --locked python -m app > "$smoke_dir/api.log" 2>&1 &
api_pid=$!
cd "$repo_root/apps/web"
NEXT_PUBLIC_API_URL=http://localhost:8000 node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 > "$smoke_dir/web.log" 2>&1 &
web_pid=$!
for attempt in $(seq 1 60); do
  if curl -fsS http://localhost:8000/api/health > "$smoke_dir/health.json" && curl -fsS http://localhost:3000 > "$smoke_dir/index.html"; then break; fi
  if ! kill -0 "$api_pid" || ! kill -0 "$web_pid"; then cat "$smoke_dir/api.log" "$smoke_dir/web.log"; exit 1; fi
  sleep 1
done
cat "$smoke_dir/health.json"
pnpm exec playwright test
