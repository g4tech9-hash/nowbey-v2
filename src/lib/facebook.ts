/*
 * Facebook page → RSS 2.0 converter — the "public Facebook page link in, valid feed out" service.
 *
 *   /api/rss/facebook?url=https://www.facebook.com/mybpl242/
 *
 * Facebook blocks anonymous scraping, so the converter is layered:
 *
 *   1. bridge  — if FB_RSS_BRIDGES maps the page to a feed from a bridge service
 *                (rss.app, fetchrss.com, a self-hosted RSS-Bridge…), that feed is
 *                fetched and NORMALIZED: whatever messy XML the upstream emits is
 *                re-parsed and re-serialized into strict RSS 2.0 (fixed entities,
 *                CDATA policy, RFC-822 dates, canonical permalinks).
 *   2. direct  — otherwise the public mobile page (mbasic.facebook.com) is fetched
 *                and posts are parsed from the HTML. Best effort: when Facebook
 *                answers with a login wall the converter returns an empty-but-valid
 *                feed instead of an error, and operators should configure a bridge.
 *
 * Everything here is pure and hermetic (fetch is never called inside this file except
 * in fetchFacebookPosts), so node --test can exercise the parsers and the serializer
 * against fixtures, and qa/rss-qa/validate.mjs validates the produced XML.
 */

export type FbPost = {
  /** Facebook story id, when the source provides one. */
  id: string | null;
  /** Canonical permalink to the post (facebook.com when we built it, upstream URL for bridges). */
  url: string;
  /** Decoded plain text of the post (tags stripped, entities resolved). */
  text: string;
  /** Direct image URL when the source provides one (used for the RSS enclosure). */
  imageUrl: string | null;
  /** Post time when the source provides one; otherwise the fetch time (like readers do). */
  publishedAt: Date;
  /** True when publishedAt is just the fetch time, not a real post timestamp. */
  timeEstimated: boolean;
};

export type FbSource =
  | { kind: "bridge"; pageName: string; url: string }
  | { kind: "direct"; pageName: string; username: string };

/** Pages whose display name we ship in code, so the feed metadata is right with zero configuration. */
const KNOWN_FB_PAGES: Record<string, string> = {
  mybpl242: "Bahamas Power and Light",
};

const RESERVED_FB_PATHS = new Set([
  "login", "watch", "groups", "events", "marketplace", "gaming", "help", "policies",
  "privacy", "settings", "reel", "reels", "video", "video.php", "photo.php", "photo",
  "story.php", "permalink.php", "profile.php", "hashtag", "search", "share", "share.php",
  "pages", "people", "public", "notifications", "messages", "friends", "home", "reg",
  "recover", "legal", "business", "ads", "about", "login.php", "unsupported",
]);

const FB_HOST_RE = /^(?:(?:www|m|mbasic|web|d|touch)\.)?(?:facebook\.com|fb\.com)$/i;

/**
 * Accepts a public page link in any reasonable shape —
 *   https://www.facebook.com/mybpl242/ · https://m.facebook.com/mybpl242/posts/123 ·
 *   mbasic… · fb.com/mybpl242 — or a bare username ("mybpl242").
 * Returns the page username, or null when the link is not a public profile/page.
 */
export function fbUsernameFromUrl(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      return null;
    }
    if (!FB_HOST_RE.test(u.hostname)) return null;
    path = u.pathname;
    const idParam = u.searchParams.get("id");
    // profile.php?id=… pages have no vanity name; the numeric id is the stable handle.
    if (/^\/profile\.php$/i.test(path) && idParam && /^\d+$/.test(idParam)) return `profile-${idParam}`;
  }
  const seg = path.split("?")[0].split("#")[0].split("/").filter(Boolean)[0] ?? "";
  if (!/^[A-Za-z0-9.\-_]{2,80}$/.test(seg)) return null;
  if (RESERVED_FB_PATHS.has(seg.toLowerCase())) return null;
  return seg;
}

/** Display name for a page: code-known, then FB_PAGES env ("user|Name,…"), then the handle itself. */
export function fbPageName(username: string, env: NodeJS.ProcessEnv = process.env): string {
  const extra = env.FB_PAGES ?? "";
  for (const entry of extra.split(",")) {
    const i = entry.indexOf("|");
    if (i > 0 && entry.slice(0, i).trim() === username) return entry.slice(i + 1).trim() || username;
  }
  return KNOWN_FB_PAGES[username.toLowerCase()] ?? `${username} (Facebook)`;
}

/** Bridge feed URL for a page from FB_RSS_BRIDGES ("user|https://…/rss.xml,…"), if configured. */
export function fbBridgeUrl(username: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.FB_RSS_BRIDGES ?? "";
  for (const entry of raw.split(",")) {
    const i = entry.indexOf("|");
    if (i > 0 && entry.slice(0, i).trim() === username) {
      const url = entry.slice(i + 1).trim();
      if (url.startsWith("http")) return url;
    }
  }
  return null;
}

export type FbPageRef = { username: string; pageName: string };

/**
 * Parse the admin-managed page list (site setting "fb_pages"). Each entry is a public
 * page link or bare username, optionally "|Display Name". Entries are de-duplicated by
 * username, invalid ones dropped — the list comes from an admin form, so be forgiving.
 */
export function fbPagesFromValue(raw: string, env: NodeJS.ProcessEnv = process.env): FbPageRef[] {
  const out = new Map<string, FbPageRef>();
  for (const entry of (raw ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const pipe = trimmed.indexOf("|");
    const givenName = pipe > 0 ? trimmed.slice(pipe + 1).trim() : "";
    const username = fbUsernameFromUrl(pipe > 0 ? trimmed.slice(0, pipe) : trimmed);
    if (!username) continue;
    if (!out.has(username)) out.set(username, { username, pageName: givenName || fbPageName(username, env) });
    else if (givenName) out.get(username)!.pageName = givenName;
  }
  return [...out.values()];
}

/* ───────────────────────── text helpers ───────────────────────── */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "\u2019", lsquo: "\u2018",
  ldquo: "\u201c", rdquo: "\u201d", hellip: "\u2026", ndash: "\u2013", mdash: "\u2014", middot: "·",
};

/** Resolve HTML entities and strip tags — two passes, so escaped markup (&lt;b&gt;) and
 * double-escapes (&amp;amp;) come out as clean text, matching what a reader should see. */
export function decodeFbText(input: string): string {
  let out = input;
  for (let pass = 0; pass < 2; pass++) {
    out = out
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => safeChar(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, n: string) => safeChar(Number(n)))
      .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
  }
  return out
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeChar(code: number): string {
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

/** XML-escape for attribute values and text nodes (outside CDATA). */
export function escapeXml(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Wrap text in CDATA, splitting any literal "]]>" so the section cannot break early. */
function cdata(input: string): string {
  return `<![CDATA[${input.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function rfc822(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (x: number) => String(x).padStart(2, "0");
  return `${days[date.getUTCDay()]}, ${p(date.getUTCDate())} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())} +0000`;
}

function mimeForImage(url: string): string {
  if (/\.png(\?|$)/i.test(url)) return "image/png";
  if (/\.webp(\?|$)/i.test(url)) return "image/webp";
  if (/\.gif(\?|$)/i.test(url)) return "image/gif";
  return "image/jpeg";
}

/** Feed title: first sentence-ish line, at least two words (readers and NowBey both drop one-word headlines). */
export function titleForPost(post: FbPost, pageName: string): string {
  const firstLine = (post.text.split("\n").find((l) => l.trim().length > 0) ?? "").trim();
  const base = firstLine || (post.imageUrl ? `${pageName} posted a photo` : `${pageName} posted an update`);
  // Keep the WHOLE title (suffix included) inside ~120 chars: budget for the clip, then the page name.
  const budget = Math.max(40, 116 - pageName.length);
  const clipped = base.length > budget ? `${base.slice(0, budget - 1).replace(/\s+\S*$/, "")}…` : base;
  // A single-word title looks like a section label; give it the page name for context.
  const words = clipped.replace(/[^a-z0-9]+/gi, " ").trim().split(/\s+/).filter(Boolean).length;
  return words < 2 ? `${clipped} — ${pageName}` : clipped;
}

/* ───────────────────────── direct (mbasic HTML) parsing ───────────────────────── */

/**
 * Parse posts out of Facebook's public mobile HTML (mbasic / m.facebook basic view).
 * Tolerant by design: story chunks are cut at each permalink occurrence, then text,
 * timestamp and image are hunted inside the chunk. Returns [] for login walls or
 * unrecognized markup — callers render an empty feed rather than an error.
 */
export function parseFacebookHtml(html: string, username: string): FbPost[] {
  if (!html) return [];
  const now = new Date();
  // Cut the document into per-story slices at each permalink occurrence.
  const marks = [
    ...html.matchAll(/(?:story|permalink)\.php\?story_fbid=(\d+)(?:&amp;id=(\d+))?|\/([A-Za-z0-9.\-_]+)\/posts\/(pfbid[\w-]+|\d+)/g),
  ];
  if (marks.length === 0) {
    if (/you must log in to continue|log in to facebook|content isn'?t available right now/i.test(html)) return [];
    return [];
  }
  const posts: FbPost[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    const start = i === 0 ? Math.max(0, m.index! - 2500) : marks[i - 1].index! + marks[i - 1][0].length;
    // Extend only to the end of the tag the permalink lives in, so a photo inside the same
    // <a> is kept but the NEXT story's content never bleeds into this chunk.
    const anchorEnd = html.indexOf("</a>", m.index!);
    const end = anchorEnd >= 0 && anchorEnd < m.index! + 2000 ? anchorEnd + 4 : m.index! + m[0].length;
    const chunk = html.slice(start, end);
    const storyId = m[1] ?? m[4] ?? null;
    const pageId = m[2] ?? null;
    if (!storyId || seen.has(storyId)) continue;
    seen.add(storyId);
    // Canonical permalink: vanity form when we know the username, permalink.php otherwise.
    const url =
      m[4] && username && !username.startsWith("profile-")
        ? `https://www.facebook.com/${username}/posts/${m[4]}`
        : pageId
          ? `https://www.facebook.com/permalink.php?story_fbid=${storyId}&id=${pageId}`
          : `https://www.facebook.com/${username}/posts/${storyId}`;
    const textDiv =
      chunk.match(/<div[^>]*class="[^"]*(?:userContent|_5pbx)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
      chunk.match(/<div[^>]*data-ft[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
      "";
    let text = decodeFbText(textDiv);
    // Drop the scaffolding noise mbasic prints around every story.
    text = text
      .replace(/^\s*(Full Story|Like\s*\d*|Comment\s*\d*|Share\s*\d*|View feedback|See Translation)\b/gi, "")
      .replace(/\b(Like|Comment|Share|Full Story)\s*\d*\s*(?:Like|Comment|Share|Full Story\s*\d*)*$/gi, "")
      .trim();
    // Photo: prefer the image inside a photo.php anchor, else any CDN image in the chunk.
    const photoAnchor = chunk.match(/<a[^>]*href="[^"]*photo\.php[^"]*"[^>]*>\s*<img[^>]*src="(https?:\/\/[^"]+)"/i)?.[1];
    const cdnImg = chunk.match(/<img[^>]*src="(https?:\/\/[^"]*(?:scontent|fbcdn)[^"]*)"/i)?.[1];
    // Attribute values arrive HTML-encoded (&amp; in URLs); decode before re-serializing.
    const imageUrl = (photoAnchor ?? cdnImg) ? decodeFbText(photoAnchor ?? cdnImg!) : null;
    const utime =
      chunk.match(/data-utime="(\d{9,13})"/i)?.[1] ??
      chunk.match(/<abbr[^>]*>\s*(\d{9,13})\s*<\/abbr>/i)?.[1] ??
      null;
    let publishedAt = now;
    let timeEstimated = true;
    if (utime) {
      const ms = Number(utime) * (utime.length > 10 ? 1 : 1000);
      if (Number.isFinite(ms) && ms < Date.now() + 3600_000) {
        publishedAt = new Date(ms);
        timeEstimated = false;
      }
    }
    posts.push({ id: storyId, url, text: text.slice(0, 4000), imageUrl, publishedAt, timeEstimated });
  }
  return posts;
}

/* ───────────────────────── bridge feed (upstream RSS/Atom) parsing ───────────────────────── */

/**
 * Normalize an upstream bridge feed (RSS 2.0 or Atom, however sloppy) into FbPosts.
 * This is deliberately forgiving — bridge services emit undefined entities, missing
 * CDATA and ISO dates; the converter's job is to fix all of that on the way through.
 */
export function parseBridgeFeed(xml: string, username: string): FbPost[] {
  if (!xml) return [];
  const now = new Date();
  const chunks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g) ?? [];
  const out: FbPost[] = [];
  for (const chunk of chunks) {
    const raw = (tag: string) => chunk.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "";
    const grab = (tag: string) => decodeFbText(raw(tag).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
    const title = grab("title");
    const rawBody = raw("content:encoded") || raw("content") || raw("description") || raw("summary") || "";
    const bodyHtml = rawBody.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
    const body = decodeFbText(bodyHtml);
    const link =
      grab("link") ||
      chunk.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1] ||
      chunk.match(/<link[^>]*href="([^"]+)"/i)?.[1] ||
      grab("guid") ||
      "";
    if (!/^https?:\/\//.test(link) && !/^www\./.test(link)) continue;
    const url = link.startsWith("http") ? link : `https://${link}`;
    const dateRaw = grab("pubDate") || grab("dc:date") || grab("published") || grab("updated");
    let publishedAt = now;
    let timeEstimated = true;
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 3600_000) {
        publishedAt = d;
        timeEstimated = false;
      }
    }
    const imageUrl =
      chunk.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image[^"]*"/i)?.[1] ??
      chunk.match(/<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/i)?.[1] ??
      chunk.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i)?.[1] ??
      bodyHtml.match(/<img[^>]*\ssrc=["']?(https?:\/\/[^"'\s>]+)/i)?.[1] ??
      null;
    const idMatch = url.match(/(?:story_fbid=|\/posts\/)(pfbid[\w-]+|\d+)/i)?.[1] ?? null;
    out.push({
      id: idMatch,
      url: url.slice(0, 600),
      text: (title && title !== body ? `${title}\n${body}` : body).slice(0, 4000),
      // Attribute values arrive HTML-encoded; decode so re-serialization never double-escapes.
      imageUrl: imageUrl && /^https?:\/\//.test(imageUrl) ? decodeFbText(imageUrl) : null,
      publishedAt,
      timeEstimated,
    });
  }
  return out;
}

/* ───────────────────────── RSS 2.0 serialization ───────────────────────── */

/**
 * Serialize posts as strict RSS 2.0 — the output is machine-checked against
 * qa/rss-qa/validate.mjs in tests/facebook-rss.test.mjs, which is why every
 * choice here is deliberate: entities escaped in text, prose in CDATA,
 * RFC-822 dates, and <enclosure> with url before type (the order NowBey's
 * own ingest regex expects) plus the required length and type attributes.
 */
export function postsToRssXml(opts: {
  username: string;
  pageName: string;
  posts: FbPost[];
  selfUrl: string;
  sourceNote?: string;
  now?: Date;
}): string {
  const { username, pageName, posts, selfUrl, sourceNote, now = new Date() } = opts;
  const canonical = username.startsWith("profile-")
    ? `https://www.facebook.com/profile.php?id=${username.slice("profile-".length)}`
    : `https://www.facebook.com/${username}/`;
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`);
  lines.push(`  <channel>`);
  lines.push(`    <title>${escapeXml(pageName)}</title>`);
  lines.push(`    <link>${escapeXml(canonical)}</link>`);
  lines.push(`    <description>${escapeXml(`Posts by ${pageName}, converted from Facebook to RSS by NowBey.`)}</description>`);
  lines.push(`    <language>en</language>`);
  lines.push(`    <lastBuildDate>${rfc822(now)}</lastBuildDate>`);
  lines.push(`    <generator>NowBey Facebook RSS converter</generator>`);
  lines.push(`    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />`);
  if (sourceNote) lines.push(`    <!-- ${escapeXml(sourceNote).replace(/-{2,}/g, "-")} -->`);
  for (const post of posts.slice(0, 40)) {
    lines.push(`    <item>`);
    lines.push(`      <title>${escapeXml(titleForPost(post, pageName))}</title>`);
    lines.push(`      <link>${escapeXml(post.url)}</link>`);
    lines.push(`      <guid isPermaLink="${post.url.startsWith("http") && /facebook\.com/.test(post.url) ? "true" : "false"}">${escapeXml(post.url)}</guid>`);
    lines.push(`      <pubDate>${rfc822(post.publishedAt)}</pubDate>`);
    if (post.text) lines.push(`      <description>${cdata(post.text)}</description>`);
    else if (post.imageUrl) lines.push(`      <description>${cdata(`${pageName} posted a photo.`)}</description>`);
    if (post.imageUrl) {
      lines.push(`      <enclosure url="${escapeXml(post.imageUrl)}" length="0" type="${mimeForImage(post.imageUrl)}" />`);
    }
    lines.push(`    </item>`);
  }
  lines.push(`  </channel>`);
  lines.push(`</rss>`);
  return lines.join("\n");
}

/* ───────────────────────── fetch layer (thin; not unit-tested) ───────────────────────── */

const UA = "Mozilla/5.0 (compatible; NowBeyBot/1.0; +https://nowbey-v2.vercel.app)";

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" }, cache: "no-store", signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a page to its posts: bridge first (configured, reliable), direct mobile
 * HTML second (best effort). Returns the posts plus the source actually used so the
 * endpoint can note it in the feed.
 */
export async function fetchFacebookPosts(
  username: string,
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = 9000,
): Promise<{ posts: FbPost[]; source: FbSource; note: string }> {
  const pageName = fbPageName(username, env);
  const bridge = fbBridgeUrl(username, env);
  if (bridge) {
    const xml = await fetchText(bridge, timeoutMs);
    if (xml) {
      const posts = parseBridgeFeed(xml, username);
      if (posts.length) return { posts, source: { kind: "bridge", pageName, url: bridge }, note: `bridge feed ${new URL(bridge).host}` };
      return { posts, source: { kind: "bridge", pageName, url: bridge }, note: `bridge feed answered but contained no items` };
    }
    // Bridge unreachable — fall through to the direct attempt.
  }
  const html = await fetchText(`https://mbasic.facebook.com/${username}`, timeoutMs);
  const posts = html ? parseFacebookHtml(html, username) : [];
  const note = !html
    ? "Facebook did not answer (blocked or unreachable from this host)"
    : posts.length === 0
      ? "Facebook answered with a login wall or markup we could not read — configure FB_RSS_BRIDGES for this page"
      : "public mobile page";
  return { posts, source: { kind: "direct", pageName, username }, note };
}
