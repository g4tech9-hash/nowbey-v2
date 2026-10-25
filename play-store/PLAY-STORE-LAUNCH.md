# NowBey → Google Play: launch walkthrough

Prepared 25 October 2026 for the Expo app in `expo/`:

- App: **NowBey**
- Android package: **`app.nowbey.mobile`**
- Expo project: **@nowbey-v3s-team/nowbey** (`7c347b21-e481-4485-9512-4bdd64eb19a5`)
- Store-debut version in config: **1.3.0**
- Backend/API and live privacy policy today: `https://nowbey-v2.vercel.app`

> **Source note.** This checkout originally came from `master`, which did **not** contain the Expo app. The newest source-bearing branch found on GitHub was `arena/b4cf0b28-nowbey-v2`; its `expo/` folder has been brought into this branch so the store configuration edits below are real and reviewable. The website source itself was not copied over; the Play launch only needs the deployed website for the privacy/delete-account URLs.

## The short version

Your current preview build is an **APK**. Google Play requires new apps as an **Android App Bundle (.aab)**. This branch now has an EAS `production` profile that builds that bundle. Do not spend another preview build if what you need is a Play upload.

Because you do **not** have a Play Console account yet, the longest part is not the build. If you register as a **new personal account**, Google requires **12 closed-test testers opted in continuously for 14 days** before you can even apply for production access. Build reviewer time around that and the realistic end-to-end launch window is **about 3–6 weeks**. An **organization account** is exempt from that tester gate, but requires organization verification with a D‑U‑N‑S number.

**Rule of thumb for this guide:**

- Human-only items are marked **[YOU]**.
- Anything already changed in this branch is marked **[DONE IN BRANCH]**.
- Start the developer-account work first; its clocks run while you do the technical steps.

Authoritative references used for the current gates:

- Target API 36 for new apps since 31 Aug 2026: <https://support.google.com/googleplay/android-developer/answer/11926878?hl=en>
- 12 testers / 14 days for new personal accounts: <https://support.google.com/googleplay/android-developer/answer/14151465?hl=en>
- EAS Submit for Android: <https://docs.expo.dev/submit/android/>

---

## Phase 0 — Decide these before you pay the US$25

### 0.1 Personal vs organization account — choose once, deliberately **[YOU]**

Your app and website name **Oasis Technology** as the operator. That makes this a real decision, not a formality. You generally cannot turn a personal account into an organization account later; changing later usually means a new account and an app transfer.

| Route | Pick it if… | Cost / proof | Production gate | Public listing shows… |
|---|---|---|---|---|
| **Personal** | Oasis Technology is a trade name / unincorporated, or you need to move now | US$25 once + personal government ID verification | **12 testers × 14 days**, then production-access application | Your legal person details per Google's developer-profile rules (at minimum legal name/country; verify what the signup flow discloses) |
| **Organization** | Oasis Technology is a registered company/legal entity with documents and you want the business shown as developer | US$25 once + organization verification + **D‑U‑N‑S number** | **Exempt** from the 12×14 gate | Organization legal name and address |

Free D‑U‑N‑S issuance can be fast or can take weeks, so if you want the organization route, request it **before** (or while) doing the build work. If Oasis Technology is not formally registered, do not invent an organization in Play Console — use personal now and accept the closed-test period.

This walkthrough's mainline assumes **personal** because you said no account exists yet. Where the organization route differs, it is called out.

### 0.2 Lock the public identity details **[YOU]**

Before creating the listing, settle these and use them consistently everywhere:

1. **One monitored support email.** Right now the live privacy page shows `g4tech9@gmail.com`, while the app code fallback is `oasistechnology242@gmail.com`. Pick one address, set it on the website (`SUPPORT_EMAIL`), and use the same address in Play Console. Reviewers and users will email it; an unmonitored inbox is a launch risk.
2. **Privacy URL.** `https://nowbey-v2.vercel.app/privacy` is live today. `nowbey.com/privacy` could not be verified from this workspace. **Do not enter `nowbey.com/privacy` in Play Console until it visibly loads in a private browser window.** You can start with the `vercel.app` URL and change it later when the custom domain is attached.
3. **Free means free.** Create the app as **Free**. A free app can never later be changed to paid; if monetization comes, it must be subscriptions/in‑app products later, not an install price.
4. **Package name is forever.** `app.nowbey.mobile` must match exactly in `expo/app.json`, the first uploaded bundle, and Firebase. Once the first bundle is uploaded to a Play app entry, that package cannot be changed.
5. **Countries.** Start paid‑attention small: production in **Bahamas** first (add the United States later if diaspora demand is real). For closed testing, also include any other country where a recruited tester physically is, or they will not be able to install the test build.

### 0.3 Decide the age audience now **[YOU]**

Current privacy copy says “not for children under 13.” Before you open the Target Audience form, decide whether NowBey is:

- **18+ only** (cleanest for a public UGC/location app), or
- **13+** (then your terms, sign‑up flow, moderation and Play answers must consistently support minors 13–17).

Do not select “18+” in Play while the product invites 13‑year‑olds, or the reverse. The worksheet in `data-safety-worksheet.md` records the answers for the 18+ route and flags what to change if you choose 13+.

---

## Phase 1 — Create and verify the Play Console account **[YOU]**

Start this on day one; verification time is not under your control.

1. Sign in with the Google account that should own NowBey long‑term. Avoid a personal mailbox you might lose. Turn on **2‑Step Verification** on that Google account and store recovery codes in your password manager.
2. Go to Play Console signup, choose **personal** or **organization** (see Phase 0), pay the one‑time **US$25** with a card in the account holder's name where possible.
3. Complete developer verification exactly as prompted. Be ready with government ID (Bahamas passport/driver's licence), legal address/contact details, and — for organization — the D‑U‑N‑S number and company documents.
4. If Google asks you to verify with an Android device / the Play Console app, use a physical Android phone signed into the **same developer Google account**. Testers later install with their own accounts; the owner device is only for verification and your own QA.
5. Fill the developer profile contact email with the single monitored support address from Phase 0. Check the preview of what will be public before submitting.
6. Keep the verification confirmation email. Do not create a second “backup” developer account to dodge a delay — duplicate accounts create worse problems.

**Exit check:** Play Console opens, the account shows verified/active, and **Create app** is available.

---

## Phase 2 — Build the store binary (.aab)

### 2.1 What changed in this branch **[DONE IN BRANCH]**

| File | Change | Why |
|---|---|---|
| `expo/` | Brought in from `arena/b4cf0b28-nowbey-v2` | `master` had no app source to patch |
| `expo/eas.json` | Added a real `production` profile: `distribution: store`, Android `buildType: app-bundle`, `channel: production`, `autoIncrement: true`; added update `channel` to preview/development; added `submit.production.android` → internal track | The GitHub copy of `eas.json` had **no production profile and no channels** (your Windows‑side EAS fix was never committed back to GitHub) |
| `expo/app.json` | Version **1.3.0**; `blockedPermissions` denies background location, foreground‑service location, broad media/storage, camera, microphone and Ad ID; `expo-location` background explicitly off; notification icon/color wired | Keeps the Play manifest to what the code actually uses and isolates production OTA from sideloaded 1.2.3 APKs (runtime policy is `appVersion`) |
| `expo/assets/notification-icon.png` | New 96×96 white pin silhouette | Android status‑bar notifications need a monochrome small icon; without one you get a muddy tinted app icon |
| `expo/.easignore` | New; restates `.gitignore` secrets but lets `google-services.json` reach the EAS worker | `.gitignore` rightly excludes the Firebase file from Git; EAS would then also exclude it from the build archive |
| `.github/workflows/eas-production-aab.yml` | New manual‑only workflow | One‑button production bundle using your existing `EXPO_TOKEN` + `FIREBASE_GOOGLE_SERVICES_JSON` secrets |
| repo root `eas.json` | **Deleted** | It was a third, stray variant. The only canonical file is `expo/eas.json`; a root copy invites editing the wrong file |

Expo SDK **57.0.29** targets **Android API 36**, which is the current floor for a new app. Still prove it on the artefact (Phase 3): never trust a config file over the uploaded bundle.

### 2.2 One important non-change — for now

`EXPO_PUBLIC_API_BASE` stays `https://nowbey-v2.vercel.app`, because that is the backend that is verifiably live. When `nowbey.com` is attached to the same deployment and `/privacy` loads there, change **all three** env blocks in `expo/eas.json` and `extra.apiBase` in `expo/app.json` together, then rebuild. Do not point the store build at a domain you have not opened on your phone.

### 2.3 Firebase / push prerequisites **[YOU]**

The app references `./google-services.json` and uses Expo push tokens (`getExpoPushTokenAsync`). That file is never committed; CI writes it from `FIREBASE_GOOGLE_SERVICES_JSON`, and for a local build you must place it at `expo/google-services.json` yourself.

Also verify the **FCM v1 server credential** exists on EAS, or production push tokens will register but pushes will not send:

```powershell
cd expo
npx eas-cli@latest credentials --platform android
# production → check for the FCM Google Service Account Key
# if missing: Firebase Console → Project settings → Service accounts → Generate new private key,
# then upload that JSON as the FCM key here.
```

This Firebase service‑account JSON is **not** the same thing as the Play submission service‑account key in Phase 6. Do not swap them, and never commit either.

The classic “add the Play signing SHA‑1 to Firebase or login breaks” gotcha does **not** apply to NowBey today: there is no Firebase Auth and no Google Maps Android key in the app (the map is Leaflet/OpenStreetMap‑family tiles in a WebView; Google sign‑in is website OAuth returning to `nowbey://auth`). Still record the Play signing fingerprints in Phase 3; the day you add Firebase Auth or a restricted Google API key, you will need them.

### 2.4 Build it — pick one route **[YOU]**

**Route A — GitHub (recommended; matches your existing pipeline).**
Merge this branch to the default branch first (GitHub only offers manual workflows that exist on the default branch), then:

`Actions → EAS production AAB (Google Play) → Run workflow`

It installs `google-services.json` from the secret, type‑checks, runs the EAS production build, and prints the `.aab` download URL.

**Route B — local terminal (Windows or any machine with the repo).**

```powershell
cd expo
# ensure expo\google-services.json exists locally (from Firebase Console) — never commit it
npm ci
npx tsc --noEmit
npx eas-cli@latest whoami            # must be able to act for nowbey-v3s-team
npx eas-cli@latest build --platform android --profile production --non-interactive --wait
```

The first production build makes EAS generate your Android **upload keystore**. Immediately afterwards:

```powershell
npx eas-cli@latest credentials --platform android
# production → view/download the upload keystore details; store the export + passwords in your password manager
```

Google holds the final app‑signing key under Play App Signing, and a lost upload key can be reset with Google support — but “resettable with paperwork during a hurricane” is not a backup strategy.

**Quota note.** Your October EAS report showed 3 of 15 free Android builds used, resetting 1 Nov. Do ordinary QA on the `preview` APK, use `eas update` (free, JS/asset fixes) where possible, and spend a production build only when native/config changes are settled. Any change to `app.json` native fields, plugins, icon or permissions needs a new bundle; JS/copy fixes after release go over‑the‑air on the `production` channel.

**Exit check:** EAS shows a finished **production** Android build and you can download an **`.aab`** (not `.apk`) for version 1.3.0.

---

## Phase 3 — Create the Play app and upload to Internal testing **[YOU]**

1. Play Console → **Create app**:
   - App name: use the title in `store-listing.md` (*NowBey — Bahamas Safety Map*) — it can be polished later.
   - Default language: English (United States) is fine for Bahamian English.
   - **App** (not game) · **Free**.
   - Accept the declarations truthfully.
2. Turn on **Managed publishing** (Play Console publishing overview). This stops an approved release going live at 3 a.m. before your social posts — you press the final button.
3. Go to **Test and release → Testing → Internal testing → Create new release** and upload the `.aab` **manually this first time**. Manual first upload is deliberate: you see the warnings with your own eyes and consciously accept **Play App Signing** (Google's default). Automate from upload #2 with EAS Submit.
4. On the release summary / **App Bundle Explorer**, verify and screenshot for your records:
   - Package `app.nowbey.mobile`
   - Version name 1.3.0 and the auto‑incremented version code (remote source was at 4 in October, so expect 5 unless another build consumed one)
   - **Target API 36**
   - Permissions list: expect foreground coarse/fine location, notifications and ordinary network/service permissions — and **no** background location, camera, microphone, broad media or Ad ID. If any blocked permission appears, stop and fix the config before going further.
5. Open **Release → Setup → App signing** and save the **app signing key** SHA‑1/SHA‑256 and the **upload key** fingerprints to your password manager.
6. Add internal testers (your own Gmail + 1–2 trusted Android users), publish the internal release, open the opt‑in link on a physical phone, **Become a tester**, install from Play, and run this smoke list:
   - Map loads tiles and centres on New Providence (reviewers may be outside the Bahamas; the default view must still make sense).
   - Deny location → you can still browse and place a report without GPS.
   - Allow location only from the report flow's *Use my location* tap; no “Allow all the time” ask anywhere.
   - Create a throwaway account, post/confirm, flag a comment, block a user.
   - Receive a real push notification (small icon should be the white pin).
   - Google sign‑in round‑trip returns to the app (`nowbey://auth`).
   - **You tab → Delete my account** truly deletes and signs you out.
7. Read the **Pre‑launch report** (crashes, accessibility, performance). Fix crashes before closed testing; note warnings you consciously accept.

**Exit check:** one physical Android phone is running the **Play‑installed internal build**, not a sideloaded APK.

---

## Phase 4 — Store listing **[YOU, copy/assets provided]**

Everything to paste is in **`store-listing.md`** — title, short/full description (character‑checked), release notes, category, contact fields and a screenshot shot list.

Provided in `play-store/assets/`:

- `icon-512.png` — 512×512 listing icon composited from your actual adaptive icon on its `#03121b` background (matches what users see in the launcher).
- `feature-graphic-1024x500.png` — 1024×500 graphic made from the launch‑kit cover.

Not provided, on purpose: **screenshots**. Play screenshots must show the real app. Your kit's 1080×1080 social posts are designed marketing frames, not evidence of the UI. Capture 5–6 portrait screenshots (1080×1920 recommended) from the internal build following the shot list in `store-listing.md`. Use real Nassau content, scrub personal emails/handles you do not own, and keep any caption text truthful about what is on screen.

Listing rules to respect in every field: never write “official”, never imply a government/emergency‑services connection, never promise to keep people safe, no “#1/best” claims, no keyword lists. NowBey's honest line — community reports that neighbours confirm — is also the compliant one.

---

## Phase 5 — “App content” forms (where first launches actually get stuck) **[YOU]**

Work through **Policy → App content** top to bottom. The decision‑grade answers are written for you in **`data-safety-worksheet.md`** and **`reviewer-notes.md`**; this is the map:

| Play form | NowBey answer (summary) | Prepared in |
|---|---|---|
| Privacy policy | `https://nowbey-v2.vercel.app/privacy` today (swap to `nowbey.com` only when verified live) | Worksheet §5 (three small accuracy edits to make first) |
| App access | “Some functionality is restricted”: browsing needs no login; posting/gas/reactions need an account → supply the dedicated reviewer account | `reviewer-notes.md` |
| Ads | Answer **No** only after confirming the Android build renders no promotional/sponsored cards; if “house ads” actually render in‑app, declare **Yes** | Worksheet §4 |
| Content rating (IARC) | UGC category; users can interact/exchange content and share a chosen pinned location; no in‑app purchases in the Android app | Worksheet §4 |
| Target audience | Per your Phase 0.3 decision (worksheet is written for 18+) | Worksheet §4 |
| News app | **No**, provided the listing does not market NowBey as a news outlet (the prepared copy says “community wire”, not news). If you decide the Wire *is* a news product, declare Yes instead and complete that form | `store-listing.md` |
| Data safety | Field‑by‑field table derived from the code (email/handle, user content, tap‑only precise location, push token, error logs; nothing sold; no third‑party ad/analytics SDKs) | `data-safety-worksheet.md` |
| Account deletion URL | Deploy `play-store/web/delete-account/page.tsx` to the website as `/delete-account`, then enter that URL | §5.1 below |
| Government app | No | — |
| Financial features | No (crowdsourced gas prices are information, not a financial service; no purchases inside the Android app) | — |
| Health apps | No health features | — |
| Advertising ID | No (the permission is blocked in `app.json`) | Phase 2 |

### 5.1 Deploy the web account‑deletion page before you submit anything for review **[YOU]**

In‑app deletion already exists (You tab). Play additionally requires a **web** deletion link in the Data Safety form. A ready‑made page is in this repo at `play-store/web/delete-account/page.tsx`. In the website source, copy it to `src/app/delete-account/page.tsx`, deploy, and confirm `https://nowbey-v2.vercel.app/delete-account` loads signed‑out in a private window. That exact URL goes into Play Console.

### 5.2 Create the reviewer account before you submit **[YOU]**

Register one ordinary (non‑staff) account on the production backend solely for Google's reviewers, confirm its email, and never delete or change its password casually. Google tests from outside The Bahamas, at odd hours, sometimes weeks later on an appeal. Paste its credentials into the App Access form using the text in `reviewer-notes.md`. A dead demo login is the most avoidable rejection there is.

### 5.3 One payments trap to check in the release candidate **[YOU]**

The Android app correctly shows no prices and no buy buttons. Google's payments policy also cares about **links that walk Play users out to a web checkout for digital features**. On the internal build, tap every “on the website” button (account settings, photo posting) and note where you land. If any landing page pushes a paid‑plan checkout to a Play user, change that destination before submission. Selling plans on the web is your business; steering the Android app's users to that checkout is Google's.

---

## Phase 6 — Automate uploads with EAS Submit (from upload #2) **[YOU]**

1. In Google Cloud Console, create/select a project and create a **service account** (e.g. `play-uploader`). Create a JSON key. This is a password‑grade secret.
2. In Play Console → **Setup → API access**, link that Cloud project; then **Users and permissions** → invite the service‑account email with access **only to NowBey** and only the release permissions it needs (view app information, create/edit/release testing‑track and production releases). Never grant account admin to an upload robot.
3. Upload the key to EAS (do not put it in Git — `expo/.easignore` also excludes it):

```powershell
cd expo
npx eas-cli@latest credentials --platform android
# production → Google Service Account → set up the key for Play Store submissions → give the JSON path
```

4. Thereafter, after each production build:

```powershell
npx eas-cli@latest submit --platform android --profile production --latest --non-interactive
```

`expo/eas.json` sends submissions to the **internal** track as completed releases. You then promote in Play Console (internal → closed → production). Keep that human gate; “the robot shipped to production” is a bad story. To submit straight to a closed track later, override the track deliberately rather than editing the default.

---

## Phase 7 — Closed test: the 12‑tester / 14‑day gate (new personal accounts)

*Organization/pre‑Nov‑2023 personal accounts: skip to Phase 8; running this as a beta is still good practice.*

Follow **`closed-test-plan.md`** for recruiting, the WhatsApp/Facebook copy, the day‑by‑day engagement calendar and the production‑access answers. The mechanics:

1. **Test and release → Testing → Closed testing** (the default *Alpha* track) → **Testers**: create an **email list** of recruited testers' Google account addresses. Recruit **20**, because you need **12 who stay opted in for the full 14 days** and people drift.
2. **Countries/regions** on the closed track: Bahamas plus any tester country.
3. Create the closed release from the same bundle you validated internally. Add a feedback email (your monitored support address). Closed releases go through review — allow days, not minutes, on a brand‑new account.
4. Send testers the opt‑in link with the exact 3‑step instructions from the plan: open link with the **same Google account as their Play Store app** → *Become a tester* → install **from Play**. Invited‑but‑not‑opted‑in does not count; sideloading the old APK does not count.
5. Your clock is only real once **12 testers are opted in**. Aim to have all 12 inside the first 48 hours, then hold them: keep the app installed, open it across the fortnight, ship **two visible updates** during the test (e.g. day 5 and day 11) in response to feedback. Google's production‑access questionnaire asks what testers said and what you changed — “nothing, we just waited” reads exactly like that.
6. After 12 testers have **14 continuous days** each, apply from the **Dashboard → Apply for production**. Use the draft answers in `closed-test-plan.md`, customised with your real feedback. Google typically answers within about a week; a refusal usually means “test more, with evidence”, not exile.

Do **not** buy tester‑farm installs. Twelve real Nassau Android users who actually confirm reports are both your pass evidence and your launch community.

---

## Phase 8 — Production release **[YOU]**

1. Confirm the listing (Phase 4), every App Content form (Phase 5) and Data Safety show complete, and the production‑access gate (Phase 7) is approved if it applied.
2. **Test and release → Production → Create new release**: promote the tested bundle (promoting the exact closed‑test artefact beats building a fresh one). Release notes are in `store-listing.md`.
3. Countries: **Bahamas** at launch. Rollout: 100% is acceptable for a small launch, but 20–50% staged for 48 hours is cheaper insurance — watch **Android Vitals** and your server error log before completing rollout. Keep Managed publishing on so approval ≠ surprise launch.
4. Submit for review. First production review on a new account commonly takes several days and can take longer. Answer any policy email from the **Policy status** page with specifics (the UGC/moderation text in `reviewer-notes.md` is written for that reply), not feelings.
5. When approved and you are ready: **Publishing overview → publish**, aligned with Day 1 of your social kit. Then verify from a phone that has never seen the APK: search “NowBey” in Play, install, and run the Phase 3 smoke list once more.

---

## Phase 9 — After you are live

- **OTA updates:** JS/asset fixes ship without review:
  `npx eas-cli@latest update --channel production --environment production --message "..."`.
  Native changes (permissions, plugins, icon, new native module) require a new production `.aab` and Play review. Never push an OTA that changes what data you collect without updating Data Safety + privacy first.
- **Version discipline:** user‑facing version in `expo/app.json`; version **code** is remote/auto‑incremented by EAS. Never hand‑lower either. Runtime version follows the app version, so bump the version when native code changes.
- **Moderation is a store obligation now:** work the flag queue to a <24‑hour habit (see `reviewer-notes.md`). UGC apps get re‑reviewed off user reports.
- **Watch:** Android Vitals (crash/ANR), Play reviews (reply politely, never argue), your `/api/errors` admin log after every release.
- **Yearly:** target‑API floor rises every August; the Expo SDK upgrade that matches it is routine maintenance, not a rescue mission. Also keep developer verification details current — Google can hide apps from stale accounts.
- **Background “entering an area” alerts:** see `background-location-decision.md`. Short answer there: ship watch‑zone push alerts first; add true background geofencing only after production is stable.

---

## Appendix A — Human‑only checklist (nothing here can be done from this repo)

- [ ] Choose personal vs organization; if organization, obtain D‑U‑N‑S
- [ ] Pay US$25 and pass developer verification
- [ ] Pick the one support email; set `SUPPORT_EMAIL` on the website
- [ ] Verify FCM v1 key on EAS; confirm a real push arrives
- [ ] Run the production build (Actions button or terminal) and back up the upload keystore
- [ ] Play Console: create app, upload `.aab`, record signing fingerprints
- [ ] Deploy `/delete-account` page; verify it loads signed‑out
- [ ] Make the three privacy‑page accuracy edits (worksheet §5) and redeploy the site
- [ ] Create the reviewer account; put its credentials in App Access
- [ ] Capture Play screenshots from the internal build
- [ ] Complete listing + App Content + Data Safety
- [ ] Recruit ~20 closed testers (personal route); keep 12 opted in for 14 days
- [ ] Apply for production access; then submit production for review
- [ ] Publish, install from public Play, smoke‑test

## Appendix B — If Google rejects or asks questions

| Likely theme | First move |
|---|---|
| “Cannot access features / login” | Re‑test the reviewer account yourself from a signed‑out phone; fix credentials in App Access; note browsing needs no login |
| UGC objectionable content | Reply with the moderation summary in `reviewer-notes.md` (terms gate, flag reasons, block, admin queue, <24 h handling); remove the flagged item and say so |
| Location permission | Point to tap‑only foreground use on the Report screen, the permission string, and the privacy paragraph; there is no background location in this build |
| Data Safety mismatch | Re‑audit against `data-safety-worksheet.md`; the form, the privacy page and the binary must tell one story |
| Misleading/safety claims | Remove any wording implying official or emergency use; the approved copy in `store-listing.md` is the safe text |
| Broken functionality | Check the API base in the store build and that the backend is up; reviewers test on their schedule, including during your deploy windows |
| Payments steering | Remove/re‑aim any app link that lands a Play user on a web checkout for digital features |

Appeal with evidence (build number, steps, timestamps), once, clearly. Re‑submitting an unchanged bundle at a policy wall only spends reviewer patience.
