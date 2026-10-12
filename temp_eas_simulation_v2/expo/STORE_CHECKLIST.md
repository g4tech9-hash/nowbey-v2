# App Store and Google Play checklist

What the code now does, and what only you can do. Have a lawyer read the Terms and Privacy pages before you submit.

## Done in the app and website
| Rule | What was done |
| --- | --- |
| Apple 3.1.1 / Google Play Billing: no outside payments for in-app features | The app shows no prices, no "see plans" or "manage plan" buttons and no payment links. Your plan only appears after you sign in. Plans are sold on the website. |
| Apple 5.1.1(v) / Google: delete account inside the app | You tab > Delete my account (asks for the password). The website and database already delete the data. |
| Apple 1.2 / Google UGC policy: report, block, terms | Report on every comment, post and report. Block person (hides their content). Reports from readers reach admins (Admin > Reports > Reported by readers; comments and posts through their existing admin pages). Terms must be accepted at sign-up. No-abuse rule and contact in the Terms. |
| Emergency disclaimer | Shown when creating an account and on the Report tab. |
| Privacy policy and terms URLs | `/privacy` and `/terms` on your website. |
| Encryption export question | Set to "no non-exempt encryption" in the build config. |
| Version numbers | Build number 1, version code 1. Raise both for every upload. |
| Location permission text | Explains it is used only to place a pin. Foreground only. |
| App icon | A plain placeholder is included. Replace `assets/icon.png` (1024x1024, no transparency) and `assets/adaptive-icon.png` before submitting. |

## You must do
1. **Put the website online with https.** Store builds refuse plain http. Set `extra.apiBase` in `app.json` to that address.
2. **Create the accounts:** Apple Developer Program (US$99 a year) and Google Play Console (one-time US$25).
3. **Set SUPPORT_EMAIL** in the website's `.env`, so the Terms and Privacy pages show who to contact.
4. **Map:** the map is a free OpenStreetMap-style map inside the app, so no Google key is needed. Before a large public launch, switch the tile addresses at the top of `src/MapCanvas.tsx` to a provider you have an agreement with.
5. **Store listings:** screenshots, description, support email, privacy policy URL (`/privacy`), and a **review login** (a test account) in the review notes.
6. **Questionnaires:** Apple privacy labels and Google Data safety form. Data collected: email, name, user ID, precise location (when reporting), photos (website), user content. Not sold, not used for tracking. Age rating: user-generated content, so expect 12+/Teen.
7. **Moderate quickly.** Apple and Google both expect objectionable content to be handled within about a day. Check Admin > Reports regularly.
8. **Build:** `npm install -g eas-cli`, `eas login`, `eas build:configure`, `eas build --platform all`, then `eas submit`.

## Decision: in-app purchases
This version sells nothing inside the app, which keeps it within the rules, but the review team may still ask. If you want people to buy a plan inside the app, add RevenueCat with Apple and Google in-app purchases:
- Apple and Google take 15% (small-business programs) or 30%, and card payments on the website cost about 3%. A 20% price rise covers the 15% rate only.
- Store prices are chosen from the stores' price points, so US$10.80 becomes the nearest point (for example $10.99).
- Apple's rules differ by country and change, so check the current App Review Guidelines before relying on web-only sales.
