# Release sweep — 2026-10-16

## Scope

Reviewed this session's accumulated auth diagnostics, map/layout/light-mode changes, profile photo support, badge display, broadcasting integration and Android APK release path. This is a bounded release review, not a claim of a complete penetration test or production certification.

## Corrected during the final sweep

- Added the missing `expo/scripts/preflight-apk.js` referenced by both npm preflight commands. Static checks validate APK/internal distribution, API target, project/package and assets; full checks additionally require the real Firebase file and run TypeScript plus Metro Android export.
- Wired full preflight into the mobile Actions job after secure Firebase configuration and before EAS build.
- Restored missing mobile `muted`/`subtle` theme aliases (13 TypeScript errors).
- Removed rejected CARTO endpoints from the native WebView map as well as the website. Native aerial labels use Esri; street tiles use canonical OSM. Provider loading still needs device verification.
- Correctly label Broadcaster grants instead of presenting them as Verified Reporter. Staff badge lookup now recognizes verified environment-based admins. Admin badge controls check expiry as of the server request.
- Clear viewer state on disconnect, bound webhook request bytes even without Content-Length, recognize the signed webhook at the origin wall, and clean up partial camera connections.
- Self-hosted the existing Sora/Manrope Latin variable fonts with their licenses. Builds no longer fetch Google Fonts.
- Pinned the Firebase transitive `@grpc/grpc-js` dependency to patched 1.14.6. Web production audit now reports zero vulnerabilities at sweep time.
- Bumped Android release to app version 1.2.3 / versionCode 4. EAS preview remains internal APK; no store submission was added.

## Local results

- Web TypeScript: PASS.
- Full repository ESLint: PASS.
- Unit/source regression tests: 82 PASS.
- Next production build without production secrets: PASS.
- Production-server HTTP probes: login, forgot-password, legal pages and unconfigured broadcasting render; anonymous avatar/broadcast writes return 401; foreign avatar write returns 403; unconfigured webhook/health fail closed.
- Expo TypeScript: PASS.
- Metro Android bundle export: PASS. It warns that the local Firebase file is absent; this is supplied securely in CI. Export success is not equivalent to a signed native APK.
- APK static preflight: PASS; Firebase portion intentionally deferred to full CI preflight.

## Remaining limitations / follow-up

- No production database, mail catcher, provider credentials or real device in this sandbox. Database-dependent local suites, photo upload round trips, Google sign-in, LiveKit media/moderation/webhook delivery, physical-device push and install tests were NOT run here.
- `src/db/add-profile-photos.sql` and root `add-live-streams.sql` must exist in production. No production migration was executed by this session.
- LiveKit remains unavailable until the owner supplies valid server configuration and a signed lifecycle webhook. No recording is requested. See BROADCASTING.md for short-lived token reuse and provider-disconnect failure boundaries.
- Expo production dependency audit reports 29 findings (19 high, 10 moderate), largely propagated through Expo/Metro tooling: unpatched `braces` stack-exhaustion and `node-forge` signature-verification advisories; router `decode-uri-component` and build-tool `uuid` findings. npm proposes incompatible SDK downgrades for several. Do not blindly run `npm audit fix --force`; a compatible upstream SDK/dependency update and separate validation are needed. No critical findings reported. Web audit clean does not mean mobile audit clean.
- Earlier Vercel CLI deploy runs rejected the repository token; this session cannot read/update Actions secrets (403). Deployment status must be established from the new Actions run and independent production smoke check, not inferred from local tests.

## Release procedure

Push only the Arena session branch, open a PR, merge explicitly to master after local gates. The master push triggers the gated web deploy and production smoke check. Then dispatch target `mobile`: full preflight precedes `eas build --platform android --profile preview --non-interactive --wait --json`. A green preflight is not a finished APK; verify EAS status FINISHED and its artifact URL. No AAB/store build or submission is requested.
