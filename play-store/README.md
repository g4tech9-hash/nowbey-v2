# NowBey — Google Play launch pack

Start at **[`PLAY-STORE-LAUNCH.md`](./PLAY-STORE-LAUNCH.md)** and work top to bottom. Everything else here is a paste-ready annex it points to.

| File | What it is |
|---|---|
| `PLAY-STORE-LAUNCH.md` | The walkthrough: account → `.aab` build → Console → forms → closed test → production |
| `store-listing.md` | Title/short/full description (character-checked), release notes, category, screenshot shot list |
| `assets/icon-512.png` | Play listing icon (512×512, from the real adaptive icon) |
| `assets/feature-graphic-1024x500.png` | Play feature graphic (from the launch-kit cover) |
| `data-safety-worksheet.md` | Data Safety + App Content answers derived from the code, incl. the 4 privacy-page edits |
| `reviewer-notes.md` | App Access text, demo-account steps, UGC/location/payments policy replies |
| `closed-test-plan.md` | 12 testers × 14 days: recruiting copy, day-by-day calendar, production-access draft answers |
| `background-location-decision.md` | Entry-alert difficulty verdict, geofencing sketch, watch-zone alternative, decision gate |
| `web/delete-account/page.tsx` | Drop-in page for the website (`src/app/delete-account/page.tsx`) — Play requires a web deletion URL |

Code/config changes that ship with this pack (outside this folder):

- `expo/eas.json` — production AAB profile + update channels + submit-to-internal
- `expo/app.json` — v1.3.0, blocked over-broad permissions, notification icon
- `expo/assets/notification-icon.png` — white pin small icon
- `expo/.easignore` — lets `google-services.json` reach EAS while keeping it out of Git
- `.github/workflows/eas-production-aab.yml` — manual one-button production bundle build
