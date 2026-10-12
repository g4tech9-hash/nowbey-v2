// Runs when Claude finishes a turn. Skips if nothing changed since the last passing run.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const roots = [process.env.CLAUDE_PROJECT_DIR, process.cwd()].filter(Boolean);
const root = roots.find(r => fs.existsSync(path.join(r, 'expo', 'package.json')));
if (!root) process.exit(0);
const app = path.join(root, 'expo');

const stamp = path.join(os.tmpdir(), 'claude-preflight-pass.txt');
const attemptsFile = path.join(os.tmpdir(), 'claude-preflight-attempts.txt');
const SKIP = new Set(['node_modules', '.expo', 'android', 'ios', '.git', 'dist']);

function newest(dir) {
  let t = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
  }
  return t;
}

let lastPass = 0;
try { lastPass = Number(fs.readFileSync(stamp, 'utf8')); } catch {}
if (newest(app) <= lastPass) process.exit(0); // nothing changed since the last pass

const configChanged = ['package.json', 'package-lock.json', 'app.json', 'eas.json', 'babel.config.js', 'metro.config.js']
  .some(f => { try { return fs.statSync(path.join(app, f)).mtimeMs > lastPass; } catch { return false; } });

const checks = [['npm ci --dry-run', 'package-lock.json is out of sync with package.json, so EAS would fail at npm ci']];
if (fs.existsSync(path.join(app, 'tsconfig.json'))) checks.push(['npx tsc --noEmit', 'TypeScript errors']);
if (configChanged) checks.push(['npx expo-doctor', 'Expo config or dependency problems']);

const failures = [];
for (const [cmd, why] of checks) {
  const r = spawnSync(cmd, { cwd: app, shell: true, encoding: 'utf8' });
  if (r.status !== 0) failures.push(`FAILED: ${cmd} (${why})\n${((r.stdout || '') + (r.stderr || '')).slice(-1500)}`);
}

if (!failures.length) {
  fs.writeFileSync(stamp, String(Date.now()));
  try { fs.unlinkSync(attemptsFile); } catch {}
  process.exit(0);
}

let n = 0;
try { n = Number(fs.readFileSync(attemptsFile, 'utf8')); } catch {}
if (n >= 3) { try { fs.unlinkSync(attemptsFile); } catch {} process.exit(0); } // give up after 3 tries
fs.writeFileSync(attemptsFile, String(n + 1));
console.error(failures.join('\n\n') + '\n\nFix these before finishing. Do not run any eas commands.');
process.exit(2);
