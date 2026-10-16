# Project Audit - NowBey V2

## Application Overview
NowBey V2 is a dual-platform application consisting of:
1. **Website**: A Next.js web application.
2. **Mobile App**: An Expo/React Native application.

The app appears to be a community-focused platform (possibly for reporting incidents, gas prices, and other local updates in the Bahamas, based on filenames like `add-gas-table.sql`).

## Tech Stack
### Website (Root)
- **Framework**: Next.js 16.4.0
- **Language**: TypeScript
- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS 4.1.17
- **Payments**: Stripe
- **Email**: Resend
- **Maps**: Leaflet / React-Leaflet

### Mobile App (`expo/`)
- **Framework**: Expo 57.0.27
- **Language**: TypeScript
- **Navigation**: Expo Router
- **Key Libraries**: Expo Location, Expo Secure Store, React Native WebView

## Project State
- **Finished**:
    - Basic project structure for both web and mobile.
    - Database schema files (.sql) and Drizzle config.
    - Basic routing for the mobile app (tabs for gas, life, map, report, etc.).
- **Broken/Missing**:
    - Need to verify if the Next.js site builds and runs.
    - Need to verify if the Expo app builds and runs.
    - Environment variables are partially configured in `.env`, but `.env.example` lists many missing keys (STRIPE, RESEND, AUTH_SECRET).

## Setup & Execution Commands

### Website
1. **Install**: `npm install`
2. **Run (Dev)**: `npm run dev`
3. **Build**: `npm run build`
4. **Typecheck**: `npm run typecheck`

### Mobile App
1. **Install**: `cd expo && npm install`
2. **Run (Dev)**: `cd expo && npm start`
3. **Build (Android APK)**: `cd expo && eas build -p android --profile preview --non-interactive`

## Secrets Audit
- `.env` file contains production Neon database credentials.
- `.gitignore` correctly includes `.env`.
- No production secrets found hardcoded in the main source code (except for local defaults in `setup.ps1`).

## Current audit (2026-10-16, autonomous)

### Application
Community safety map + news wire for The Bahamas. Next.js 16 App Router (Tailwind 4, Drizzle + Neon Postgres, Stripe, Resend/SMTP, optional Firebase push), plus Expo Android app in `expo/`.

### Architecture
- Web: `src/app` routes (pages + API routes), `src/lib`, `src/db` (schema + SQL migrations), `src/proxy.ts` (CORS/origin checks).
- Mobile: `expo/` Expo Router app; API base from `EXPO_PUBLIC_API_BASE`.
- CI: `.github/workflows/deploy.yml` (gate: typecheck/lint/unit tests/build; deploy web on push to master), `build.yml` (manual APK), `eas-cancel.yml`.

### Commands
- Web: `npm install`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:local`, `npm run test:ui`, `npm run fuzz`, `npm run audit:mobile`.
- Mobile: `cd expo && npm install`, `npm run typecheck`, `npm run preflight:apk`.

### Environment variables
See `.env.example` (web) and `expo/.env.example` (mobile). Server-only secrets: DATABASE_URL, AUTH_SECRET, CRON_SECRET, STRIPE_*, RESEND_API_KEY, SMTP_*, FIREBASE_*, GEMINI_API_KEY, GITHUB_TOKEN, GOOGLE_CLIENT_SECRET, GOOGLE_MAPS_API_KEY, EXPO_ACCESS_TOKEN. Public: NEXT_PUBLIC_*, EXPO_PUBLIC_*.

### Verified this session
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS (48/48).
- `npm run build`: FAIL in sandbox due to Google Fonts network (fonts.googleapis.com unreachable); code path unchanged; CI has network.
- Expo `npm run typecheck`: PASS.
- `expo-doctor`: 19/21; 2 failures are network (Expo API schema + package metadata).

### Known blockers
- Production build cannot be verified in sandbox (Google Fonts). CI will verify.
- No Postgres/SMTP catcher in sandbox => `test:local`/`test:ui` not run.
- No Vercel/EAS CLIs => deployment/APK not run from sandbox.
- better-sqlite3/playwright native deps installed with `--ignore-scripts` (no rebuild) due to network; `openplaces` geocoder may be limited but non-blocking.
