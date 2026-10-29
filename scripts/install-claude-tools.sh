#!/usr/bin/env bash
# Installs five Claude Code add-ons at USER level, so every project gets them:
#   Context7 (MCP)         up-to-date library docs        github.com/upstash/context7
#   Chrome DevTools (MCP)  drive and inspect Chrome       github.com/ChromeDevTools/chrome-devtools-mcp
#   REA (MCP + skill)      reverse engineer anything      github.com/morluto/rea
#   Replica (11 skills)    /replica-recon, /replica-build github.com/Jakeschincariol/replica-skill
#   Agent Reach (skill)    read X, Reddit, YouTube, ...   github.com/Panniantong/Agent-Reach
#
# Use it in two places:
#   - Your Mac/Linux computer:  bash install-claude-tools.sh
#   - Claude Code on the web:   paste into the cloud environment's "Setup script"
#                               so every new session, in any repo, starts with them.
# Safe to re-run. Skip Agent Reach with SKIP_AGENT_REACH=1.
set -uo pipefail

CONTEXT7_VERSION=4.4.4
CHROME_DEVTOOLS_VERSION=1.12.0
REA_VERSION=6.8.0

SKILLS_DIR="$HOME/.claude/skills"
mkdir -p "$SKILLS_DIR"
failed=()

step() { printf '\n==> %s\n' "$1"; }

add_mcp() { # name, then the server command
  local name=$1; shift
  claude mcp remove --scope user "$name" >/dev/null 2>&1 || true
  claude mcp add --scope user "$name" -- "$@" || failed+=("$name")
}

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code CLI not found. Install it first: npm install -g @anthropic-ai/claude-code" >&2
  exit 1
fi

step "Context7"
add_mcp context7 npx -y "@upstash/context7-mcp@$CONTEXT7_VERSION"

step "Chrome DevTools MCP"
# Cloud sessions ship Chromium here; on a normal computer it uses your installed Chrome.
if [ -x /opt/pw-browsers/chromium ]; then
  add_mcp chrome-devtools npx -y "chrome-devtools-mcp@$CHROME_DEVTOOLS_VERSION" \
    --headless --isolated --executablePath /opt/pw-browsers/chromium --chromeArg=--no-sandbox
else
  add_mcp chrome-devtools npx -y "chrome-devtools-mcp@$CHROME_DEVTOOLS_VERSION"
fi

step "REA (Reverse Engineer Anything)"
# REA's setup needs Node >= 22.23.4; run it under Node 24 in case the system Node is older.
npx -y -p node@24 -p "rea-agents@$REA_VERSION" -- rea setup --client claude_code --yes >/dev/null \
  || failed+=(rea)

step "Replica (11 skills)"
tmp=$(mktemp -d)
if git clone -q --depth 1 https://github.com/Jakeschincariol/replica-skill.git "$tmp/replica"; then
  for d in "$tmp"/replica/replica-*/; do
    rm -rf "$SKILLS_DIR/$(basename "$d")"
    cp -R "$d" "$SKILLS_DIR/"
  done
else
  failed+=(replica)
fi
rm -rf "$tmp"

if [ "${SKIP_AGENT_REACH:-0}" != 1 ]; then
  step "Agent Reach"
  # The PyPI package named agent-reach is a different project; install only from the GitHub release.
  if ! command -v uv >/dev/null 2>&1; then
    curl -LsSf https://astral.sh/uv/install.sh | sh && export PATH="$HOME/.local/bin:$PATH"
  fi
  if uv tool install --force https://github.com/Panniantong/Agent-Reach/releases/latest/download/agent-reach.zip; then
    export PATH="$HOME/.local/bin:$PATH"
    agent-reach setup >/dev/null || failed+=(agent-reach-setup)
  else
    failed+=(agent-reach)
  fi
fi

step "Installed"
claude mcp list 2>/dev/null | grep -E '^(context7|chrome-devtools|rea):' || true
ls "$SKILLS_DIR"

if [ ${#failed[@]} -gt 0 ]; then
  echo "Failed: ${failed[*]}" >&2
  exit 1
fi
echo "Done. Restart Claude Code to load the new tools."
