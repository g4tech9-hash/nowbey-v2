# QA Diagnostic Report — Facebook→RSS Conversion Endpoint

**Target Facebook page:** https://www.facebook.com/mybpl242/ (Bahamas Power and Light)
**RSS endpoint:** ❌ **not supplied** — the prompt contained the literal placeholder
`[INSERT_YOUR_RSS_GENERATOR_URL_HERE]` and no XML payload followed it.
**Report date:** 2026-10-17 · **Harness:** `qa/rss-qa/validate.mjs` (node v22.22.3)

---

## OVERALL STATUS: ⏸ **BLOCKED**

The live test cannot execute: both mandatory inputs are missing (the endpoint URL **or**
a pasted XML payload — either one unblocks it). Everything that *can* be pre-verified has
been, and the test rig is built, self-tested, and waiting.

**To unblock, reply with either:**
1. The endpoint URL (e.g. `https://yoursite.com/feed?url=https://www.facebook.com/mybpl242/`), **or**
2. The raw XML payload pasted into chat (curl the URL and paste the body — this is the
   highest-fidelity path, see §3).

---

## 1. XML Health — *rig validated against 8 fixtures, 8/8 correct*

The validator (`node qa/rss-qa/validate.mjs`) performs strict XML 1.0 well-formedness
scanning + RSS 2.0 schema validation + content verification + a faithful simulation of
this repo's production parser (`src/lib/ingest.ts → parseFeed()`). Self-test results
(each fixture isolates one failure mode the test plan asks about):

| Fixture | Expected | Result | Detector |
|---|---|---|---|
| `golden-bpl.xml` | PASS | ✔ PASS | — |
| `broken-unescaped-amp.xml` | FAIL (`&` instead of `&amp;`) | ✔ FAIL | `WF_AMP`, line 11, with corrected snippet |
| `broken-undefined-entity.xml` | FAIL (`&nbsp;`/`&rsquo;`) | ✔ FAIL | `WF_ENTITY_UNDEFINED` |
| `broken-raw-html-in-description.xml` | warn (missing CDATA around HTML) | ✔ PASS WITH WARNINGS | `CDATA_MISSING` + CDATA fix |
| `broken-malformed-unclosed.xml` | FAIL (unclosed tags) | ✔ FAIL | `WF_UNCLOSED` ×3 |
| `wrong-metadata.xml` | FAIL (title/link ≠ BPL page) | ✔ FAIL | `CONTENT_TITLE_MISMATCH`, `CONTENT_LINK_MISMATCH` |
| `bad-dates.xml` | warn (non-RFC-822, future, missing `pubDate`) | ✔ PASS WITH WARNINGS | `DATE_NOT_RFC822`, `DATE_FUTURE`, `DATE_MISSING` |
| `empty-feed.xml` | FAIL (no posts) | ✔ FAIL | `CONTENT_NO_ITEMS` + NowBey gate failure |

Transport layer verified against a local HTTP matrix: `200 + application/rss+xml` → **PASS (exit 0)**;
`200 + text/html` → **PASS WITH WARNINGS (exit 2)**; `503` → **FAIL (exit 1)**; unreachable → compact FAIL.

## 2. Target page verification — ✔ PASS

facebook.com/**mybpl242** exists and is the official **"Bahamas Power and Light"** page
(~40.7k followers). Default content expectations are therefore:
`<channel><title>` contains **"Bahamas Power"** · `<channel><link>` contains
**"facebook.com/mybpl242"**. Recent-post context: BPL is actively posting about Eleuthera
outage restoration (mid-Oct 2026), so a healthy feed should have items within days.

## 3. Live-test capability map (what runs the moment input arrives)

| Test-plan step | Via pasted XML payload | Via endpoint URL |
|---|---|---|
| HTTP 200 + `Content-Type` check | n/a | ✔ full — run `node qa/rss-qa/validate.mjs --url "…"` where the endpoint is reachable |
| Strict XML/RSS 2.0 validation, CDATA, escaping, line numbers | ✔ **full fidelity** | ✔ full — same harness |
| Channel metadata vs BPL page | ✔ | ✔ |
| Item structure, `pubDate`, `enclosure` | ✔ | ✔ |
| Data proof (latest post title/date/link) | ✔ | ✔ |
| Live click-through of the FB post permalink | ✖ FB login-walls bots — format-validated only; final click is manual | same |
| Endpoint reachability from this sandbox | — | limited egress: if the harness reports "endpoint unreachable", run it from your machine and paste the report back |

⚠️ Known limitation discovered while drafting: rendering this endpoint through a
page-fetch/markdown pipeline **strips XML tags** (demonstrated on znsbahamas.com/feed —
tags and CDATA markers destroyed), so pasted-XML or direct-HTTP are the only valid paths
for schema testing.

## 4. What will run (definition of done)

- [ ] `--url` mode: 200 OK, `Content-Type` ∈ {`application/rss+xml`, `application/xml`, `text/xml`}
- [ ] Well-formed XML 1.0, zero `WF_*` errors
- [ ] RSS 2.0: `<rss version="2.0">`, channel title/link/description present, ≥1 item
- [ ] Content: title contains "Bahamas Power", link contains "facebook.com/mybpl242", newest item ≤ 30 days
- [ ] Latest item: absolute facebook.com permalink, RFC-822 `pubDate`, non-empty `description` (CDATA or entity-encoded), valid `<enclosure>` if images exist
- [ ] Escaping: no raw `&`, no undefined entities, no double-escaping, CDATA where markup exists
- [ ] NowBey sim: `parseFeed()` accepts ≥1 item with no silent drops/date clamps
- [ ] Feed wired into `NEWS_FEEDS` and confirmed in ingest stats

## 5. Report format preview (from the golden fixture)

```text
OVERALL STATUS: PASS
  0 error(s) · 0 warning(s) · 8 info

[2] XML HEALTH (well-formedness)
  ✔ Document is well-formed XML 1.0 (no syntax errors found).
[4] CONTENT VERIFICATION
  ✔ Channel title : "Bahamas Power and Light"
  ✔ Channel link  : "https://www.facebook.com/mybpl242/"
  ✔ Post items    : 3
[5] DATA PROOF — most recent post
  Title : Scheduled maintenance outage for parts of eastern New Providence on Tuesday
  Date  : Thu, 15 Oct 2026 14:30:00 +0000   → parsed: 2026-10-15T14:30:00.000Z (2 days ago)
  Link  : https://www.facebook.com/mybpl242/posts/1205834411022
[6] NOWBEY INGEST COMPATIBILITY
  fetchXml() <item|entry> gate : ✔ passed
  Items accepted by parseFeed(): 3/3
  Verdict: ✔ this feed would surface posts in NowBey's news pipeline
[7] ACTIONABLE FIXES
  None required.
```

Failure reports include the exact line, the offending excerpt, and a corrected snippet, e.g.:

```text
✖ line 11: Unescaped '&' in content — XML requires &amp; (the feed will hard-fail strict parsers).
    at: <description>BPL & BEC crews are working on the Blue Hills feeder.</description>
  Fix 1 — WF_AMP (line 11):
    Replace with:
      BPL &amp; BEC crews are working on the Blue Hills feeder.
```

---

**Verdict:** rig ready · page verified · live test **BLOCKED pending endpoint URL or XML payload**.
