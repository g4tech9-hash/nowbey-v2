# Project Decisions

## 1. MVP Scope (Nassau Launch)
- **Status:** APPROVED
- **Focus:** Hazard Reports + News only.
- **Deferred:** "Island Life" and "Gas Tracker" (to be put behind feature flags `FEATURE_ISLAND_LIFE=false` and `FEATURE_GAS_TRACKER=false`).
- **Requirement:** Remove deferred features from navigation, onboarding, and landing page/store descriptions.
- **Goal:** User can file a hazard report in <30s and read a news feed.

## 2. First-Revenue Path: Community Digest
- **Status:** APPROVED
- **Model:** $25/mo (or $250/year prepaid) for HOAs and local organizations.
- **Strategy:** Staged implementation (Concierge $\rightarrow$ Semi-automated $\rightarrow$ Self-serve).
- **Primary Experiment:** Manually delivered digest of geographic/category-specific reports.

## 3. Founder Residency & Legal
- **Status:** RESOLVED (Bahamian National)
- **Entity:** Sole proprietorship.
- **Requirements:**
    - Implement a prominent, non-dismissible "For emergencies, call 919 / 911 — this app is not an emergency service" disclaimer on hazard report screens, onboarding, and Terms.

## 4. Payment Provider
- **Status:** PIVOT to Manual Invoicing
- **Constraint:** Stripe is not currently available for Bahamian-registered businesses.
- **Architecture:** Implement a thin `PaymentProvider` interface.
- **Current Lane:** `ManualInvoiceProvider` (Bank transfer/Cheque $\rightarrow$ Manual mark as paid).

## 5. Beta Group
- **Status:** APPROVED (14-day closed beta)
- **Target:** 10 trusted Nassau residents.
- **Sourcing:** DMs via Facebook/WhatsApp/IG/TikTok (contact admins first).
- **Target Mix:** Commuters, HOA members, non-technical users, local influencers.
- **Success Metrics:** Reports per tester, retention, time-to-first-report, and $\ge 2$ organization leads for Community Digest.
