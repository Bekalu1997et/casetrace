#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/scripts/wsl-env.sh"
cd "$repo_root/apps/web"
pnpm install
pnpm lint
pnpm typecheck
pnpm test
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm build
