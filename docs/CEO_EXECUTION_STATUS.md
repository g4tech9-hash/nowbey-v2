# CEO execution status — Bahamas utility roadmap

_Last updated 2026-10-15_

## The ten priorities

1. **Account recovery/admin access — implemented.** Verified email, one-time reset tokens, password strength, session invalidation, resend verification, sign-out-other-devices, and admin account controls exist. The unsafe shared-password admin bootstrap was removed. Production owner rows still require a one-time controlled recovery because this workspace has no Neon/Vercel credentials.
2. **Real push delivery — code complete, credential/build validation pending.** Web FCM and Expo device registration, delivery, dead-token pruning, tap paths, and unregister are present. Firebase Android config is validated. Final physical-device delivery waits for FCM v1 credentials and the intentionally postponed APK build.
3. **Simple View — implemented.** Device-local larger typography, minimum touch targets, simpler visual presentation, pre-paint preference loading, account settings, and a footer quick switch.
4. **Low-data mode — implemented.** Device-local preference, decorative imagery suppression, reduced map size, and maps paused behind an explicit “Load this map” action. Text/list location data remains available.
5. **Source/freshness/trust labels — implemented.** Incident details identify community versus official origin, confirmation count, freshness/staleness, source link, and the limits of community information. Paid membership does not grant an official badge.
6. **Duplicate clustering — implemented conservatively.** A new report within 180 metres, the same category, and 90 minutes reuses the existing active incident rather than sending another alert. Wider or ambiguous events remain separate.
7. **Saved family areas/routes — family areas implemented through alert profiles.** Profiles support multiple islands, category filters, exact centre, and 2–100 km radius; paid plans support multiple profiles. Route-corridor alerting remains deferred until routing data/provider terms and user testing justify its cost and privacy impact.
8. **Open after disruption — implemented.** Public `/open-now`, expiring essential-service statuses, source/verification labels, additive SQL migration, and an admin publishing console at `/admin/statuses`.
9. **Organization operations/revenue — foundation implemented.** Enterprise plans, enquiry intake, admin inbox, notification delivery, digest partners, incident/admin dashboards, exports, and audit records exist. Customer-specific multi-tenant workspaces should wait for 3–5 paid design partners rather than be built speculatively.
10. **Human-supervised AI — implemented.** Gemini moderation is queue-only, not autonomous; AI story briefs, digest drafts, image screening, and structured enrichment fail open and preserve human control.

## Additional improvements added because they materially help

- Secret-free `/api/health` readiness report for database, mail, push, AI, geocoding, APP_URL, version, and timestamp.
- Native browser read-aloud on incident pages at no cloud cost.
- “Open now” entries expire automatically, preventing stale operating claims from lingering.
- Older-user controls are available without signing in.

## Free services worth configuring

| Service | Free value | Required action | Cost guardrail |
|---|---|---|---|
| Firebase Spark | FCM and basic project services | Android app already registered; add FCM v1 credential to Expo later | Do not enable paid products until needed |
| Firebase Crashlytics | Mobile crash reporting | Add after the next APK tranche | Never log precise locations, tokens, or private text |
| Google AI Studio / Gemini | Limited AI moderation and summaries | Create `GEMINI_API_KEY`, add to Vercel as Secret | Daily quotas and kill switch |
| Sentry free tier (optional) | Better web/server error grouping | Only if the existing `client_errors` dashboard proves insufficient | One error service is enough |
| UptimeRobot free tier | External `/api/health` checks | Monitor production health URL every 5 minutes | Alert only on repeated failures |
| Cloudflare free tier (optional) | DNS, caching and basic protection | Use only when a custom domain is active | Do not proxy-map APIs without testing |
| Google Maps Platform | Better geocoding, usage generally requires billing account | Restrict key to Geocoding API and production origins/IPs | Set budget alerts and hard quotas |

Do not migrate transactional data from Neon to Firestore. Do not add Twilio/SMS until a sponsor or paying organization covers recurring message costs. Do not paywall critical safety alerts.

## Secure account-access policy

Never place passwords, 2FA codes, SMTP app passwords, service-account private keys, database URLs, or access tokens in chat or source control. Use Arena connectors where supported, provider dashboards, or scoped environment secrets. This workspace currently has limited GitHub CLI access only; Firebase, Vercel, Expo and Neon require secure provider-side authorization before production operations can be performed.
