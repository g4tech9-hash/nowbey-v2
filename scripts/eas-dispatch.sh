#!/usr/bin/env bash
# Dispatch an Android APK build of NowBey without needing Actions tab access. Only needs push
# permission on the repo (no actions:write required) because it sends a repository_dispatch
# event, which the Deploy (Vercel + EAS) workflow is wired to receive.
#
# Usage:
#   scripts/eas-dispatch.sh mobile           # Android preview APK via EAS, local Gradle fallback
#   scripts/eas-dispatch.sh fallback         # skip EAS, build the APK on the runner with Gradle
#   scripts/eas-dispatch.sh web              # web deploy (usually unnecessary — Vercel App deploys master)
#   scripts/eas-dispatch.sh all              # web + mobile
#   scripts/eas-dispatch.sh cancel           # cancel every in-flight EAS build
#   scripts/eas-dispatch.sh account          # which Expo account EXPO_TOKEN is, and what quota is left
#   scripts/eas-dispatch.sh link [owner] [id] # create/link the EAS project under `owner` (PR with the config change)
#
# NowBey ships Android APKs only (no Play Store, no iOS yet). `mobile` means one Android preview
# APK: EAS first, and the same job falls back to a local Gradle build when EAS refuses or errors.
# `fallback` is that Gradle build on its own — it needs no EXPO_TOKEN and no Expo account access,
# which is what to use when EAS itself is the problem.
set -euo pipefail

target="${1:-mobile}"
repo="g4tech9-hash/nowbey-v2"

case "$target" in
  mobile|web|all|smoke)
    event_type="deploy"
    ;;
  fallback|local|mobile-fallback)
    event_type="deploy"
    target="mobile-fallback"
    ;;
  cancel|stop)
    event_type="eas-cancel"
    target=""
    ;;
  account|whoami|quota)
    event_type="expo-account"
    target=""
    ;;
  link|relink)
    event_type="eas-link"
    target=""
    owner="${2:-nowbey-v3s-team}"
    project_id="${3:-}"
    ;;
  *)
    echo "usage: $0 {mobile|fallback|web|all|smoke|cancel|account|link [owner] [project-id]}" >&2
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
elif [ "$event_type" = "expo-account" ]; then
  echo "Asking expo.dev who EXPO_TOKEN is and what build quota is left …"
  gh api "repos/$repo/dispatches" -f event_type="expo-account"
  echo "Dispatched. The verdict is in the run's annotations and summary:"
  echo "  https://github.com/$repo/actions/workflows/expo-account.yml"
elif [ "$event_type" = "eas-link" ]; then
  echo "Creating or linking @$owner${project_id:+ / project $project_id} on expo.dev; the config change arrives as a PR …"
  gh api "repos/$repo/dispatches" \
    -f event_type="eas-link" \
    -f "client_payload[owner]=$owner" \
    -f "client_payload[project_id]=$project_id" \
    -f "client_payload[dry_run]=${DRY_RUN:-false}"
  echo "Dispatched. Watch:"
  echo "  https://github.com/$repo/actions/workflows/eas-link.yml"
else
  echo "Cancelling every in-flight EAS build of $repo …"
  gh api "repos/$repo/dispatches" -f event_type="eas-cancel"
  echo "Cancel sent. Watch:"
  echo "  https://github.com/$repo/actions/workflows/eas-cancel.yml"
fi
