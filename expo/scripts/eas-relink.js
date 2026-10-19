#!/usr/bin/env node
// Move the EAS link in `app.json` to another Expo account — or check that it is intact.
//
// `owner`, `extra.eas.projectId` and `updates.url` are one fact written in three places. EAS
// resolves the app by `projectId`, so changing `owner` alone still points at the old project and
// fails with the same "Entity Not Authorized"; changing `projectId` alone leaves OTA updates
// pointing at a project that no longer exists. `eas init` writes the first two but never
// `updates.url`, so this script exists to finish the move in one step and to refuse a half-move.
//
// It never talks to expo.dev and it needs no token: it edits the config file only. Creating or
// linking the project itself is `eas init` (see docs/EAS_ACCOUNT_RELINK.md), which is where the
// project UUID comes from.
//
// Usage:
//   node scripts/eas-relink.js --check                       # is the link intact?
//   node scripts/eas-relink.js --owner <account> --project-id <uuid>
//   node scripts/eas-relink.js --owner <account>             # keep the UUID, re-derive updates.url
//   node scripts/eas-relink.js --check --owner <account>     # has the move landed yet?
//
// Exit codes: 0 = linked (or already correct), 1 = refused or invalid, 2 = bad usage.
const fs = require('node:fs');
const path = require('node:path');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Expo account and team slugs: letters, digits, dash and underscore. Deliberately stricter than
// "not empty" so a pasted display name ("NowBey Team") is rejected instead of written to config.
const ACCOUNT = /^[a-z0-9][a-z0-9_-]*$/i;
const UPDATES_PREFIX = 'https://u.expo.dev/';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expoOf(config) {
  return config.expo || config;
}

// Everything this script promises is expressed here, so `--check` and a write can never disagree.
// Returns { problems, values } — problems is empty exactly when the link is valid.
function validateLink(config, { owner: expectedOwner } = {}) {
  const app = expoOf(config);
  const problems = [];
  const owner = typeof app.owner === 'string' ? app.owner.trim() : '';
  const projectId = typeof app.extra?.eas?.projectId === 'string' ? app.extra.eas.projectId.trim() : '';
  const updatesUrl = typeof app.updates?.url === 'string' ? app.updates.url.trim().replace(/\/+$/, '') : '';

  if (!owner) problems.push('owner is empty: EAS has no account to resolve the project under');
  else if (!ACCOUNT.test(owner)) problems.push(`owner "${owner}" is not an Expo account name (letters, digits, - and _)`);
  else if (expectedOwner && owner !== expectedOwner) problems.push(`owner is "${owner}", expected "${expectedOwner}"`);

  if (!projectId) problems.push('extra.eas.projectId is missing: run `eas init` to create or link the project');
  else if (!UUID.test(projectId)) problems.push(`extra.eas.projectId "${projectId}" is not a project UUID`);

  if (!updatesUrl) problems.push('updates.url is missing: OTA updates have nowhere to go');
  else if (!projectId || !UUID.test(projectId)) problems.push('updates.url cannot be checked until the project ID is valid');
  else if (updatesUrl !== `${UPDATES_PREFIX}${projectId.toLowerCase()}`) {
    problems.push(`updates.url is "${updatesUrl}" but the project is "${projectId}": the half-move (OTA updates left on the old project)`);
  }

  return { problems, values: { owner, projectId, updatesUrl } };
}

// `app.config.js` may override anything in `app.json`. Writing app.json then would look like it
// worked and change nothing at build time, so a dynamic config that mentions these keys is refused
// instead of silently ignored. The committed app.config.js is a pass-through and passes this check.
function dynamicConfigProblems(dir) {
  const problems = [];
  for (const name of ['app.config.js', 'app.config.ts', 'app.config.mjs']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');
    const touched = ['owner', 'extra', 'updates'].filter((key) => new RegExp(`\\b${key}\\b`).test(source));
    if (touched.length) {
      problems.push(`${name} mentions ${touched.join(', ')}, so it may override app.json; edit the dynamic config by hand (or pass --allow-dynamic-config)`);
    }
  }
  return problems;
}

function relink({ dir = path.resolve(__dirname, '..'), owner, projectId, check = false, allowDynamicConfig = false } = {}) {
  const appFile = path.join(dir, 'app.json');
  const config = readJson(appFile);
  const app = expoOf(config);
  const before = {
    owner: app.owner,
    projectId: app.extra?.eas?.projectId,
    updatesUrl: app.updates?.url,
  };

  // A check reads the committed file as it is: no target account is needed, and the dynamic-config
  // guard does not apply (nothing is written).
  if (check) {
    if (owner && !ACCOUNT.test(owner)) {
      return { ok: false, check, changed: [], problems: [`--owner "${owner}" is not an Expo account name (letters, digits, - and _)`], before, after: before };
    }
    const current = validateLink(config, { owner });
    return { ok: current.problems.length === 0, check, changed: [], problems: current.problems, before, after: before };
  }

  const problems = dynamicConfigProblems(dir);
  if (problems.length && !allowDynamicConfig) {
    return { ok: false, check, changed: [], problems, before, after: before };
  }

  if (!owner) {
    return { ok: false, check, changed: [], problems: ['--owner is required (the Expo account that owns the project)'], before, after: before };
  }
  if (!ACCOUNT.test(owner)) {
    return { ok: false, check, changed: [], problems: [`--owner "${owner}" is not an Expo account name (letters, digits, - and _)`], before, after: before };
  }
  if (projectId && !UUID.test(projectId)) {
    return { ok: false, check, changed: [], problems: [`--project-id "${projectId}" is not a project UUID`], before, after: before };
  }

  const targetProjectId = (projectId || app.extra?.eas?.projectId || '').trim().toLowerCase();
  const targetOwner = owner.trim();
  if (!targetProjectId) {
    return { ok: false, check, changed: [], problems: ['no project ID to link: pass --project-id <uuid> or run `eas init` first'], before, after: before };
  }

  const next = JSON.parse(JSON.stringify(config));
  const nextApp = expoOf(next);
  if (targetOwner) nextApp.owner = targetOwner;
  nextApp.extra = nextApp.extra || {};
  nextApp.extra.eas = { ...(nextApp.extra.eas || {}), projectId: targetProjectId };
  nextApp.updates = { ...(nextApp.updates || {}), url: `${UPDATES_PREFIX}${targetProjectId}` };

  const validation = validateLink(next, { owner: targetOwner });
  if (validation.problems.length) {
    return { ok: false, check, changed: [], problems: validation.problems, before, after: before };
  }

  const after = {
    owner: nextApp.owner,
    projectId: nextApp.extra.eas.projectId,
    updatesUrl: nextApp.updates.url,
  };
  const changed = Object.keys(before).filter((key) => before[key] !== after[key]);

  if (changed.length) {
    // Written through a temporary file in the same directory and renamed, so an interrupted run
    // cannot leave app.json truncated (it is read by the APK preflight and by every EAS command).
    const tmp = `${appFile}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
    fs.renameSync(tmp, appFile);
  }
  return { ok: true, check, changed, problems: [], before, after };
}

function render(result, { json = false } = {}) {
  if (json) return `${JSON.stringify(result, null, 2)}\n`;
  const lines = [];
  if (result.check) {
    for (const problem of result.problems) lines.push(`FAIL ${problem}`);
    if (result.ok) {
      lines.push(`PASS owner ${result.before.owner}`);
      lines.push(`PASS extra.eas.projectId ${result.before.projectId}`);
      lines.push(`PASS updates.url ${result.before.updatesUrl}`);
      lines.push('');
      lines.push('EAS link is intact (app.json).');
    } else {
      lines.push('');
      lines.push(`EAS LINK INVALID (${result.problems.length})`);
    }
    return `${lines.join('\n')}\n`;
  }
  if (!result.ok) {
    for (const problem of result.problems) lines.push(`FAIL ${problem}`);
    lines.push('');
    lines.push('Nothing was written.');
    return `${lines.join('\n')}\n`;
  }
  lines.push(result.changed.length ? `Linked the app to @${result.after.owner} (${result.after.projectId}).` : `Already linked to @${result.after.owner} (${result.after.projectId}); nothing to write.`);
  if (result.changed.length) {
    for (const key of result.changed) lines.push(`  ${key}: ${result.before[key] || '(unset)'} → ${result.after[key]}`);
  }
  lines.push('');
  lines.push('Next:');
  lines.push('  npx expo config --type public   # the config EAS will actually read');
  lines.push('  eas project:info                # the token can read the project');
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const args = { check: false, json: false, allowDynamicConfig: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) throw new Error(`${arg} needs a value`);
      i += 1;
      return next;
    };
    switch (arg) {
      case '--owner': args.owner = value(); break;
      case '--project-id': args.projectId = value(); break;
      case '--dir': args.dir = path.resolve(value()); break;
      case '--check': args.check = true; break;
      case '--json': args.json = true; break;
      case '--allow-dynamic-config': args.allowDynamicConfig = true; break;
      case '-h':
      case '--help': args.help = true; break;
      default: throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

if (require.main === module) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}\nRun with --help for usage.`);
    process.exit(2);
  }
  if (args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 22).join('\n').replace(/^\/\/ ?/gm, ''));
    process.exit(0);
  }
  let result;
  try {
    result = relink(args);
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    process.exit(1);
  }
  process.stdout.write(render(result, { json: args.json }));
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = { validateLink, relink, render, parseArgs, dynamicConfigProblems, UUID, ACCOUNT };
