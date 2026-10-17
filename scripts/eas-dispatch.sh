#!/usr/bin/env bash
# Dispatch an Android APK build of NowBey without needing Actions tab access. Only needs push
# permission on the repo (no actions:write required) because it sends a repository_dispatch
# event, which the Deploy (Vercel + EAS) workflow is wired to receive.
#
# Usage:
#   scripts/eas-dispatch.sh mobile     # Android preview APK (default)
#   scripts/eas-dispatch.sh web        # web deploy (usually unnecessary — Vercel App deploys master)
#   scripts/eas-dispatch.sh all        # web + mobile
#   scripts/eas-dispatch.sh cancel     # cancel every in-flight EAS build
#
# NowBey ships Android APKs only (no Play Store, no iOS yet). The 'mobile' target therefore
# means one Android preview APK; revisit this script when iOS or store builds are added.
set -euo pipefail

target="${1:-mobile}"
repo="g4tech9-hash/nowbey-v2"

case "$target" in
  mobile|web|all|smoke)
    event_type="deploy"
    ;;
  cancel|stop)
    event_type="eas-cancel"
    target=""
    ;;
  *)
    echo "usage: $0 {mobile|web|all|smoke|cancel}" >&2
    exit 2
    ;;
esac

if [ "$event_type" = "deploy" ]; then
  echo "Dispatching '$target' build to $repo …"
  gh api "repos/$repo/dispatches" \
    -f event_type="$event_type" \
    -f "client_payload[target]=$target"
  echo "Dispatched. Watch:"
  echo "  https://github.com/$repo/actions/workflows/deploy.yml"
else
  echo "Cancelling every in-flight EAS build of $repo …"
  gh api "repos/$repo/dispatches" -f event_type="eas-cancel"
  echo "Cancel sent. Watch:"
  echo "  https://github.com/$repo/actions/workflows/eas-cancel.yml"
fi
