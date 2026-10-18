# Phase 1 — Trust & data integrity (2026-10-18)

The first phase of the NowBey master refinement. The brief was blunt about the
rule: **truth over polish**. This is a safety product, and a false pin, a
mislabelled "Live", an advert filed as a flood, or a quiet island that is
really a failed query are all worse than an honest gap.

Everything below was verified against the running app, not just typechecked.

---

## Before and after

| Surface | Before | After |
| --- | --- | --- |
| News wire | "Profile : taixiushopnet" published as news | Held in a quarantine queue with a reason; never published |
| News wire | Google News redirect links | Resolved to the publisher's own URL; the publisher must be on the allowlist |
| News wire | A "Live" badge and a "Nobody has checked it recently" tooltip on an article | "Published 5 h ago", and nothing else |
| News wire | "Pinned · 25.0443, -77.3504" | "Pinned: New Providence", or "Island-level — approximate" |
| News wire | Header count said one number, the list showed another | "Showing 20 of 388", with a "Show more stories" link |
| News wire | Snippets carried the word "Advertisement" and a trailing "[...]" | Both stripped at ingest |
| Feed card | "Live" next to "20h ago" next to "11 Oct" | One band (Live / Recent / Needs a recheck / Stale) and one labelled time line: "Filed 6d ago · last confirmed 20h ago" |
| Feed card | Five copies of the same flooded junction | One card: "3 neighbours reported this" |
| Feed card | "High" plus three of four dots, and no severity at all on most cards | One four-level scale in words: Minor / Lane blocked / Road blocked / Dangerous, and "Not rated" when it was never rated |
| Feed card | Raw latitude, longitude and "± 54 m" on the card | Moved to the detail page, where they mean something |
| Feed | "BIG SALE at O-Tech PC Solutions" filed as Flooding, with a "saw it too" | Held for a human, taken off the map, and queued with the reason |
| Map | "Island activity · 0 open pins — The island is quiet" before the data loaded | "Checking the island…", then either "No open reports on this island right now. Last checked 21:40." or an error with a retry |
| Map | "Wiring up the map…" | "Loading the map…" |
| Incident page | "Trust 40 of 100 — Shaky" on a report 14 neighbours had confirmed | "Needs a recheck — 14 neighbours confirmed, but nobody has checked in 7 days" |
| Map pins | Two-letter codes (FL, ST, PW) | The category glyph, with the code kept as the accessible name |
| Map pins | Island-centroid pins drawn like street dots | Hollow, larger, and labelled "Island-level — approximate" |
| Categories | Labels in `geo.ts`, icons and colours in `glyph.tsx`, and they drifted | One file: `src/lib/categories.ts` |
| Alerts | 13 loose checkboxes; "leave everything unselected to hear about every report" | Grouped chips (Hazards / Utilities / Community) with "All reports" as a visible default |
| Buttons | "Drop a pin", "Report a spot", "Report", "file a report" | "Report a hazard" everywhere, except the tab bar's "Report" |

---

## The new shared modules

These are the "one source of truth" files Phase 2 and 3 build on.

| File | What it owns |
| --- | --- |
| `src/lib/categories.ts` | The 13 kinds: label, token, glyph, description, default severity, family |
| `src/lib/severity.ts` | The one four-level scale, with its labels and tokens |
| `src/lib/freshness.ts` | The one freshness rule, the four bands, and the one time line |
| `src/lib/copy.ts` | The CTA and term glossary |
| `src/lib/news-filter.ts` | The publisher allowlist, the junk patterns, the dedupe key, the snippet cleaner |
| `src/lib/report-check.ts` | Duplicate clustering, the advert check, title collapsing, canned-note detection |
| `src/lib/report-hold.ts` | Holding a misfiled report and queueing it for a human |
| `src/components/legal-document.tsx` | The shared renderer for the Terms and the Privacy Notice |
| `src/components/coverage-badge.tsx` | "Live alerts: New Providence · other islands soon" |

---

## The new database

`src/db/add-news-quarantine.sql` (and the matching drizzle migration
`drizzle/0001_brave_power_pack.sql`):

- `news_quarantine` — a holding pen. A story that fails the filter is **not
  deleted**; it is held with a reason (`junk-title`, `too-short`, `gambling`,
  `cutout`, `no-publisher`, `publisher-unknown`, `duplicate`) for a human.
- `news_items.placement` — `street`, `island` or `none`, so the wire can say
  how exactly a story was placed and never draw an island centroid like a
  street.
- The migration also quarantines the junk that is already in the table and
  hides it from readers. It does not delete it.

**This needs running against Neon** — see TODO_HUMAN.md.

---

## The judgement calls, stated

**A held report is hidden, not flagged.** The existing moderation pass (AI
first pass) never hides anything; a human decides. This one does hide, because
an advert on a safety map is not a "maybe" — it is a false hazard somebody
might route around at night. The report goes to the staff queue with the
reason, and a human releases it. The carve-out is deliberate: a report whose
text does not look like a hazard is only held **once a neighbour has backed
it**, so a real but oddly-worded report is never hidden by a word filter.

**"No place named in the text" is not a location.** A story with no place in it
is now labelled that way, rather than being pinned at the island's centre and
called "Pinned". The pin still exists, because the island is real — it is just
drawn hollow and labelled approximate.

**Severity is stored as 1–4 and stays that way.** Nothing moves in the
database. "Annoying" became "Minor" in the words, because a resident who
thinks a report is "annoying" and one who thinks it is "minor" are not saying
the same thing, and a safety product cannot have two words for one level.

**A story is published, never confirmed.** The news freshness band is driven by
the publication time, and the card says "Published". Nobody checks an article.

---

## What was verified

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors (2 pre-existing warnings, untouched files) |
| `npm test` | 159 / 159 (30 new: `tests/news-filter.test.mjs`, `tests/report-check.test.mjs`, rewritten `tests/freshness.test.mjs`) |
| `npm run test:ui` | 7 / 7 |
| `npm run build` | compiled successfully, 65 pages |
| `npm run audit:contrast` | 136 / 136 pairs pass in both themes |
| `node scripts/mobile-audit.mjs` | 0 findings |
| Route smoke | `/`, `/feed`, `/wire`, `/map`, `/report`, `/alerts`, `/support`, `/login`, `/terms`, `/privacy` all 200 |

---

## What was left alone, and why

- **The landing page, the report form's four-step flow, the 404 copy, the
  splash, the design tokens and the CSS cleanup** are Phase 2–5 work. Phase 1
  was the P0 trust work; the redesign depends on modules that did not exist
  until this phase landed.
- **`V2_UI_Backup/`** was not touched. It is the rollback source.
- **The severity CSS still defines `--sev-5`.** The app no longer uses it
  (the scale is four levels) but it was not deleted, because removing a token
  from a token file that other layers read is a Phase 3 change with a visual
  regression risk. It is documented rather than silently orphaned.
- **The reader-submitted story form** (`/api/news/submit`) does not go through
  the publisher allowlist. A resident can send a link; an admin reviews it.
  Putting a reader tip behind a newsroom allowlist would mean no Bahamian
  resident could ever submit a story from a small outlet.
