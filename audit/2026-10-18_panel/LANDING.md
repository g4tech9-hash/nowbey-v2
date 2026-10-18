# The front door — landing page in the register language

**2026-10-18 · companion to `REDESIGN_MANIFESTO.md`**

`/` is not the resident home. Signed-in visitors are redirected to `/feed`, so the only people who ever see this
page are strangers: someone who followed a WhatsApp link, a search result, or a friend's screenshot. That
changes the brief completely.

## The problem with what is there now

The current landing is a competent SaaS template: eyebrow, hero, two buttons, app-store cards marked *coming
soon*, then four numbered feature sections each paired with a phone mockup of the real app.

Three things in it are wrong for this product:

1. **It describes the map instead of showing it.** A phone mockup is what you draw when the live thing is not
   worth looking at. Ours is.
2. **"Coming soon" store badges are the loudest thing above the fold.** The product runs in the browser today.
   The badges apologise for something that is not missing.
3. **It sells four features equally.** The community map, the report flow, the news wire and email alerts are
   not four equivalent benefits. One of them is the product; the rest are supporting cast.

## The rule

> **The front door is the product, not a description of it.**

Same material, same chart, same claim voice — running on real data. A visitor's first impression is the actual
state of the island at this minute, with its age attached. If that is not compelling, no amount of marketing
copy will make the product compelling.

---

## Above the fold

```
┌──────────────────────────────────────────────────────────────┐
│ NOWBEY                                    Map   Wire  Sign in │  56px, hairline under
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              T H E   C H A R T   (contours, island)          │
│                                                              │
│                                                              │
│   NEW PROVIDENCE · CHECKED 07:41                             │
│   Nothing to report.                                         │
│   on your island.                                            │
│   Neighbour reports, local news and island alerts.           │
│   One map for The Bahamas.                                   │
│   [ Open the map ]   Report a hazard                         │
│                                                    ( ↓ )     │
└──────────────────────────────────────────────────────────────┘
```

- **One claim.** The same `.nb-claim` as the app — this is not a marketing headline wearing the product's font.
- **Live, and dated.** `checked 07:41` is the real resolver output, cached for at most 60 seconds.
- **Nav goes from three anchors to three destinations.** "Features / How it works / Our approach" is a template
  artifact; Map, Wire and Sign in are places a person might actually want to go.
- **No store badges above the fold.** There is a single line further down — "NowBey runs in your browser. The
  app is in progress." — because that is the truth.
- **The scroll cue is a hairline chevron**, not an animated arrow.

### The quiet-island problem

Most days the claim will read *"Nothing to report."* On a marketing page that risks reading as *"nothing here."*

**The fix is the archive, not a fake.** Immediately below the fold, the page shows the last three resolved
soundings from the past seven days, with dates:

```
RECENT SOUNDINGS

Water at the dip · Bay Street            12 confirmed · 2 days ago
Lane blocked · Shirley Street             4 confirmed · 4 days ago
Streetlight out · Grant's Town            2 confirmed · 6 days ago
```

Real history proves the product works far better than an invented hero screenshot, and it costs nothing —
these records already exist. If the archive is genuinely empty (a new island, a new deployment) the section is
**omitted entirely** rather than padded with placeholder copy.

---

## Below the fold — the argument, as three soundings

No cards, no icons, no phone frames. Three numbered rows on hairlines, in the same grammar as the app's list:

| | | |
| --- | --- | --- |
| **01** | **Notice something** | Water, a blocked lane, a dark street. Three taps, no account needed. |
| **02** | **Tell the street** | Choose whether your name appears. Anonymous stays anonymous, including offline. |
| **03** | **It reaches the right people** | Neighbours nearby, and the island alert list if it matters. |

Then **one** section on why the thing can be trusted — the honesty layer, stated as behaviour rather than
values:

> **Every sounding carries its age.**
> Nothing on this map is presented as permanent. You always see how old it is, who counted, and whether staff
> have confirmed it. We do not publish hazards we cannot attribute, and we do not tell you what to do.

Then the map, once, wide: the real map at `/map`, embedded rather than mocked.

Then a single closing action and the legal footline. **No four-CTA stack, no newsletter modal, no cookie
banner over the chart** — the cookie banner is a real constraint, so it docks to the bottom as a hairline row
in the footline, not a floating card.

---

## When there is an emergency

This is the most important state of the front door and the one most products get wrong.

**If the resolver returns `storm`, the landing page becomes the alert.** Not a banner above the marketing —
the marketing is gone. Same page, same URL, and it carries:

- the amber hairline and `LIVE · STORM REGISTER`
- the claim, with its confirmations and age
- one action: *See the flooded streets*
- one link: *I am safe*
- a single line at the bottom: **"Anyone can read this. No account needed."**

No sign-up wall, no email capture, no "create an account to continue". During a flood, that link gets shared
into group chats by people who are not members, and it has to work for them instantly — both because it is
right and because it is the only growth loop this product will ever need.

Caching rule: the storm page is regenerated **every 30 seconds**, never served from a stale ISR window. A
front door that shows yesterday's flood is worse than no front door.

---

## What is deleted

- The four phone mockups (`PhoneFrame`, `MockCommunityMap`, `MockReportHazard`, `MockNewsWire`, `MockEmailAlerts`).
- The App Store / Google Play cards. One honest line replaces two "coming soon" badges.
- The `#features` / `#how` / `#approach` anchor nav.
- The watermark headlines ("Neighbour reports in one clear view") — a device for filling space beside a mockup.
- `landing-reveal.tsx` and the scroll-reveal choreography. The chart draws once; nothing else animates on scroll.

## What is added

- `getPublicSounding()` — server-side, cached 60s, returns the resolver's register + claim + age for a chosen
  island, with **no personal data and no precise coordinates** (parish and street name only).
- The recent-soundings archive query: three most recent resolved reports in 7 days, street name + category +
  confirmations + age.
- `?island=` selection in the header — the one piece of interactivity above the fold, because the claim is only
  meaningful for the island you are standing on.

---

## Accessibility notes specific to this page

- The hero is **text over illustration**, not text over photography — contrast is deterministic, so the chart
  can be clipped away where the claim sits rather than relying on a scrim guess.
- The claim is the `<h1>`; the locator line is not a heading, and the section numerals are `aria-hidden`.
- The three honesty rows are a real `<ol>`; the numerals are `aria-hidden`, so a screen reader hears "1 of 3".
- The storm page announces itself with `role="status"` **once**, on load, and does not re-announce on refresh.
- Every scanned element on the page is a `<main>` landmark with one `<h1>` — the audit's existing rules still
  apply unchanged.
