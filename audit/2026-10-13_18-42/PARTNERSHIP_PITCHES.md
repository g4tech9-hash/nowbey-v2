# Partnership Pitches – NowBey V2

Prepared for review only. Do not send, submit, publish, or commit. Figures are illustrative and require validation.

## A. Government pitch (about one page)

**Problem:** In The Bahamas, residents often learn about floods, road hazards, outages, closures, and public-safety incidents through informal social channels. Responses can be slow and uncoordinated, especially across islands. Existing communication is fragmented, and many people rely on mobile access with limited data.

**Solution:** NowBey is a public-first, mobile-friendly community incident and local-information map. It allows residents to anonymously read and report street-level events, confirm or challenge reports, view Bahamian news, and receive parish-based alerts. Government agencies can use it as an additional situational-awareness and public-communication layer, while preserving public access.

**Who benefits:** Residents, Family Island communities, first responders, recovery teams, and agencies responsible for roads, utilities, emergency management, and communications.

**Measurable outcomes:**
- Faster public reporting of hazards and service disruptions.
- Improved parish-level alert reach for enrolled residents.
- More reliable location-based incident records (coordinates, time, category).
- Better understanding of which islands/areas have repeated issues.

**Accessibility and islands:** Public reading and anonymous reporting do not require an account; email alerts are optional; the interface is web-based; parish filters support multiple islands. Data-light/offline improvements are still needed for low-bandwidth use.

**Data, accountability, privacy:** Core safety information remains public. User email and alert preferences are used only for requested communication. No sale of personal data. Moderation and audit logs are built into admin tooling. Retention/deletion/legal questions need qualified counsel and written policy.

**The ask:** A scoped 60-90 day non-exclusive pilot with one agency or coordinator, using anonymized/operational data practices and clear success metrics. Do not position as a replacement for official emergency systems.

## B. Corporate pitch (about one page)

**Suitable company types:** utilities, telecoms, banks, insurers, ports/harbours, resorts and tourism employers, media organizations, logistics/fuel providers, and community foundations.

**Business problem/opportunity:** Companies need trusted, real-time local context to protect staff/customers, plan maintenance, understand incident impact, and support community resilience. They can also fund public safety information through non-intrusive sponsorships or services.

**Commercial value and community benefit:** Organizations can pay for branded sponsor placement, data exports/dashboards, team alert profiles, and onboarding. Residents retain free access to the map and core reporting. This converts CSR/community benefit into a documented service.

**Offer options:** paid pilot, enterprise service, sponsorship, or licensing. Pricing should be custom and validated.

**Why pay rather than use the free app:** Companies pay for team features, exportable/reporting data, SLA/support, private dashboards, account governance, and brand placement—not for public safety information itself.

## C. Practical partnership plan

### Partner shortlist
1. **Government emergency/communications coordination office** – verified incident visibility and parish alerts.
2. **Utility company (power/water)** – outage/flood context and customer communication.
3. **Telecom provider** – network/outage and connectivity partnership; potential alert channel distribution.
4. **Insurance/local risk partners** – hazard data and claims context (privacy-aware).
5. **Media/newswire partner** – mutually beneficial content distribution and credibility.

### Pilot proposal (illustrative, 60-90 days)
- **Scope:** one island/parish group; operational dashboard for partner; public map remains free; weekly incident summary; 2-3 staff seats; agreed taxonomy for outages/floods/hazards.
- **Responsibilities:**
  - NowBey: software access, onboarding, training, weekly review, anonymized metrics.
  - Partner: part-time coordinator, issue categories, validation rules, feedback.
- **Success metrics:** number of valid reports, median report-to-confirmation time, alert enrollments, reduction in duplicate posts, monthly active residents, partner actions taken.
- **Illustrative budget (not a quote):** USD 5,000-15,000 for a pilot covering hosting, onboarding/support, admin features, and limited data plan. Assumes one engineer/founder part-time and no paid agency.

### Government outreach email (draft)
Subject: Pilot proposal: parish-level incident awareness map for [Agency]

Hello [Name],

I am the founder of NowBey, a public-first community map that helps Bahamian residents report and verify local hazards, outages, road issues, and safety events by parish. The free map already supports anonymous access, incident pins, confirmations, and parish alerts.

I would like to propose a small, no-lock-in 60-90 day pilot to test whether verified local information improves situational awareness and public communication across [island/parish]. NowBey would remain free for residents; the pilot would focus on taxonomy, validation, and useful reporting for your team.

Could I share a short demonstration and discuss whether this aligns with your current priorities?

Thank you,
[Founder name]

### Corporate outreach email (draft)
Subject: Partnership: local hazard awareness and community alerts

Hello [Name],

I am reaching out from NowBey, a community-first hazard and local-information map used by Bahamian residents. Utilities, telecoms, and community partners can help residents get timely, location-specific information while supporting the public platform.

I would welcome a short conversation about a paid pilot for team alerts, parish-level situational summaries, and transparent sponsorship that funds free public access. No resident access would be paywalled.

Would 30 minutes be available next month?

Thank you,
[Founder name]

### What must be fixed before approaching partners
- Web build passing and CI in place.
- Credential/token hygiene.
- Automated tests for auth, billing/webhooks, and admin authorization.
- Clear premium feature status and no misleading claims.
- Documented privacy/support/SLA and owner claim process.
- Real or clearly labeled data sources.
- Backup/restore test.

### Demonstrable now versus requiring development
**Now:** anonymous/public reporting map, incident confirmations, island filters, news wire, place listing, alerts emails, admin moderation, audit logs, optional Stripe tiers in test mode.
**Needs development:** production-ready build discipline, push/SMS, storm tracks, team seats, data export API, sponsor placement, analytics/ROI dashboards, offline support.

### Due diligence questions partners will ask
- Is safety information always free to residents?
- Who moderates reports and who is accountable?
- How is personal data stored, retained, deleted, and secured?
- What happens if the service is offline during an emergency?
- Can government/users export data in standard formats?
- What jurisdiction/support commitments exist?
- Is grant/contract funding compliant with procurement rules?
- Are payment/settlement and taxes handled through a suitable entity?
