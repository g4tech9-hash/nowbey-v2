# PARTNERSHIP PITCHES — NowBey

*Prepared 2026-10-13. Materials only — nothing has been sent, submitted, or committed to any partner. All claims about NowBey's current functionality were verified in source review; all planned capabilities are labeled. No endorsements, contacts, funding programs, procurement eligibility, or financial outcomes are claimed or invented. Official-source items still to be verified are marked **[verify]**.*

**Readiness gate:** do not send any of this until NB-001 (build), NB-002/003/017 (invented content), and NB-015 (environment) are closed. The gas-page fabrications and invented advertisers would end a meeting with a fuel retailer or an agency.

---

## A. Government pitch (~1 page)

**To:** Government of The Bahamas — agencies responsible for emergency management, disaster risk, and Family Island administration.

**The problem.** When a flood closes a road in a Family Island settlement, a power cut takes out a neighbourhood, or a storm is 48 hours out, there is no fast, trusted, island-by-island picture that residents, responders, and officials can share. Official channels publish; residents see things first, on the ground, but their reports scatter across WhatsApp groups and radio call-ins that nobody can act on or verify.

**What NowBey is.** A Bahamian-made app and website where residents pin what is happening — floods, outages, road hazards, safety incidents — on a live map of the islands. Neighbours confirm pins, so the map shows what multiple people saw. Alongside it runs a Wire of stories from Bahamian outlets (The Tribune, Nassau Guardian, Eyewitness News, ZNS, Bahamas Press and others), offline-geocoded to the island each story belongs to. Residents can subscribe to verified email alerts for the islands and categories they choose. Reading the map and wire requires no account.

**Who benefits and how.**
- Residents — minutes-earlier warning of local hazards; confirmation instead of rumour.
- Family Island communities in particular — coverage that does not depend on Nassau newsrooms noticing.
- Responders and agencies — a triage layer of crowd-confirmed events with location, category, and confirmation counts, and a moderation queue their staff control (already built).
- Visitors — orientation to closures and conditions.

**Measurable outcomes we would report in a pilot (baseline to be set at kickoff):**
- Median minutes from first resident pin to confirmed status, by island.
- Alert reach: verified subscribers per island; alerts delivered vs suppressed by cooldown.
- Coverage: distinct islands and settlements with at least one confirmed pin per month.
- Editorial quality: wire stories ingested, auto-published vs held for review, corrections applied within 24 h.
- Public-value counter-metric: zero gated safety information (alerts and emergency content stay free).

**Accessibility across islands.** Default parish is New Providence but every island in the gazetteer is first-class; no account is needed to read; the Expo mobile companion keeps tokens in device secure storage and works on modest Android handsets; a low-data mode is on the roadmap.

**Data protection and accountability.** Sessions and password storage use scrypt hashing and signed tokens; staff actions on member accounts, reports, and stories are written to an activity log; members can export their own data and delete their alert profiles at any time (account deletion and full data-subject tooling are in the 30–90 day plan, NB-014). NowBey does not sell personal data and would contractually confirm that in any pilot. Formal data-protection compliance advice is being obtained from a qualified professional **[verify before signing]**; no compliance claim is made here.

**The ask.** A 60–90 day pilot in one Family Island community with one public partner: NowBey provides the platform, moderation tooling, and weekly reporting; the partner provides distribution (official channels pointing residents to it), a named contact, and feedback on what officials need from the map. No exclusivity, no data sale, no charge to the public. If the pilot's numbers meet the thresholds above, we discuss a continued distribution partnership.

**What has to be true first (honesty section).** The build regression at HEAD is fixed, fabricated demo content removed, moderation workflow documented, and a named NowBey contact for escalations. None of these are done yet today.

---

## B. Corporate pitch (~1 page)

**To:** Bahamian utilities, telecoms, banks, fuel retailers, insurers, resorts, and Family Island operators.

**The problem you already have.** You spend on customer communication and brand presence in exactly the moments your customers are disrupted — outages, storm prep, road and harbour conditions. Your channels (SMS blasts, Facebook, radio) are either expensive per contact, unverifiable, or unusable during the very events when everyone needs you at once. Meanwhile your customers are already talking to each other about your service in scattered group chats.

**The opportunity.** NowBey already aggregates where and when disruptions are happening, island by island, with neighbour confirmation — the layer your comms and ops teams lack. A sponsorship or enterprise partnership puts your brand in front of exactly the audience and geography you serve, in the moments that matter, next to content that is useful rather than interruptive.

**What we can offer (current vs planned, honestly labeled):**
- *Today:* sponsored placement on the Wire and homepage rail, clearly labeled "Promoted", targeted by island; your own verified listing on Island Life places (hours, menu, contact — **[verify]** as FEAT-01 claim workflow).
- *Planned (contract to build in the pilot):* a verified-responder channel where your official updates are visually distinct from resident posts; team seats for staff to monitor your service areas; a branded island page; aggregated, anonymized disruption dashboards for your operations team.
- *Enterprise:* invoiced billing and a named contact — no card-processing dependency on either side.

**Why pay rather than use the public app.** Because the free public product is deliberately advertising-light and trust-first; what money buys is reach in your geography, verification of your voice, and dashboards for your operations — none of which are available to the public. Community benefit is contractual: sponsor slots are labeled, core alerts stay free and public, and we publish what was sponsored and where.

**The offer.** A 90-day paid pilot for one service area (one island or one utility territory): sponsored placements, one verified channel, monthly dashboard, joint success review against agreed metrics (alert reach, engagement with your updates, brand-lift survey — baseline set at kickoff). Illustrative pilot budget: B$15,000–30,000 for 90 days depending on scope **[illustrative only — validate before quoting]**.

**What must be fixed before we approach you.** Removal of demo/fabricated content (including in the fuel-price tracker — you, as a fuel retailer, would rightly walk), a working release, a signed moderation policy, and confirmed data terms. We list these openly; none are done yet.

---

## C. Practical partnership plan

### Partner shortlist (categories, with examples — all **[verify]** current structure/contacts before outreach)
1. **National emergency management / disaster agency** — pilot host for advisories and shelter info; validates FEAT-02 sources. Fit: their mandate is exactly our worst-day value.
2. **Family Island administration / district commissioner's office** — distribution into one community; ground truth for parish alerts.
3. **Electricity and water utilities** — verified responder channel; outage corroboration; the clearest daily-use case.
4. **Telecom operator(s)** — distribution (zero-rating/placement) and an SMS alert path for low-connectivity moments (FEAT-03 depends on this).
5. **Bahamian media (ZNS, Tribune, Guardian, Eyewitness)** — Wire accuracy and republication; they already feed our ingest.

### Proposed pilot: "Storm Season Ready" (60–90 days)
- **Scope:** one Family Island community + one utility partner. NowBey: platform, alerts, moderation tooling, weekly metrics. Partner: distribution via official channels, named contact, storm-season readiness input, joint review.
- **Success metrics:** confirmed-pin median confirmation time; verified alert subscribers on the island; % advisories surfaced <15 min (once official sources wired — FEAT-02); zero gated safety content; public dashboard optional.
- **Illustrative budget [hypothetical, validate]:** NowBey engineering 0.5 FTE × 3 months ≈ B$18,000; comms/support ≈ B$3,000; infra/email ≈ B$1,500; total ≈ **B$22,500**, offset by sponsor slots where agreed. Government pilot may be cost-share; no figures are commitments.
- **Responsibilities & data:** partner data flows one way unless separately contracted; member PII never shared; moderation SLA defined jointly.

### Outreach email — government
> Subject: A resident alerting map for [Island] — 90-day pilot proposal
>
> Dear [Name],
>
> I'm the founder of NowBey, a Bahamian-made app where residents pin floods, outages, and road hazards on a live island map, neighbours confirm them, and subscribers get alerts for the islands they choose. Reading it is free and needs no account.
>
> I'm proposing a 60–90 day pilot in one Family Island community with your office: we run the platform and moderation, your channels help residents find it, and we report weekly on confirmed-pin response times, alert reach, and storm-season readiness. No cost to the public, no data sale, and safety information stays free.
>
> Before anything launches I'm completing a security and build hardening pass (in progress, tracked internally). Could we schedule 20 minutes to see whether this fits your storm-season plans?
>
> Warmly, [Name] — NowBey

### Outreach email — corporate
> Subject: Sponsor reach that survives a storm — 90-day pilot on NowBey
>
> Dear [Name],
>
> NowBey maps resident-confirmed disruptions across the islands — outages, floods, road closures — alongside a Bahamian news Wire. Your customers are already in those conversations; we give you verified presence there, targeted by island, next to content that's useful rather than interruptive.
>
> I propose a 90-day pilot for your service area: labeled sponsored placement, one verified channel for your official updates, and a monthly dashboard. Alerts and emergency information stay free and public — that's contractual.
>
> One caveat up front: we're finishing a build/content hardening pass first (demo content removal and a moderation policy), so I'd rather show you the finished product than rush it. Worth a short call to shape the pilot around your comms calendar?
>
> Best, [Name] — NowBey

### Fix before any outreach (hard gates)
NB-001 build; NB-002 fabricated gas data (fatal with fuel/utility partners); NB-003 invented advertisers; NB-017 "Government price" labeling; NB-015 environment/AUTH_SECRET/APP_URL; moderation policy for the Wire (NB-009); privacy/terms reviewed by a professional **[unverified — legal review outstanding]**.

### Demonstrable now vs requires development
- **Now:** live map + confirmations; parish/category/geofenced alerts with working unsubscribe; Wire ingest + moderation queue; admin console with activity log; Island Life + places; subscription machinery (demo mode until payments verified — NB-016); Expo companion.
- **Requires development:** verified-responder channels (FEAT-04), storm advisories (FEAT-02, sources **[verify]**), SMS/push (FEAT-03), place claims (FEAT-01), dashboards, low-data mode (FEAT-05).

### Due-diligence questions partners will ask
- Who moderates user reports, how fast, under what policy? (moderation SLA, appeal path)
- What personal data is held, where is it stored, who can access it, and how is deletion handled? (NB-014 in progress)
- What happens to alerting if NowBey shuts down or the pilot ends? (data export; no lock-in)
- Uptime and incident response commitments; single-instance vs managed hosting.
- Procurement/registration requirements for public-sector pilots **[verify with the relevant agency]**; no procurement eligibility is claimed.
