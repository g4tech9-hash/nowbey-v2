#!/usr/bin/env bash
# Rebuild every NowBey brand asset, in dependency order.
#   3D profile pictures → 3D lockups → flat vector set → contact sheet
set -euo pipefail
cd "$(dirname "$0")"

PY=${PY:-.venv/bin/python}
NODE=${NODE:-node}

# node_modules is not committed: link it from the marketing kit once
if [ ! -e node_modules ]; then
  echo "linking node_modules from the marketing kit"
  ln -sfn ../Downloads/nowbey-full-kit/nowbey-kit/node_modules node_modules
fi

echo "1/6  avatar drawn from the product UI   (primary)"
"$NODE" scripts/build_pfp_ui.mjs

echo "2/6  3D profile pictures                (alternate)"
"$PY" scripts/build_pfp_3d.py

echo "3/6  3D lockups"
"$PY" scripts/build_lockup_3d.py

echo "4/6  flat vector mark + lockups"
"$NODE" scripts/build_flat.mjs

echo "5/6  contact sheet"
"$PY" scripts/build_sheet.py

echo "6/6  UI avatar sheet"
"$PY" scripts/build_ui_sheet.py

echo "done — out/ is up to date"
