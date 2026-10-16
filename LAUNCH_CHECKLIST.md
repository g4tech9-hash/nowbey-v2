# Launch Checklist

Preflight (Phase 0) — 2026-10-16. Feature/test matrix (initial).

| Feature / Journey | Components | Required Test | Result | Evidence / Reason |
| --- | --- | --- | --- | --- |
| Landing page & navigation | src/app/page.tsx | UI smoke | NOT RUN | deps not installed |
| Hazard report create | src/app/report, API routes | endpoints/auth | NOT RUN | needs Postgres |
| Map & pin list | src/app/map, leaflet | UI + mobile audit | NOT RUN | |
| News/wire feed | src/app/wire | build/typecheck | NOT RUN | |
| Auth (email+password, Google) | src/app/login, api/auth | auth tests | NOT RUN | |
| Email alerts | alerts routes | mail tests | NOT RUN | |
| Admin pages | src/app/admin | admin tests | NOT RUN | |
| Profile/settings | src/app/you | profile tests | NOT RUN | |
| Health endpoint | src/app/api/health | endpoints | NOT RUN | |
| Expo Android app | expo/ | typecheck, bundle | NOT RUN | no node_modules |
| Deploy (Vercel) | .github/workflows/deploy.yml | gate | NOT RUN | no CLI |
| APK build (EAS) | expo/eas.json | eas build | NOT RUN | no CLI |

## Launch Gates
- Website: NOT READY (unverified).
- Android: NOT READY (unverified).

## Blockers (initial)
- No node_modules installed (install required).
- No Vercel/EAS/Playwright/psql CLIs in sandbox.
- No .env present (use .env.example).
