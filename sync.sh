#!/usr/bin/env bash
# Full Tailored refresh: fetch last year of games, analyse new ones, rebuild profile + app, deploy.
# Analysis cache lives on the orphan branch `analysis-cache` so runs only analyse new games.
set -euo pipefail
cd "$(dirname "$0")"
USER_CC=${USER_CC:-maxthechessnoob}; TC=${TC:-blitz}; DAYS=${DAYS:-365}
mkdir -p data
if [ ! -s data/${TC}_analysis.jsonl ] && git ls-remote --exit-code origin analysis-cache >/dev/null 2>&1; then
  git fetch -q origin analysis-cache && git show origin/analysis-cache:${TC}_analysis.jsonl.gz | gunzip > data/${TC}_analysis.jsonl || true
fi
python3 fetch.py "$USER_CC" "$TC" "$DAYS"
python3 analyze.py data/$TC.json data/${TC}_analysis.jsonl
# keep only games still in the window
python3 - "$TC" <<'PY'
import json, sys
tc = sys.argv[1]; keep = {g["url"] for g in json.load(open(f"data/{tc}.json"))}
rows = [l for l in open(f"data/{tc}_analysis.jsonl") if json.loads(l)["url"] in keep]
open(f"data/{tc}_analysis.jsonl", "w").writelines(rows); print(len(rows), "analysed games in window")
PY
.venv/bin/python profile.py data/${TC}_analysis.jsonl
.venv/bin/python humanize.py data/profile.json
.venv/bin/python build_data.py data/${TC}_analysis.jsonl data/profile.json
(cd web && npm run build)
if [ "${DEPLOY:-1}" = 1 ]; then
  url=$(git remote get-url origin); tmp=$(mktemp -d)
  cp -r web/dist/. "$tmp"; touch "$tmp/.nojekyll"
  (cd "$tmp" && git init -q -b gh-pages && git add -A && git commit -qm "Deploy $(date -u +%F)" && git push -qf "$url" gh-pages)
  tmp=$(mktemp -d); gzip -c data/${TC}_analysis.jsonl > "$tmp/${TC}_analysis.jsonl.gz"
  (cd "$tmp" && git init -q -b analysis-cache && git add -A && git commit -qm "Analysis cache $(date -u +%F)" && git push -qf "$url" analysis-cache)
fi
