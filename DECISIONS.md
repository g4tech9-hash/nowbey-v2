# DECISIONS.md (push notifications, 2026-10-14)
1. `android.googleServicesFile` OMITTED (file missing; referencing it fails EAS prebuild). Remote delivery needs a human Firebase step → TODO_HUMAN.md. Token flow + taps still work.
2. eas.json preview already internal/apk — verified, untouched.
3. Backend deploy = push branch, check Vercel auto-deploy; prod needs master (merge only if pipeline confirms).
4. Push covers incident + news alert dispatches only (the notification system); auth/enterprise mails stay email-only.
5. sendPush runs AFTER email loops, try/catch-isolated; never blocks email.
6. Tests: pure helpers (chunk/validate/receipts) under node --test; routes need DB → typecheck + manual.
7. Commit only push files on the feature branch; unrelated work stays uncommitted.
8. No iOS code/config; no firebase-admin; no `eas update` (native module added).
9. places-update cron disabled (501): installed openplaces@0.3.5 dropped the
   `Places` export its WIP used and ships a broken sqlite helper, failing
   `next build` on master too. This unblocks ALL backend deploys, not just push.
10. Firebase: project nowbey-ed663 exists but g4tech9@gmail.com has no app-create
    permission (403). google-services.json + FCM V1 key remain human steps.
