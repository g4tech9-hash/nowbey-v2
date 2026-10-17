# RSS 2.0 QA Harness (`qa/rss-qa/`)

Senior-QA validation for the **Facebook→RSS conversion endpoint** (target page:
<https://www.facebook.com/mybpl242/> — Bahamas Power and Light), and for any other RSS
feed NowBey ingests through `NEWS_FEEDS` / `src/lib/ingest.ts`.

The harness (`validate.mjs`, zero dependencies, Node ≥ 20) checks, in report order:

| # | Section | What it does |
|---|---------|--------------|
| 1 | Transport & headers | HTTP status must be 2xx; `Content-Type` should be `application/rss+xml` / `application/xml` / `text/xml`; flags `text/html`, JSON, error pages. URL mode only. |
| 2 | XML health | Strict XML 1.0 well-formedness scanner: unescaped `&`, undefined named entities (`&nbsp;`, `&rsquo;`…), control chars, mismatched/unclosed/duplicate tags, stray `<`, `]]>` in text, DOCTYPE/XXE, double root, UTF-8→Latin-1 mojibake — all with line numbers and excerpts. |
| 3 | RSS 2.0 schema | Root `<rss version="2.0">`, required `<channel>` title/link/description, item structure (title or description), `<link>` absoluteness, `pubDate` RFC-822 shape + future-date detection, `<guid isPermaLink>`, `<enclosure url length type>` completeness, element misspellings (`pubdate` → `pubDate`…). Atom/RDF roots are flagged. |
| 4 | Content verification | Channel title must contain `Bahamas Power`, channel link must contain `facebook.com/mybpl242` (both configurable); at least one item; recency check; CDATA policy — raw child HTML inside `<description>` flagged as `CDATA_MISSING`; double-escaping (`&amp;amp;`), entity soup inside CDATA, executable HTML. |
| 5 | Data proof | Title, raw + parsed date, link, enclosure image and text excerpt of the **most recent post**, plus a permalink-format verdict. |
| 6 | NowBey ingest compatibility | Faithful re-run of `src/lib/ingest.ts` `fetchXml()` + `parseFeed()` gates (junk titles, two-word rule, absolute-link rule, date clamping, image extraction incl. the `url=` before `type=` enclosure-regex quirk) — tells you exactly what production would ingest or silently drop. |
| 7 | Actionable fixes | Every error/warning gets a line reference and a copy-pasteable corrected snippet. |

## Usage

```bash
node qa/rss-qa/validate.mjs --url "https://your-site.example/feed?url=https://www.facebook.com/mybpl242/"
node qa/rss-qa/validate.mjs --file path/to/feed.xml          # XML payload analysis (no HTTP)
cat feed.xml | node qa/rss-qa/validate.mjs --stdin
node qa/rss-qa/validate.mjs --selftest                        # fixture regression suite

# options
--expect-title "Bahamas Power"        # default; set to null via --expect-none
--expect-link "facebook.com/mybpl242" # default
--no-nowbey                           # skip section 6
--json                                # machine-readable findings
```

**Exit codes:** `0` = PASS · `2` = PASS WITH WARNINGS · `1` = FAIL / endpoint unreachable.

## Self-test (QA the QA)

`fixtures/` contains one golden feed and seven broken variants, each isolating one
failure mode (unescaped `&`, undefined entity, missing CDATA, unclosed tag, wrong
channel metadata, bad/missing/future dates, zero items). `--selftest` asserts each
fixture produces its known status + finding codes:

```text
✔ golden-bpl.xml                         PASS
✔ broken-unescaped-amp.xml               FAIL  [WF_AMP]
✔ broken-undefined-entity.xml            FAIL  [WF_ENTITY_UNDEFINED]
✔ broken-raw-html-in-description.xml     PASS WITH WARNINGS  [CDATA_MISSING]
✔ broken-malformed-unclosed.xml          FAIL  [WF_UNCLOSED]
✔ wrong-metadata.xml                     FAIL  [CONTENT_TITLE_MISMATCH, CONTENT_LINK_MISMATCH]
✔ bad-dates.xml                          PASS WITH WARNINGS  [DATE_NOT_RFC822, DATE_FUTURE, DATE_MISSING]
✔ empty-feed.xml                         FAIL  [CONTENT_NO_ITEMS]
```

The current QA findings and execution status live in [`QA_REPORT.md`](./QA_REPORT.md).

## Wiring a passing feed into NowBey

Once the endpoint reports **PASS**, add it to the environment (`src/lib/ingest.ts`
consumes `NEWS_FEEDS` — Facebook blocks direct scraping, so the bridge feed is the
supported path):

```
NEWS_FEEDS="Bahamas Power and Light|https://your-site.example/feed?url=https://www.facebook.com/mybpl242/"
```

Posts then flow through the normal ingest (categorisation, geocoding, `/news` page)
on the existing refresh schedule.
