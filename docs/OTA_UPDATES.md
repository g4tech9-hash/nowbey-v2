# Testing OTA updates

**Status 2026-10-19:** the OTA plumbing in this repository is complete and pinned by
`tests/ota.test.mjs`, but **no update can be published or received yet**: `expo/app.json` has
`extra.eas.projectId: null` and **no `updates.url` key at all**, because the project has not been
created under `nowbey-v3s-team` (`docs/EAS_ACCOUNT_RELINK.md`). With the key absent, expo-updates
resolves `ENABLED="false"` in the native manifest, so every build made today has OTA cleanly switched
off.

`updates.url` is *absent* rather than `null` on purpose — a literal `null` builds a broken APK. See
§1b; that is the one finding here worth reading before touching the link.

Step 2 below is the only blocker. Everything after it works once the link exists.

All eas-cli commands and flags here were checked against the published command surface of
**eas-cli 25.2.0**, and the expo-updates behaviour against **expo-updates 57.0.26** and
**@expo/config-plugins** — read out of the published packages, not recalled. The manifest contents
quoted below were produced by actually running `expo prebuild` in this repository.

---

## 1. What actually decides whether an update arrives

Four independent facts, in four different places. An update needs all four; missing any one fails
**silently** — `eas update` still succeeds and the phone simply never asks.

| Fact | Where it lives | Now |
| --- | --- | --- |
| A project to publish to, and a URL to fetch from | `app.json` → `extra.eas.projectId` + `updates.url` | **unlinked — blocking** (§1b) |
| Which branch this install listens to | `eas.json` → `build.<profile>.channel`, mirrored in `app.json` → `updates.requestHeaders["expo-channel-name"]` | `preview` ✅ |
| Which builds are eligible | `app.json` → `runtimeVersion.policy: appVersion` → runtime version `1.2.3` | ✅ |
| A release binary | not Expo Go, not a dev build, not web | depends on step 2 |

### 1b. `updates.url` must be absent while unlinked, never `null`

This is counter-intuitive and it produces a build that looks linked, so it was verified by running
`expo prebuild` in this repository and reading the generated manifest rather than reasoned about.

`@expo/config` resolves a literal `"url": null` to the empty object `{}`. `@expo/config-plugins` then
computes `getUpdatesEnabled(config)` as `config.updates.enabled ?? (getUpdateUrl(config) !== null)`,
and `getUpdateUrl` is `config.updates?.url ?? null` — an empty object is not null, so **enabled
becomes true**. With `"url": null` in `app.json`, `expo prebuild` writes:

```
expo.modules.updates.ENABLED         = "true"
expo.modules.updates.EXPO_UPDATE_URL = "[object Object]"
```

That APK believes OTA is on and tries to fetch updates from the literal string `[object Object]`.
`Updates.isEnabled` is also true in JS, so the **App update** card would report OTA as live and offer
a "Check for update" button that can only fail — the most misleading possible answer during a test.

Deleting the key instead resolves `getUpdateUrl` to `null`, so `ENABLED="false"` and no URL is
written at all:

```
expo.modules.updates.ENABLED         = "false"
```

`expo/scripts/preflight-apk.js` fails a present-and-null `updates.url`, and `tests/ota.test.mjs` pins
both the config and the script. When the project is linked, `eas-relink.js` writes a real URL string
and updates turn on by themselves — there is no separate `enabled` flag to remember, which is exactly
why the fix is "delete the key" rather than "add `enabled: false`": a stale `enabled: false` would
survive the relink (that script spreads the existing `updates` object) and silently leave OTA off
forever.

The current manifest, produced by a real prebuild of this repository, is:

| Manifest key | Value |
| --- | --- |
| `ENABLED` | `false` (unlinked — becomes `true` with a real URL) |
| `EXPO_UPDATES_CHECK_ON_LAUNCH` | `ERROR_RECOVERY_ONLY` |
| `EXPO_RUNTIME_VERSION` | `@string/expo_runtime_version` → `1.2.3` |
| `UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY` | `{"expo-channel-name":"preview"}` |
| `EXPO_UPDATE_URL` | absent |

### Why the channel is written twice

`@expo/config-plugins` has no channel logic at all — verified in the published package. The channel
reaches a binary **only** as `updates.requestHeaders["expo-channel-name"]`, stringified into the
Android manifest key `expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY` (iOS:
`EXUpdatesRequestHeaders`).

* **EAS Build** injects that header itself, from `channel` in the build profile.
* **`expo prebuild`** — the local Gradle fallback in `scripts/build-apk-local.sh` — never reads
  `eas.json`, so it takes the header from `app.json` or the APK has no channel.

Two files, one fact, no error when they disagree. `expo/scripts/preflight-apk.js` fails the build if
they drift, and `tests/ota.test.mjs` pins it.

### Why `checkAutomatically` is `ON_ERROR_RECOVERY`

The unset default is `ON_LOAD`, which config-plugins resolves to `ALWAYS` and hands to the **native**
layer: it reloads on launch. This app draws its own splash (`expo/src/Splash.tsx`) over the root
view, so a native on-load reload lands mid-animation and a *successful* update presents as a broken
splash. `ON_ERROR_RECOVERY` maps to `ERROR_RECOVERY_ONLY`, and the reload is done in JS instead —
`installUpdateOnLaunch()` in `expo/src/updates.ts`, called from `expo/app/_layout.tsx` only after the
splash has finished (or immediately when `EXPO_PUBLIC_NOWBEY_SPLASH=off`).

---

## 2. Get a real project id

The one-click path is the **Link EAS project** workflow. It creates the project on expo.dev and
rewrites `owner`, `extra.eas.projectId` and `updates.url` **together in one commit** — a half-move is
what `preflight-apk.js` refuses:

```bash
scripts/eas-dispatch.sh link nowbey-v3s-team     # Actions > Link EAS project
cd expo && npm run eas:check                     # read-only: confirms the link
npm run preflight:apk                            # must be green
```

Before spending anything, `scripts/eas-dispatch.sh account` reports which account `EXPO_TOKEN`
authenticates as, whether the project is readable, and the remaining build quota.

---

## 3. Build a release client that can receive updates

OTA never applies in Expo Go, and expo-updates is inert in a dev build. You need a release binary.

**EAS path** (Android free-plan quota is spent until 2026-11-01 per `docs/EAS_ACCOUNT_RELINK.md`):

```bash
cd expo && eas build --platform android --profile preview
```

**Local path** — works today, spends no quota, needs JDK 17+, the Android SDK and
`expo/google-services.json`:

```bash
scripts/build-apk-local.sh          # expo prebuild → ./gradlew assembleRelease
```

Both produce an APK on the `preview` channel. Install it, open **You**, and read the **App update**
card: it should show the runtime version (`1.2.3`), channel `preview`, and *embedded (shipped inside
the app)*. If it says *not an OTA build*, the project is still unlinked or you are in Expo Go.

---

## 4. Publish an update and watch it land

Make a change you can see. The **App update** card is the reliable marker — it prints the update id —
but a visible text change is worth having too.

```bash
cd expo
eas update --branch preview --channel preview --message "OTA smoke test"
```

There is **no `--runtime-version` flag** on `eas update`; the runtime version is always derived from
app config, so it publishes for `1.2.3` automatically. Do not use `--auto` here: it takes the branch
from the current *git* branch, which is not `preview` and is meaningless on a detached CI checkout.

Then background the app fully and reopen it — **twice**. Launch #1 downloads, launch #2 runs the new
bundle. The card should now read `<8-char id> (OTA)` instead of *embedded*, while **Installed
version** stays put. That split is the whole point: an OTA update changes the JS bundle and can never
change the binary's version.

In-app, **Check for update** does ask → download → restart in one step, which is faster than
backgrounding twice when you are iterating.

---

## 5. Rollback

Two different operations — pick by what went wrong:

```bash
# The update itself is bad; go back to the one before it on the branch.
eas update:rollback <groupId> --message "reverting broken update"

# The branch is bad; put phones back on the JS that shipped inside the APK.
eas update:roll-back-to-embedded --branch preview --channel preview --runtime-version 1.2.3

# Or move the channel to a branch you trust, which touches no update at all.
eas channel:edit preview --branch <good-branch>
```

Relaunch twice and confirm the card shows the older id, or *embedded* after a roll-back-to-embedded.

---

## 6. Prove runtime-version gating works

This is the test that a native-only change cannot be pushed OTA — the one that matters for store
compliance.

1. Bump `expo/app.json` → `version` to `1.2.4`.
2. `eas update --branch preview --channel preview --message "for 1.2.4 only"`.
3. On the phone still running the `1.2.3` APK: **Check for update** must report *Already the newest
   update for this runtime version*, and the card must still show the old id or *embedded*.
4. `eas update:list --branch preview --runtime-version 1.2.4` shows the new group; the same command
   with `--runtime-version 1.2.3` does not.

If step 3 delivers the update, gating is broken — stop and do not ship.

---

## 7. Debugging without a device

```bash
eas update:list --branch preview          # --all, --platform, --runtime-version also available
eas update:view <groupId> --insights      # delivery counts, per --days/--start/--end
eas channel:list
eas channel:view preview                  # which branch the channel points at
eas update:embedded:list                  # what shipped inside the binary
```

Check what got baked into an APK without installing it — the manifest carries the URL, the runtime
version and the request headers:

```bash
unzip -p expo/android/app/build/outputs/apk/release/app-release.apk AndroidManifest.xml \
  | strings | grep -i "u.expo.dev\|expo-channel-name\|1\.2\.3"
```

Ask the update server directly (EAS protocol v1). A `404` with a valid project id means "linked, no
update published for this runtime version yet" — which is a *good* result, and different from the
`Entity Not Authorized` an unlinked or mis-owned project gives:

```bash
curl -sD- -o/dev/null "https://u.expo.dev/<projectId>" \
  -H "expo-protocol-version: 1" -H "expo-platform: android" -H "expo-runtime-version: 1.2.3"
```

On device, expo-updates keeps its own log, readable from JS via `Updates.readLogEntriesAsync()` —
the fastest way to see why a check found nothing.

---

## 8. Gotchas

* **A build with no channel** — `eas update` succeeds, nothing ever arrives, no error anywhere. This
  is why the preflight fails it.
* **`--auto`** derives the branch from git. On a CI checkout (detached HEAD) that is not a branch you
  want. Pin `--branch` explicitly.
* **Reload under the splash** — see §1. Symptom: the splash flickers or freezes right after an update.
* **Dev builds and Expo Go** report *not an OTA build*. That is correct, not a bug.
* **`updates.url: null` does NOT disable OTA — it enables it against `[object Object]`.** The exact
  opposite of what it looks like; delete the key to disable updates cleanly (§1b).
* **Changing `version` changes the runtime version** (`appVersion` policy), which silently makes
  every installed build ineligible for future updates on the old runtime version. Bump it only when
  you also ship a new binary.

---

## 9. What was added

| File | Change |
| --- | --- |
| `expo/src/updates.ts` | New. `updateFacts()`, `checkAndApplyUpdate()`, `installUpdateOnLaunch()`. Never throws; answers `unavailable` when OTA cannot run rather than pretending to be up to date. |
| `expo/app/_layout.tsx` | Calls `installUpdateOnLaunch()` once the splash finishes (or at once with the splash off). |
| `expo/app/(tabs)/you.tsx` | **App update** card: running update id, runtime version, channel, installed version, and a **Check for update** button. |
| `expo/app.json` | `updates.checkAutomatically: ON_ERROR_RECOVERY`; `updates.requestHeaders["expo-channel-name"]: preview`; `updates.url: null` **deleted** (it built an enabled APK pointing at `[object Object]` — §1b). |
| `expo/eas.json` | `channel` on the `preview` and `development` profiles. |
| `expo/scripts/preflight-apk.js` | Channel present; channel agrees with app.json; `checkAutomatically` is splash-safe; `updates.url` absent-or-string (§1b); and the project link now distinguishes *deliberately unlinked* (warn) from *half-moved* (fail). |
| `tests/ota.test.mjs` | 20 hermetic tests, in `npm test`. |

`expo/app.config.js` stays a pass-through — `tests/eas-relink.test.mjs` requires that `app.json`
remains the only record of the link, so the channel could not be injected there.

## 10. Limitations

Nothing in this document was exercised against expo.dev or a physical device from this sandbox: there
is no linked project, no Expo account access and no Android device here. Steps 2–6 are derived from
the published behaviour of eas-cli 25.2.0, expo-updates 57.0.26 and `@expo/config-plugins`, and from
this repository's own preflight and tests. They have not been observed end to end. The first real run
of §4 is the actual verification, and §3's **App update** card is what makes it readable.
