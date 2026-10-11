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
