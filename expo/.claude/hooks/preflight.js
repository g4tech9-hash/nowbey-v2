// Runs when Claude finishes a turn. Uses no model tokens unless it finds a failure.
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
const logDir = path.join(root, '.claude', 'preflight-logs');
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
if (newest(app) <= lastPass) process.exit(0); // nothing changed since the last pass or give-up

const configChanged = ['package.json', 'package-lock.json', 'app.json', 'eas.json', 'babel.config.js', 'metro.config.js']
  .some(f => { try { return fs.statSync(path.join(app, f)).mtimeMs > lastPass; } catch { return false; } });

const checks = [['npm ci --dry-run', 'lock file out of sync with package.json (EAS fails at npm ci)']];
if (fs.existsSync(path.join(app, 'tsconfig.json'))) checks.push(['npx tsc --noEmit', 'TypeScript errors']);
if (configChanged) checks.push(['npx expo-doctor', 'Expo config or dependency problems']);

// Keep only the useful lines so feeding a failure back to Claude costs few tokens.
const compact = s => {
  const lines = s.split(/\r?\n/);
  const hits = lines.filter(l => /error|missing|fail|eresolve|✖|TS\d{4}/i.test(l));
  return (hits.length ? hits : lines.slice(-8)).slice(0, 12).join('\n').slice(0, 700);
};

const failures = [];
let full = '';
for (const [cmd, why] of checks) {
  const r = spawnSync(cmd, { cwd: app, shell: true, encoding: 'utf8' });
  if (r.status !== 0) {
    const out = (r.stdout || '') + (r.stderr || '');
    full += `$ ${cmd}\n${out}\n`;
    failures.push(`FAILED: ${cmd} (${why})\n${compact(out)}`);
  }
}

if (!failures.length) {
  fs.writeFileSync(stamp, String(Date.now()));
  try { fs.unlinkSync(attemptsFile); } catch {}
  process.exit(0);
}

fs.mkdirSync(logDir, { recursive: true });
fs.writeFileSync(path.join(logDir, 'hook-last-failure.log'), full);

let n = 0;
try { n = Number(fs.readFileSync(attemptsFile, 'utf8')); } catch {}
if (n >= 2) { // give up after 2 tries, and stay quiet until files change again
  try { fs.unlinkSync(attemptsFile); } catch {}
  fs.writeFileSync(stamp, String(Date.now()));
  process.exit(0);
}
fs.writeFileSync(attemptsFile, String(n + 1));
console.error(failures.join('\n\n') + '\nFull log: .claude/preflight-logs/hook-last-failure.log (read only its tail if needed). Fix, then finish. Do not run eas commands.');
process.exit(2);
