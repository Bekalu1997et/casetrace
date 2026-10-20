#!/usr/bin/env bash
# Real API/browser integration with the control fixture, never canonical CASE-001.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
smoke_dir="$(mktemp -d -t casetrace-hospital-XXXXXXXX)"
export DATABASE_URL="sqlite+aiosqlite:///$smoke_dir/hospital.db"
export ASSET_STORAGE_PATH="$smoke_dir/assets"
export APP_ENV=test API_HOST=127.0.0.1 API_PORT="${HOSPITAL_SMOKE_API_PORT:-18302}"
web_port="${HOSPITAL_SMOKE_WEB_PORT:-13302}"
export CORS_ALLOWED_ORIGINS="[\"http://localhost:$web_port\"]"
export NEXT_PUBLIC_API_URL="http://localhost:$API_PORT"
export WEB_TEST_URL="http://localhost:$web_port"
export HOSPITAL_CONTROL_SMOKE=1
api_pid=""
web_pid=""
cleanup() {
  if [[ -n "$web_pid" ]]; then kill "$web_pid" 2>/dev/null || true; wait "$web_pid" 2>/dev/null || true; fi
  if [[ -n "$api_pid" ]]; then kill "$api_pid" 2>/dev/null || true; wait "$api_pid" 2>/dev/null || true; fi
  echo "Isolated smoke data and logs: $smoke_dir"
}
trap cleanup EXIT
cd "$repo_root/apps/api"
uv run --locked alembic upgrade head
uv run --locked python ../../scripts/hospital_smoke_seed.py "$smoke_dir"
uv run --locked python -m app > "$smoke_dir/api.log" 2>&1 &
api_pid=$!
cd "$repo_root/apps/web"
pnpm build > "$smoke_dir/build.log" 2>&1
pnpm exec next start --hostname 0.0.0.0 --port "$web_port" > "$smoke_dir/web.log" 2>&1 &
web_pid=$!
ready=0
for attempt in $(seq 1 60); do
  if curl -fsS "$NEXT_PUBLIC_API_URL/api/health" > "$smoke_dir/health.json" && curl -fsS "$WEB_TEST_URL/patients" > "$smoke_dir/patients.html"; then ready=1; break; fi
  if ! kill -0 "$api_pid" || ! kill -0 "$web_pid"; then cat "$smoke_dir/api.log" "$smoke_dir/web.log"; exit 1; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then echo "Applications did not become ready"; exit 1; fi
cat "$smoke_dir/health.json"
pnpm exec playwright test
