#!/usr/bin/env bash
# One-time environment setup for a fresh machine (Linux x86-64).
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v stockfish >/dev/null && [ ! -x ~/bin/stockfish ]; then
  mkdir -p ~/bin && tmp=$(mktemp -d)
  curl -sL https://github.com/official-stockfish/Stockfish/releases/download/sf_17.1/stockfish-ubuntu-x86-64-avx2.tar | tar -x -C "$tmp"
  cp "$tmp"/stockfish/stockfish-ubuntu-x86-64-avx2 ~/bin/stockfish
fi
pip3 install -q chess==1.11.2
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q chess==1.11.2 maia2==0.11.0
(cd web && npm install --legacy-peer-deps --no-audit --no-fund)
