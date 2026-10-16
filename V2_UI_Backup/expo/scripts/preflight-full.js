const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = process.cwd();
const app = root.endsWith('expo') ? root : path.join(root, 'expo');
const logDir = path.join(root, '.claude', 'preflight-logs');
const tmpDir = path.join(os.tmpdir(), `expo-preflight-${Date.now()}`);

function log(name, cmd, args = [], cwd = app) {
  const r = spawnSync(cmd, args, { cwd, shell: true, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, `${name}.log`), out);
  return r.status === 0;
}

async function run() {
  try {
    // a. Copy files
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const files = spawnSync('git ls-files --cached --others --exclude-standard', { cwd: app, shell: true, encoding: 'utf8' }).stdout?.split('\n').filter(Boolean) || [];
    if (files.length === 0) {
      // Fallback: simple copy excluding heavy dirs
      const copy = (src, dst) => {
        fs.mkdirSync(dst, { recursive: true });
        fs.readdirSync(src).forEach(f => {
          if (['node_modules', '.expo', 'android', 'ios', '.git', 'dist'].includes(f)) return;
          const s = path.join(src, f), d = path.join(dst, f);
          if (fs.statSync(s).isDirectory()) copy(s, d);
          else fs.copyFileSync(s, d);
        });
      };
      copy(app, tmpDir);
    } else {
      files.forEach(f => {
        const s = path.join(app, f), d = path.join(tmpDir, f);
        if (fs.existsSync(s)) {
          fs.mkdirSync(path.dirname(d), { recursive: true });
          fs.copyFileSync(s, d);
        }
      });
    }

    // b. Checks
    const checks = [
      { name: 'npm-ci', cmd: 'npm ci --include=dev' },
      { name: 'npm-10-ci', cmd: 'npx npm@10 ci --dry-run' },
      { name: 'expo-doctor', cmd: 'npx expo-doctor' },
      { name: 'tsc', cmd: 'npx tsc --noEmit', skip: !fs.existsSync(path.join(tmpDir, 'tsconfig.json')) },
      { name: 'expo-export', cmd: 'npx expo export --platform android' }
    ];

    let result = 'PASS';
    for (const c of checks) {
      if (c.skip) continue;
      if (!log(c.name, c.cmd)) {
        console.log(`FAIL ${c.name} -> .claude/preflight-logs/${c.name}.log`);
        result = 'FAIL';
        break; // Skip subsequent if first fails
      }
      console.log(`PASS ${c.name}`);
    }

    // c. Static Checks
    const appJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'app.json'), 'utf8')).expo;
    const assets = [appJson.icon, appJson.android?.adaptiveIcon?.foregroundImage, appJson.web?.favicon].filter(Boolean);
    assets.forEach(a => {
      if (!fs.existsSync(path.join(tmpDir, a))) console.log(`WARN assets: ${a} missing`);
    });

    if (!appJson.android?.package) console.log('WARN assets: android.package missing');
    if (!appJson.extra?.eas?.projectId) console.log('WARN assets: eas.projectId missing');

    const sourceFiles = [];
    const walk = (d) => {
      fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.js')) sourceFiles.push(p);
      });
    };
    walk(tmpDir);

    const envs = [];
    sourceFiles.forEach(f => {
      const content = fs.readFileSync(f, 'utf8');
      const match = content.match(/process\.env\.([A-Z_]+)|EXPO_PUBLIC_([A-Z_]+)/g);
      if (match) match.forEach(m => envs.push(m.replace('process.env.', '').replace('EXPO_PUBLIC_', '')));
    });
    
    const easJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'eas.json'), 'utf8'));
    const prodEnv = easJson.build?.preview?.env || {};
    [...new Set(envs)].slice(0, 5).forEach(e => {
      if (!prodEnv[e]) console.log(`WARN env: ${e} missing in eas.json preview`);
    });

    // d. Native
    if (process.argv.includes('native')) {
      if (!log('prebuild', 'npx expo prebuild --platform android --no-install --clean')) {
        result = 'FAIL';
      } else {
        const gradle = path.join(tmpDir, 'android', 'gradlew.bat');
        if (!log('gradle', gradle, ['assembleDebug'])) result = 'FAIL';
      }
    }

    console.log(`RESULT: ${result}`);
    process.exit(result === 'PASS' ? 0 : 1);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

run();
