# Moving NowBey to a new Expo account

**Status 2026-10-19:** the app is still linked to `oasistech242/nowbey`
(`projectId 10e4a677-274e-43b1-99e6-33a2b32ccd23`) and the target is **`nowbey-v3s-team`**. No
project exists under that account yet, so `expo/app.json` has deliberately **not** been edited: the
account, the project UUID and the OTA URL are one fact, and the UUID can only be minted by
expo.dev. This document is the procedure, the tooling is in this repository, and the one-click way
to finish the move is the **Link EAS project** workflow.

---

## 1. Why `app.json` cannot be half-edited

`expo/app.json` records the link three times:

| Field | Now | What reads it |
| --- | --- | --- |
| `expo.owner` | `oasistech242` | which account EAS resolves the app under (`eas init`, build ownership) |
| `expo.extra.eas.projectId` | `10e4a677-274e-43b1-99e6-33a2b32ccd23` | every EAS API call: build, update, `project:info` |
| `expo.updates.url` | `https://u.expo.dev/10e4a677…` | where the shipped app fetches OTA updates |

EAS resolves the project by **projectId**, not by owner. Writing `owner: "nowbey-v3s-team"` while
the UUID still points at `oasistech242/nowbey` therefore changes nothing about which project EAS
uses — it only makes the file *look* moved. Writing a UUID that does not exist is worse: the error
becomes `Project not found` instead of `Entity Not Authorized`, and nothing in the message says the
project was never created.

`expo/scripts/preflight-apk.js` fails a half-move on purpose (`updates.url points at
extra.eas.projectId (move both together)`), and `tests/preflight-apk.test.mjs` keeps it that way.
So the move happens in one commit, after expo.dev hands over a real UUID.

## 2. Before anything: which account can the token actually reach?

Run the read-only account check — it never builds and never spends quota:

```bash
scripts/eas-dispatch.sh account          # Actions > Expo account
```

It reports, as check-run annotations:

* which account the `EXPO_TOKEN` secret authenticates as,
* every account that token can reach,
* whether the project in `app.json` is readable,
* the remaining Android build quota and the reset date.

The secret has been replaced several times on 2026-10-19, so run this first rather than trusting an
earlier reading. The last run before this document was written (run `39304899284`, 18:47 UTC)
reported:

| | |
| --- | --- |
| `EXPO_TOKEN` authenticates as | `GitHub App · @g4tech9-hash` (robot) |
| Accounts it can reach | `oasistech242 (Role: Developer)` |
| The project in `app.json` | readable — this token *is* authorized on `oasistech242/nowbey` |
| Android build quota | `15/15` on the Free plan, resets 2026-11-01 |

So the old project is reachable and out of builds, and `nowbey-v3s-team` is **not** in the list. A
token that cannot reach the target account makes the relink workflow refuse before it calls
`eas init` — that is the intended behaviour, not a bug, because `eas init` would fail with the same
fact one step later.

**If the token cannot reach the target account**, replace the repository secret with a token
created while logged in as an account that can create projects in `nowbey-v3s-team`
(expo.dev → Account settings → Access tokens). From a terminal that is logged in:

```bash
gh secret set EXPO_TOKEN --repo g4tech9-hash/nowbey-v2   # paste the token at the prompt
```

Never put it in a `.env` file, a workflow file, a commit, or a chat message: `EXPO_TOKEN` exists in
exactly one place, the GitHub Actions secret. `EAS_BUILD_USERNAME` is not used anywhere in this
repository and there is no `.easrc`, `.env` or local credential file in the tree (the only env
templates are `.env.example` files, and `expo/.env.example` now says so explicitly).

## 3. Do the move

### Option A — the **Link EAS project** workflow (recommended)

`.github/workflows/eas-link.yml`. It runs where expo.dev is reachable and where the token already
lives, and it never builds anything.

1. **Actions → Link EAS project → Run workflow**
   * `owner`: `nowbey-v3s-team`
   * `project_id`: leave empty to **create** `@nowbey-v3s-team/nowbey`, or paste a UUID to link an
     existing project.
   * `dry_run`: `true` first if you only want the report (nothing is created, nothing is written).
2. The job:
   * asserts the token can reach `owner` (and names the accounts it can reach when it cannot);
   * reads the plan's remaining builds — informational, never a failure;
   * runs `eas init --account nowbey-v3s-team --force --json`, which creates or links the project
     and writes `extra.eas.projectId` into `expo/app.json` (`--force` is what allows a config
     already linked elsewhere to move; `--json` implies non-interactive);
   * runs `node scripts/eas-relink.js --owner nowbey-v3s-team --project-id <uuid>`, which writes
     `owner` and `updates.url` so all three fields agree;
   * reads the config back through Expo's own loader (`npx expo config --type public --json`) and
     fails if the resolved `owner`, `projectId` or `updates.url` is not the requested one;
   * runs the APK preflight, then `eas project:info` — the call that used to fail as
     `AppEntity[…] Not Authorized`;
   * opens a **pull request** `eas/link-nowbey-v3s-team` with the `app.json` change. It never
     pushes to `master`, and a patch artifact is uploaded even if the PR cannot be opened.
3. Review and merge the PR. That is the whole move.

From a terminal the same thing is one command (push permission is enough):

```bash
scripts/eas-dispatch.sh link nowbey-v3s-team
DRY_RUN=true scripts/eas-dispatch.sh link nowbey-v3s-team    # report only
```

### Option B — a machine that is logged in to Expo

```bash
cd expo
npx eas-cli@latest whoami                       # who am I, and which accounts can I reach?
npx eas-cli@latest init --account nowbey-v3s-team --force --json
npx eas-cli@latest whoami                       # unchanged, but now confirm the project:
npx eas-cli@latest project:info
node scripts/eas-relink.js --owner nowbey-v3s-team
node scripts/eas-relink.js --check --owner nowbey-v3s-team
npx expo config --type public                   # the config EAS actually resolves
node scripts/preflight-apk.js
```

`eas init` writes `owner` and `extra.eas.projectId`; it does **not** write `updates.url`, which is
why the relink script is a separate step and why skipping it leaves OTA updates on the old project.

Local CLI hygiene, when `eas whoami` names the wrong account: `eas logout && eas login`, then
`eas whoami` again (a stale session is the usual cause; nothing in the repository caches it — there
is no `.easrc` and no committed `.expo/` state).

There is **no `eas switch` command** in eas-cli 25.2.0 (`eas --help` has no `switch`; it answers
`Command switch not found`). Account selection is per login or per command: `eas login` /
`eas account:login`, then `--account <name>` on the command that needs it, or the `owner` field in
the config. `eas build:configure` only verifies/creates `eas.json`; with the committed
`expo/eas.json` it reports that the project is already configured, and it is **not** a link check —
`eas project:info` is.

### Option C — transfer the existing project instead

expo.dev → project → Settings → **Transfer project** (available while you can administer both
accounts) moves `oasistech242/nowbey` to `nowbey-v3s-team` **keeping the UUID**. If that is used,
`expo/app.json` needs no change at all: `owner` may be updated to the new account for clarity, and
`projectId`/`updates.url` stay as they are. `node scripts/eas-relink.js --check` keeps passing
throughout, which is exactly how to tell a transfer (UUID unchanged) from a recreate (new UUID).

## 4. Verify — in this order

| Check | Command | Expected |
| --- | --- | --- |
| Config is internally consistent | `cd expo && npm run eas:check` | `EAS link is intact` |
| Config is linked to the intended account | `cd expo && npm run eas:check -- --owner nowbey-v3s-team` | `PASS owner nowbey-v3s-team` |
| Expo's own resolver agrees | `cd expo && npx expo config --type public` | `owner`, `extra.eas.projectId`, `updates.url` as committed |
| APK preflight | `cd expo && npm run preflight:apk` | `PREFLIGHT PASSED` |
| Token is the right account | `scripts/eas-dispatch.sh account` | the account that owns the project is in the reachable list |
| Token can read the project | `eas project:info` (logged in) or the workflow step of the same name | project name, not `Entity Not Authorized` |

Until the read-only check is green, **do not fire a `mobile` dispatch** — it would spend an archive
upload only to be refused. The local Gradle fallback is unaffected by any of this and needs no
account:

```bash
scripts/eas-dispatch.sh fallback
```

## 5. What the scan of the repository found

Every reference to the old account, and its disposition:

| File | Reference | Disposition |
| --- | --- | --- |
| `expo/app.json` | `owner: "oasistech242"`, `projectId 10e4a677…`, `updates.url` | still the live link — moves in one commit once the UUID exists (workflow PR) |
| `expo/app.config.js` | pass-through only | verified by test: it never overrides the link, so `app.json` is the single record |
| `expo/eas.json` | no account, no project ID | nothing to change |
| `expo/.env.example` | no token | comment added: EAS credentials are not app env vars |
| `.env.example` (root) | no EAS/Expo values | nothing to change |
| `.easrc` | does not exist | nothing to change |
| `.github/workflows/deploy.yml` | generic; reads `EXPO_TOKEN`, names no account | nothing to change |
| `.github/workflows/expo-account.yml` | reads `owner` from `app.json` at run time | nothing to change |
| `.github/workflows/eas-cancel.yml` | uses `EXPO_TOKEN` only | nothing to change |
| `scripts/eas-dispatch.sh` | no account baked in | gained `link` |
| `expo/scripts/preflight-apk.js` | deliberately account-agnostic (PR #53) | nothing to change |
| `tests/preflight-apk.test.mjs`, `tests/expo-account.test.mjs` | prove the tools do not pin the account | unchanged, still pass |
| `docs/EAS_MIGRATION_HANDOFF.md` | "must be able to build for `oasistech242/nowbey`" | points at this document instead |
| `TODO_HUMAN.md` | the October 2026 refusal log | new dated status block added |
| `V2_UI_Backup/expo/app.json` | the rollback snapshot | intentionally untouched — it is a snapshot of the old tree |

## 6. Rollback

The move is one commit. Before it lands, `git revert`/close the PR is a complete rollback. After it
lands, reverting `expo/app.json` restores the old (still existing) project, and nothing on expo.dev
was deleted — `eas init` creates, it never moves or removes the old project.

One consequence worth stating plainly: an APK built before the move has the old `updates.url` baked
into its native binary and keeps using it. New builds use the new project. Since NowBey ships
direct APKs and test installs only, that only matters for whoever is holding an old test build.
