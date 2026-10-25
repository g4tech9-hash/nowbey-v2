# NowBey — Data Safety + App Content worksheet

Derived from a code audit of `expo/` on 25 Oct 2026 (SDK 57.0.29 build). Data Safety is a claim about **this Android binary and what it sends**, not about the website in general. If a feature ships that changes a row below, update this sheet, the privacy page, and Play Console **before** releasing it.

Key audit findings the answers rest on:

- Location: `app/(tabs)/report.tsx` calls `requestForegroundPermissionsAsync()` + one `getCurrentPositionAsync()` **only** when the user taps *Use my location*. No watch, no background, no geofencing code exists today.
- Accounts are NowBey's own (handle/email + hashed password via your API; Google sign-in is web OAuth). Account is **optional**: browsing needs none, and hazard reports can be posted without one.
- In-app deletion exists: You tab → Delete my account (`api.deleteAccount()`).
- Push: `getExpoPushTokenAsync()` (Expo Push Service → FCM). No `@react-native-firebase` analytics/crashlytics, no ad SDKs, no third-party analytics SDKs in `package.json`.
- Error reporting: `src/errorReporting.ts` posts JS errors, stack traces, platform, app version, a random per-launch session ID and recent screen/API breadcrumbs to your own `/api/errors`.
- Map: Leaflet in a WebView; imagery/labels from Esri, streets from OpenStreetMap tiles.
- Payments: no prices, buy buttons or payment links in the Android app. Stripe exists only on the website → **not** part of this app's Data Safety answers.
- Photos: the Android app **displays** photos but cannot upload any (no image picker/camera permission; posting photos hands off to the website in a browser).

## 1) Data collected

Answer **Yes** to “does your app collect or share any of the required user data types?”, then:

| Data type | Collected? | Shared? | Required or optional | Purpose(s) | Notes |
|---|---|---|---|---|---|
| **Precise location** | ✅ Yes | No | Optional | App functionality | Only on the user's tap while reporting; the chosen pin is stored with the report and shown publicly as the *hazard's* location. Not ephemeral (it persists with the report). Tick Precise; you do not need Approximate as well. |
| **Email address** | ✅ Yes | No | Optional | App functionality · Account management | Account recovery + email alerts. Only when the user creates an account or subscribes to alerts. |
| **Name** | ✅ Yes (display name) | No | Optional | App functionality · Account management | Profile display name. |
| **User IDs** | ✅ Yes (handle + account ID) | No | Optional | App functionality · Account management | Handles are public on content unless the user posts anonymously. |
| **Other personal info** | ✅ Yes (home island) | No | Optional | App functionality | Used to aim alerts at the right island. |
| **Other user-generated content** | ✅ Yes | No | Optional | App functionality | Reports (incl. the pinned location), comments, reactions, confirmations, flags. This content is *published in the app* by design; under Google's definitions, posting publicly at the user's direction is collection, not third-party “sharing”. |
| **Device or other IDs** | ✅ Yes | No | Optional (push token) / Required (security processing) — answer the form's single choice as *users can choose* for the token and note the rest below | App functionality · Fraud prevention, security and compliance | Expo/FCM push token (only if notifications allowed); IP address processed for rate-limiting and, for anonymous actions, stored only as a one-way hash; random per-launch session ID attached to error reports. |
| **Crash logs** | ✅ Yes | No | Required (automatic) | App functionality · Analytics | JS error message + stack to your own `/api/errors`. |
| **Diagnostics** | ✅ Yes | No | Required (automatic) | App functionality · Analytics | API-failure reports with app version/platform. |
| **App interactions** (App activity) | ✅ Yes | No | Required (automatic) | Analytics | Recent screen names are attached as breadcrumbs **only when an error report is sent**. Declaring it is the conservative, honest answer. |

**Not collected (answer No):** approximate location (covered by Precise), financial info of any kind, health info, photos/videos *(Android app cannot upload — see audit note; revisit the day an image picker lands)*, audio, files/docs, calendar, contacts, SMS/call logs, web browsing history, in-app search history, installed apps, purchases/purchase history *(nothing is sold in the Android app)*.

## 2) Data shared

**None.** Google's “sharing” excludes transfers to service providers processing data on your behalf. Yours are: your host/database (Vercel/Neon), Resend (alert email), Expo + Google FCM (push delivery). Nothing is sold and there are no advertising/analytics third parties.

One judgement call to document for yourself: map tile requests go from the phone to Esri/OSM tile servers, which necessarily see the phone's IP and which map area is on screen. This sheet treats tile delivery as a service-provider transfer (map display), keeps “Shared: No”, and mitigates with explicit privacy-page disclosure (§5, edit 3). If a future lawyer disagrees, the fallback answer is *Device or other IDs — Shared — App functionality*.

## 3) Security practices section

| Question | Answer |
|---|---|
| Data encrypted in transit | **Yes** (HTTPS everywhere; `allowBackup:false` is also set) |
| Users can request data deletion | **Yes** — in-app account deletion + the web deletion page + email requests. Mirror the privacy page exactly: account data, comments, posts, photos and alert settings are deleted; hazard reports are kept **with the name removed** (neighbours confirmed them) |
| Account creation methods | Username/password (handle/email) + OAuth (Google) — if the form asks |
| Delete-account URL | `https://nowbey-v2.vercel.app/delete-account` **after** you deploy the supplied page |
| Committed to Play Families Policy | Only asked if you target children — No/N/A on the 18+ route |
| Independent security review | No |

## 4) The other App Content forms

**Ads.** The Android code contains no ad components, but the You tab says “Free plan, with house ads.” On the internal build, scroll the feed/wire and confirm whether any promotional/sponsored cards actually render. **Nothing renders → declare No** (and fix that copy in your next OTA so the app stops contradicting the form). **House/sponsor cards render → declare Yes** (“contains ads”); Google counts house ads. Decide from the release candidate, not from intention.

**Content rating (IARC questionnaire).** Choose the social/UGC category. Truthful answers: users **can** interact and exchange content (comments, reactions); the app **does** show other users a location the reporter chose to pin; no violence/sexual content/gambling/profanity *provided by you* (user text is covered by the interaction questions); no digital purchases **in the Android app**; it is not a web browser. Expect a Teen-to-17+ style outcome with “Users Interact / Shares Location” descriptors — accept what IARC returns and never edit answers to chase a lower rating.

**Target audience.** This sheet assumes **18 and over** only, “does not appeal to children”. If you instead intend 13+, update the privacy/terms age lines and sign-up copy to match, select 13–15/16–17/18+, and expect child-safety questions for a social/UGC app. Never select an under-13 group without entering the Families programme deliberately.

**News app.** No — on the condition in `store-listing.md` (primary purpose is the community safety map; the Wire is community notices, and the listing never markets a news outlet).

**Advertising ID.** No — `com.google.android.gms.permission.AD_ID` is blocked in `app.json` and no SDK uses it.

**Permissions declarations.** None owed for this build: no background location, no exact-alarm/media/foreground-service special permissions in the manifest. If Play's upload check disagrees with the permission list in App Bundle Explorer, the bundle wins — fix config and rebuild.

## 5) Privacy-page accuracy edits (make these on the website before submitting)

Your live policy at `nowbey-v2.vercel.app/privacy` is 90% there (named operator, tap-only location, deletion + anonymised-report retention, no sale, under-13 line, 919/911 footer). Four surgical additions make it match this binary exactly. Suggested wording:

1. **Push tokens** — add to *What we collect*:
   > Notifications: if you allow them, your phone gives us a push token, delivered through Expo and Google's Firebase Cloud Messaging, so we can send alerts to that phone. Turn notifications off in the app or your phone settings and we stop using it.
2. **Error logs** — extend the *Technical* line:
   > If the app hits an error, it sends us the error message, the app version, your phone's platform and the last few screens you visited, under a random ID created each time the app launches, so we can find and fix the fault.
3. **Map tiles** — add to *Who sees it*:
   > Map pictures are loaded from Esri and OpenStreetMap tile servers. Like any image download, those servers see your IP address and which part of the map you are looking at.
4. **Support email consistency** — the live page currently renders `g4tech9@gmail.com` while the app falls back to `oasistechnology242@gmail.com`. Set the website's `SUPPORT_EMAIL` to the **one** address you chose (Phase 0) and redeploy.

Only add a “backups clear within 30 days” sentence if you have verified your database backup retention actually behaves that way. Ask your Bahamian lawyer for the final read before production, as your own `expo/STORE_CHECKLIST.md` already advises.

## 6) Final self-check before pressing submit

- [ ] Form answers match the **uploaded bundle's** permission list (App Bundle Explorer)
- [ ] Privacy page live, signed-out, with §5 edits and the correct email
- [ ] `/delete-account` live and entered in Data Safety
- [ ] Ads answer decided from the release candidate (§4), and the “house ads” copy agrees with it
- [ ] No feature in the build collects something missing from §1 (re-run this sheet after any PR that adds a picker, analytics, ads, purchases or background location)
