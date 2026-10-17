#!/usr/bin/env bash
# Quick status of the most recent Deploy (Vercel + EAS) workflow runs.
# Reads the conclusion and any annotation on the latest check, without needing to open the
# Actions tab or the EAS build page. Requires gh to be authenticated against the repo.
set -euo pipefail
repo="g4tech9-hash/nowbey-v2"

run_id=$(gh run list --repo "$repo" --workflow "Deploy (Vercel + EAS)" --limit 1 --json databaseId --jq '.[0].databaseId')
if [ -z "${run_id:-}" ]; then
  echo "No runs found for the Deploy workflow."
  exit 1
fi
echo "Latest Deploy run: https://github.com/$repo/actions/runs/$run_id"
echo ""
gh run view "$run_id" --repo "$repo"
echo ""
echo "--- annotations ---"
gh run view "$run_id" --repo "$repo" --exit-code || true
