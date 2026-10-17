# INSTALLATION GUIDE

This guide describes how to set up the NowBey platform (Web & Mobile).

## Prerequisites
- Node.js (latest LTS)
- Docker Desktop (Required for Local DB setup)
- PostgreSQL Client (`psql`) (Required for seeding)
- Expo Go app (for mobile testing)

## 1. Web Setup (Backend & Admin)
```bash
# Navigate to project root
cd C:\Users\Admin\Downloads\nowbeyV2

# Run the automated setup script
# This script handles DB selection (Local vs Cloud), dependencies, and schema push.
powershell -ExecutionPolicy Bypass -File .\setup.ps1

# Start development server
npm run dev
```

### No database yet? `npm run dev` still works

With **no `DATABASE_URL` set**, the dev server boots an embedded Postgres automatically
([PGlite](https://pglite.dev), real PostgreSQL compiled to WASM — no Docker, no Neon account
needed for a first look):

- the full schema is applied from the generated migrations in `drizzle/`
- a handful of clearly-marked demo pins and wire stories are seeded, so the map, feed and wire
  have content immediately
- data persists in `.data/pglite` — delete that folder to reset to the demo set

Set `DATABASE_URL` (`.env`) and the embedded database is never used. Production behavior is
untouched: a deployment without `DATABASE_URL` shows "setup not finished" pages and 503 JSON
APIs rather than crashing, and never starts the embedded database.

After changing `src/db/schema.ts`, regenerate the migrations so the dev database (and
`drizzle-kit migrate` on a real one) stays in step:

```bash
npm run db:gen   # drizzle-kit generate → new SQL file in drizzle/
```

## 2. Mobile Setup
```bash
# Navigate to expo folder
cd expo

# Install dependencies
npm install

# Start Expo
npm start
```

## 3. Environment Configuration
The project uses a `.env` file for secrets. Ensure the following are set for production:
- `DATABASE_URL`: Your Neon PostgreSQL connection string.
- `AUTH_SECRET`: A long random string.
- `STRIPE_SECRET_KEY`: From your Stripe dashboard.
- `RESEND_API_KEY`: From your Resend dashboard.
- `APP_URL`: The public URL of your deployed web app.

## 4. Database Management
- **Push Schema Changes**: `npx drizzle-kit push`
- **Seed Data**: `psql [URL] -f src/db/seed.sql`

## 5. Deploying on Vercel
Environment variables live in **Project → Settings → Environment Variables**, not in the repo (`.env*` is ignored by both git and `.vercelignore`).

Each variable is ticked for one or more of **Production / Preview / Development**. A variable added for Production only is *not* there for a Preview build, so a build from any branch other than `master` will run without it:

- `DATABASE_URL` — the Neon connection string. Required for anything that reads or writes data: pages with a feed, `/admin`, `/api/*`.
- `AUTH_SECRET` — at least 32 characters. Required in production; without it sign-in fails and pages log the reason.
- `CRON_SECRET`, `APP_URL`, plus any of the optional keys in `.env.example` for the features you use.

Since the site renders every page on demand, a missing variable shows up at runtime, not as a build failure: the build passes and `/api/health` answers `{"ok":false}`. For `DATABASE_URL` specifically the site degrades gracefully — data-backed pages show a "setup not finished" panel with these exact steps, and API routes answer a readable 503 JSON — so a forgotten variable can no longer take a deployment down. Add it, then redeploy (environment changes only apply to new deployments).
