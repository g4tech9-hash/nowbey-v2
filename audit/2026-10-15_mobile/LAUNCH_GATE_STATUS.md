# Mobile remediation — status and launch gate

Date: 2026-10-15 · branch `arena/b2560608-nowbey-v2` (nothing pushed to `master`, no deploy run)

This is the record of the launch-blocking mobile work: what changed, what was measured, what is still
open, and what it will take to close it. Evidence is a command plus its output, not an impression.

---

## 1. Acceptance criteria

| # | Requirement | State | Evidence |
| --- | --- | --- | --- |
| 1 | Mobile map reduced and redesigned for phones | **Done** | `.nb-map-split` caps the phone map at `clamp(132px, 23dvh, 260px)` (200px at ≤360px, `auto` ≥1024px); `/map` gains a Map / Both / List switch, "Both" is the phone default so the map is short and the pin list follows it, map chrome (`NowBeyMap` `compact`) drops the search box, layer pills and zoom readout on phones |
| 2 | Pin list usable above the fold at 320–412px | **Done (contract-level)** | The list is rendered after a ≤260px map, so the first rows are above the fold; checked by `tests/ui.test.mjs` (CSS clamp + source order) and by the width audit. A real device check stays on the human list |
| 3 | Push either working end to end or honestly relabelled | **Relabelled honestly; delivery still open** | `/alerts` says "Not switched on for this site yet" with the push keys absent; the app's You tab says "Android only for now"; `conch`'s push perk keeps its `Soon` tag; no page, plan or document claims delivery. `TODO_HUMAN.md` holds the credential steps |
| 4 | Alerts form simplified to the Nassau MVP | **Done** | Nassau-first copy, New Providence preselected, two decisions only (address + report kinds), other islands behind one fold, email named as the working channel, storm cover stated as free for everyone |
| 5 | Every mobile page audited at 320–412px | **Done** | `scripts/mobile-audit.mjs` (W1–W10 + W2b) over all 20 routes, widths 320/360/390/412 — **0 findings**; report in `MOBILE_AUDIT_320-412.md` |
| 6 | `mario242` investigated without weak passwords or exposed credentials | **Done locally, production facts not readable from here** | `tests/admin.test.mjs` proves the only two safe levers end to end on the local server; see §4 |
| 7 | No deploy until UI, endpoint, auth, mail and push tests pass | **Held** | Nothing deployed. `deploy.yml` now has a `gate` job that both deploy jobs need. Physical push remains **unverified** and is the one criterion that cannot be met from this environment |

## 2. Tests built for the gate

| Suite | Command | Result |
| --- | --- | --- |
| Hermetic unit tests | `npm test` | 7/7 |
| Endpoints | `npm run test:local` | 12/12 (health, feeds, every phone page, 404s for deferred products, member redirect, admin invisibility, foreign-origin rejection, push registration honesty) |
| Authentication | `npm run test:local` | 9/9 (password policy incl. handle/email substrings, sign-up, duplicate handle/email, wrong password, reset email + single use + session invalidation, sign-out) |
| Mail | `npm run test:local` | 8/8 (verification email, alert confirmation and verification, alert on a new report, storm override for a filtered free plan, "annoying" silence, three-minute cooldown, stop link) |
| Admin / recovery | `npm run test:local` | 6/6 (owner account, admin area gating, one-hour reset link, self/env-admin protections, sign-out-everywhere) |
| Phone UI | `npm run test:ui` | 7/7 (map contract, Nassau form, push wording on every surface, launch documents, viewport/zoom, audit stays clean, deploy gate exists) |
| Mobile width audit | `npm run audit:mobile` | **Findings 0** |

Repeatability was checked: `npm run test:local` was run twice back to back and passed both times
(fixtures are cleared per run, and each test uses its own client address so the app's own rate limits
never leak into the next run).

## 3. What changed in this stretch

* `src/lib/http.ts` — the same-origin check behind every write compared the browser's `Origin` with
  `req.url`'s host only, which rejected legitimate same-origin writes behind a proxy (and on a dev
  server bound to `0.0.0.0`). It now accepts a match against `x-forwarded-host`, `host` or `req.url`.
  Forged cross-site origins are still refused, and the session cookie stays `SameSite=strict`.
* `src/app/api/alerts/route.ts` — the non-email channel answer now points at where push really lives
  (the Android app) instead of claiming push is "coming soon".
* `src/app/map/page.tsx`, `src/components/engage/reaction-bar.tsx` — tap targets raised to the 40–44px
  range on phones (`min-h-[40px]` segmented buttons, `min-h-[44px]` engagement pills).
* `src/components/mode-toggle.tsx`, `src/components/nav-links.tsx`, `src/app/globals.css` — phone
  header controls at 40px, and an unlayered `@media (max-width: 639.98px)` rule that renders every
  form field at 16px so iOS Safari cannot zoom the page on focus.
* `scripts/mobile-audit.mjs` — new audit (see §5) plus a `--report` flag that writes the markdown
  report in this folder.
* `.github/workflows/deploy.yml` — new `gate` job (typecheck, lint, unit tests, production build);
  `deploy-web` and `build-mobile` both `needs: gate`, so a red build cannot reach production.
* `package.json` — `test`, `test:local`, `test:ui`, `audit:mobile` scripts.
* `tests/` — harness (`harness/env.mjs`, `harness/smtp-capture.py`) and the five suites listed above.
  The SMTP catcher now writes `messages.json` atomically, because parallel suites were catching a
  half-written file.
* `README.md` — was a single line; now states what works today (including that push is off), how to
  run the suites, and how deploys are gated.

## 4. `mario242` — what was found, and the only safe ways in

What could be established without credentials or guessing:

* The account is promoted by `src/db/setup_admins.sql`, which only touches `role` and `status` and
  refuses to run if the account does not exist. It never sets or reads a password.
* Holding the handle is not how the account gets its powers. `src/lib/viewer.ts` grants admin to any
  handle listed in `ADMIN_HANDLES`, so `ADMIN_HANDLES=mario242` is enough for staff access even if the
  database row still says `resident`.
* Production `/api/health` (`2026-10-15 12:38Z`) answered `database:true, mail:true, push:false`.
  Nothing in this workspace can read Vercel environment variables, the production database, or any
  existing session, so whether the production row exists, its role, its status and its email address
  are **not known here** and were not guessed at.
* No endpoint in the product reads or returns a password hash; the admin Members page was checked for
  leaked material and carries none.

The two verified ways back in (both exercised end to end against the local server in
`tests/admin.test.mjs`, with no old password ever seen):

1. **The account's own email.** `POST /api/account/forgot` with the address on the account mails a
   one-hour, single-use link; `POST /api/account/reset` sets a new password, signs every other device
   out, and marks the address verified. The response is identical whether or not the account exists,
   so this leaks nothing and needs no admin access.
2. **An admin-issued link.** From any account with admin rights: Members page → "Send reset link", or
   `PATCH /api/admin/users {"handle":"mario242","action":"resetLink"}`, which returns a one-hour link
   once. It never reveals or changes the stored hash.

Never do: guess or reuse a weak password, paste a password or hash into chat/Git, or hand-write a hash
into the database. If the production account's email is unknown, `setup_admins.sql` in the Neon SQL
editor will restore its staff role but cannot restore a forgotten password — in that case the honest
next step is a support ticket with the account owner, not a workaround.

## 5. The mobile audit, and what it cannot prove

`node scripts/mobile-audit.mjs` fetches every route with a phone User-Agent, reads the compiled
stylesheet, parses the HTML with jsdom and applies: W1 oversized fixed widths, W2/W2b unsplittable
tracks and rows, W3 fixed height over flowing text, W4 tap targets under 40px, W5 unnamed icon
controls, W6 text under 11.5px, W7 unscrolled tables/`<pre>`, W8 unbreakable strings, W9 fields under
16px, W10 bottom-fixed elements that ignore the bottom nav. It exits 1 on any finding.

**Limit, stated plainly:** there is no browser in this environment, so this is a markup and CSS audit,
not a pixel one. Client-rendered regions (the pin list markup, the Leaflet canvas) are covered by the
source-level assertions in `tests/ui.test.mjs`. Anything that needs eyes and a thumb — real iPhone and
Android rendering, the iOS Home Screen push flow, the Android APK — is on the human checklist.

## 6. Still open (needs a human or a device)

1. **Physical push delivery.** No Firebase service account exists in this environment and production
   reports `push:false`. `TODO_HUMAN.md` §1 holds the four steps (Admin SDK key → Expo → APK).
   Until a real phone shows a notification, push stays labelled "not delivered yet".
   *The web deploy is not a prerequisite:* the mobile workflow builds the APK from any branch, and the
   app talks to the production API, so this test can run before the launch deploy. The app's
   notification is mirrored from the member's **verified email alert profile** (device tokens → Expo
   push service, no Firebase keys involved on the server); the separate `FIREBASE_*`-gated path only
   feeds the website's browser push.
2. **Production email links (`appUrl:false`).** That flag is the **old health probe**, not proof that
   links are broken: the deployed build (checked with `git show 2489ce4:src/lib/billing.ts`) already
   falls back to Vercel's own `VERCEL_PROJECT_PRODUCTION_URL` when `APP_URL` is unset, which is how
   every deployment learns its public address. This branch fixes the probe so it stops reporting
   `false` for a healthy site.
   Decisive check, one minute from a phone: open `https://nowbey-v2.vercel.app/alerts`, enter an email
   you can read, press "Send me a confirmation email". Mail arrives → nothing to do. No mail (and not
   in spam) → then set `APP_URL=https://nowbey-v2.vercel.app` in Vercel (Production) and redeploy.
   After the next deploy of this branch the probe reports `appUrl:true` on its own.
3. **`mario242` in production.** The two levers in §4 are the whole toolkit; run one of them when you
   have the account's email or an admin session.
4. **CI depth (optional).** The gate runs typecheck, lint, unit tests and a build. The live suites need
   Postgres and the SMTP catcher, so they run locally today; wiring them into Actions with service
   containers is a follow-up.
5. **Real-device checklist** — `TODO_HUMAN.md` §4: deny/allow notification permission without a
   crash, tap a notification and land on the report, revoke permission in Android settings.
