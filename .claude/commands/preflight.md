You are acting as a senior full-stack engineer, QA engineer, and release engineer.

You are working autonomously in:
C:\Users\Admin\Downloads\nowbeyV2

Environment: Windows, PowerShell.
I am already logged in to GitHub (gh), Vercel, and Expo/EAS.

I will be away and cannot answer questions. Make reasonable decisions, document your assumptions, and continue with all work that can be completed safely.

MISSION
Audit the application, fix safe issues, add and run meaningful tests, and prepare the website and Android app for launch.

Do not stop at “the build passes.” Verify the frontend, backend, integrations, mobile app, and deployment configuration.

Do not claim the application is launch-ready unless the relevant checks actually pass. Clearly distinguish verified results from assumptions, skipped tests, and blocked work.

==================================================
SAFETY RULES — APPLY TO EVERY PHASE
==================================================

1. Safe, reversible source-code edits are allowed.
   Preserve existing functionality and user work. Do not delete or overwrite unrelated files, user content, local configuration, or uncommitted changes.

2. Do NOT perform dangerous changes. Skip the affected action, record it in NEEDS_APPROVAL.md, and continue with other safe work.

   Dangerous changes include:
   - Deleting user files or data.
   - Dropping, truncating, resetting, or migrating database tables or data.
   - Running commands or tests that modify production database data.
   - Changing authentication, authorization, payment, or subscription logic.
   - Changing or rotating secrets or API keys.
   - Force-pushing, rewriting Git history, or discarding existing work.
   - Upgrading major versions of Next.js, Expo SDK, React, or React Native.
   - Changing app identifiers, package names, signing keys, or domains.
   - Installing global software.
   - Creating paid resources, making purchases, or triggering new charges.
   - Any other change that could lose data or be difficult to undo.

3. The requested website deployment and APK build are authorized only when they use the existing projects, accounts, configuration, credentials, and available included/free resources.
   If they require a dangerous change or potentially chargeable action, stop that action and document it for approval.

4. Environment-variable setup:
   - You may configure missing deployment variables using their existing local values, as requested below.
   - Do not rotate secrets or overwrite an existing deployment value that differs from the local value.
   - Confirm local values are appropriate for the deployment target; do not blindly deploy development database connections to production.
   - If this cannot be established safely, record the blocker.

5. Tests must use synthetic data, mocks, in-memory fixtures, or an existing confirmed non-production environment.
   Do not trigger real payments, subscriptions, emails, SMS, push notifications, destructive uploads, or production writes.
   Do not run invasive security scans against production.

6. Never print, log, screenshot, or commit secret values.
   Use variable names and redacted diagnostics only.
   Never put private secrets in NEXT_PUBLIC_* or EXPO_PUBLIC_* variables.

7. Inspect install, build, and deployment hooks before running them.
   Do not allow an automatic migration, seed, reset, or production write to run indirectly through a script.

8. Do not make checks pass by:
   - Disabling tests, lint rules, or type checking.
   - Weakening security.
   - Removing working features.
   - Replacing production functionality with fake success responses.
   - Hiding errors or broadly adding “any”, ts-ignore, or equivalent suppressions.

9. For every item in NEEDS_APPROVAL.md, include:
   - Proposed change.
   - Why it is needed.
   - Exact commands or edits.
   - Risk and affected systems.
   - How to undo it.
   - Safe workaround, if one exists.

==================================================
PHASE 0: PREFLIGHT AND CHECKPOINT
==================================================

- Confirm the working directory and Git repository.
- Read repository instructions, README files, package manifests, lockfiles, and workspace configuration.
- Identify existing staged and unstaged changes. Preserve them.
- Check available Node.js, package-manager, Git, browser-testing, Vercel, and EAS tooling.
- Use the package manager indicated by the repository’s lockfile.
- Use PowerShell-compatible commands; do not assume Bash syntax.

Before making repairs:
- Create a Git checkpoint commit containing only verified non-secret files.
- Do not blindly run “git add .”.
- If existing changes cannot safely be included, create an empty checkpoint commit and note that it does not back up uncommitted work.
- Never commit secrets or unrelated user changes.

Create and maintain:
- PROGRESS.md
- AUDIT.md
- TEST_RESULTS.md
- LAUNCH_CHECKLIST.md
- NEEDS_APPROVAL.md

Update PROGRESS.md throughout the work with:
- Actions taken.
- Commands run and outcomes.
- Fixes completed.
- Failures and blockers.
- Current next step.

Commit your own changes after each major fix or completed phase.

==================================================
PHASE 1: FULL-STACK AUDIT
==================================================

Read all relevant first-party source and configuration.
Exclude generated output, dependency folders, caches, and binary assets from line-by-line review.

Write AUDIT.md covering:

- What the application does and its main user journeys.
- Frontend and mobile architecture.
- Backend, API routes, server actions, database access, storage, and background jobs.
- External services and integrations.
- Authentication, user roles, payments, and subscriptions, if present.
- Existing tests and CI/CD.
- What is finished, broken, incomplete, or unverified.
- Exact installation, development, testing, and build commands for each app/workspace.
- Deployment requirements and known launch blockers.

Environment and secret audit:
- Identify every required environment variable and which app needs it.
- Add .env* files to .gitignore while explicitly allowing .env.example.
- Create or update .env.example with variable names and empty values only.
- Document which variables are server-only, public, optional, or required.
- Check for accidentally tracked environment files and hardcoded secrets without exposing values.
- If safe, stop tracking secret files without deleting the local copies.
- Replace hardcoded secret references with environment-variable references only when behavior can be preserved safely.
- Record exposed credentials in NEEDS_APPROVAL.md for rotation.
- Do not rotate credentials or rewrite Git history.

Create a feature/test matrix in LAUNCH_CHECKLIST.md:
- Feature or user journey.
- Relevant frontend/backend/mobile components.
- Required test.
- Result: PASS, FAIL, BLOCKED, NOT RUN, or NOT APPLICABLE.
- Evidence or reason.

==================================================
PHASE 2: FIX AND RUN FULL-STACK TESTS
==================================================

First establish a baseline:
- Install dependencies using the existing package manager and lockfile.
- Run existing checks before editing.
- Record the original failures.
- Inspect dependency vulnerabilities without using forced upgrades.
- Avoid unnecessary dependencies or framework changes.

Fix safe defects and add regression tests where appropriate.
Use existing test frameworks where possible. If testing is missing, add minimal project-local tooling compatible with the current stack.

Run the following checks wherever applicable:

A. STATIC CHECKS AND BUILDS
- TypeScript/type checking.
- ESLint or the repository’s lint checks.
- Formatting checks, if configured.
- Import resolution and case-sensitive path issues.
- Next.js production build.
- Backend/server build.
- Expo/React Native bundling checks.
- Verify required environment variables fail clearly when missing.

B. UNIT TESTS
- Business utilities, validation, transformations, and calculations.
- Important UI components and hooks.
- Loading, empty, error, and success states.
- Boundary cases, malformed inputs, and missing values.

C. BACKEND AND INTEGRATION TESTS
- API/server-action request and response contracts.
- Successful and unsuccessful requests.
- Validation and error handling.
- Existing authentication and authorization behavior.
- Unauthorized and forbidden access.
- Database/service failures and timeouts using safe fixtures or mocks.
- External integrations using mocks or confirmed sandbox environments.
- Ensure errors and logs do not expose secrets or sensitive data.

Do not change protected authentication/payment/subscription logic.
If a defect requires such a change, document it for approval.

D. WEB END-TO-END TESTS
Use Playwright or the existing browser-test framework.

Test the app’s actual critical journeys, including applicable flows such as:
- Landing page and navigation.
- Registration/login/logout/session behavior in a safe test environment.
- Main user dashboard and core feature.
- Forms, validation, search, filtering, and pagination.
- Profile/settings functionality.
- Role-restricted pages.
- Checkout/subscription UI using mocked or sandbox integrations only.
- Not-found routes and recoverable errors.

Check:
- Browser console errors.
- Failed network requests.
- Broken links and missing assets.
- Hydration errors.
- Direct navigation and page refresh.
- Desktop and mobile viewport layouts.
- Keyboard navigation, focus, labels, and basic accessibility.
- Supported browsers where tooling is available.

Do not test real production mutations.

E. SECURITY AND CONFIGURATION REVIEW
Review locally for:
- Client-side exposure of secrets.
- Missing server-side permission checks.
- Unsafe input handling and injection risks.
- XSS/CSRF risks where applicable.
- CORS and security-header configuration.
- Sensitive data in responses, logs, or source maps.
- Dependency vulnerabilities.
- Unsafe debug/test endpoints or development settings.

Fix only what is safe under the rules.
Do not claim a security review is a penetration test or security certification.

F. PERFORMANCE AND PUBLIC-PAGE READINESS
- Identify obvious rendering, loading, image, and bundle-size problems.
- Check layout shifts and basic page-load performance using available tools.
- Verify public-page titles, descriptions, canonical URLs, robots settings, and sitemap behavior where applicable.
- Ensure private pages are not accidentally exposed or listed.
- Do not invent legal text, business policies, or unsupported claims.

G. ANDROID / EXPO TESTS
- Run available Expo diagnostics, including expo-doctor and dependency compatibility checks.
- Check TypeScript, navigation, assets, fonts, permissions, and environment configuration.
- Verify API URLs are usable from Android and do not point to localhost unintentionally.
- Review Android network and platform-specific behavior.
- Test loading, empty, error, offline, and reconnection behavior where applicable.
- Verify deep links and core mobile journeys where supported.
- Use an existing emulator/device if available.
- Do not install global SDKs, change signing keys, or change app identifiers.

If device/emulator testing is unavailable, mark it BLOCKED or NOT RUN.
A successful EAS build does not prove the APK works on a device.

For every test category, record in TEST_RESULTS.md:
- Exact command or procedure.
- Environment used.
- Pass/fail counts where available.
- Failures and fixes.
- Skipped or blocked coverage and why.

Keep fixing safe failures and rerunning affected checks.
Do not mark untested features as passed.

LAUNCH GATE
Before deploying a target, confirm:
- Required build, type, and lint checks pass.
- Critical applicable tests pass.
- No known critical runtime or security blocker remains.
- Required deployment variables and integrations are accounted for.
- Build/deployment hooks will not modify production data.
- No dangerous change is required.

If a critical gate fails, do not publish that target as launch-ready.
Continue preparing and testing other independent targets.

==================================================
PHASE 3: DEPLOY AND VERIFY
==================================================

WEBSITE / VERCEL

- Confirm the correct existing Vercel project, app directory, and build settings.
- Record the previous production deployment and a rollback procedure.
- Verify required production environment-variable names.
- Add missing variables from the appropriate local .env using a secure CLI input method.
- Do not echo values, place secrets in command-line arguments, or expose them in logs.
- Do not overwrite differing existing values.
- Use a preview deployment for additional checks if supported safely by the existing setup.
- Deploy the validated Next.js app to production with the Vercel CLI.
- Use “vercel --prod --yes” only after confirming the correct project and configuration.

After deployment:
- Wait for completion and verify deployment status.
- Confirm the production URL loads.
- Check public routes, redirects, static assets, response status, and visible errors.
- Check for client console and network failures where browser tooling is available.
- Use read-only production smoke tests only.
- Record the live URL, deployment identifier, and verification results.

ANDROID / EAS

- Confirm the existing Expo/EAS project and Android configuration.
- Preserve existing eas.json configuration.
- If a preview profile is missing, add one with Android buildType set to "apk".
- Do not alter identifiers, signing credentials, or protected configuration.

Run:
eas build -p android --profile preview --non-interactive

- Wait for the build to finish.
- Verify the resulting artifact is an APK.
- Record the build ID, build status, and download link.
- If an existing test device/emulator is available, install and smoke-test the APK safely.
- Record any remaining device-validation gap.
- Do not upload to app stores or change store listings.

FAILURE HANDLING
- Read the actual error before retrying.
- Make a relevant safe fix rather than repeating the same failing command.
- Retry up to 3 times after the initial attempt, only if retries remain within the safety and cost limits.
- Never retry a chargeable operation without approval.
- If blocked, record the reason and continue with independent work.

==================================================
PHASE 4: FINAL REPORT
==================================================

Update all documentation and commit your completed safe changes.

The final summary must include:
- What was fixed.
- What remains broken, incomplete, or unverified.
- Tests run and their actual results.
- Critical journeys verified.
- Checks skipped or blocked.
- Live website URL and deployment status.
- APK download link and build status.
- Whether the APK was tested on a device/emulator.
- Required environment-variable names or manual setup steps.
- Relevant commit identifiers.
- Rollback instructions.
- An honest launch verdict for the website and Android app separately.

Use:
- READY: all required gates passed.
- NOT READY: a required gate failed or remains unverified.

Do not label a target READY merely because it builds or deploys.

End the summary with:

NEEDS MY APPROVAL
See NEEDS_APPROVAL.md.

List each approval item in one line.
If there are none, explicitly say “None.”
