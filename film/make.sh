#!/bin/sh
# Spela om alla filmer från början: kurvdata -> spelklipp -> Remotion-render.
#   ./make.sh            allt
#   ./make.sh steg3      bara scener vars id börjar med steg3
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --no-audit --no-fund
echo "== kurvdata"; ../train/.venv/bin/python ../train/export_curves_json.py
echo "== spelklipp"; node record.mjs "$1"
echo "== render";    node render.mjs "$1"
echo "klart: film/out/"
