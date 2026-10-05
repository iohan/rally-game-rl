#!/bin/sh
# Redo all films from scratch: curve data -> game clips -> Remotion render.
#   ./make.sh            everything
#   ./make.sh step3      only scenes whose id starts with step3
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --no-audit --no-fund
echo "== curve data"; ../train/.venv/bin/python ../train/export_curves_json.py
echo "== game clips"; node record.mjs "$1" --force
echo "== render";    node render.mjs "$1"
echo "done: film/out/"
