Set up automatic build checks for this project. Work autonomously, never ask me questions, and do not run any eas commands. Do these steps in order:



1\. Create `.claude/hooks/preflight.js` (in the project root, next to the expo folder) with exactly this content:



```js

// Runs when Claude finishes a turn. Skips if nothing changed since the last passing run.

const { spawnSync } = require('child\_process');

const fs = require('fs');

const os = require('os');

const path = require('path');



const roots = \[process.env.CLAUDE\_PROJECT\_DIR, process.cwd()].filter(Boolean);

const root = roots.find(r => fs.existsSync(path.join(r, 'expo', 'package.json')));

if (!root) process.exit(0);

const app = path.join(root, 'expo');



const stamp = path.join(os.tmpdir(), 'claude-preflight-pass.txt');

const attemptsFile = path.join(os.tmpdir(), 'claude-preflight-attempts.txt');

const SKIP = new Set(\['node\_modules', '.expo', 'android', 'ios', '.git', 'dist']);



function newest(dir) {

&#x20; let t = 0;

&#x20; for (const e of fs.readdirSync(dir, { withFileTypes: true })) {

&#x20;   if (SKIP.has(e.name)) continue;

&#x20;   const p = path.join(dir, e.name);

&#x20;   t = Math.max(t, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);

&#x20; }

&#x20; return t;

}



let lastPass = 0;

try { lastPass = Number(fs.readFileSync(stamp, 'utf8')); } catch {}

if (newest(app) <= lastPass) process.exit(0); // nothing changed since the last pass



const configChanged = \['package.json', 'package-lock.json', 'app.json', 'eas.json', 'babel.config.js', 'metro.config.js']

&#x20; .some(f => { try { return fs.statSync(path.join(app, f)).mtimeMs > lastPass; } catch { return false; } });



const checks = \[\['npm ci --dry-run', 'package-lock.json is out of sync with package.json, so EAS would fail at npm ci']];

if (fs.existsSync(path.join(app, 'tsconfig.json'))) checks.push(\['npx tsc --noEmit', 'TypeScript errors']);

if (configChanged) checks.push(\['npx expo-doctor', 'Expo config or dependency problems']);



const failures = \[];

for (const \[cmd, why] of checks) {

&#x20; const r = spawnSync(cmd, { cwd: app, shell: true, encoding: 'utf8' });

&#x20; if (r.status !== 0) failures.push(`FAILED: ${cmd} (${why})\\n${((r.stdout || '') + (r.stderr || '')).slice(-1500)}`);

}



if (!failures.length) {

&#x20; fs.writeFileSync(stamp, String(Date.now()));

&#x20; try { fs.unlinkSync(attemptsFile); } catch {}

&#x20; process.exit(0);

}



let n = 0;

try { n = Number(fs.readFileSync(attemptsFile, 'utf8')); } catch {}

if (n >= 3) { try { fs.unlinkSync(attemptsFile); } catch {} process.exit(0); } // give up after 3 tries

fs.writeFileSync(attemptsFile, String(n + 1));

console.error(failures.join('\\n\\n') + '\\n\\nFix these before finishing. Do not run any eas commands.');

process.exit(2);

```



2\. Update `.claude/settings.json`: MERGE this hooks block into the existing file and keep everything already in it (the permissions deny rules and defaultMode). Make sure the file is still valid JSON afterward.



```json

"hooks": {

&#x20; "Stop": \[

&#x20;   {

&#x20;     "hooks": \[

&#x20;       { "type": "command", "command": "node .claude/hooks/preflight.js", "timeout": 600 }

&#x20;     ]

&#x20;   }

&#x20; ]

}

```



3\. Append this section to CLAUDE.md without removing any existing rules:



```

\## After every change

\- A Stop hook (.claude/hooks/preflight.js) runs `npm ci --dry-run`, `npx tsc --noEmit` and, when package.json, app.json, eas.json or the babel/metro config changed, `npx expo-doctor`. If it reports a failure, fix it before finishing. Never bypass or disable the hook.

\- When adding or changing a dependency, use `npx expo install <package>`, then `npm install`, then confirm `npm ci --dry-run` passes. Never edit package-lock.json by hand.

\- Peer dependencies (reanimated, gesture-handler, worklets and the @react-native/\* tooling packages) must be explicit dependencies at Expo-compatible versions.

\- Maps use OpenStreetMap through the OSMMap component. Never add Google Maps or any API-key-based map service.

\- Before telling me the app is ready for an EAS build, run the /preflight command.

\- Never run eas commands.

```



4\. Test it: run `node .claude/hooks/preflight.js` from the project root and tell me the exit code and any failures. Then list the three files you created or changed.

