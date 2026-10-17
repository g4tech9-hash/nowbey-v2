# NOWBEY LAUNCH PLAN

> **Status update (2026-10-17).** Three items below are resolved in code, so this plan is no longer the source of truth for them:
> - **P0 (paid Verified badge): resolved.** `src/lib/badges.ts` grants verification through `badge_grants`, which staff grant, revoke and can time-limit. A plan tier does not grant it.
> - **P1 (payment language): resolved.** Billing copy depends on the real state (`src/lib/billing.ts`), so demo mode is no longer described as live billing.
> - **P2 (alert paywall): resolved.** Storm warnings are free (`src/lib/alerts.ts`, `stormOverride`).
> The original analysis is kept below for history.


## 1. Actual Functionality Audit
NowBey is a community-driven hazard and news aggregator for the Bahamas.
- **Core Features:** Residents "drop pins" to report hazards (floods, outages, etc.) on a map with aerial imagery. Neighbors can confirm these reports.
- **News Wire:** Ingests news from Bahamian outlets (approved by admin).
- **Island Life:** User-generated tips, experiences, and ratings for local spots.
- **Alerts:** Email notifications for specific islands/categories.
- **Gas Tracker:** Crowd-sourced fuel prices.
- **Payments:** Integration with Stripe exists for tiered plans (Conch, Rock Sound, Admiral), but is currently in "demo mode" (no active secret key) where users get "sandbox" status without being charged.

## 2. Trust & Safety Defects
| Priority | Issue | Root Cause | Impact |
| :--- | :--- | :--- | :--- |
| **P0** | **Paid "Verified" Badge** | `src/lib/badges.ts`: The `verified` badge is granted automatically to any user on the "Admiral" paid tier. | **High.** Misleads users into thinking the reporter's identity or information is vetted, when it is actually just a payment receipt. |
| **P1** | **Payment Language** | Privacy policy and billing pages mention Stripe and active payment flows, but the system is in demo mode. | **Medium.** Creates friction/confusion if users attempt to pay or expect real billing. |
| **P2** | **Alert Paywalling** | `src/lib/tiers.ts` and `src/app/page.tsx` suggest advanced alerts (storm warnings) are tied to paid tiers. | **Medium.** Essential safety info (storms) should not be a paid-only feature. |

## 3. Implementation (P0 Fix)
**Fix:** Decouple the "verified" badge from the paid "Admiral" tier. 
**Action:** Remove the automatic assignment of the `verified` badge to Admiral members in `src/lib/badges.ts`. I will change it so the badge is only granted to trusted handles (e.g., those explicitly marked by staff) or remove it until a real verification process is defined.

## 4. Bahamas Launch Strategy
- **Starting Island:** New Providence (Nassau). Highest density, most critical infrastructure hazards.
- **Customer Segment:** Homeowners and commuters in flood-prone areas.
- **MVP:** Live Map + News Wire + Email Alerts.
- **Defer:** "Island Life" ratings, Gas Tracker (lower trust/higher maintenance), and Paid Plans.

### Roadblock Table
| Item | Blocker? | Cheapest Lawful Next Step | Source |
| :--- | :--- | :--- | :--- |
| Business License | Yes | Register as a sole proprietorship/company in Bahamas. | UNVERIFIED |
| Foreign Ownership | Yes | Partner with a Bahamian national or apply for investment permit. | UNVERIFIED |
| VAT | Yes | Register for VAT if revenue exceeds threshold (approx $100k). | UNVERIFIED |
| Data Protection | Yes | Implement a clear Privacy Policy compliant with Bahamas Data Protection Act. | UNVERIFIED |
| UGC Liability | No | Clear Terms of Service stating users are responsible for content. | UNVERIFIED |
| Payment Provider | Yes | Verify Stripe's current eligibility for Bahamian bank accounts. | UNVERIFIED |

### Revenue Experiment
**Experiment:** Fixed-scope "Community Digest" for a local business/HOA.
- **Model:** A curated weekly email of hazards/news for a specific neighborhood.
- **Price:** $25/month.
- **First Buyer:** Local Homeowners Association (HOA) president.
- **Pre-requisite:** Written agreement on data usage and a manual payment link (PayPal/Bank transfer) to avoid Stripe complexity.

### Launch Options
- **$0:** Host on Vercel Free, use Free Tier for DB, manual moderation.
- **$100:** Small marketing spend (local FB groups), basic professional email.
- **$300:** Local influencer partnership, paid API credits for higher-res map data.
- **Break-even:** Monthly costs ~$20 (DB/Email). 1 paying partner ($25) covers it.

### 30-Day Timeline
- **48h:** Fix P0 trust issues, clean up "demo" billing language.
- **7d:** Deploy to production; invite 10 beta testers in Nassau.
- **30d:** Reach 100 active users; pitch first $25/mo digest partner.
- **Pivot Trigger:** If <10 pins/week after 14 days, shift focus from "hazard reports" to "local news/events".

## 5. Feature Roadmap
- **Real-time Push Alerts:** LATER (High cost/complexity).
- **Official Gov Feed Integration:** NOW (Increases trust).
- **Verified Resident Badge (ID check):** LATER (High friction).
- **Paid Storm Alerts:** DO NOT BUILD (Ethically problematic).
- **Business Sponsorship Pins:** NOW (Fastest revenue).
