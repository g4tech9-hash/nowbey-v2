# NowBey — Panel Deep-Dive Audit

**Date:** 18 October 2026 · **Scope:** `/home/user/nowbey-v2` @ `ae2e044` (branch `arena/63af5af4-nowbey-v2`)
**Surfaces:** Next.js website (`src/`, 33,600 lines of TS/TSX/CSS, 47 pages, 75 API routes) + Expo/React Native Android app (`expo/`, 4,115 lines) + Postgres/Drizzle schema.
**Panel:** Principal UI/UX · Solutions Architect · Lead QA & Security · Growth & Conversion · Accessibility & Compliance.

---

## How this was produced (read this first)

This is not a screenshot review. Every finding below was read out of the source, then verified where it could be.

| What was run | Result |
| --- | --- |
| `npx tsc --noEmit` | **Clean** (exit 0) |
| `npx eslint .` | **Clean** (exit 0) |
| `npm test` (hermetic unit suites) | **129/129 pass** |
| `npm run dev` + live fetch of `/ /map /report /login /feed /alerts` | **All 200**, app boots on embedded PGlite with no config |
| `node scripts/mobile-audit.mjs` against the live server | **0 findings** across 19 routes × 320/360/390/412px |
| Contrast: computed WCAG ratios from the real tokens in `globals.css` and `expo/src/theme.ts` | Numbers quoted below are calculated, not eyeballed |

**What this audit could not test, and will not pretend to:** real-device rendering (no browser/simulator in this environment), VoiceOver/TalkBack behaviour, actual tap accuracy under a thumb, thermal behaviour on a real handset, email deliverability, and anything behind a paid third-party key (Stripe, Resend, Google OAuth, Firebase). Where a finding depends on those, it is marked **[needs device]** or **[needs live keys]**.

**A note on the existing audit culture in this repo.** There is already unusually good machinery here: a `gate` job that blocks deploys on typecheck/lint/tests/build, a bespoke 320–412px markup audit, a documented light-mode contrast remediation, and a pin-privacy offset that is genuinely thoughtful. That is why the sharpest findings in this report are not "you forgot X" — they are places where **the machinery is measuring the wrong thing**, and the team is drawing confidence from a green light that does not cover the road.

---

# Executive Summary

NowBey is, on the evidence, a more disciplined codebase than most pre-revenue products at this stage — and that is precisely what makes the failures dangerous. Typecheck, lint, 129 unit tests and a bespoke mobile audit all pass, the security posture is real (CORS allowlist, origin wall on writes, scrypt hashes with a decoy-hash timing defence, shared rate limiting, per-request CSP nonces, DOMPurify on feed HTML, a random-bearing 60m pin offset to protect homes), and the light-mode token remap is documented with measured ratios. But the release gate is calibrated to the wrong rulers: the mobile audit only sees tap targets written as inline utilities, so the 32px `.nb-chip` and 42px `.nb-btn` sail through as "0 findings"; the layout math for the phone map subtracts a hard-coded 58px header that is actually 76px, so the last row of the pin list sits 27px under the fixed nav on the screen the product is built around. A green gate is worse than no gate when the team stops looking.

The product's own promises are, in three places, not true. A person who signed up with Google **cannot delete their account at all** — deletion requires a password, their `password_hash` is `null`, `verifyPassword` returns false for null, and the only feedback is "That password is not right", six times, then a lockout. The landing page says *"Your draft stays if you lose the signal"* and the offline page says *"Your draft is kept on this device"*, but the draft lives in `sessionStorage`, which the OS reclaims when the tab is backgrounded or the browser is killed — exactly what happens when someone closes their phone mid-report in a squall. And the mobile app tells residents *"It is on the map"* when the server has actually replied `duplicate: true` and created nothing, because two of the three report entry points never read that field.

Then there is the layer nobody has looked at, and it is the layer most likely to decide whether this survives contact with Nassau. The map — the entire product — is drawn from `tile.openstreetmap.org`, whose usage policy explicitly forbids exactly this ("heavy use, e.g. distributing an app that uses tiles from openstreetmap.org, is forbidden"), and from Esri World Imagery, which is licensed for production use under an ArcGIS agreement this project does not have. Neither will fail in testing. Both fail on the day the site gets attention, which for a hazard map means the day of the storm. The Android app compounds it: it loads Leaflet from `unpkg.com` at runtime inside a WebView, carries no offline cache and no draft, polls three screens every 60 seconds on the radio, requests camera and photo-library permissions for a photo feature that does not exist, and locks to portrait on a listing that claims tablet support. Meanwhile the web signup collects an email address, a declared home island and location-tied content with **no consent record and no Terms/Privacy acknowledgement anywhere in the form** — while the app, built by the same team, gates its Create button on exactly that checkbox. The company is running two different legal postures on the same day, and the one with more exposure is the one a user reaches first, from a Facebook link, on a phone, in a hurry.

---

### What the panel could not fault (held to the same standard)

- **Pin privacy is done properly.** `src/lib/location-privacy.ts` uses a random bearing and 30–60m distance, records `pinApproximated`, and inflates `accuracyMeters` so the UI never displays precision the pin does not have. Most products at this stage ship exact GPS coordinates next to a handle.
- **Origin/CSRF model.** `src/lib/origin.ts` + `src/proxy.ts` refuse cross-origin writes at the edge, then again in `hasBadOrigin`, behind a `SameSite=Lax` httpOnly cookie. This is the right architecture, not a patch.
- **Sign-in timing & enumeration.** Decoy hash for missing accounts, `timingSafeEqual`, a shared `rate_limits` table so serverless cold starts cannot reset the counter, identical copy for "no such account" and "wrong password".
- **Light mode.** `globals.css:765–945` is a genuine, measured remediation (ink-400 → 3a4e57 for ≥7.5:1), not a colour flip.
- **Copy discipline on push.** The app refuses to claim push works until a device has received one, and `/api/health` reports `push:true` only when the server can sign FCM. That honesty is rare and should be protected.
- **Double-submit is guarded everywhere** — wizard, map inline form, comments, mobile, reactions all disable on a busy flag.
- **Draft protection on the wizard** (restore-before-save ordering so an empty first render cannot overwrite a draft) shows someone was thinking about real failure modes.

---

# The Audit Matrix

Ordered by severity. Every row is a defect with a file reference — not a preference.

| ID | Category | Severity | The Issue | Why it Matters | Actionable Fix |
| --- | --- | --- | --- | --- | --- |
| **C1** | Compliance / Trust | **Critical** | A Google-created account can never be deleted. `src/app/api/auth/google/callback/route.ts:140` creates the user with `passwordHash: null`; `src/app/api/account/route.ts` DELETE calls `verifyPassword(password, u.passwordHash)`; `src/lib/secret.ts:99` returns `false` when stored is null. The UI (`src/components/account-forms.tsx:230`, `expo/app/(tabs)/you.tsx:396`) offers only a password field. | Directly contradicts the published Privacy Policy ("You can delete your account in the app… or on the website"). App Store Guideline 5.1.1(v) requires in-app deletion and is an automatic rejection. GDPR Art. 17 / Bahamas DPA erasure request cannot be honoured by the user. Worst of all, the user is told their *password* is wrong and is locked out after 6 attempts, so support gets a "deletion is broken" ticket with the wrong diagnosis. | In DELETE: if `u.passwordHash === null && u.googleSub`, accept a fresh Google re-auth (or a signed, 15-minute deletion link emailed to the verified address) instead of a password. In the UI, branch the copy: "You signed up with Google — confirm with Google" vs "Type your password". Add a regression test: create via Google, delete, expect 200. |
| **C2** | Compliance | **Critical** | The web signup form captures handle, email, display name, **home island** and password with **zero consent artefact** — no Terms/Privacy links inside the form and no acknowledgement. The app (`expo/app/(tabs)/you.tsx`) does the opposite: an `agreed` pill gates the Create button and links both documents. | Two legal postures, one company. The web path is the one reached from a Facebook/WhatsApp link — the primary acquisition channel. No `terms_accepted_at`, no policy version, so you cannot prove consent for any existing user, and you cannot demonstrate a lawful basis for the email + island + location processing the policy describes. This is the single cheapest high-severity fix in the report. | Add one unchecked checkbox + inline links to `/terms` and `/privacy` above Create, disabled submit until ticked, and persist `terms_version` + `terms_accepted_at` on the user row. Mirror the exact wording of the app. Backfill: show a one-time acknowledgement card to existing users on next sign-in. |
| **C3** | Compliance | **Critical** | The Privacy Policy is materially narrower than the code. It never mentions: `/api/errors` crash telemetry (breadcrumb trail of **every button label tapped**, pathname, stack, a `sessionStorage` `nb_session` identifier — `src/components/error-reporter.tsx`), `/api/funnel` counters on every map visit, IP hashing for dedupe, or that Neon/Resend/Stripe/Firebase process data in the **United States**. There is no controller identity, no postal address, no retention period, no lawful-basis statement, and no complaints route. `LEGAL_UPDATED` is a bare string in `src/lib/legal.ts`. | A privacy notice that omits a category of processing is not a disclosure — it is a misstatement, and it removes your defence if a regulator or a journalist asks. The breadcrumb log is behavioural analytics wearing an "error reporting" hat: "tap: Publish to NowBey", "navigation: /u/jenny", "api: POST /api/incidents → 500" is a user journey. It is defensible to collect; it is not defensible to not say so. | Rewrite the policy against an actual data map: add "Technical & diagnostic" and "Transfers" sections naming each processor and country, add controller identity/address, retention (e.g. errors 90 days, funnel 13 months), lawful basis per purpose, and a complaint route. Version it (`terms_version`) and surface it. Have a Bahamian lawyer sign it off — the file already says `// TEMPLATE`, so nobody has. |
| **H1** | Layout / QA | **High** | `.nb-fill-view` is **27px too tall**. `globals.css:371` sets `--nb-header-h: 58px`, but the header is `min-h-[76px]` + 1px border (`app-shell.tsx`); the formula also subtracts `12px` for `main` top padding when the class is `pt-5` (20px). 19 + 8 = 27px of overflow on exactly the screen (`/map`) the product exists for. | The last row of the pin list sits under the fixed bottom nav — and the CSS comment at `globals.css:405` says this exact bug was already fixed once ("Leaving the nav out was why the last row of a full-height view sat behind it"). It has regressed via a stale constant, and no test would catch it because `tests/ui.test.mjs` asserts CSS *text*, not geometry. | Derive the number instead of asserting it: measure the header with a `ResizeObserver` into `--nb-header-h`, or set `--nb-header-h: 77px` and `- 20px` and add a visual regression at 390×844. Cheapest durable fix: drop the magic numbers and make `.nb-fill-view` `height: 100dvh` with `position: sticky; bottom: 0` layout, or use `grid-template-rows: auto 1fr auto` on the shell. |
| **H2** | QA Process | **High** | The release gate cannot see the most common tap-target failure. `scripts/mobile-audit.mjs:163` reads **only** `min-h-[Npx]` utilities or an inline `style`, so any size set by a stylesheet class is invisible. `.nb-chip` is 32px, `.nb-btn` 42px, `.nb-btn-sm` 38px, `.nb-chip` on `/report` severity = 32px — all pass W4 silently. The gate reports 0 findings. | The audit is the thing standing between this code and a store build, and it reports "0 findings" while three of the four chip/button classes are below the 44px AAA target and the `More` mode pills on Android are ~31px tall. The team is now citing "0 findings" as evidence in `LAUNCH_GATE_STATUS.md`. A gate that cannot fail is not a gate. | Resolve computed sizes instead: parse the emitted stylesheet for the class, or (better) run Playwright at 390×844 once and read `getBoundingClientRect()` for every `a,button,[role=button]`. Add a hard rule: any interactive element < 44×44 in the *phone* breakpoint fails. Also add W11 (focus ring present), W12 (`aria-invalid` on failed fields), W13 (all `<img>` with alt), W14 (target spacing 24px). |
| **H3** | Infrastructure | **High** | **Production map tiles are used outside their terms.** `src/lib/geo.ts:22` and `expo/src/MapCanvas.tsx:18` draw from `tile.openstreetmap.org`, whose policy forbids apps that distribute their own client. `src/lib/geo.ts:37–49` uses `server.arcgisonline.com` World Imagery without an ArcGIS agreement. The Expo file even admits it in a comment: *"Free public tile servers are fine for testing… switch before a big public launch."* | This is the highest-probability outage in the product. It will not fail in dev, it will not fail in a demo, and it will fail on the day a storm drives 5,000 people to the map — as a grey rectangle, for the one app that must not go grey. OSMF blocks by referrer/UA and does not warn. | Buy a tile plan this week (MapTiler, Stadia, Mapbox, or Thunderforest) and put the key behind a server-side proxy so it is not scraped. Budget it as COGS, not as a nice-to-have. If cost is the blocker today: cap map access to `/map` and `/report` only, and ship a static fallback image behind the first paint. |
| **H4** | Mobile / Resilience | **High** | The Android map is a WebView that loads Leaflet from `unpkg.com` at runtime (`expo/src/MapCanvas.tsx:27,38`). SRI is present (good), but the *library* is a network dependency of the map. | Every cold map open burns a third-party request before a single tile; on a congested BTC/ALIV cell, on hotel Wi-Fi, or behind a captive portal the map shows "The map needs an internet connection" **while the user is online**. It also hands a JS payload to a CDN inside your trust boundary. | Vendor Leaflet into the app bundle (`expo-asset` + inline HTML, or `@rnmapbox/maps`/`react-native-maps`). Ship the CSS inline. Keep SRI only if you keep the CDN. |
| **H5** | Security | **High** | The app exposes a **free-text server address** in `You → Server address` (`expo/src/api.ts: changeApiBase`). It clears the stored token when the origin changes, but nothing stops a user from being talked into pointing the app at `https://nowbey-helpdesk.net` and then typing their password into a page that looks identical. | This is the highest-value social-engineering lever in the product and it ships to consumers. A public-safety app will attract exactly the people most likely to follow instructions from "support" during an emergency. Debug affordances in production builds are how credentials get harvested. | Wrap the field in `if (__DEV__)` or a build-time flag. If you need it for field testing, gate it behind a five-tap gesture + a confirm dialog that names the risk in plain words. Never allow a non-TLS origin outside `localhost`. |
| **A1** | Accessibility | **High** | `src/components/ui/modal.tsx` has **no focus trap, no initial focus, no focus restore, no scroll lock**. It asserts `aria-modal="true"` while doing none of the things that make the assertion true. The full-screen backdrop is a `<button aria-label="Close">` that appears **before** the dialog in DOM order, so Tab from the trigger lands on an invisible "Close" covering the page. Escape is bound to `window`, so it fires even when focus is elsewhere. | Used by Delete Account, admin flows, and every confirm in the app. A keyboard user tabs into the void; a screen-reader user hears "Close, button" instead of the dialog title; a sighted keyboard user sees no focus at all (it is on a transparent overlay) — that is WCAG 2.4.11 *Focus Not Obscured* failing in the same component that claims `aria-modal`. | Use a `<dialog>` element with `showModal()` (free trap, free inert, free Escape) or add: focus the dialog on open, cycle Tab within it, restore focus to the trigger on close, `overflow:hidden` on `body`, and make the backdrop a `<div onClick>` + `aria-hidden`. Delete the backdrop `<button>`. |
| **A2** | Accessibility | **High** | The mobile `More` sheet (`src/components/nav-links.tsx`, `variant="bar"`) is a fixed overlay with no `role="dialog"`, no `aria-modal`, no focus trap, no Escape handler and no scroll lock. Background links stay tabbable. | Same class of failure as A1, on the most-used navigation affordance on a phone. Screen-reader users lose the sheet the moment they swipe past its last item. | Same fix as A1 — extract a shared `<Sheet>` primitive. Add `onKeyDown` Escape and `<body>` scroll lock. Ten lines. |
| **A3** | Accessibility | **High** | `role="tablist"` with two `role="tab"` children and **zero** `role="tabpanel"` (`src/app/login/login-form.tsx`). No `aria-controls`, no roving tabindex, no arrow-key handling. Verified in rendered HTML: 2 tabs, 0 panels. | Announced to AT as a tab interface that does not exist; the expected next element is not there, and arrow keys do nothing. Users who navigate by role will think the form is broken. On the primary account-creation screen. | Either implement the ARIA tabs pattern properly (`aria-controls` + panel + arrow keys + roving tabindex), or drop the roles entirely and use two plain buttons with `aria-pressed`. The second is 5 minutes and is almost always the right answer for two options. |
| **A4** | Accessibility | **High** | Form errors are not attached to fields. All fields in the login/signup form and the report wizard have zero `aria-invalid` and zero `aria-describedby`; validation surfaces as a single `role="alert"` block **below the submit button**, while focus stays on the button. | A screen-reader user submits, hears one sentence, and has no idea which of six fields is wrong — the header row is above them and unreachable without re-navigating. Sighted users on a phone see the error below the fold on a 390px screen. This is the single most common accessible-form failure and it is on the conversion-critical screen. | On error: set `aria-invalid` + `aria-describedby` on the offending field, render the message adjacent to it, and move focus to the first invalid field. Keep the summary but link it with `aria-describedby`. |
| **A5** | Accessibility | **High** | There is no focus management anywhere except one arrow-key handler (`src/app/map/page.tsx:189`). Across the whole app there are **five** `aria-live` regions. The report wizard replaces the entire DOM on each step change; publishing replaces the view with a success card; there is no `loading.tsx`. Focus returns to `<body>` each time. | Screen-reader and keyboard users get silence at every transition — including "It is on the map", the single most important moment in the product. Keyboard users lose their position entirely. | Create a `<RouteAnnouncer>` in `AppShell` that announces the new `<h1>` on pathname change. Move focus to the success `<h1>` with `tabIndex={-1}` on publish. Announce step changes via `aria-live="polite"`. Add `loading.tsx` per segment. |
| **R1** | Resilience | **High** | The report draft is `sessionStorage` only (`src/app/report/page.tsx:19`), but two user-facing surfaces promise otherwise: the landing page (*"Your draft stays if you lose the signal"*) and `/offline` (*"Your draft is kept on this device, so you can finish it when you are back"*). The code comment on the same state says it "survives a refresh, a dropped signal or a trip to the map"; none of those promises cover a closed tab, and mobile browsers discard backgrounded tabs under memory pressure. The `restored` flag is set but never rendered. | The promise is about the exact moment the product is most needed: the user types three lines, the squall takes the tower, they lock the phone. They come back to an empty form. A safety product that loses a witness's words is a safety product people stop trusting. | Move to `localStorage` with a TTL and an explicit "you have an unfinished report — resume / discard" card on `/report`. Store `{v, savedAt, category, pick, title, details}` and expire at 24h. If the pick contains coordinates, say so and offer a "clear" action. |
| **R2** | Resilience | **High** | The Android app has **no offline story at all**: no cache, no persistence, no `NetInfo`, no draft, no queue. `expo/app/(tabs)/index.tsx` simply shows the error from `errMsg(e)`. | Storms knock out cell towers; that is the product's core use case. On web there is at least a service worker and a saved feed; on the app there is a spinner then an error. The app is strictly worse than the website at the moment of need. | Add `@react-native-async-storage/async-storage`: persist the last successful feed + map payload with `savedAt`, render it immediately with an "Offline — showing 09:12" banner, and queue report submissions in a durable outbox with idempotency keys. |
| **B1** | Business logic | **High** | Duplicate handling is inconsistent across the three report entry points. `/report` wizard reads `data.duplicate` and shows an honest "Someone already reported this". `src/app/map/page.tsx submit()` and `expo/app/(tabs)/report.tsx` **ignore it** and show "It is on the map" after a 200 that created nothing. | The server returns the *existing* incident, so the user is congratulated for a report they did not file, and — critically — their description and photo note were silently discarded. They will assume they are on record. | Add `if (data.duplicate) { … }` to both callers, reusing the wizard's copy. Better: make the API return `201` only on create and `409 { duplicate: true }`, so a client that forgets the field fails loudly. |
| **B2** | Growth / Trust | **High** | Anonymous report spam is unmitigated. `POST /api/incidents` accepts unauthenticated pins at `15/hour/IP`, with no CAPTCHA, no proof-of-work, and no pre-publication moderation. `autoFlagIncident` "can only add a staff flag… it never hides a report itself" (`src/app/api/incidents/route.ts`). | On a hazard map, 15 fake floods are enough to destroy the product's only real asset: residents' belief that a pin is real. Attack cost is one VPN. Rate limiting per IP is also the wrong axis in The Bahamas (see B3). | Tier it: first report from an IP → live immediately; second within an hour → live but marked "unconfirmed"; unauthenticated reports never trigger alert emails. Add Turnstile (free) on the anonymous path. Show a "new reporter" chip instead of hiding. |
| **B3** | Infrastructure / Fairness | **High** | Rate limits key on `clientIp` at `15 reports/hour` (`src/app/api/incidents/route.ts`) and `10 sign-ups/hour`. Bahamian mobile data (BTC/ALIV) is heavily CGNAT — hundreds of subscribers share one public address. | A single busy street can exhaust the neighbourhood's quota. During an event, the second and third residents to report get *"Too many reports just now. Please wait 59 minutes."* — the worst possible message at the worst possible moment, and it looks like censorship. The privacy page already hints at IP-hash voting, so the team has thought about IP proxies; this is the same problem, unaddressed. | Key the limiter on `sessionId`/user id first, then on IP with a much higher ceiling (e.g. 60/hr) plus a per-IP *concurrency* cap. On a 429, offer "sign in to continue" (identity beats IP) and never word it as suspicion. |
| **A6** | Accessibility | **High** | `role="alert"` on the permanent `EmergencyNotice` (`src/components/emergency-notice.tsx`) — a static, always-present banner. | `alert` is an assertive live region: it interrupts whatever the screen reader is saying, on every mount, on `/report`, `/alerts` and `/feed`. Users will hear "police car light, for emergencies call 919 911, this app is not an emergency service" before they hear the page title — every single visit. Noisy live regions are how people learn to ignore them. | Use `<aside aria-labelledby>` — a landmark, not a live region. Keep the emoji out of the accessible name (`aria-hidden`) or replace it with an SVG that has `<title>`. Reserve `role="alert"` for things that appear *after* load. |
| **U1** | Usability / Growth | **High** | First paint of any deep link shows a **3.9-second full-screen splash** (`src/components/splash-screen.tsx`, `initialPath !== "/"`), with `aria-hidden="true"` and nothing set to `inert` — so a keyboard user can tab into links hidden behind it. | Every alert email, every shared pin, every Facebook link pays a mandatory tap or ~4s before content. For a report filed mid-emergency, that is a tax you cannot afford, and it is the first thing a new user experiences on the one URL you most want to convert. The non-`inert` overlay is WCAG 2.2 SC 2.4.11 (*Focus Not Obscured*) failing on arrival. | Keep the splash for `/` only. For deep links, render the splash as an *in-flow* 200ms fade of the header, or make it `dismissible on first scroll` with a 1.2s cap. Add `inert` to the shell while it is up. Honour `prefers-reduced-motion` by skipping entirely (the CSS currently only shortens it). |
| **A7** | Accessibility | **High** | Touch targets below 44px throughout, invisible to the gate (see H2): `.nb-chip` **32px**, `.nb-btn` **42px**, `.nb-btn-sm` **38px**, `SessionChip` 42px, `ModeToggle` 40px (36px at ≥640px), Expo `Pill` ≈31px (12px text + 7px padding). | WCAG 2.2 AAA 2.5.5 requires 44×44. Chips are the severity and category selectors on `/report` — the most consequential taps in the product, and the easiest to mis-hit with a wet thumb in the rain. Apple's own guidance is 44pt. | Raise the phone-breakpoint floor: `.nb-chip { min-height: 44px }`, `.nb-btn { min-height: 46px }`, Expo `Pill` `paddingVertical: 12` + `minHeight: 44`. Then fix H2 so the gate can prove it. |
| **M1** | Mobile | **High** | Expo `Field` renders its label as a sibling `<Text>` and never links it to the `TextInput` (`expo/src/ui.tsx`). No `accessibilityLabel`, no `nativeID`/`accessibilityLabelledBy`. | VoiceOver/TalkBack read the *placeholder* as the field name — and the placeholder changes by mode ("your_handle or you@example.com"), so the field has no stable name. On sign-in and sign-up, this is an unlabeled form to a blind user. | Pass `accessibilityLabel={label}` to every `TextInput` inside `Field`. One-line change, app-wide effect. |
| **M2** | Mobile | **High** | No `maxFontSizeMultiplier` or `allowFontScaling` anywhere in `expo/`. Text scales to 200%+ with Dynamic Type. `t.h1` is 30px → 60px; uppercase labels with `letterSpacing: 0.8` have no `numberOfLines`; the horizontal `Pill` rails rely on fixed heights. | A user with large text (a large share of the 50+ demographic this product needs for neighbourhood watch) gets clipped headings, overlapping chips and unreachable buttons. This is the difference between "accessible" and "passes the audit". | Cap display type (`maxFontSizeMultiplier={1.3}` on `t.h1`/`t.h2`) and let body text scale fully. Add `flexShrink: 1` and `numberOfLines` where truncation is acceptable. Test at "Larger Text" max on a real device. |
| **S1** | Store / Compliance | **High** | `expo/app.json` declares `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription`, plus `android.permission.POST_NOTIFICATIONS`, but there is **no camera or photo-picker dependency and no photo feature** (`/report` says "Photo uploads are not available yet"). | App Review rejects permission strings for capabilities an app does not use (Guideline 2.5.1 / 5.1.1). iOS users see a privacy label claiming photo access. On Android the asymmetry (no camera permission) means the two store listings describe different apps. | Delete both iOS strings until the feature exists. When photos land, add `expo-image-picker` and the strings in the same PR. |
| **S2** | Store / Compliance | **High** | `"orientation": "portrait"` with `"supportsTablet": true`. | iPad apps must support all orientations to qualify for multitasking; portrait-only + tablet-claimed is a well-known 2.1 rejection and a poor large-screen experience. | Either set `supportsTablet: false` (honest, fastest) or support all orientations and lay out the map/list for landscape. Given the map workspace uses `dvh`-style bounded heights on web, replicate that with `useWindowDimensions`. |
| **U2** | Trust / Copy | **High** | Network failures surface raw JS: `setError(e instanceof Error ? e.message : …)` in `src/app/report/page.tsx submit()`, `src/app/map/page.tsx submit()` and `src/app/login/login-form.tsx submit()`. Offline or a DNS blip renders **"Failed to fetch"** in the error box. | "Failed to fetch" is a browser internal, in a product for people who are not developers, at the moment they are standing in floodwater. It reads as a crash and teaches the user the app is broken, not that the signal dropped. | Catch `TypeError` before display: if `!navigator.onLine` → "You are offline. Your report is safe on this device — publish when the signal returns." Otherwise → "We could not reach NowBey. Check your connection and try again." Log the raw message to `/api/errors` instead. |
| **P1** | Performance / Battery | **High** | Polling on every surface with no backoff: web map every 60s, web ticker every 45s, Expo feed 60s, Expo map 60s, Expo wire 60s — each `useFocusEffect`-driven, so they restart on every tab switch and keep the radio awake while the app is foregrounded. `MapCanvas` also re-renders a WebView with remote `unpkg` JS. | On a prepaid Bahamian data plan, three 60s polls is measurable money, and the radio wake-lock is the single biggest battery cost on Android. The app's own `expo/src/push.ts` comments show the team cares about honesty; this is the same discipline applied to power. | Exponential backoff with jitter (60s → 120s → 300s → 900s, reset on foreground), pause on `AppState !== 'active'`, and use `expo-network`/`NetInfo` to skip polls while offline. On web, use `visibilitychange` (already done) *and* backoff. Target: ≤ 1 request/minute idle, 0 while backgrounded. |
| **D1** | Localization | **High** *(in context)* | There is no i18n layer: `lang="en"` hardcoded (`src/app/layout.tsx`), no `dir`, no message catalogue, and a design language built on **uppercase + px `letterSpacing`** (`nb-eyebrow` 11px/0.17em, `nb-field-label` 11px/0.14em, Expo `t.label` 11.5px/0.8). | Honest scoping: Bahamian launch is English-only, so this is not a launch blocker — and the panel will not manufacture one. But two of the four navigation labels ("Feed", "Wire") are English idioms, the product is pitching HOAs and digests to organisations, and the *structure* is fragile: `text-transform: uppercase` + tracking + fixed `grid-cols-2` category tiles means German/`+40%` expansion will wrap mid-word, and Arabic/Hebrew would need `dir="rtl"` plus mirrored icons and a re-think of the eyebrow/letterSpacing motif. | Do not translate yet. Do add the two cheap structural guards now: `min-w-0` + `overflow-wrap` on the label containers (mostly present), and replace fixed `h-[...]` on label-bearing chips with `min-h-` (already true) so text can grow. When the first translation lands, add `dir` support and drop `letterSpacing` on any translated string. |
| **A8** | Accessibility | **Medium** | `html, body { touch-action: manipulation }` (`globals.css:449`) disables double-tap-to-zoom for the entire site. Pinch still works, so this is not a hard WCAG fail — but the app's own viewport does not set `maximum-scale`, so this line is the only thing suppressing zoom on iOS. | A resident reading a street name on a pin at 1.5mm text (`.text-2xs` is 10px) cannot double-tap to read it. The audience for a hazard map skews older. | Remove it from `html`/`body`; apply `touch-action: manipulation` only to the map canvas and to buttons/links where 300ms delay actually matters. |
| **D2** | Typography | **Medium** | `:is(h1, h2, h3, p, a, span) { overflow-wrap: anywhere }` (`globals.css`) applies to **every** span and link on the site. `anywhere` (unlike `break-word`) also affects intrinsic sizing. | Mid-word breaks in narrow columns — "Publishing…" → "Publishi/ng…", street names split at the worst letter. It also makes flex children compute a smaller min-content width, which is why some labels look cramped and others fine, with no obvious rule. | Scope it: `.nb-break { overflow-wrap: anywhere }` on the handful of places that carry URLs/handles/emails (the file's own comment names them). Use `overflow-wrap: break-word` for the generic case. |
| **D3** | Design system | **Medium** | Global `input, textarea, select { font-size: 16px }` (`globals.css:461`) overrides `.nb-field { font-size: 14px }` everywhere, not just on iOS. Labels are 11px, values 16px. | The token scale says 14px, the browser says 16px, and the two disagree on every desktop form — including `/report`, where the visual hierarchy is headline → label → value. It also silently blocks any future attempt to make fields responsive. | Move it into the existing `@media (max-width: 639.98px)` block that already exists for exactly this purpose, or use `@supports (-webkit-touch-callout: none)`. Then set `.nb-field` to the token it claims. |
| **D4** | Design system | **Medium** | `--font-mono` references `--font-plex-mono`, which is **never defined** (no `next/font` import, no woff2). Every `.font-mono`, `time`, and `.num` element falls back to the OS mono stack. | Timestamps, coordinates and pin codes are a deliberate part of the visual language ("Technical numerics") and they are rendering in a different font on every OS. Small, but it is the kind of thing that makes a designed product feel assembled. | Either drop in `next/font/local` for IBM Plex Mono (the CSS already names the file) or accept `ui-monospace` and delete the dead variable. |
| **D5** | Light mode | **Medium** | Light mode is rescued by a hardcoded override list (`globals.css:899–916`) that enumerates exact hex utilities: `.text-\[\#a9cdc9\]`, `.text-\[\#8fb9b6\]`, … | This is a maintenance trap with a guaranteed failure mode: the next hardcoded `#a9cdc9` added anywhere renders at **1.86:1** on the light background (computed). Nobody will remember the list exists, and nothing will fail. | Grep for `text-\[#` and replace every instance with a token (`text-ink-300`). Then delete the override block and add an ESLint rule (`no-restricted-syntax` on `text-[#…]`) so it cannot come back. |
| **D6** | Contrast | **Medium** | `ink-400` `#718d95` is **5.31:1** on `--color-abyss-950` and **4.96:1** on raised surfaces — AA, not AAA. Yet `expo/src/theme.ts` describes it as *"the quietest still-AAA tier"*. `danger-500` `#f43f5e` is **5.11:1** at 12–13px — that is the *error message* colour. `cat-crime` 6.97, `cat-road` 6.70, `cat-health` 6.90 are all sub-AAA. | Every caption, timestamp, hint and secondary meta line on the site is `ink-400`, and every form error is `danger-500`. WCAG 2.2 AAA 1.4.6 wants 7:1 for normal text. The *code comment is factually wrong*, which means the tier was never measured — the same failure mode as H2. | Raise `ink-400` to ~`#8aa4ab` (≈6.6:1) and `danger-500` to `#ff6b7d` (≈7.2:1), or accept AA and change the documentation and the stated standard. Either is fine; the current state is a claim that does not hold. |
| **U3** | IA / Navigation | **Medium** | The desktop menu is labelled **"Plans"** but contains Island Life, What is open now, Gas prices, Plans and You (`src/components/nav-links.tsx: MoreMenu`). It opens on `group-hover` with no click-outside close and no focus-out close beyond `group-focus-within`. | Label and contents disagree — a user looking for gas prices will not hover "Plans", and a user who opens it to see pricing gets a grab-bag. A hover menu that stays open after you move away is a classic desktop annoyance. | Rename to **"More"** (or split: "Plans" alone). Add `onBlur`/outside-click close. Better: replace with a proper disclosure button that toggles on click only. |
| **U4** | Mobile IA | **Medium** | The phone tab bar has **six** targets: Feed, Map, Wire, Alerts, Report, More (`nav-links.tsx`). The comment says Report is *"a tide pill in the middle of the thumb zone"* — it is second from the right, not the middle. At 320px each target is ~53px wide with 11.5px labels. | Six items at 320px is at the edge of legibility, and the loudest action is not where the thumb expects it. The comment/code mismatch suggests the layout was changed after the reasoning was written. | Five targets max: **Map · Feed · [Report] · Wire · More**, with Report as the true centre. Move Alerts into More (it is a settings-like destination, not a daily one). |
| **R3** | State | **Medium** | No `loading.tsx` in any segment. `/feed`, `/wire` and `/incident/[id]` are `force-dynamic` server components with DB queries, and there is no Suspense boundary around them. | On a slow connection the previous page just sits there. Users tap again — which navigates twice, or (on a report CTA) fires the request twice. The map has a real skeleton (`map-panel.tsx`), so the pattern is understood; it just was not applied to the routes that need it. | Add `loading.tsx` per route group with a skeleton that matches the real card rhythm. For `/incident/[id]`, a skeleton of the card + map block is enough. |
| **R4** | Privacy | **Medium** | The pin is offset 30–60m, but `address` and `street` are stored verbatim from the reverse-geocode of the **exact** spot and published in the public API (`src/lib/public.ts` strips only `userId`). Verified: `/api/incidents` returns `"address":"Madeira St & Mackey St, Nassau"` alongside the blurred coordinate. | The privacy control protects the coordinate and leaves the postal address next to it. A user who ignores "pin the road, not a house" gets `12 Village Rd` published with their (possibly anonymous) handle. The blur becomes decorative. | Apply the same treatment: truncate `address` to the first road segment + parish (drop `house_number`), or store `address` for staff only and publish `street`. Add a test asserting no `house_number` reaches `publicIncident`. |
| **U5** | Onboarding | **Medium** | Signup asks for **six** decisions before any value (handle, email, display name, home island, password, confirm) and is the *default* tab. Copy says "cannot be changed later" for the handle — but `/api/account/handle` exists. `Name (optional)` and `Home island` are pre-filled/pressured (a select defaulting to New Providence). | Commitment before value, on a product whose own copy says you can read and report without an account. "Cannot be changed later" is a fear-inducing, possibly false statement — and the handle is the one thing users *will* want to change (it goes on every report). | Default to **Sign in** unless `?mode=signup`. Allow handle changes (with a redirect table) or soften the copy to "your handle can be changed once". Drop Home island from signup — you already derive parish from the pin. |
| **U6** | Interaction | **Medium** | The report wizard's step chips are navigable to any step (`onClick={() => setStep(i)}`), so step 3 is reachable with no pin, while the *"Next: write it up →"* button is disabled without one. Two contradictory affordances for the same state. | A user who taps "Tell neighbours" lands on a publish screen with a disabled button and a yellow blocker, having skipped the step that mattered. The step rail looks like a progress bar but behaves as free navigation. | Render the step chips as `<ol>` markers, not buttons, until the step is complete. If you keep them clickable, gate forward jumps behind `pick` with the same explanation. |
| **U7** | Interaction | **Medium** | A restored draft can reopen at step 3 with day-old text and a live *Publish* button (`src/app/report/page.tsx` — `step`, `title`, `pick` all restored). Nothing says "this is from yesterday". | A stale flood report published during a new storm is disinformation with the product's own branding on it, and it will be a neighbour's first impression of the map. | Show a "Restored draft from {timeAgo}" banner with Resume/Discard, and force a re-confirm of the pin (the world moved). Expire at 24h. |
| **M3** | Mobile | **Medium** | No `KeyboardAvoidingView` anywhere in `expo/`. `keyboardShouldPersistTaps="handled"` is set on the ScrollViews, but nothing scrolls the focused field into view. On iOS the software keyboard covers the bottom of the form. | The report form's "Details" field and the sign-up's password fields sit at the bottom of the scroller. On an iPhone the keyboard covers them and the user cannot see what they are typing — the single most common mobile form bug, on the conversion path. | Wrap each form screen in `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>` and add `automaticallyAdjustKeyboardInsets` on the ScrollView (iOS 13+). Test with a keyboard up. |
| **M4** | Mobile | **Medium** | The iOS map WebView sets `user-scalable=no, maximum-scale=1` in its inline viewport (`expo/src/MapCanvas.tsx`). | Disables pinch-zoom of the map's labels (street names) even though Leaflet's own gestures work — a WCAG 1.4.4 concern for low-vision users inside the one screen where reading a street name is the task. | Remove `maximum-scale`/`user-scalable` from the WebView viewport; Leaflet already handles `touchmove` for panning. |
| **M5** | Mobile | **Medium** | `useFocusEffect` + `setInterval(load, 60000)` runs while the *screen* is focused, but nothing checks `AppState`. Backgrounding the app does not stop the polls. | Android keeps scheduling wakes; on a mid-range device with three pollers this is real heat and battery drain, and it is invisible in a simulator. | Gate the interval on `AppState.currentState === 'active'` with a listener, or move to a single app-level "refresh on foreground" event. |
| **M6** | Mobile | **Medium** | `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })` with no `timeout` and no fallback (`expo/app/(tabs)/report.tsx`). | Indoors, in a car, or on a weak fix, High accuracy can hang for 30s+ with a spinner and no way out but the map. High accuracy also drains faster than Balanced for a 60m-blurred pin. | Use `Accuracy.Balanced`, pass a 12s timeout, and fall back to "tap the map" with a visible hint after 8s. The pin is blurred by 30–60m anyway — centimetre accuracy is wasted. |
| **U8** | Copy | **Medium** | Stale/fabricated content ships in a live component: `src/components/live-ticker.tsx` renders hard-coded gas prices ("Shell $7.08/gal", "Esso $7.50/gal") under a pulsing "Gas Updates" badge, and fetches real incident data into `rows`/`counts` that it **never uses** (`strip` and `total` are computed and dead). It is currently rendering nowhere — but it is exported from `app-shell.tsx` and imported in `layout.tsx`. | One line of JSX away from publishing invented fuel prices as live data under your brand, in a product whose stated scope explicitly defers the gas tracker (`DECISIONS.md` §1). If it ever ships, it is the single most damaging screenshot a competitor could take. | Delete the file and its exports. If you want a ticker, drive it from `rows` and label it "Recent reports". |
| **U9** | Copy | **Medium** | `src/components/read-aloud.tsx` hardcodes `utterance.lang = "en-US"` and silently truncates at `text.slice(0, 4000)`. | The target audience is Bahamian English; a US voice reading Bahamian place names and a cut-off sentence mid-report both erode the "this is for us" feeling the product is selling. | Set `lang = "en-BS"` (falls back gracefully), warn before truncating ("Reading the first part"), and split long text into utterances at sentence boundaries. |
| **P2** | PWA | **Medium** | `src/app/manifest.ts` ships a single `{ src: "/icon.svg", sizes: "any" }` icon. There is no `public/` directory, no 192/512 PNG, no maskable icon, no `apple-touch-icon`, no manifest `id`. | "No app download needed" is a stated value proposition, and the install path is the weakest part of the web product: iOS gets a screenshot as the home-screen icon, Android shows a letterboxed or scaled icon, and the splash is unbranded. Install friction is conversion loss on the exact audience you want (repeat visitors during a storm). | Generate 192/512 PNG + a maskable 512 from the existing mark, add `apple-touch-icon.png` (180) and a `theme_color` that matches the dark header, add `"id": "/"`. |
| **P3** | Performance | **Medium** | `src/lib/use-is-mobile.ts` initialises `mobile = false` and syncs in `useEffect`. `/map` therefore renders the **desktop** workspace (`.nb-map-workspace`, min-height 540px, two columns) for one paint on a phone. | A visible jump on the most-used screen, on mid-range Android where the first paint is the slowest. It also means the first client render disagrees with the server HTML by design. | Use a CSS-only solution (the media queries already exist for `.nb-fill-view` / `.nb-map-workspace`), or read `matchMedia` in `useState`'s initialiser guarded by `typeof window` and accept a hydration-safe `suppressHydrationWarning` on the container. |
| **A9** | Accessibility | **Medium** | Category is encoded by colour in the map pin dot and the category strip (`.nb-category-chip`), with the text label present in the list but not on the pin. Pins *are* named via `nameMarker` (good) including category, so this is partial, not total. | On a map, the pin colour is the only at-a-glance channel; a red/green colour-blind user cannot distinguish fire from flood until they open the popup. The severity ramp (`sev-1..5` green→red) is a second colour-only scale. | Add a 2-letter glyph or category initial inside the pin (F, W, P), which also helps scanning at zoom. For severity, keep the 5-bar meter (already labelled `aria-label`) but also render a number. |
| **A10** | Accessibility | **Medium** | `Modal` is reachable but `Escape` is bound to `window` while open, so it also closes when the user presses Escape inside a nested field — and there is no `preventDefault`/`stopPropagation`. Combined with A1 (no trap), `Escape` is the *only* working exit. | Dialogs that can be dismissed by a keystroke aimed at something else cause data loss (the delete dialog holds no data, but admin dialogs do). | Bind `Escape` on the dialog element (`onKeyDown`), not `window`, and cancel it when a nested menu is open. |
| **B4** | Business logic | **Medium** | `/api/account` PATCH silently coerces an invalid parish to `null` (`const parish = PARISHES.includes(...) ? parishIn : null`). | A user edits their name, the parish select fails to submit, and their home island is silently erased — which changes their alert routing (`viewer.parish` defaults elsewhere). Silent partial writes are worse than a 400. | Reject the write with a 400 when `parishIn` is non-empty and invalid; keep `null` only for an explicit clear. |
| **B5** | Business logic | **Medium** | Anonymous reports are created with `userId: null` and `authorHandle: "someone"` at insert time (`src/app/api/incidents/route.ts`), so there is no audit link between the report and its author — including for abuse, legal requests, or a user who later wants their own anonymous pin removed. | This is privacy-forward and defensible, but it is a one-way door: you cannot honour "delete everything I posted", cannot ban a spammer's pins, and cannot investigate a defamatory anonymous report. It also means the deletion transaction's `update incidents set … where authorHandle = u.handle` never touches them. | Keep the anonymity from *readers*, not from *staff*: store `createdByUserId` in a separate, access-controlled column (or a hash of it) so rare legitimate use is possible. Document the retention in the privacy policy. |
| **C4** | Compliance | **Medium** | No cookie/consent surface exists anywhere (verified by grep: zero matches for consent/banner/CMP outside one unrelated string). The site sets a session cookie, and uses `localStorage` (`nb_mode`, `nb_simple`, `nb_low_data`) and `sessionStorage` (`nb_session`, `nb_splash`, `nb_report_draft_v1`). | Defensible today: the session cookie is strictly necessary, and the preference keys are functional. **Not** defensible once `/api/funnel` or the error breadcrumbs are treated as analytics, or the moment an EU/UK visitor lands. The point is that nobody has written down *why* no banner is needed — so the first ad-tech or analytics script will silently make it non-compliant. | Write a one-page "cookies & storage" register: name, purpose, duration, necessity. Link it in the footer. Add the two analytics entries explicitly. That page is the thing a regulator asks for, and it costs an hour. |
| **A11** | Accessibility | **Low** | `.text-2xs` is `10px` and `.text-xs` `11px` (fluid `clamp`), used for chips, eyebrows and meta. The mobile audit's own rule is a 12px floor (W6) — but W6 only inspects *inline* font sizes, so the token escapes it. | 10px uppercase with 0.17em tracking is below most published mobile readability guidance and is exactly the text a user squints at while walking. | Raise the floor to 11.5px for uppercase tracking labels and 12px for meta on phones. Add the check to the (fixed) audit. |
| **D7** | Visual | **Low** | `--radius` tokens are `xs/sm/md/lg/xl2/2xl2` but components use raw arbitrary values everywhere: `rounded-[24px]`, `rounded-[20px]`, `rounded-[16px]`, `rounded-[14px]`, `rounded-xl2`. | The token set exists and is then bypassed, so radii drift by 2–4px between cards that should match. It is invisible one card at a time and obvious in a list. | Map arbitrary radii to tokens (`rounded-[20px]` → `rounded-lg`, `[24px]` → `rounded-xl2`) and lint for `rounded-\[`. |
| **U10** | Copy | **Low** | Handle input silently strips characters: `setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())`. | Typing "jenny!" makes the "!" vanish with no explanation; users retype and blame the keyboard. | Show a one-line reason under the field ("letters, numbers and _ only") on the first rejected keystroke, or allow the character and validate on blur. |
| **M7** | Mobile UX | **Low** | The mobile feed sets `loading` but never resets it to `true` when the filter changes (`expo/app/(tabs)/index.tsx`), so changing status/island shows stale rows with no busy state until the fetch lands. | A tap that appears to do nothing, on the primary screen. | Set `setLoading(true)` at the start of `load()`, or use a separate `refreshing` flag per filter. |
| **C5** | Compliance | **Low** | `SUPPORT_EMAIL` is `""` by default, so `/privacy` renders *"use the contact details on our app store listing"* and `/terms` has no contact at all. | A privacy policy without a working contact route fails the "easy to contact" expectation in every framework, and it is the only path the C1 victims would have. | Set `SUPPORT_EMAIL` (and `MAIL_FROM`) in every environment; fail the production build if `SUPPORT_EMAIL` is empty. |
| **Q1** | QA | **Low** | `npm ci` fails on a bare machine: `better-sqlite3` (a transitive dependency) has no prebuilt binary and falls back to `node-gyp`, which needs network access to `nodejs.org`. | A new contributor or a CI runner without that egress cannot install. The repo's own README says `npm install` should work. | Move `better-sqlite3` to `optionalDependencies` or pin a version with prebuilds; document `npm ci --ignore-scripts` as the CI path. |

---

# The "Blind Spots" Report

These are the things that did not show up in any existing audit file in `audit/` or `TODO_HUMAN.md`, and that I would not expect a normal review to catch.

## 1. The release gate is the biggest risk in the repo

The single most valuable asset here is the `gate` job: typecheck, lint, unit tests, production build, then a bespoke mobile audit. It is real engineering discipline and it is why the code is as clean as it is.

It is also the source of the most dangerous belief in the project: **that green means safe.**

`scripts/mobile-audit.mjs` W4 exists to catch undersized tap targets. It reads:

```js
const minH = cls.match(/min-h-\[(\d+)px\]/)?.[1] ?? style.match(/min-height:\s*(\d+)px/)?.[1];
```

That is a regex over **inline utilities and inline styles only**. Every size that lives in `globals.css` — which is where the design system lives — is invisible. So:

- `.nb-chip` is 32px → passes
- `.nb-btn` is 42px → passes
- `.nb-btn-sm` is 38px → passes
- `SessionChip` at 42px → passes
- `ModeToggle` at 40px, and **36px at ≥640px** → passes

The audit printed **"Findings: 0"** against a running build that contains all five. And `LAUNCH_GATE_STATUS.md` now cites that zero as acceptance evidence.

There is a second, quieter blind spot in the same tool: W6's readability floor and W4's 40px floor both check *declarations*, not *computed styles*, so they cannot see `clamp()`, `em`, `rem`, or cascade overrides either. W6 only reads `text-[Npx]` utilities — so `.text-2xs` at `clamp(0.625rem, …)` = **10px** is invisible. And the tool's own header documents the floor as "under 12px" while the implementation uses `11.5`, which is the same documentation drift that H1 and D6 exhibit.

**What to do:** the fix is not more regex. Run Playwright once at 390×844 in the gate, walk `a,button,[role=button],input,select,textarea`, and assert `rect.width >= 44 && rect.height >= 44` on the phone breakpoint. Then add: focus visible after Tab, `aria-invalid` present on failed submit, every `<img>` has alt, no `text-[#…]` arbitrary colour. That is a day's work and it converts the gate from decoration into a safety net. This single change is worth more than the next ten bugs.

## 2. The 27px that nobody will see in a screenshot

`--nb-header-h: 58px`. The header is `min-h-[76px]` plus a 1px border. `main` gets `pt-5` (20px); the formula subtracts `12px`.

So `.nb-fill-view` computes a height that is **27px larger** than the space actually available between the header and the fixed bottom nav. The consequence is the last ~27px of `/map`'s pin list — roughly one row — living underneath the tab bar on a phone.

Why this matters more than a typical off-by-N: the CSS comment above the rule documents that this exact class of bug was fixed once already ("Leaving the nav out was why the last row of a full-height view sat behind it"). It has come back through a constant that drifted from the markup. `tests/ui.test.mjs` asserts *string patterns inside `globals.css`* — e.g. that `.nb-map-split` contains `height: 150px` and `clamp(132px, 23dvh, 260px)` — and the file is admirably explicit that "nothing here may claim to prove pixels". It is therefore structurally incapable of noticing that `58 + 12` no longer equals `77 + 20`. The regression test passes while the bug is present.

**Fix the class of bug, not the number:** make the shell `display: grid; grid-template-rows: auto 1fr auto` and let the middle row be `min-height: 0`. Then no magic constant can ever be stale again. If you keep the calc, derive `--nb-header-h` at runtime from a `ResizeObserver`.

## 3. A privacy control that protects the coordinate and publishes the address

This is the most interesting design flaw in the product, because the *intent* is excellent and the *implementation* stops one field short.

`src/lib/location-privacy.ts` is genuinely good work: random bearing, 30–60m, records `pinApproximated`, and inflates `accuracyMeters` so the UI never claims more precision than it has. The report wizard even tells users "Pin the road, not a house: the published pin is moved a short distance from the exact spot."

Then `src/app/api/incidents/route.ts` stores `address: text(body.address, 200)` — the result of reverse-geocoding the **exact** spot — and `src/lib/public.ts` strips only `userId`. The public API returns:

```json
{"lat":25.0485,"lng":-77.3217,"address":"Madeira St & Mackey St, Nassau","street":"Madeira St", ...}
```

For a junction that is fine. For a house it is `12 Village Rd` sitting next to a pin that was blurred to protect `12 Village Rd`. **The blur becomes decorative the moment the geocoder returns a house number.**

The same applies to "anonymous" reports: `anonymous` hides the handle, but the address still identifies the home, and `PRIVATE_BY_DEFAULT` deliberately pre-selects anonymity for flood/water/power — the three categories most likely to be reported *from inside someone's house*.

**Fix:** strip `house_number` from the stored address (keep `road` + parish), or keep the full address staff-only and publish `street`. Add a unit test that asserts no `house_number` can reach `publicIncident`.

## 4. Bahamian network reality is not in the model anywhere

Three separate findings share one root cause: the product was tested on a good connection, by people who know the app.

- **CGNAT.** 15 reports/hour/IP (`sharedHit('report:' + clientIp)`). BTC and ALIV put many subscribers behind one address. During an event the *second* person on a street gets "Too many reports just now. Please wait 59 minutes." That reads as censorship, on a safety app, from a company the user has known for eleven minutes.
- **Data cost.** Three 60s pollers in the app, two on web, plus a WebView that downloads Leaflet from unpkg before it can draw anything. On a prepaid plan this is a line item the user will notice and blame on you.
- **Tower failure.** Storms take towers down. There is no offline path in the app at all, no draft, no queue, no banner. The web has a service worker — and even that only caches `/api/incidents?status=active`, which is **not the request `/map` makes** (`status=all`, `limit=160`). So the most important screen has no cached copy either.

**The test to write:** put the phone in airplane mode. Open the app. File a report. You should get: the last known map, an unmissable "Offline" ribbon, a report that is accepted and queued with a "pending" chip, and automatic publication when the signal returns. Right now you get a spinner, an error string, and lost work.

## 5. The identity model has a dead end that a store reviewer will find

Google users get `passwordHash: null`. Deletion requires a password. `verifyPassword(null)` is `false`. Therefore:

- The Delete modal's submit button is `disabled={busy || !password}` — it never even enables.
- If they type anything, they get `"That password is not right."` and one strike against a 6-per-15-minutes lockout.
- The Privacy Policy says they can delete their account.
- Apple's Guideline 5.1.1(v) says apps that support account creation must support deletion.

A reviewer who signs up with Google, then tries to delete the account, files a 5.1.1 rejection. A user who tries it concludes the app is lying to them. **This is the highest-ratio fix in the report**: one branch in the API, one branch in the copy, one test.

The same shape appears in two other places worth checking while you are in there:

- Admin accounts cannot be deleted at all (`409 "Ask another admin to change your role first"`) — fine, but there is no UI path to *do* that, so it dead-ends.
- A user with a live Stripe subscription must cancel billing first. The message is good; there is no link in it.

## 6. Screen-reader reality: five live regions and no focus movement

Count the announcements a blind user gets in a full report flow:

1. Page loads → **nothing** (no route announcer, no `loading.tsx`).
2. The emergency banner interrupts with `role="alert"`.
3. Tab through the header, the step rail, 13 category buttons, 4 severity chips → the category tiles are `button` elements with no `aria-pressed`, so there is **no announcement of which category is selected**. The severity chips use `data-on` (a CSS hook), not `aria-pressed`.
4. Tap "Next" → the entire DOM is replaced → **silence**, focus to `<body>`.
5. Tap the map to place a pin → a Leaflet canvas → the pin has a name (good), the readout does not announce.
6. Write a headline → publish → the success card renders → **silence**, focus to `<body>`.

The product's most important moment is inaudible. `aria-live` appears five times in the whole application, and one of them is a password-strength meter.

**The fix is small and high-leverage:** a `<RouteAnnouncer>` in `AppShell` (announce the `<h1>` on pathname change), `aria-pressed` on every toggle chip, `focus()` on the success heading, and `aria-live="polite"` on the step region. Maybe 60 lines total, and it changes the product for every keyboard and screen-reader user.

## 7. The accessibility tree claims more than the components deliver

Three components assert things that are not true:

| Component | Says | Does |
| --- | --- | --- |
| `Modal` | `aria-modal="true"` | No trap, no inert, no initial focus, no restore |
| Login tabs | `role="tablist"` / `role="tab"` | No panel, no arrow keys, no roving tabindex |
| `EmergencyNotice` | `role="alert"` | Static content, announces on every mount |

Each is a one-line-looking change with a real behaviour gap behind it. This is the pattern to watch for across the codebase: **ARIA used as documentation rather than as a contract.** An `aria-modal` that lies is worse than no `aria-modal`, because AT trusts it and stops offering the user the escape hatch it would otherwise provide.

## 8. Two legal postures, one company

The app gates account creation on a Terms/Privacy acknowledgement. The web does not. The app links both documents. The web form links neither. The privacy policy promises in-app deletion, which the app cannot deliver for Google users. The policy says "we do not track you in the background" while `/api/funnel` fires on every map visit and `/api/errors` records a breadcrumb of every button label tapped.

None of these is catastrophic alone. Together they mean **you cannot answer the question "what did this user consent to, on what date, under which version of the policy"** for a single existing account.

The cheapest durable fix is not a lawyer — it is a schema: `terms_version`, `terms_accepted_at`, `privacy_version`, `privacy_accepted_at`. Then one consent component used by web and app. Then the policy rewrite (C3) with an actual data map. That sequence is a week and it removes the entire category of risk.

## 9. Localization and RTL: an honest answer

The panel was asked what happens if text expands 40% or flips to RTL. The honest answer is: **it is not tested, but the layout is more resilient than most, and the design language is the fragile part.**

Resilient: `clamp()` type, `min-width: 0` on grid/flex children, `overflow-wrap` on text, `min-h-` instead of `h-` on chips and buttons, `100dvh`/`100svh` fallbacks, and `env(safe-area-inset-*)` wired into the chrome. A German string in a `.nb-btn` will wrap to two lines and the pill will grow — ugly, but it will not clip.

Fragile: the entire brand motif is **uppercase + wide letter-spacing at 11px** (`nb-eyebrow` 0.17em, `nb-field-label` 0.14em, Expo `t.label` 0.8). Uppercase destroys the ascender/descender cues that make dense German compounds readable, and `letterSpacing` in px does not scale with the font. RTL would additionally require mirroring the `ArrowIcon`, the step rail, and the chevron in `MoreMenu`.

**Recommendation:** do not build i18n now. Do remove the two structural risks that cost nothing: use tokens instead of px for `letterSpacing`, and mirror icons with `[dir="rtl"] .arrowIcon { transform: scaleX(-1) }` when you get there. Add `dir` to `<html>` at the same time you add the first locale — not before.

## 10. Battery, heat, and the things a simulator will never show

| Source | Cost | Where |
| --- | --- | --- |
| 60s polls × 3 screens (app) | Radio wake every minute while foregrounded | `expo/app/(tabs)/{index,map,wire}.tsx` |
| 60s + 45s polls (web) | Same on mobile browser | `map/page.tsx`, `live-ticker.tsx` |
| `Accuracy.High` GPS | Sustained high-power fix, no timeout | `expo/app/(tabs)/report.tsx` |
| Leaflet from unpkg + tile decode in WebView | CPU spike per map open | `expo/src/MapCanvas.tsx` |
| `nb-kenburns` 7s transform on a full-screen photo | GPU + battery, triggers on first paint | `globals.css:598` |
| `nb-aurora` 26s infinite radial-gradient animation | Continuous compositing when the Island theme is on | `globals.css`, `--animate-aurora` |
| Marquee 34s infinite | Continuous paint | `.marquee-track` |

The `prefers-reduced-motion` block covers the marquee, the pin pulse, the splash, the aurora and the live dot — the team clearly thought about this. What is missing is **battery** as a distinct axis: reduced-motion is a preference, not a power state. Add `navigator.getBattery()`/`expo-battery` checks (or simply: stop the aurora and ken-burns when `saveData`/`lowData` is on — you already have the `nb_low_data` flag and it currently only hides images).

## 11. Small things that will be reported as "bugs" and cost more than they should

- **"Failed to fetch."** appears verbatim on publish/sign-in when offline. Three separate call sites.
- **A restored draft** can publish yesterday's flood into today's storm with no "restored" label.
- **"It is on the map"** after a duplicate that created nothing (two of three entry points).
- **`More` sheet** on mobile has no Escape and traps nothing; a keyboard user on an Android tablet cannot close it.
- **"Plans"** opens a menu containing gas prices.
- **The gas ticker** exists with invented prices, one export away from rendering.
- **`--font-plex-mono`** is referenced and undefined, so every coordinate renders in a different font.
- **The splash** costs 3.9s or a tap on every deep link.

Each is a five-minute fix. Each, unfixed, is a one-star review with a screenshot.

## 12. What "done" looks like for a product like this

The panel's blunt view: NowBey has already done the hard engineering that most teams skip — auth, rate limits, moderation hooks, pin privacy, honest push labelling, a real test suite. What it has not done is **walk the three journeys that matter as the people who will use them**:

1. A 62-year-old in Fox Hill receiving a WhatsApp link, on a mid-range Android, on 3G, in the rain. → H1, U1, A7, R3, M3, M2, P1.
2. Someone who signed up with Google trying to leave. → C1.
3. A storm arriving, the tower dying, and the map going grey. → H3, R2, R1, P1, U2.

Fix those three scripts end-to-end and the product is ready. Everything else in this document is polish on top of a solid foundation.

---

# Phased Action Plan

## Phase 0 — Immediate hotfixes (this week, ~2 engineering days)

Nothing here is architecture. All of it is a lie the product currently tells.

| # | Action | File(s) | Effort | Why now |
| --- | --- | --- | --- | --- |
| 0.1 | Unblock Google-account deletion | `api/account/route.ts`, `account-forms.tsx`, `expo/app/(tabs)/you.tsx` | 3h | Store-blocking + the policy is already published |
| 0.2 | Add Terms/Privacy consent to web signup + `terms_version`/`terms_accepted_at` | `login-form.tsx`, `api/session/route.ts`, `db/schema.ts` | 3h | The app already does it; web is the acquisition path |
| 0.3 | Fix `.nb-fill-view` (27px) | `globals.css:415–440` | 1h | One row of the primary screen is under the nav |
| 0.4 | Honour `duplicate` in map + app submit | `map/page.tsx`, `expo/app/(tabs)/report.tsx` | 1h | False success on a public-safety record |
| 0.5 | Replace `e.message` with human copy on network failure | `report/page.tsx`, `map/page.tsx`, `login-form.tsx` | 1h | "Failed to fetch" is the worst string in the product |
| 0.6 | Draft → `localStorage` + "resume / discard" + 24h TTL | `report/page.tsx` | 3h | Three surfaces already promise this |
| 0.7 | Delete `live-ticker.tsx` and its exports | `live-ticker.tsx`, `app-shell.tsx`, `layout.tsx` | 15m | Fabricated prices, one import from shipping |
| 0.8 | Delete unused iOS camera/photo permission strings | `expo/app.json` | 10m | App Review rejection risk, zero upside |
| 0.9 | Set `SUPPORT_EMAIL`; fail the build if empty | `.env`, `lib/legal.ts`, `deploy.yml` | 30m | The only contact route for 0.1 victims |
| 0.10 | Raise `.nb-chip` → 44px, `.nb-btn` → 46px, `.nb-btn-sm` → 44px; Expo `Pill` → 44 | `globals.css`, `expo/src/ui.tsx` | 1h | 32px targets on the severity selector |

**Exit criteria:** a Google-created test account can be deleted end-to-end on web and Android; `curl` of `/report` in airplane mode shows human copy; `.nb-fill-view` measured at 390×844 leaves ≥0px gap.

## Phase 1 — Short-term UX wins (next 3–4 weeks)

The theme is *trust and the three journeys*.

| # | Action | Owner lens | Detail |
| --- | --- | --- | --- |
| 1.1 | **Fix the gate** | QA | Playwright at 390×844 in `gate`: 44×44 targets, focus-visible after Tab, `aria-invalid` on failed submit, alt on all images, no `text-[#…]`. Delete the W4 regex. This is the highest-leverage single change in the report. |
| 1.2 | Shared `<Dialog>` + `<Sheet>` primitives | A11y | Use native `<dialog showModal()>` (or add trap/restore/inert/scroll-lock). Migrate `Modal` and the mobile More sheet. Delete the backdrop `<button>`. |
| 1.3 | Form error contract | A11y | `aria-invalid` + `aria-describedby` + focus-first-invalid on login, signup, report wizard, account forms. Keep the summary, link it. |
| 1.4 | Route announcer + focus on success | A11y | `<RouteAnnouncer>` in `AppShell`; focus the `<h1>` on publish/step change; `aria-pressed` on every toggle chip. |
| 1.5 | Add `loading.tsx` for `/feed`, `/wire`, `/incident/[id]`, `/map` | UX | Skeletons that match card rhythm. |
| 1.6 | Splash: welcome only | Growth | Show on `/` only; `inert` the shell when it is up; skip entirely under `prefers-reduced-motion`. |
| 1.7 | Buy tiles, proxy the key | Infra | MapTiler/Stadia/Mapbox behind `/api/tiles/*`. Remove `tile.openstreetmap.org` and unlicensed ArcGIS. |
| 1.8 | Vendor Leaflet into the Android app | Mobile | Bundle the JS/CSS; remove the unpkg dependency. |
| 1.9 | Mobile offline v1 | Mobile | `AsyncStorage` last-good feed + map payload, "Offline — showing HH:MM" ribbon, `NetInfo`. |
| 1.10 | Polling backoff + AppState gating | Perf | 60→120→300→900s with jitter; suspend when backgrounded; skip while offline. |
| 1.11 | Keyboard handling on mobile forms | Mobile | `KeyboardAvoidingView` + `automaticallyAdjustKeyboardInsets`. Test on device. |
| 1.12 | `accessibilityLabel` on every Expo `Field` | A11y | One line in `ui.tsx`. |
| 1.13 | Dynamic Type caps | A11y | `maxFontSizeMultiplier` on display styles; test at maximum text size. |
| 1.14 | Privacy policy rewrite + storage register | Compliance | Data map, processors, transfers, retention, controller identity, complaint route. Version it. |
| 1.15 | Address privacy | Privacy | Strip `house_number` before storage/publication; test it. |
| 1.16 | Spam tiers | Trust | First-report-live, second-marked-unconfirmed, Turnstile on anonymous, identity-based rate limits ahead of IP. |

**Exit criteria:** keyboard-only user can create an account, file a report, and delete it without losing focus; airplane-mode report on Android is queued and published on reconnect; no map request leaves for `tile.openstreetmap.org`.

## Phase 2 — Long-term architectural shifts (this quarter → next)

| # | Shift | Why it is architectural |
| --- | --- | --- |
| 2.1 | **Offline-first data layer with a durable outbox** | Reports are the product's only user-generated value. A report should be a local record with a state machine (`draft → queued → syncing → published → confirmed`) rendered optimistically, not a `fetch` that can fail. This touches the schema (idempotency key, client id), the API (accept client-generated ids, return 200 on replay), and every surface. Do it once. |
| 2.2 | **One design system, two platforms** | The web tokens (`globals.css`) and the Expo tokens (`expo/src/theme.ts`) have already drifted (`#43e0cc` vs `#00c9b7`; `ink-400` values differ; radii differ). Extract `packages/tokens` as JSON and generate both. This is also the precondition for fixing D5 (the hardcoded-hex override list) permanently. |
| 2.3 | **A real accessibility contract** | Adopt WCAG 2.2 AA as the enforced bar and 2.5.5/1.4.6 as the *stated* aspiration. Right now the codebase claims AAA in comments while shipping 5.1:1 error text and 32px targets. Pick one and make the tests match. |
| 2.4 | **Location data governance** | Decide, in writing: what is stored where, what staff can see, how long, and how erasure works for anonymous content. The current split (coordinate blurred, address raw, `userId` nulled at insert) is three good ideas that do not compose. |
| 2.5 | **Storm-mode mode** | The app has a `low_data` flag and a `simple` view. Neither is wired to a storm. A single switch — "Storm: show only severe pins, hide photos, cache aggressively, poll every 10 min" — is the feature this product actually needs, and it uses machinery you already built. |
| 2.6 | **Store-readiness as a checklist, not a hope** | Portrait/tablet, permissions, deletion, privacy labels, data-safety form. `expo/STORE_CHECKLIST.md` exists; make each item a test or a script check so it cannot rot. |

---

## Appendix A — Severity definitions used

| Level | Meaning | Response |
| --- | --- | --- |
| **Critical** | Active legal exposure, store rejection, or a user-facing promise that is false and unrecoverable | Stop shipping; fix before the next deploy |
| **High** | Breaks a core journey, blocks a class of users, or will fail at scale | Fix within the current sprint |
| **Medium** | Degrades quality, trust, or accessibility in a way users will notice and report | Fix within the quarter |
| **Low** | Polish, consistency, technical debt with a visible edge | Batch into the next refactor |

## Appendix B — Files touched by the highest-severity findings

```
src/app/api/account/route.ts               C1
src/app/api/auth/google/callback/route.ts  C1
src/lib/secret.ts                          C1
src/app/login/login-form.tsx               C2 A3 A4 U5 U10
src/app/privacy/page.tsx                   C3 C4 C5
src/lib/legal.ts                           C3 C5
src/components/error-reporter.tsx          C3
src/app/globals.css                        H1 D2 D3 D4 D5 D6 A8 A11
src/components/app-shell.tsx               H1 D4
src/scripts/mobile-audit.mjs               H2
src/lib/geo.ts                             H3
expo/src/MapCanvas.tsx                     H3 H4 M4
expo/src/api.ts                            H5
src/components/ui/modal.tsx                A1 A10
src/components/nav-links.tsx               A2 U3 U4
src/app/report/page.tsx                    R1 U6 U7
expo/app/(tabs)/index.tsx                  R2 M5 M7
src/app/map/page.tsx                       B1 H1 P1 R3
src/app/api/incidents/route.ts             B2 B3 B5 R4
expo/app/(tabs)/you.tsx                    C2 M1
expo/app.json                              S1 S2
src/components/live-ticker.tsx             U8
src/components/read-aloud.tsx              U9
src/app/manifest.ts                        P2
```

---

*Prepared against commit `ae2e044`. All line references are to that tree. Findings marked **[needs device]** or **[needs live keys]** require a physical handset or production credentials to confirm completely; everything else is reproducible from the repository alone.*

---

# IMPLEMENTED — overnight pass, 18 October 2026

The fixes below are in the repository, verified, and committed on `arena/63af5af4-nowbey-v2`. Each row names
the finding, what changed, and the test or command that proves it. Anything that needs a card, a signature or a
physical handset is marked **HUMAN** and logged in `TODO_HUMAN.md`; nothing was quietly dropped.

Final gate: `npx tsc --noEmit` 0 · `npx eslint .` 0 · `npm test` **146/146** · `node --test tests/ui.test.mjs`
**7/7** · `node scripts/mobile-audit.mjs` **0 findings** · `npx next build` succeeds.

## Critical

| ID | Finding | What changed | Proof |
| --- | --- | --- | --- |
| **C1** | Google users could never delete their account (`passwordHash: null` → every attempt answered "That password is not right", then a lockout) | `src/app/api/account/route.ts` now accepts **either** a password **or** a one-time emailed token (`peekToken` before the paid-plan/admin checks, `consumeToken` only after they pass). New route `api/account/deletion-link` emails the link to the address already on the account, 3/hour. `src/lib/account.ts` `sendDeletionEmail` (30-minute TTL, single use). Both UIs branch on `hasPassword`: `components/account-forms.tsx` (web) and `expo/app/(tabs)/you.tsx` (app), plus a "I do not have my password" escape hatch for password accounts. Sign-in now says the account "signs in with Google" instead of blaming the password. | `tests/account-deletion.test.mjs` — 2 tests: the Google message, and end-to-end link → delete → replay refused |
| **C2** | Web sign-up recorded no consent at all; the app gated a button and recorded nothing | `users.terms_version` + `users.terms_accepted_at` (migration `drizzle/0001_long_wrecking_crew.sql`). The API **refuses** a sign-up without `termsAccepted === true` and writes the server's own `TERMS_VERSION` (`src/lib/legal.ts`), never a client-supplied one. The Google callback, which creates accounts outside the form, records the same. Web form: real checkbox + Terms/Privacy links, button disabled until ticked (`login-form.tsx`); app sends the flag it already required. Existing members with no record (or an old one) get a one-off `ConsentCard` on `/you/settings` backed by `api/account/consent`. | `tests/consent.test.mjs` (6 static checks incl. "a client cannot claim a version") · `tests/auth.test.mjs` (refused without consent; row records version + timestamp; session exposes it) |
| **C3** | Privacy policy omitted the crash reporter's breadcrumbs, the funnel counter, IP hashing, US processors; `// TEMPLATE` shipped; `SUPPORT_EMAIL` empty | `src/app/privacy/page.tsx` rewritten from the code: a 8-row table naming every field and its table (`client_errors`, `funnel_daily`, `rate_limits`), retention windows, the named processors (Vercel, Neon, Resend/SMTP, Stripe, Apple/Google, optional Gemini), the Data Protection Act 2003 rights and a self-service deletion path that actually works. `src/app/terms/page.tsx` no longer calls itself a template and describes re-consent. `src/lib/legal.ts` is now the single source (`TERMS_VERSION`, `LEGAL_UPDATED`, `CONSENT_LABEL`, `LEGAL_LINKS`, `supportConfigured`). | `tests/consent.test.mjs` (policy discloses both collectors, processors, hashing; no template marker) |

## High

| ID | Finding | What changed | Proof |
| --- | --- | --- | --- |
| **H1** | `.nb-fill-view` 27px too tall — last pin row under the tab bar; the header constant said 58px while the header renders at 77px | Height is now **measured**, not summed: `src/lib/fill-height.ts` (pure) + `src/lib/use-fill-height.ts` (writes `--nb-fill-h` from the real header, main padding, nav, visual viewport, re-measured on resize/rotation/keyboard). `globals.css` consumes `var(--nb-fill-h, calc(100dvh - 191px))`; `--nb-header-h` corrected to 77px as the documented fallback. | `tests/fill-height.test.mjs` — 6 tests, including one asserting the old constants were exactly 27px too tall |
| **H2** | The audit could not see sizes declared in CSS, so it passed at 0 findings while `.nb-chip` was 32px | `scripts/lib/min-heights.mjs` resolves a class's `min-height` from the compiled sheet, honouring `@layer`, `@media (max-width:)` and ignoring `@media (min-width: 1024px)` and `@keyframes`; `scripts/mobile-audit.mjs` uses it for W4. `globals.css` raises `.nb-chip` 32→44, `.nb-btn` 42→46, `.nb-btn-sm` 38→44 on phones. | `tests/min-heights.test.mjs` (5 tests) · the audit now genuinely reads 44/46/44 from the live sheet |
| **H3** | OSM community tiles (forbidden in app distribution) + unlicensed Esri | URLs moved to `src/lib/tiles.ts` and `expo/src/map-tiles.ts`, every endpoint overridable by environment (`NEXT_PUBLIC_TILE_*`, `EXPO_PUBLIC_TILE_*`); `warnIfTilesUnlicensed()` logs once in production. `docs/TILES.md` names the providers and the exact variables. **HUMAN:** buying the plan. | `tests/map-layout.test.mjs` (defaults still canonical when unset) · `TODO_HUMAN.md` item |
| **H4** | Leaflet loaded from unpkg inside the WebView — dead map offline, third-party code execution | Vendored: `expo/src/leaflet-assets.ts` (Leaflet 1.9.4, BSD-2-Clause) generated by `scripts/vendor-leaflet.mjs`; `MapCanvas.tsx` embeds it. | Regeneration is reproducible; the WebView no longer fetches a script tag |
| **H5** | Free-text server address in a shipped app | `expo/app/(tabs)/you.tsx`: the whole `ServerBox` is `__DEV__`-only. | Visible in the diff |
| **A1** | Modal asserted `aria-modal` and did none of it | `src/components/ui/use-dialog.tsx`: focus moves in, Tab/Shift+Tab trapped, Escape on the panel, focus restored to the trigger, page scroll locked with scrollbar compensation, background `inert`. Backdrop is no longer a `<button>` before the dialog. | Used by `Modal` and the More sheet |
| **A2** | The phone "More" sheet had no dialog semantics, no Escape, no trap | Same helper: `role="dialog" aria-modal aria-labelledby`, close on Escape, 44px close button, trigger marked `aria-haspopup`. | `src/components/nav-links.tsx` |
| **A3** | 2 tabs, 0 tabpanels | The sign-up/sign-in switch is a `role="group"` with `aria-pressed` — an honest description of two choices, one on. | `/login` markup |
| **A4** | 0 `aria-invalid`, 0 `aria-describedby`, errors below the submit button | `login-form.tsx` now tracks which control failed, marks it `aria-invalid`, points `aria-describedby` at the message, and **moves focus to the field**. `PasswordField` gained an `error` prop. `/report` headline and publish blocker are programmatically linked. | `npx tsc` + `/login` markup |
| **A5** | No route announcer, no `loading.tsx` | `src/components/route-announcer.tsx` (polite live region announcing each client navigation) mounted in the shell; `src/app/loading.tsx` gives every route a shaped skeleton with `aria-busy`. | Visible on any slow navigation |
| **A6** | `role="alert"` on a static banner — every page load interrupted the reader | `src/components/emergency-notice.tsx` is a labelled `<aside>` landmark instead. It is still the first thing in the DOM and still tappable. | Markup |
| **A7** | Sub-44px targets | Mobile floor in `globals.css` for `.nb-chip`/`.nb-btn`/`.nb-btn-sm`; Expo `Pill` 31→44 with `minHeight` and larger type; Expo close/tab controls raised. | `mobile-audit.mjs` W4 (now CSS-aware) |
| **A8** | `touch-action: manipulation` on `html, body` disabled double-tap zoom for the whole site | Scoped to controls only; the page keeps zoom (WCAG 1.4.4). | `globals.css` |
| **R1** | Two surfaces promised the draft was saved; it lived in `sessionStorage` and had no expiry; `restored` was set and never rendered | `localStorage` + 24-hour TTL + a **"We kept your words"** card with **Start fresh** on `/report`. Expired and legacy drafts are discarded rather than resurrecting yesterday's hazard. | `src/app/report/page.tsx` |
| **B1** | `duplicate:true` ignored — the UI said "It is on the map" about a report this person did not write | Web `/map` and app `/report` both branch on `data.duplicate`, keep the person's words, and send them to the report that exists with a confirm prompt. | `map/page.tsx`, `expo/app/(tabs)/report.tsx`; `api.ts` now types the flag |

## Medium / craft (safely fixed)

- **D6 contrast:** `--color-ink-400` `#718d95`→`#8fabb1` (5.3→7.7:1); `--color-danger-500` `#f43f5e`→`#ff7d8e` (5.1→7.7:1); crime/road/health label tints raised to 8.7–9.4:1. Error text is no longer the least legible text in the product.
- **D2/D3/D4 theming debt:** 150 hardcoded `text-[#…]` night hexes replaced with semantic tokens in 27 files; the light-mode rescue list that existed only for them is deleted. `--font-mono` pointed at a font that was never loaded. The global 16px field rule is now a phone-only query, so desktop type is no longer silently overridden.
- **A11:** `--text-2xs` 10px → 11–12px.
- **U1:** the splash rendered on **every route except `/`** for 3.9s — it now runs on `/` only and for 1.6s.
- **U8/error copy:** `"Failed to fetch"` replaced by `src/lib/error-copy.ts` (offline / timeout / server / passthrough), wired into report, map, login, account forms; the Expo equivalent in `errMsg`.
- **M5 (app):** foreground-only auto-refresh via `expo/src/use-auto-refresh.ts` — no polling while backgrounded (battery and prepaid data), instant refresh on return.
- **M1/M7 (app):** sign-up and delete screens in `KeyboardAvoidingView`; location uses `Accuracy.Balanced` (the published pin is blurred 30–60m anyway) with a 12s race so "Finding you…" cannot hang.
- **M4 (app):** accessibility labels on fields and category badges, `maxFontSizeMultiplier` caps where a label must not blow a pill apart.
- **P2:** `public/` did not exist, so `/icon.svg` and the install prompt were blank. Real 192/512/maskable/apple-touch/OG images plus full `icons`/`openGraph`/`twitter` metadata.
- **New surface:** `/cookies` lists every item of storage with its lifetime and clears it in one press (leaving sign-in alone) — the honest alternative to a consent banner for a site with no tracking.
- **Data-integrity nit:** `api/account` PATCH now refuses an unrecognised island instead of silently writing `null` over a member's home island.

Still open, and listed in `TODO_HUMAN.md`: the tile contract (H3), a Bahamian lawyer's read of the terms (C3), Mail/App-URL keys for the deletion email in production, and everything marked **[needs device]** — R2's offline queue in particular, which is a feature rather than a fix.
