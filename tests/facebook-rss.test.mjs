/**
 * Facebook page → RSS converter (src/lib/facebook.ts) — hermetic, no network.
 *
 * The serializer's output is machine-checked with the project's own RSS QA harness
 * (qa/rss-qa/validate.mjs), so "the converter emits valid RSS 2.0" is asserted the
 * same way the live endpoint is audited, including the NowBey ingest simulation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fbUsernameFromUrl,
  fbPageName,
  fbBridgeUrl,
  parseFacebookHtml,
  parseBridgeFeed,
  postsToRssXml,
  titleForPost,
} from "../src/lib/facebook.ts";
import { validateXmlString } from "../qa/rss-qa/validate.mjs";

const HOUR = 3600_000;
const hoursAgoSec = (h) => Math.floor((Date.now() - h * HOUR) / 1000);
const hoursAgoIso = (h) => new Date(Date.now() - h * HOUR).toISOString();

test("page links in every reasonable shape resolve to the username", () => {
  assert.equal(fbUsernameFromUrl("https://www.facebook.com/mybpl242/"), "mybpl242");
  assert.equal(fbUsernameFromUrl("https://www.facebook.com/mybpl242"), "mybpl242");
  assert.equal(fbUsernameFromUrl("https://m.facebook.com/mybpl242/posts/1205834411022?refid=17"), "mybpl242");
  assert.equal(fbUsernameFromUrl("https://mbasic.facebook.com/mybpl242?_rdr"), "mybpl242");
  assert.equal(fbUsernameFromUrl("https://fb.com/mybpl242"), "mybpl242");
  assert.equal(fbUsernameFromUrl("mybpl242"), "mybpl242");
  assert.equal(fbUsernameFromUrl("https://www.facebook.com/profile.php?id=100064712345678"), "profile-100064712345678");
});

test("non-page links are rejected (SSRF / nonsense guard)", () => {
  assert.equal(fbUsernameFromUrl("https://www.facebook.com/login.php"), null);
  assert.equal(fbUsernameFromUrl("https://www.facebook.com/watch/live"), null);
  assert.equal(fbUsernameFromUrl("https://evil.example.com/mybpl242"), null);
  assert.equal(fbUsernameFromUrl("javascript:alert(1)"), null);
  assert.equal(fbUsernameFromUrl(""), null);
  assert.equal(fbUsernameFromUrl("https://www.facebook.com/"), null);
});

test("page names come from code, then FB_PAGES env, then the handle", () => {
  assert.equal(fbPageName("mybpl242"), "Bahamas Power and Light");
  assert.equal(fbPageName("242intheknow", { FB_PAGES: "242intheknow|242 In The Know" }), "242 In The Know");
  assert.equal(fbPageName("unknownpage"), "unknownpage (Facebook)");
});

test("bridge URLs resolve from FB_RSS_BRIDGES only", () => {
  const env = { FB_RSS_BRIDGES: "mybpl242|https://rss.app/feeds/abc.xml, other|https://x/y.xml" };
  assert.equal(fbBridgeUrl("mybpl242", env), "https://rss.app/feeds/abc.xml");
  assert.equal(fbBridgeUrl("nobody", env), null);
  assert.equal(fbBridgeUrl("mybpl242", {}), null);
});

/* ───────────────────────── direct (mbasic HTML) parsing ───────────────────────── */

const mbasicHtml = (epoch1, epoch2) => `<html><head><title>Bahamas Power and Light</title></head><body>
<div id="m_header"><a href="/home.php">Home</a> <a href="/mybpl242">Page</a></div>
<div>
  <div><a href="/mybpl242?fref=nf">Bahamas Power and Light</a> <abbr data-utime="${epoch1}">2 hrs</abbr></div>
  <div class="_5pbx userContent" data-ft='{"tn":"K"}'>BPL advises customers in Fox Hill &amp; Sans Souci: planned outage Tuesday 9am-11am.<br/>Report outages 24/7 to 225-5275.</div>
  <div><a href="/photo.php?fbid=987654&amp;set=a.1&amp;type=3"><img src="https://scontent.xx.fbcdn.net/v/t39/outage-map.jpg?efg=1&amp;_nc_ht=scontent" /></a></div>
  <div><a href="/story.php?story_fbid=1205834411022&amp;id=100064712345678&amp;refid=17">Full Story</a> <span>Like 342 Comment 41 Share 88</span></div>
</div>
<div>
  <div><a href="/mybpl242?fref=nf">Bahamas Power and Light</a> <abbr>${epoch2}</abbr></div>
  <div class="_5pbx userContent">Crews restored supply to Tarpum Bay &amp; Greencastle this morning. We thank customers for their patience.</div>
  <div><a href="/mybpl242/posts/1204678301001?refid=17">Full Story</a></div>
</div>
<div>
  <div class="_5pbx userContent"></div>
  <div><a href="/permalink.php?story_fbid=1203344955110&amp;id=100064712345678"><img src="https://scontent.xx.fbcdn.net/solar-sign.jpg?oh=7&amp;oe=1" /></a></div>
  <div><a href="/permalink.php?story_fbid=1203344955110&amp;id=100064712345678&amp;refid=17">Full Story</a></div>
</div>
</body></html>`;

test("mbasic HTML yields posts with canonical permalinks, text, images and times", () => {
  const e1 = hoursAgoSec(2);
  const e2 = hoursAgoSec(26);
  const posts = parseFacebookHtml(mbasicHtml(e1, e2), "mybpl242");
  assert.equal(posts.length, 3);

  assert.equal(posts[0].id, "1205834411022");
  assert.equal(posts[0].url, "https://www.facebook.com/permalink.php?story_fbid=1205834411022&id=100064712345678");
  assert.equal(posts[0].text.includes("Fox Hill & Sans Souci"), true, "entities must be decoded");
  assert.equal(posts[0].text.includes("225-5275"), true, "<br> must become a line break");
  assert.equal(posts[0].imageUrl, "https://scontent.xx.fbcdn.net/v/t39/outage-map.jpg?efg=1&_nc_ht=scontent");
  assert.equal(posts[0].timeEstimated, false);
  assert.ok(Math.abs(posts[0].publishedAt.getTime() - e1 * 1000) < 1500);

  // Vanity /posts/ links canonicalize with the username.
  assert.equal(posts[1].url, "https://www.facebook.com/mybpl242/posts/1204678301001");
  assert.equal(posts[1].imageUrl, null);
  assert.equal(posts[1].timeEstimated, false);

  // Photo-only post: empty text falls back to a "posted a photo" title, not page junk.
  assert.equal(posts[2].text, "");
  assert.equal(posts[2].imageUrl, "https://scontent.xx.fbcdn.net/solar-sign.jpg?oh=7&oe=1");
  assert.equal(titleForPost(posts[2], "Bahamas Power and Light"), "Bahamas Power and Light posted a photo");
});

test("login walls and unrecognized markup produce an empty post list, never a crash", () => {
  const wall = `<html><body>You must log in to continue.<form action="/login.php"><input name="email"></form></body></html>`;
  assert.deepEqual(parseFacebookHtml(wall, "mybpl242"), []);
  assert.deepEqual(parseFacebookHtml("", "mybpl242"), []);
  assert.deepEqual(parseFacebookHtml("<html><body><div>nothing here</div></body></html>", "mybpl242"), []);
});

/* ───────────────────────── bridge feed normalization ───────────────────────── */

// Deliberately sloppy upstream: a raw & in <title>, undefined &nbsp;/&rsquo; entities,
// escaped markup, an enclosure with type= before url=, a missing date, a non-canonical host.
const sloppyBridgeXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>mybpl242 FB bridge</title>
<link>https://www.facebook.com/mybpl242/</link>
<description>Upstream feed with &nbsp; and &rsquo; entities and a raw & </description>
<item>
<title>Outage update &amp; Fox Hill alert</title>
<link>https://www.facebook.com/mybpl242/posts/1112233445</link>
<pubDate>Wed, 14 Oct 2026 09:15:00 +0000</pubDate>
<description>Restored supply to &lt;b&gt;Tarpum Bay&lt;/b&gt; &amp; surrounding areas.</description>
<enclosure type="image/jpeg" url="https://scontent.xx.fbcdn.net/img.jpg?x=1&amp;y=2"/>
</item>
<item>
<title>Second post without a date</title>
<link>https://facebook.com/mybpl242/posts/1112233446</link>
<description>Board meeting notice: directors &amp; officers convene Thursday. <img src="https://scontent.xx.fbcdn.net/board.jpg"/></description>
</item>
</channel>
</rss>`;

test("a broken upstream feed normalizes into posts (that is the converter's job)", () => {
  const posts = parseBridgeFeed(sloppyBridgeXml, "mybpl242");
  assert.equal(posts.length, 2);
  assert.equal(posts[0].url, "https://www.facebook.com/mybpl242/posts/1112233445");
  assert.equal(posts[0].text.includes("Tarpum Bay"), true);
  assert.equal(posts[0].text.includes("<b>"), false, "markup must be stripped from text");
  assert.equal(posts[0].imageUrl, "https://scontent.xx.fbcdn.net/img.jpg?x=1&y=2", "enclosure attrs decode; order does not matter");
  assert.equal(posts[0].timeEstimated, false);
  assert.equal(posts[1].timeEstimated, true, "missing date falls back to fetch time");
  assert.equal(posts[1].imageUrl, "https://scontent.xx.fbcdn.net/board.jpg", "images are found even inside escaped body HTML");
});

test("the raw upstream feed fails the QA harness, the converter's output passes it", () => {
  const raw = validateXmlString(sloppyBridgeXml, { expectTitle: "Bahamas Power", expectLink: "facebook.com/mybpl242", nowbey: true });
  assert.notEqual(raw.status, "PASS");
  assert.ok(raw.findings.some((f) => f.code === "WF_AMP" || f.code === "WF_ENTITY_UNDEFINED"), "the upstream is genuinely broken");

  const posts = parseBridgeFeed(sloppyBridgeXml, "mybpl242");
  const xml = postsToRssXml({
    username: "mybpl242",
    pageName: "Bahamas Power and Light",
    posts,
    selfUrl: "https://nowbey-v2.vercel.app/api/rss/facebook?url=https%3A%2F%2Fwww.facebook.com%2Fmybpl242%2F",
    sourceNote: "source: bridge; upstream host example",
  });
  const result = validateXmlString(xml, { expectTitle: "Bahamas Power", expectLink: "facebook.com/mybpl242", nowbey: true });
  assert.equal(result.status, "PASS");
  assert.equal(result.findings.filter((f) => f.severity === "ERROR" || f.severity === "WARN").length, 0, JSON.stringify(result.findings));
  assert.equal(result.nowbey?.accepted.length, 2, "both normalized posts survive NowBey's ingest gates");
});

/* ───────────────────────── RSS serialization, checked by the QA harness ───────────────────────── */

const samplePosts = () => [
  {
    id: "1205834411022",
    url: "https://www.facebook.com/mybpl242/posts/1205834411022",
    text: "BPL advises customers in Fox Hill & Sans Souci: a planned outage runs Tuesday 9am-11am for line maintenance.\nReport outages 24/7 to 225-5275.",
    imageUrl: "https://scontent.xx.fbcdn.net/v/t39/outage-map.jpg",
    publishedAt: new Date(hoursAgoIso(2)),
    timeEstimated: false,
  },
  {
    id: "1204678301001",
    url: "https://www.facebook.com/mybpl242/posts/1204678301001",
    text: "Crews restored supply to Tarpum Bay & Greencastle this morning.",
    imageUrl: null,
    publishedAt: new Date(hoursAgoIso(26)),
    timeEstimated: false,
  },
  {
    id: null,
    url: "https://www.facebook.com/photo?fbid=987654&set=a.1",
    text: "",
    imageUrl: "https://scontent.xx.fbcdn.net/solar-sign.jpg",
    publishedAt: new Date(hoursAgoIso(50)),
    timeEstimated: true,
  },
];

test("serializer output is strict RSS 2.0: harness PASS, no warnings, NowBey accepts every post", () => {
  const xml = postsToRssXml({
    username: "mybpl242",
    pageName: "Bahamas Power and Light",
    posts: samplePosts(),
    selfUrl: "https://nowbey-v2.vercel.app/api/rss/facebook?url=https%3A%2F%2Fwww.facebook.com%2Fmybpl242%2F",
  });
  const result = validateXmlString(xml, { expectTitle: "Bahamas Power", expectLink: "facebook.com/mybpl242", nowbey: true });
  assert.equal(result.status, "PASS", JSON.stringify(result.findings, null, 2));
  assert.equal(result.nowbey?.accepted.length, 3);
  assert.equal(result.nowbey?.clamped, 0);
  // Data proof must resolve the newest post (title text in the feed carries XML-escaped entities).
  assert.equal(result.newest?.title.includes("Fox Hill"), true);
  assert.equal(result.newest?.link, "https://www.facebook.com/mybpl242/posts/1205834411022");
  assert.ok(Math.abs((result.newest?.date?.getTime() ?? 0) - (Date.now() - 2 * HOUR)) < 5000);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes("<rss version=\"2.0\""));
  assert.ok(xml.includes("<description><![CDATA["), "post text is CDATA-wrapped");
  assert.ok(/<enclosure url="[^"]+" length="0" type="image\/jpeg" \/>/.test(xml), "enclosure: url before type, length and type present");
  const titles = [...xml.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => m[1]);
  assert.ok(titles.length >= 4, "channel + item titles present");
  assert.ok(titles.every((t) => !/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(t)), "titles carry escaped entities only");
  assert.equal(titles[1].includes("&amp;"), true, "the & in 'Fox Hill &' is escaped exactly once");
});

test("titles never arrive single-word (NowBey and readers drop them)", () => {
  const one = titleForPost({ ...samplePosts()[1], text: "Thanks!" }, "Bahamas Power and Light");
  assert.equal(one, "Thanks! — Bahamas Power and Light");
  const long = titleForPost({ ...samplePosts()[0], text: "x".repeat(400) }, "Bahamas Power and Light");
  assert.ok(long.length <= 120, `title too long: ${long.length}`);
});

test("an empty page still produces a valid, honest empty feed (channel metadata intact)", () => {
  const xml = postsToRssXml({
    username: "mybpl242",
    pageName: "Bahamas Power and Light",
    posts: [],
    selfUrl: "https://nowbey-v2.vercel.app/api/rss/facebook",
    sourceNote: "source: direct; Facebook answered with a login wall",
  });
  const result = validateXmlString(xml, { expectTitle: "Bahamas Power", expectLink: "facebook.com/mybpl242", nowbey: true });
  // Metadata passes; the content requirement (recent posts) fails — reported honestly, never faked.
  assert.equal(result.status, "FAIL");
  assert.deepEqual(result.findings.filter((f) => f.severity === "ERROR").map((f) => f.code), ["CONTENT_NO_ITEMS"]);
  assert.equal(result.findings.some((f) => f.code === "CONTENT_TITLE_MISMATCH"), false);
});

test("CDATA edge: post text containing ']]>' cannot break the feed", () => {
  const xml = postsToRssXml({
    username: "mybpl242",
    pageName: "Bahamas Power and Light",
    posts: [{ ...samplePosts()[0], text: "Notice ]]> in the middle of text" }],
    selfUrl: "https://x.test/feed",
  });
  const result = validateXmlString(xml, { expectTitle: "Bahamas Power", expectLink: "facebook.com/mybpl242", nowbey: true });
  assert.equal(result.status, "PASS", JSON.stringify(result.findings));
});
