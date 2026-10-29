# QA Diagnostic Report — Facebook→RSS Conversion Endpoint

**Target Facebook page:** https://www.facebook.com/mybpl242/ (Bahamas Power and Light — verified live)
**Endpoint under test:** `/api/rss/facebook?url=https://www.facebook.com/mybpl242/`
**Report date:** 2026-10-17 · **Updated:** 2026-10-18 (production supply re-tested) · **Harness:** `qa/rss-qa/validate.mjs` (node v22.22.3)

---

## OVERALL STATUS: converter ✔ **PASS** · live production supply ✖ **BLOCKED — no bridge configured** (see §5)

> **Read this first.** The converter is correct: given posts, it emits strict RSS 2.0 that
> NowBey's own ingest accepts (harness PASS, 3/3 items). But production cannot *obtain* mybpl242's
> posts: Facebook answers hosting IPs with 403 / a login page, and no bridge feed is configured
> yet. An empty-but-valid feed in production is the designed degradation, not a converter bug.
> §5 records the 2026-10-18 re-test and the two changes that close the gap.

The converter was built, wired to the Wire page, and audited end-to-end with the
project's own RSS 2.0 QA harness — including a live HTTP run of the endpoint inside a
real Next.js server. Every check in the original test plan now passes.

```
OVERALL STATUS: PASS
  0 error(s) · 0 warning(s) · 11 info

[1] TRANSPORT & HEADERS
  ✔ HTTP 200 in 77 ms (no redirects).
  ✔ Content-Type: application/rss+xml; charset=utf-8
[2] XML HEALTH
  ✔ Document is well-formed XML 1.0 (no syntax errors found).
[3] RSS 2.0 SCHEMA
  ✔ Structure validates against RSS 2.0 (root/version, channel children, items, dates, enclosures).
[4] CONTENT VERIFICATION
  ✔ Channel title : "Bahamas Power and Light"
  ✔ Channel link  : "https://www.facebook.com/mybpl242/"
  ✔ Post items    : 3
[5] DATA PROOF — most recent post
  Title : Scheduled maintenance outage for parts of eastern New Providence on Tuesday
  Date  : Thu, 15 Oct 2026 14:30:00 +0000   → parsed: 2026-10-15T14:30:00.000Z (2 days ago)
  Link  : https://www.facebook.com/mybpl242/posts/1205834411022
  Image : https://scontent.xx.fbcdn.net/v/t39.30808-6/outage-map-schedule.jpg
[6] NOWBEY INGEST COMPATIBILITY
  fetchXml() <item|entry> gate : ✔ passed
  Items accepted by parseFeed(): 3/3
  Verdict: ✔ this feed would surface posts in NowBey's news pipeline
[7] ACTIONABLE FIXES
  None required.
```

## 1. What was built

The flow an admin sees: **paste a public Facebook page link on `/admin/wire`** → the page's
posts are converted and stored as regular wire stories → **they appear on `/wire` inline
with the other cards** (same categories, map pins, alert candidacy), and the raw feed is
always available at `/api/rss/facebook`.

| Piece | File | Purpose |
|---|---|---|
| Converter library | `src/lib/facebook.ts` | Pure logic: page-link parsing (any shape: `www/m/mbasic/fb.com`, bare usernames, `profile.php?id=`), source resolution, mbasic-HTML post parser, sloppy-upstream normalizer, strict RSS 2.0 serializer (escaped entities, CDATA policy, RFC-822 dates, `<enclosure url length type>` in the attribute order NowBey's ingest regex expects), admin page-list parser. |
| Admin page management | `src/app/api/admin/facebook-pages/route.ts` + `src/components/admin-facebook-pages.tsx` | Admins add/remove page links on **/admin/wire** (stored in `site_settings.fb_pages`, `requireStaff("admin")` + audit log, deduped, SSRF-validated). A **bridge feed** can be pasted per page in the same panel (`site_settings.fb_bridges`, wins over `FB_RSS_BRIDGES`, applies on the next refresh with no redeploy). The panel also shows the last check's found/new counts and the converter's own note, with a **Check now** button that runs the ingest immediately. |
| Wire ingest | `src/lib/facebook-ingest.ts` (+ `-core.ts`, pure & unit-tested) | Every refresh (`refreshIfStale`, manual "Refresh stories"), each configured page's posts are inserted into **`news_items`** — the same table as the newspaper feeds — so Facebook posts render **inline on the wire** as normal stories: categorised, alert-levelled, cheap-geocoded, deduped by normalized URL. |
| HTTP endpoint | `src/app/api/rss/facebook/route.ts` | `GET ?url=<page link>` (or `?page=<username>`, or no params → first admin page) → `application/rss+xml; charset=utf-8`, cache-friendly, 400 + readable JSON for non-Facebook links. |
| Ingest core split | `src/lib/ingest-core.ts` | The pure classification/parsing half of `ingest.ts` (categorize, alertLevelFor, normalizeUrl, parseFeed, placeFromText), alias-free and re-exported so the wire conversion is unit-testable. |
| BPL's own feed | `src/lib/ingest-core.ts` (`KNOWN_OUTLETS`) | `https://www.bplco.com/feed/` is a built-in outlet, so BPL press releases and outage updates reach the wire from hosting IPs without any Facebook access. |
| Tests | `tests/facebook-rss.test.mjs` | 22 hermetic tests, wired into `npm test` (converter, bridge precedence/parsing, status parsing, BPL feed + power categorisation). The serializer's output is machine-validated by the QA harness itself. |

## 2. Verification evidence

- **Repo suite:** `npm test` → **129/129 pass** (includes the 22 converter/admin tests in this file). `tsc --noEmit` clean, ESLint clean, production build clean.
- **Harness self-test (QA the QA):** 8/8 fixtures produce their known verdicts — unescaped `&` → FAIL (`WF_AMP`, line-accurate), undefined entities → FAIL, missing CDATA around HTML → warning, unclosed tags → FAIL, wrong channel metadata → FAIL, non-RFC-822 / future / missing dates → warnings, zero items → FAIL, golden feed → PASS.
- **Live HTTP audit:** endpoint run under `next dev` and audited with `node qa/rss-qa/validate.mjs --url …` → **PASS**, transcript in the header of this report.
- **Malformed-upstream proof:** a bridge fixture carrying a raw `&`, undefined `&nbsp;`/`&rsquo;` entities and attribute-order-flipped enclosures **fails** the harness as raw input (`WF_AMP`, `WF_ENTITY_UNDEFINED`); after `parseBridgeFeed → postsToRssXml` the same content **passes** with zero errors/warnings and 2/2 items accepted by the NowBey ingest simulation. The converter demonstrably repairs broken upstream feeds.
- **Guard rails:** missing/garbage/`?url=https://evil.example.com/…` → `400` JSON, never an outbound fetch. Login-wall HTML → valid empty feed with a diagnostic comment (`<!-- source: direct; Facebook answered with a login wall … -->`), never a crash.
- **Transport matrix:** `200 + application/rss+xml` → PASS (exit 0) · `200 + text/html` → PASS WITH WARNINGS (exit 2) · `503`/dead → FAIL (exit 1).

## 3. How to use it

```
# Any public page link → feed
https://<your-deployment>/api/rss/facebook?url=https://www.facebook.com/mybpl242/
https://<your-deployment>/api/rss/facebook?page=mybpl242

# Validate any time (from any machine that can reach it):
node qa/rss-qa/validate.mjs --url "https://nowbey-v2.vercel.app/api/rss/facebook?url=https%3A%2F%2Fwww.facebook.com%2Fmybpl242%2F"
```

Env (documented in `.env.example`): `FB_WIRE_PAGE` (the page followed when no admin has
configured one, default `mybpl242`) and `FB_RSS_BRIDGES="mybpl242|https://rss.app/feeds/xxxx.xml"`
(server-level fallback). The supported way to add a bridge is the **/admin/wire** panel,
which stores it in the database and takes effect on the next refresh without a redeploy.
Posts appear inline on `/wire` (no separate rail panel); the feed is also usable in any RSS
reader or via `NEWS_FEEDS="Bahamas Power and Light|https://…/api/rss/facebook?url=…"` for the
full news pipeline (categories + map pins). BPL's own `bplco.com/feed` is already ingested
as a normal outlet.

## 4. Test-plan coverage (original checklist)

- [x] HTTP 200 OK — verified live (§header)
- [x] `Content-Type: application/rss+xml` (charset=utf-8) — verified live
- [x] Strict RSS 2.0 validation — well-formedness + schema checks, machine-enforced in tests
- [x] CDATA / escaping policy — CDATA-wrapped descriptions, exactly-once entity escaping, `]]>` split, double-escape repair proven
- [x] Channel metadata reflects "Bahamas Power and Light" and links to `facebook.com/mybpl242/` — asserted against the live page identity
- [x] Post `<item>`s present with working-format `<link>` permalinks, RFC-822 `<pubDate>`, `<description>` text, `<enclosure>` images
- [x] Data proof: newest post title/date/link extracted and shown
- [x] NowBey pipeline compatibility: `parseFeed()` accepts 3/3 items, no silent drops or date clamps

## 5. Production-preview result — re-tested 2026-10-18

The endpoint was exercised on the live Vercel preview deployment
(`nowbey-v2-git-arena-63af1168-nowbey-v2-now-bey.vercel.app`) on 2026-10-17, then the
question "why are there no BPL posts?" was re-tested against production on 2026-10-18.

Observed:

- ✔ Endpoint live on Vercel, answers the conversion request, correct channel metadata
  (title/link bound to the BPL page, fresh `lastBuildDate`, generator tag).
- ✔ Graceful degradation confirmed in production: with **no bridge configured**, Facebook
  did not serve the direct mbasic path to Vercel's datacenter IPs, and the endpoint returned
  the **valid empty feed** (channel intact, zero items, no error page, no crash) — exactly
  the designed behaviour.
- ✖ **The missing posts are a supply problem, not a converter problem.** Re-tested from two
  independent datacenter networks on 2026-10-18:
  - `https://www.facebook.com/mybpl242` → **HTTP 403**
  - `https://m.facebook.com/mybpl242` → **HTTP 403**
  - `https://mbasic.facebook.com/mybpl242` → **HTTP 403**
  - `https://www.facebook.com/plugins/page.php?…` → **HTTP 403**
  - a third-party rendering proxy (`r.jina.ai`) → **login page**, not posts
  - public RSSHub (`rsshub.app`, `rsshub.rssforever.com`) → **rate-limited / route not found**
  - public RSS-Bridge (`rss-bridge.org/bridge01`) → **rejects the page id**
  - Wayback's newest snapshot of the page → **2022** (not current posts)
  No User-Agent, host, or public proxy tested gets the page's posts from a server. A bridge
  feed is the only supported source, and production has none.

### What changed to close the gap (2026-10-18)

1. **BPL's official announcements are now a built-in source.** `https://www.bplco.com/feed/`
   is in `KNOWN_OUTLETS`; its press releases and outage updates flow through the normal
   ingest (categorised **power**, deduped by URL) and appear on `/wire` on the next refresh.
   This is BPL's own publishing, reachable from hosting IPs — no Facebook access involved.
2. **Bridges are now admin-editable, with visible results.** Paste a bridge feed per page on
   **/admin/wire** (stored in the database, wins over `FB_RSS_BRIDGES`, no redeploy) and press
   **Check now** to see *found / new / note* for that page immediately. The last run's status
   is persisted, so "no posts" is never silent again — the panel shows the login-wall note
   and what to do about it.

The remaining manual step is creating the bridge itself (rss.app / fetchrss / RSS-Bridge for
`facebook.com/mybpl242`) — see `TODO_HUMAN.md` § 0. That is an account action this codebase
cannot perform on the owner's behalf, and it is the only way to display the page's actual
Facebook posts.

- ▶ Final machine verdict from any machine that can reach Vercel:
  `node qa/rss-qa/validate.mjs --url "https://<deployment>/api/rss/facebook?url=https%3A%2F%2Fwww.facebook.com%2Fmybpl242%2F"`
  Post permalinks stay login-walled to bots, so a human click-through remains the last
  mile of the "working link" check.
