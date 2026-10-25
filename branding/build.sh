#!/usr/bin/env bash
# Rebuild every NowBey brand asset, in dependency order.
#   3D profile pictures → 3D lockups → flat vector set → contact sheet
set -euo pipefail
cd "$(dirname "$0")"

PY=${PY:-/home/user/.venv-img/bin/python}
NODE=${NODE:-node}

echo "1/4  3D profile pictures"
"$PY" scripts/build_pfp_3d.py

echo "2/4  3D lockups"
"$PY" scripts/build_lockup_3d.py

echo "3/4  flat vector mark + lockups"
"$NODE" scripts/build_flat.mjs

echo "4/4  contact sheet"
"$PY" scripts/build_sheet.py

echo "done — out/ is up to date"
