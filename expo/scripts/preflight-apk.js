#!/usr/bin/env node
// Safe static checks by default. --full also validates Firebase and runs type-check/Metro export.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const failures = [];
function check(ok, label) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures.push(label); }
const app = read('app.json').expo;
const profile = read('eas.json').build.preview;
check(profile.distribution === 'internal' && profile.android.buildType === 'apk', 'preview is an internal APK, not store AAB');
check(profile.env.EXPO_PUBLIC_API_BASE === 'https://nowbey-v2.vercel.app', 'APK targets production HTTPS API');
check(app.android.package === 'app.nowbey.mobile', 'Android package is app.nowbey.mobile');
check(Boolean(app.extra?.eas?.projectId), 'EAS project is linked');
for (const asset of [app.icon, app.android.adaptiveIcon.foregroundImage, app.web.favicon]) check(fs.existsSync(path.resolve(root, asset)), `asset exists: ${asset}`);
const file = path.resolve(root, app.android.googleServicesFile);
const full = process.argv.includes('--full');
if (fs.existsSync(file)) {
  const firebase = JSON.parse(fs.readFileSync(file, 'utf8'));
  check(firebase.project_info?.project_id === 'nowbey-6a30f', 'Firebase project matches push sender');
  check(firebase.client?.some((c) => c.client_info?.android_client_info?.package_name === app.android.package), 'Firebase contains this Android package');
} else if (full) check(false, 'google-services.json present (CI installs it securely before full preflight)');
else console.log('WARN Firebase file is absent locally; full preflight must run in CI with the secret installed.');
if (full && !failures.length) {
  for (const args of [['run', 'typecheck'], ['exec', '--', 'expo', 'export', '--platform', 'android']]) {
    const result = spawnSync('npm', args, { cwd: root, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' } });
    check(result.status === 0, `npm ${args.join(' ')}`);
    if (result.status !== 0) break;
  }
}
console.log(failures.length ? `PREFLIGHT FAILED (${failures.length})` : `PREFLIGHT PASSED (${full ? 'full' : 'static only'})`);
process.exitCode = failures.length ? 1 : 0;
