#!/usr/bin/env bash
# Optional per-user toolchain setup for WSL; does not modify system packages.
set -euo pipefail
toolchain_dir="$HOME/.local/share/casetrace-toolchain"
mkdir -p "$toolchain_dir"
cd "$toolchain_dir"
curl --retry 3 -fsSLO https://nodejs.org/dist/v24.22.0/node-v24.22.0-linux-x64.tar.xz
curl --retry 3 -fsSL https://nodejs.org/dist/v24.22.0/SHASUMS256.txt -o SHASUMS256.txt
grep ' node-v24.22.0-linux-x64.tar.xz$' SHASUMS256.txt | sha256sum -c -
tar -xf node-v24.22.0-linux-x64.tar.xz
export PATH="$toolchain_dir/node-v24.22.0-linux-x64/bin:$PATH"
npm install --prefix "$toolchain_dir/pnpm" pnpm@10.34.0
node --version
"$toolchain_dir/pnpm/node_modules/.bin/pnpm" --version
