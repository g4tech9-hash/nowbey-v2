# NowBey

Community safety map and news wire for The Bahamas. Pure Next.js website (App Router, Tailwind 4,
Drizzle + Postgres/Neon, Stripe, optional Firebase push), plus an Expo app in `expo/` for Android, plus a
standalone landing page (Vite + React + Tailwind 4) that sits in front of the product.

```bash
npm run dev          # landing page, http://localhost:5173
npm run dev:app      # the application, http://localhost:3000
npm run build        # landing page: sync the feature docs, then vite build
npm run build:app    # the application: next build
npm run sync-docs    # regenerate docs/FEATURES.md from the feature registry
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
```

## The landing page

`src/App.tsx` assembles the page from `src/components/` (`Hero`, `FeatureRegistry`, `Spotlight`, `Faq`,
`Cta`, `Footer`, `Nav` and the dependency-free `Icon` set). Nothing on the page is hard-coded in a
component:

| What | Where it lives |
| --- | --- |
| Design tokens and the shared component layer | `src/index.css` (`@theme static`, plus `.shell`, `.grid-veil`, `.glass`, `.focus-ring`) |
| Every word a reader sees | `src/content/site.ts` |
| Every feature, and the `src/lib` module that implements it | `src/content/featureRegistry.ts` |
| The domain model, the page state and the seeded demo data | `src/lib/landing-model.ts`, `src/lib/landing-state.ts`, `src/lib/landing-seed.ts` |
| The generated feature reference | `docs/FEATURES.md` |

`scripts/sync-docs.mjs` bundles `src/content/featureRegistry.ts` with esbuild, checks that every
`source` path still exists, and rewrites `docs/FEATURES.md`. It runs before every landing-page build
and in CI, so the documentation cannot describe a feature the code does not have. Run it by hand
after touching the registry:

```bash
npm run sync-docs            # rewrite docs/FEATURES.md
node scripts/sync-docs.mjs --check   # fail if the docs are out of date
```

The landing page links to the product's own routes (`/map`, `/wire`, ...). In local development the
Vite server proxies those paths to the Next.js app on port 3000, so run `npm run dev:app` as well if
you want the links to land somewhere real.

## What works today, honestly

| Area | State |
| --- | --- |
| Map, pin list, reporting, confirmations | Live for New Providence (launch stage `nassau`) |
| Accounts | Email + password, and **Sign in with Google** (authorization code + PKCE, no auth framework). One button covers sign-up and sign-in; an existing password account is linked by its verified Google address |
| Email alerts | Live. One profile per address on the free plan, one island, storm warnings always sent |
| Text-message alerts | **Not built.** Labeled "Soon" wherever a plan mentions them |
| Website push (browser, FCM) | Code complete, **switched off in production**: no Firebase keys are set, so the alerts page says "Not switched on for this site yet" |
| Android app push | Code complete, **not delivered to a device yet** — it needs the FCM v1 service account and an APK build. See `TODO_HUMAN.md` |
| iPhone app push | **Not built.** The website can still show push on iOS 16.4+ once the site is added to the Home Screen; email always works |
| Island guides (`/gas`, `/life`) | Deferred until after the Nassau launch |
| Log pipeline (AI fixes) | Code complete: web, server and Expo crashes auto-collect with breadcrumbs into Admin → Logs, where Gemini diagnoses each group. An admin approves or dismisses; approval creates a GitHub issue for a human/Arena session to implement. In-app AI never edits or deploys code. Needs `add-error-ai.sql`, `GEMINI_API_KEY`, `GITHUB_TOKEN`/`GITHUB_REPO` and the `/api/cron/error-analysis` cron — see `docs/AI_LOG_FIXES.md` |

Push is never claimed as working in a plan, a page or a document until a real device receives a real
notification. `/api/health` reports `push: true` only when the server can actually sign FCM requests.

## Tests

```bash
npm test            # hermetic unit tests (no server needed)
npm run audit:mobile    # 320–412px markup/CSS audit of every phone page; exits 1 on findings
```

The launch-blocking suites need a running server, a local Postgres and the SMTP catcher:

```bash
# 1. Postgres on 55432, schema + seed applied, .env.local pointing at it (see tests/harness/env.mjs)
# 2. A throwaway SMTP server that captures every message:
openssl req -x509 -newkey rsa:2048 -keyout /tmp/certs/key.pem -out /tmp/certs/cert.pem \
  -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
python3 tests/harness/smtp-capture.py --port 4465 --cert /tmp/certs/cert.pem \
  --key /tmp/certs/key.pem --out /tmp/nowbey-mail
# 3. npm run dev
npm run test:local  # endpoints + auth + mail + admin, 35 checks against the running server
npm run test:ui     # phone markup checks, honest-push wording, deploy gate, mobile audit
```

Everything the suites send stays local: mail lands in `/tmp/nowbey-mail/messages.json`, rate limits are
avoided with per-test client addresses, and no test ever reads, writes or guesses a password. The
`mario242` owner account is exercised only through the reset emails the product itself issues.

`tests/google.test.mjs` drives the whole Google handshake against a fake token endpoint that the suite
starts itself, so it needs no Google account and no network. Run the server with these in `.env.local`
(the suite reads the same file):

```
GOOGLE_CLIENT_ID=test-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=test-client-secret
GOOGLE_OAUTH_BASE=http://127.0.0.1:4466   # test hook: leave unset in production
```

What that suite *cannot* prove is Google's side of the bargain: the consent screen, the real client id
and the redirect-URI registration. `TODO_HUMAN.md` §0c has those steps.

## Deploying

`.github/workflows/deploy.yml` deploys to Vercel on a push to `master`, but only after the `gate` job
passes typecheck, lint, the unit tests and a production build. The APK build is manual
(Actions → Deploy → Run workflow → `mobile`) and is deliberately postponed until the push credentials
and a physical-device test are ready. `TODO_HUMAN.md` lists every step that needs a human.

The `gate` job builds both halves of the repository: `npm run build:app` (the Next.js application
that Vercel serves) and `npm run build` (the landing page, which also regenerates
`docs/FEATURES.md`). If the Vercel project ever has a custom build command, it must be
`npm run build:app` - `npm run build` builds the landing page, not the application.
