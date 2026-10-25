# “Alert me when I drive into a hazard area” — how hard is it, really?

You asked about the background-location option: alerting users **as they enter** an area with an active hazard. Short answer:

| Part | Difficulty | Time |
|---|---|---|
| The code in Expo (geofencing) | **3 / 5** — very buildable | ~2–4 dev days + several days of drive-testing |
| Getting Google Play to approve it | **5 / 5 before launch** | Declaration + demo video + extra review cycle(s); rejections common |
| **Recommended launch path** | Ship foreground-only v1 + **watch-zone push alerts** (below) | ~1–2 dev days, **zero** new permissions |

**Recommendation: do not put background location in the first Play release.** On a brand-new personal developer account it stacks Google's most sensitive permission review on top of the 12-tester/14-day gate and first-app review — three separate ways to lose weeks. Get production live and stable, then add it as a declared v1.1 feature with real usage evidence. Nothing in the launch build below blocks adding it later (it needs a fresh native build, not an OTA).

## What the app does today (audited)

Foreground-only, by tap: `requestForegroundPermissionsAsync()` + one balanced-accuracy fix when a reporter taps *Use my location*. No `expo-task-manager`, no background code, and the privacy policy explicitly promises “We do not track you in the background.” Entry alerts are therefore a **net-new feature + a privacy-promise change**, not a switch to flip.

## If you build it later — the honest implementation sketch

**Pattern choice.** Use `expo-location` **geofencing** (`startGeofencingAsync`), not continuous background location updates. Android's geofence service does the watching in low-power system code and wakes your app on entry; continuous updates require a persistent foreground-service notification (“NowBey is watching your location”) hanging on the user's phone all day, plus a separate Play foreground-service declaration. Geofences are capped (~100 regions/app), and hazard pins churn — so the app periodically syncs *the nearest confirmed, unexpired incidents* as regions (lat/lng + radius ~300–500 m) and refreshes that set when the app is opened and via a fetch after each entry event.

**Changes required (NOT applied in this branch):**

1. `npx expo install expo-task-manager` (background tasks cannot run without it; tasks must be defined at the top level of the app entry so they exist when Android cold-starts the JS for a geofence event).
2. `app.json` — expo-location plugin: `isAndroidBackgroundLocationEnabled: true`; remove `ACCESS_BACKGROUND_LOCATION` (and possibly `FOREGROUND_SERVICE*`) from `blockedPermissions`; add `android.permission.ACCESS_BACKGROUND_LOCATION` to `permissions`. New native build + version/runtime bump.
3. Permission choreography: explain → request foreground → **prominent disclosure screen** → send user to system settings to choose “Allow all the time” (Android 11+ will not grant background from an in-app dialog). Handle every denial as a fully-working app.
4. Task: on `enter` transition → check the incident is still confirmed → fire a local notification (“Flooding reported near Bay — confirmed 20 min ago”) with a tap deep-link to the incident. Cooldowns so one flooded corner doesn't buzz six times.
5. Settings: an obvious on/off toggle (“Hazard entry alerts”), pause, radius choice; default **off** until the user opts in.
6. Testing that cannot be skipped: real drives past test pins on 2–3 Android versions, battery-saver/Doze behaviour, region-cap behaviour near expiry, false-positive radius tuning. Budget days of elapsed time, not an afternoon.

## What Google will demand for it

- **Background-location declaration** in Play Console: name the single core feature, why background (not foreground) is required, and upload a **screen-recorded demo video** (unlisted YouTube) showing: the prominent disclosure → the permission flow → the feature working.
- The **prominent disclosure** must appear *before* the permission ask, stand alone (not buried in terms), and state in plain words that location is collected **in the background / when the app is closed or not in use**, and why. Draft copy:
  > **Hazard entry alerts** — If you turn this on, NowBey collects your location in the background, including when the app is closed or not in use, only to warn you when you enter an area with a recently confirmed hazard. We do not sell location data or use it for ads. You can turn this off any time in Settings. [Not now] [Continue]
- **Privacy policy** must describe the background collection before the build ships (your current “we do not track you in the background” sentence must be replaced in the same release — form, policy and binary in lockstep, as always).
- Expect the reviewer question “could this work with less-invasive means?” Your truthful answer is that watch-zone push (below) covers home/work, while entry alerts cover **travel through unfamiliar areas** — keep that narrative consistent everywhere, or the declaration reads as opportunistic.

## The alternative that covers most of the value now: watch zones (recommended for v1.x)

Let users save **Home / Work / School-run** points (picked on the map; foreground location optional) with a radius. Your backend already sends island/category email alerts and collects Expo push tokens — add: on a newly **confirmed** incident, push to users whose zone contains it.

|  | Entry alerts (background) | Watch zones (server push) |
|---|---|---|
| New permission | ⛔ Background location + declaration + video | ✅ None |
| Covers drive to unfamiliar areas | ✅ | ❌ (map still shows all when opened) |
| Covers home/work/school — the daily Bahamas commute | ✅ | ✅ |
| Battery / trust story | “App watches me all day” | “App watches my places” |
| iOS later | Separate Always-authorization battle | Same push code path |
| Effort | 2–4 dev days + approval risk | ~1–2 dev days on existing alert infra |

## Decision gate for adding true entry alerts (all should be true first)

- [ ] Production is live, with one stable release and healthy Android Vitals
- [ ] Real users/testers have asked for en-route alerts (your declaration evidence)
- [ ] Watch zones shipped and insufficient for a named use case
- [ ] You can film the demo video on a real device and keep a tester or two driving test pins during review
