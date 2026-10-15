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

Since the site renders every page on demand, a missing variable shows up as a runtime error, not a build failure: the build passes, `/api/health` answers `{"ok":false}`, and the server log names the variable that is missing. Add it, then redeploy (environment changes only apply to new deployments).
