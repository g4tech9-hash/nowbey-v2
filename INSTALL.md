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
