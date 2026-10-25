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

echo "1/7  avatar drawn from the product UI   (primary)"
"$NODE" scripts/build_pfp_ui.mjs

echo "2/7  3D profile pictures                (alternate)"
"$PY" scripts/build_pfp_3d.py

echo "3/7  3D lockups"
"$PY" scripts/build_lockup_3d.py

echo "4/7  flat vector mark + lockups"
"$NODE" scripts/build_flat.mjs

echo "5/7  contact sheet"
"$PY" scripts/build_sheet.py

echo "6/7  UI avatar sheet"
"$PY" scripts/build_ui_sheet.py

echo "7/7  preview page"
"$NODE" scripts/build_preview.mjs

echo "done — out/ and index.html are up to date"
echo "preview:  node scripts/serve.mjs 8000"
echo "          (no-store headers, so reloads never serve a cached build)"
