# Windows version of install-claude-tools.sh: installs Context7, Chrome DevTools MCP,
# REA, Replica and Agent Reach for Claude Code at USER level (every project).
# Run in PowerShell:  powershell -ExecutionPolicy Bypass -File install-claude-tools.ps1
# Skip Agent Reach with:  $env:SKIP_AGENT_REACH = "1"

$Context7Version = "4.4.4"
$ChromeDevtoolsVersion = "1.12.0"
$ReaVersion = "6.8.0"

$SkillsDir = Join-Path $HOME ".claude\skills"
New-Item -ItemType Directory -Force -Path $SkillsDir | Out-Null
$Failed = @()

function Step($Name) { Write-Host "`n==> $Name" }

function Add-Mcp($Name, [string[]]$Command) {
  claude mcp remove --scope user $Name *> $null
  claude mcp add --scope user $Name -- @Command
  if ($LASTEXITCODE -ne 0) { $script:Failed += $Name }
}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Error "Claude Code CLI not found. Install it first: npm install -g @anthropic-ai/claude-code"
  exit 1
}

Step "Context7"
Add-Mcp context7 @("cmd", "/c", "npx", "-y", "@upstash/context7-mcp@$Context7Version")

Step "Chrome DevTools MCP"
Add-Mcp chrome-devtools @("cmd", "/c", "npx", "-y", "chrome-devtools-mcp@$ChromeDevtoolsVersion")

Step "REA (Reverse Engineer Anything)"
# REA's setup needs Node >= 22.23.4; run it under Node 24 in case the system Node is older.
npx -y -p node@24 -p "rea-agents@$ReaVersion" -- rea setup --client claude_code --yes | Out-Null
if ($LASTEXITCODE -ne 0) { $Failed += "rea" }

Step "Replica (11 skills)"
$Tmp = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid())
git clone -q --depth 1 https://github.com/Jakeschincariol/replica-skill.git "$Tmp\replica"
if ($LASTEXITCODE -eq 0) {
  Get-ChildItem "$Tmp\replica" -Directory -Filter "replica-*" | ForEach-Object {
    Remove-Item -Recurse -Force (Join-Path $SkillsDir $_.Name) -ErrorAction SilentlyContinue
    Copy-Item -Recurse $_.FullName $SkillsDir
  }
} else { $Failed += "replica" }
Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue

if ($env:SKIP_AGENT_REACH -ne "1") {
  Step "Agent Reach"
  # The PyPI package named agent-reach is a different project; install only from the GitHub release.
  if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    $env:Path = "$HOME\.local\bin;$env:Path"
  }
  uv tool install --force https://github.com/Panniantong/Agent-Reach/releases/latest/download/agent-reach.zip
  if ($LASTEXITCODE -eq 0) {
    $env:Path = "$HOME\.local\bin;$env:Path"
    agent-reach setup | Out-Null
    if ($LASTEXITCODE -ne 0) { $Failed += "agent-reach-setup" }
  } else { $Failed += "agent-reach" }
}

Step "Installed"
claude mcp list
Get-ChildItem $SkillsDir -Name

if ($Failed.Count -gt 0) { Write-Error "Failed: $($Failed -join ', ')"; exit 1 }
Write-Host "Done. Restart Claude Code to load the new tools."
