# NowBey Master Refinement — Final Report

**Branch:** `arena/6ea130a4-nowbey-v2` · **Date:** 2026-10-19

**Verification (after every phase):** 152/152 unit tests (incl. 23 new content-lint guards) · `tsc --noEmit` clean · eslint 0 errors (2 pre-existing warnings) · production build green · route smoke: 12 routes, unique `<title>` and exactly one `<h1>` each · contrast audit 136/136 pairs in both themes · mobile audit 0 findings · CSP header enforced · cache headers split marketing vs user-specific.

---

## PHASE 1 — Trust & Data Integrity

### 1.1 News wire spam
| Before | After |
|---|---|
| "Profile : taixiushopnet", "Search results for : low cost", "Segment 7 cutout \| e-Edition", gambling SEO junk on /wire | Ingest-side filter drops them; UI-side safety net re-checks on render (defence in depth) |

- **Root cause found:** the junk-title regex ended `profile\s*:\b` — `\b` after `:` can never match (both sides non-word), so the rule silently never fired. That is exactly how "Profile :" reached production. Fixed.
- New guards: `Profile:`/`Search results for:` prefixes, gambling/SEO tokens (taixiu, iwin, sc88, mm99, bl555, nohu, llwin, poker, casino…), numeric SEO handles (`88/99…hiphop|slot|com`), e-Edition cutout pages, titles under 4 words.
- Publisher allowlist + `isAllowedPublisher()`: non-publisher Google News redirects without a resolvable publisher are dropped.
- `resolveGoogleNewsUrl()` follows news.google.com redirects to the real publisher URL at insert time.
- De-dupe by normalised title + publisher within 48h (`dedupKey`).
- Snippets cleaned: literal "Advertisement" and trailing "[...]" stripped (`cleanSnippet`).
- `/wire` shows "Showing 20 of N" with the SSR budget capped at 20 stories.

### 1.2 Feed pollution
- `clusterDuplicateReports()`: same normalised title within 150 m / 24h → ONE card with "x3 neighbours reported this" badge.
- Canned demo photo notes ("Photo note: water up to the first step of the shelter") are no longer rendered.
- Titles equal to body ("Sanitation issue / Sanitation issue") collapse to one line.
- `isContentCategoryMismatch()`: "BIG SALE at O-Tech PC Solutions" filed under Flooding is auto-flagged for review (same AI/moderation queue the app already uses).

### 1.3 Freshness — one function
`getFreshness(lastConfirmedAt, kind)` in `src/lib/freshness.ts` — the only place bands are defined:
- **Live** < 2h · **Recent** < 24h · **Aging** ("Needs a recheck") < 72h · **Stale** > 72h
- News uses "Published 5h ago" only — never Live/Watching.
- Every card shows ONE labelled time line: "Filed 6d ago · last confirmed 20h ago" (`primaryTimeLine`).
- Stale rows fold under **"Show older reports (N)"** in the feed; stale pins are excluded from the default map (toggle "Older reports hidden/shown").
- FreshnessPill re-derives its band on its own clock after mount; badges carry icon + word + colour.

### 1.4 Never false calm
- /map "The island is quiet — no open pins" now renders: skeleton while loading → "Could not load reports. Retry · Last checked HH:MM" on failure → honest empty "No open reports on this island right now. Last checked HH:MM." only on confirmed zero rows.
- "Wiring up the map…" → "Loading the map…" (also the map skeleton).

### 1.5 Count honesty
- Feed header: "Showing X of Y live reports · N on the wire". Wire rail: "Showing 20 of N stories".

### 1.6 Severity — one scale
- `src/lib/severity.ts`: **Minor / Lane blocked / Road blocked / Dangerous** (1–4) + neutral **"Not rated"** when missing. Report form and map form use the same words. SeverityTag always shows icon+word (dots-only retired); `--sev-5` unused.

### 1.7 Trust copy
- Tiers: **Unverified / Partly confirmed / Well confirmed / Needs a recheck** — no more "Shaky".
- Leads with the reason: "14 confirmed, but nobody has checked in 7 days" + "Verify before you act — conditions may have changed."

### 1.8 False precision
- Island-centroid pins (26.5330, −78.6999) render as **hollow, larger markers** with "Island-level — approximate" instead of coordinates; popup shows the same phrase, never 4-decimal coords.
- Feed cards lost raw lat/long and "± 54 m" — those live on the detail page only.

---

## PHASE 2 — Unity of structure & copy

- **2.1** Landing now says "A guided, four-step report flow"; report page headline "Four steps, twenty seconds" and step rail labels come from `REPORT_STEPS` in `src/lib/copy.ts`.
- **2.2** Landing nav = **Map / Report / News wire / Alerts**, each anchoring its own section (ids `#map #report #news-wire #alerts`); fake "01–04" sequence is no longer a nav lie.
- **2.3** Glossary in `src/lib/copy.ts` (CTA = "Report a hazard"; "News wire" / "News" tab; "Email alerts"; British spelling). Sweep removed "Report a spot" / "Drop a pin" / "file a pin" site-wide (12 files).
- **2.4** `src/lib/categories.ts`: 13 kinds, id/label/description/default severity/token, `CATEGORY_GROUPS` (Hazards/Utilities/Community) for the alerts picker. Map already renders category glyphs with accessible names.
- **2.5** `CoverageBadge` ("Live alerts: New Providence — other islands soon") + "Tell me when it opens" email capture hint on /alerts; channels status card ("Email: On · Phone push: Off — Android app only · Text: Not available").
- **2.6** Emergency strip: one component, on incident + report + map + **every footer** (and landing hero + honest block).
- **2.7** /support collapsed: **Free — live now** card + **Paid plans — join the waitlist** (one benefits list, email capture, no fake prices). "Your current plan" only when signed in. "Storm warnings are never paywalled" kept prominent.
- **2.8** Unique `<title>` + description per route (verified 12/12), 404 has its own title **and noindex**; OG + Twitter cards with a real 1200×630 map image (`/og/map-1200x630.png`), per-incident OG, canonical URLs, `robots.txt`, `sitemap.xml` (static routes; incident URLs left for the DB-backed extension), `metadataBase` from `NEXT_PUBLIC_SITE_URL`.
- **2.9** Manifest theme colors unified with meta (`#000000` dark / `#f7f3ec` light); added 192/512/maskable-512 PNGs, apple-touch-icon, two manifest screenshots.

---

## PHASE 3 — Design system (selected)

- Spacing scale filled (48/64/80 added to CSS + JS token mirrors).
- `/styleguide` (noindex) re-exports the existing `/design` Pulse library route — same live components, both themes.
- Severity/Freshness/Trust atom components now follow the one-source modules.

## PHASE 4 — Page acceptance (selected)

- **/report** — step labels from the glossary ("What / Where / Details / Check & send"), live preview card (kept), **location accuracy warning** ("Pin is about 400 m from where you are…") when precision ≥ 100m, anonymous one-liner (kept), success screen with **Share** + **View on map** + "Report another hazard". Draft persistence untouched.
- **/wire** — snippet clamped to 3 lines, headline is a real link with ↗ + screen-reader note, location tag "Pinned: Exuma" / "Island-wide" / none, no empty meta rows, Today/Yesterday/Earlier groups kept.
- **/alerts** — "All reports" chip as the explicit default (was "leave everything unselected"), grouped category chips (Hazards/Utilities/Community), "Check your inbox at …" success copy, "Storm warnings are always sent" kept.
- **/incident/[id]** — duplicate nearby titles merged, avatar stack collapsed to one avatar + "+N" (no more "SR SR SR SR"), raw coords hidden for approximate pins, emergency strip at top. Sticky action bar kept.
- **/login** — "Continue without an account" link; visible labels/validation/password rules were already present (kept).
- **/privacy, /terms** — 72ch column, "On this page" TOC with anchor ids, last-updated (kept), emergency strip, cross-links.
- **/map** — island filter with counts ("Grand Bahama · 12"), "Last updated" stamp, "Older reports hidden/shown" toggle, clusters with accessible names (kept), legend collapsible (kept).

## PHASE 5 — Stability / performance / a11y / security

- **5.1** Marketing pages (`/`, /privacy, /terms, /support, /mobile, /credits) now CDN-cacheable: `public, s-maxage=3600, stale-while-revalidate=86400` (verified on live responses). User surfaces keep `private, no-cache, no-store`. Landing signed-in redirect moved client-side so the document is cacheable.
- **5.2** Wire SSR capped at 20 stories; feed already capped at 24; wire snippets clamped (no repeated title-as-body rendering).
- **5.3** CSP **enforced** (was Report-Only) — verified the live header. Microphone **kept** in Permissions-Policy after the broadcast test proved `/broadcast` (LiveKit studio) uses it — the spec said remove "if unused", and it is used.
- **5.4** Retry-with-backoff error copy + "Last checked" stamps on map states (per-route error boundaries pre-existing).
- **5.5** Content-lint suite `tests/content-lint.test.mjs` (23 guards) wired into `npm test`: no Profile:/Search spam, junk titles, Live>2h, quiet-while-loading strings, glossary violations, one severity scale, one freshness function, dedup keys, approximate-centroid detection.
- **3.8** Splash reduced from ~3.7s to **1.1s + 0.3s fade**, once per session (`nb_splash_seen`), skipped on deep links (/incident/*, ?focus=), reduced-motion and low-data.

---

## Remaining risks / intentionally left alone

1. **Legacy per-category freshness thresholds** (`freshnessFor`) kept for `trustFor` and 5 legacy tests; new surfaces use `getFreshness`. A follow-up can fold trust onto the 4-band model and retire the old thresholds.
2. **`--sev-5`** token left defined (delete once nothing in the older kit reads it); `--sev-1..4` are the scale.
3. **Alias layer (abyss-/tide-/conch-…)** — the codemod is a large mechanical sweep across ~40 pages; the Tailwind `@theme` bridge already repaints them semantically. Left for a dedicated pass.
4. **CSS split / !important count / arbitrary Tailwind values (text-[11.5px] etc.)** — mechanical, but touches nearly every component; left for the dedicated Phase 3 pass to avoid churning working pages now.
5. **Map bottom sheet** — the map already shows a one-line selected-pin card above the list rather than a full navigation; a dedicated sheet component remains on the Phase 4 list.
6. **Sitemap incident URLs** — needs the DB at build time (ISR extension); static routes are in.
7. **Playwright/axe/Lighthouse CI** — not added (no CI budget this session); `tests/content-lint.test.mjs` + `audit:contrast` + `audit:mobile` cover the truth and contrast rules locally. The existing `lighthouserc.json` is untouched.
8. **Newscategorisation** — keyword rules improved but "Notice" is still common; AI recategoriser (existing `news-ai.ts`) is the intended fix when GEMINI_API_KEY is set.
9. **Demo/seed canned notes in the DB** — display of known canned notes is suppressed; a data migration to delete them is owner-run (prod DB).
10. **Two pre-existing lint warnings** (detail-drawer exhaustive-deps, incident-card window.location) predate this work and were left untouched.

## Addendum — post-refinement work (2026-10-19)

Everything below landed after the phase report above was written; the changelog
ends at `a8b8224`, this section covers up to the reconciliation commits.

**Theme calibration — "Ocean Night v2" (5 commits).** The default dark theme was
repeatedly reported too dark, then washed out. The arc: one lift off the original
true-black OLED ramp → two further lifts (which the user never saw — see bug
below) → a mid-slate overshoot ("washed out") → a rebuilt tonal architecture →
two converging darkening steps. The calibrated landing, all in
`src/styles/pulse/tokens.css`:

| Role | Token | Value | Notes |
|---|---|---|---|
| Canvas | `--pulse-hue-night-000` | `#0c151d` | page + sunken |
| Cards | `--pulse-hue-night-100` | `#152230` | raised |
| Elevated | `--pulse-hue-night-200` | `#1c2b39` | menus |
| Hover / chips | `--pulse-hue-night-300` | `#243546` | |
| Text steps | primary/secondary/tertiary | `#f3f1ea` / `#b9c8c9` / `#9aafb3` | 16.3:1 / 10.7:1 / 7.0:1 on cards |
| Danger | `--danger` | coral-400 `#ff7f6b` | 6.5:1 on cards |

Category picker cards carry a whisper of their category hue (7% rest / 12% hover
/ 18% selected) so the 13 cards read as a spectrum rather than identical slabs.

**Bug fixed: the Island look was overriding the theme.** `:root[data-look="island"]`
(the default look) hard-coded `--bg-base #000205` etc. in `globals.css`, silently
shadowing every brightness lift (and forcing light mode near-black). The look
axis is orthogonal to brightness — Island now only re-tunes ambient glows and
the grid. Screenshot pixel-forensics matched the override exactly; that is why
earlier lifts "did nothing".

**Preview database — `NOWBEY_EMBEDDED_DB=1` (1 commit).** `src/instrumentation.ts`
now boots the embedded PGlite database (`src/db/dev.ts`: migrations + demo
Nassau seed, files in `.data/pglite/`) under `next start` when the flag is set
explicitly — for sandboxes/previews with no real Postgres. Default production
behaviour is unchanged: without the flag or a `DATABASE_URL`, a deployment still
shows the honest "setup not finished" pages. `npm run dev` continues to boot it
automatically.

**Reconciliation (this report's companion: `RECONCILIATION_REPORT.md`).** Also
landed: `geo.ts` category data now derives from `src/lib/categories.ts` (single
source of truth, cross-checked in content-lint), `CoverageBadge` mounted on
`/alerts` rendering `COVERAGE_COPY` (one copy of the coverage strings).

## How to verify

```bash
npm test          # 154/154 incl. content-lint guards
npx tsc --noEmit  # clean
npm run lint      # 0 errors
npm run build     # green
npm run audit:contrast && BASE=http://localhost:3000 npm run audit:mobile

# preview with the embedded database (no Postgres needed):
NOWBEY_EMBEDDED_DB=1 npx next start -p 3100
```
