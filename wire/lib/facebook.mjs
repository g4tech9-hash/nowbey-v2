/**
 * FACEBOOK PAGE → STRICT RSS 2.0 GENERATOR
 * ---------------------------------------------------------------------------
 * Restored from PRs #37 & #38 and wired into both /api/rss/facebook and the
 * wire / Marco's Alert engines.
 *
 * Layered resolution because Facebook serves 403 / login walls to datacenter IPs:
 *   1. bridge  — if site_settings.fb_bridges, FB_RSS_BRIDGES, or RBPF_FB_RSS_URL
 *                maps the page to an upstream feed (rss.app, fetchrss.com, self-hosted
 *                RSS-Bridge…), fetch and NORMALIZE it into strict RSS 2.0 (resolved
 *                HTML entities, safe CDATA, RFC-822 dates, canonical permalinks,
 *                valid <enclosure url length type>).
 *   2. direct  — otherwise fetch mbasic.facebook.com/<username> best-effort; on a
 *                login wall or 403, emit a valid empty RSS 2.0 feed with a diagnostic
 *                XML comment rather than broken XML.
 */

export const KNOWN_FB_PAGES = {
  mybpl242: 'Bahamas Power and Light',
  rbpfpublicaffairs: 'Royal Bahamas Police Force',
  royalbahamaspoliceforce: 'Royal Bahamas Police Force',
  rbpf242: 'Royal Bahamas Police Force',
};

export const RBPF_HANDLES = new Set([
  'rbpfpublicaffairs',
  'royalbahamaspoliceforce',
  'rbpf242',
]);

export const DEFAULT_FB_PAGE = 'mybpl242';

const RESERVED_FB_PATHS = new Set([
  'login', 'watch', 'groups', 'events', 'marketplace', 'gaming', 'help', 'policies',
  'privacy', 'settings', 'reel', 'reels', 'video', 'video.php', 'photo.php', 'photo',
  'story.php', 'permalink.php', 'profile.php', 'hashtag', 'search', 'share', 'share.php',
  'pages', 'people', 'public', 'notifications', 'messages', 'friends', 'home', 'reg',
  'recover', 'legal', 'business', 'ads', 'about', 'login.php', 'unsupported',
]);

const FB_HOST_RE = /^(?:(?:www|m|mbasic|web|d|touch)\.)?(?:facebook\.com|fb\.com)$/i;

/**
 * Accepts a public Facebook page link in any reasonable shape or a bare handle.
 * Returns the canonical page handle, or null if not a public page/profile URL.
 */
export function fbUsernameFromUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    let u;
    try {
      u = new URL(raw);
    } catch {
      return null;
    }
    if (!FB_HOST_RE.test(u.hostname)) return null;
    path = u.pathname;
    const idParam = u.searchParams.get('id');
    if (/^\/profile\.php$/i.test(path) && idParam && /^\d+$/.test(idParam)) {
      return `profile-${idParam}`;
    }
  }
  const seg = path.split('?')[0].split('#')[0].split('/').filter(Boolean)[0] ?? '';
  if (!/^[A-Za-z0-9.\-_]{2,80}$/.test(seg)) return null;
  if (RESERVED_FB_PATHS.has(seg.toLowerCase())) return null;
  return seg;
}

/** Display name for a page: FB_PAGES env ("user|Name,…"), then KNOWN_FB_PAGES, then handle. */
export function fbPageName(username, env = process.env) {
  const extra = env?.FB_PAGES ?? '';
  for (const entry of extra.split(',')) {
    const i = entry.indexOf('|');
    if (i > 0 && entry.slice(0, i).trim().toLowerCase() === String(username).toLowerCase()) {
      return entry.slice(i + 1).trim() || username;
    }
  }
  return KNOWN_FB_PAGES[String(username).toLowerCase()] ?? `${username} (Facebook)`;
}

/**
 * True for hosts a server must never fetch on an admin's behalf: loopback, LAN ranges,
 * link-local and internal-only names (SSRF guard).
 */
export function isPrivateHostname(host) {
  const h = String(host ?? '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  ) {
    return true;
  }
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31)
    );
  }
  if (h.includes(':')) {
    if (h === '::1' || /^f[cd]/.test(h) || h.startsWith('fe80')) return true;
  }
  return false;
}

function isSafeExternalHttpUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (isPrivateHostname(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Bridge feed URL for a page:
 *   1. Admin-saved bridge from site_settings.fb_bridges
 *   2. FB_RSS_BRIDGES env ("user|https://…/rss.xml,…")
 *   3. RBPF_FB_RSS_URL env when username is an RBPF handle
 */
export function fbBridgeUrl(username, env = process.env, adminBridges = {}) {
  const key = String(username ?? '').trim();
  if (!key) return null;

  const directAdmin = (adminBridges[key] ?? adminBridges[key.toLowerCase()] ?? '').trim();
  if (/^https?:\/\//i.test(directAdmin) && isSafeExternalHttpUrl(directAdmin)) {
    return directAdmin;
  }

  const raw = env?.FB_RSS_BRIDGES ?? '';
  for (const entry of raw.split(',')) {
    const i = entry.indexOf('|');
    if (i > 0 && entry.slice(0, i).trim().toLowerCase() === key.toLowerCase()) {
      const url = entry.slice(i + 1).trim();
      if (/^https?:\/\//i.test(url) && isSafeExternalHttpUrl(url)) return url;
    }
  }

  if (RBPF_HANDLES.has(key.toLowerCase())) {
    const rbpfUrl = (env?.RBPF_FB_RSS_URL ?? '').trim();
    if (/^https?:\/\//i.test(rbpfUrl) && isSafeExternalHttpUrl(rbpfUrl)) return rbpfUrl;
  }

  return null;
}

/** Parse site_settings.fb_bridges ("user|https://…/rss.xml,…"). */
export function fbBridgesFromValue(raw) {
  const out = {};
  for (const entry of String(raw ?? '').split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const i = trimmed.indexOf('|');
    if (i <= 0) continue;
    const username = trimmed.slice(0, i).trim();
    const url = trimmed.slice(i + 1).trim();
    if (!/^[A-Za-z0-9.\-_]{2,80}$/.test(username)) continue;
    if (!/^https?:\/\/[^\s]+$/i.test(url)) continue;
    out[username] = url.slice(0, 600);
  }
  return out;
}

/** Serialize bridge map back into "user|url,user|url". */
export function fbBridgesToValue(bridges) {
  return Object.entries(bridges || {})
    .filter(([, url]) => /^https?:\/\//i.test(String(url)))
    .map(([username, url]) => `${username}|${url}`)
    .join(',');
}

/** Parse site_settings.fb_pages ("https://facebook.com/mybpl242/|BPL, rbpfpublicaffairs|RBPF"). */
export function fbPagesFromValue(raw, env = process.env) {
  const out = new Map();
  for (const entry of String(raw ?? '').split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const pipe = trimmed.indexOf('|');
    const givenName = pipe > 0 ? trimmed.slice(pipe + 1).trim() : '';
    const username = fbUsernameFromUrl(pipe > 0 ? trimmed.slice(0, pipe) : trimmed);
    if (!username) continue;
    const lower = username.toLowerCase();
    if (!out.has(lower)) {
      out.set(lower, { username, pageName: givenName || fbPageName(username, env) });
    } else if (givenName) {
      out.get(lower).pageName = givenName;
    }
  }
  return [...out.values()];
}

/* ───────────────────────── text & XML helpers ───────────────────────── */

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '\u2019',
  lsquo: '\u2018',
  ldquo: '\u201c',
  rdquo: '\u201d',
  hellip: '\u2026',
  ndash: '\u2013',
  mdash: '\u2014',
  middot: '·',
};

function safeChar(code) {
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
}

/** Resolve HTML entities and strip tags in two passes so double-escaped HTML decodes cleanly. */
export function decodeFbText(input) {
  let out = String(input ?? '');
  for (let pass = 0; pass < 2; pass += 1) {
    out = out
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
      .replace(/&#(\d+);/gi, (_, n) => safeChar(Number(n)))
      .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
  }
  return out
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function escapeXml(input) {
  return String(input ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(input) {
  return `<![CDATA[${String(input ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function rfc822(date) {
  const d = date instanceof Date ? date : new Date(date);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (x) => String(x).padStart(2, '0');
  return `${days[d.getUTCDay()]}, ${p(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

function mimeForImage(url) {
  if (/\.png(\?|$)/i.test(url)) return 'image/png';
  if (/\.webp(\?|$)/i.test(url)) return 'image/webp';
  if (/\.gif(\?|$)/i.test(url)) return 'image/gif';
  return 'image/jpeg';
}

/** Feed title: first non-empty line, never single-word, max ~120 chars. */
export function titleForPost(post, pageName) {
  const firstLine = (String(post?.text ?? '').split('\n').find((l) => l.trim().length > 0) ?? '').trim();
  const base = firstLine || (post?.imageUrl ? `${pageName} posted a photo` : `${pageName} posted an update`);
  const budget = Math.max(40, 116 - String(pageName).length);
  const clipped = base.length > budget ? `${base.slice(0, budget - 1).replace(/\s+\S*$/, '')}…` : base;
  const words = clipped.replace(/[^a-z0-9]+/gi, ' ').trim().split(/\s+/).filter(Boolean).length;
  return words < 2 ? `${clipped} — ${pageName}` : clipped;
}

/* ───────────────────────── direct (mbasic HTML) parsing ───────────────────────── */

export function parseFacebookHtml(html, username) {
  if (!html) return [];
  const now = new Date();
  const marks = [
    ...String(html).matchAll(
      /(?:story|permalink)\.php\?story_fbid=(\d+)(?:&amp;id=(\d+))?|\/([A-Za-z0-9.\-_]+)\/posts\/(pfbid[\w-]+|\d+)/g,
    ),
  ];
  if (marks.length === 0) return [];

  const posts = [];
  const seen = new Set();
  for (let i = 0; i < marks.length; i += 1) {
    const m = marks[i];
    const start = i === 0 ? Math.max(0, m.index - 2500) : marks[i - 1].index + marks[i - 1][0].length;
    const anchorEnd = html.indexOf('</a>', m.index);
    const end = anchorEnd >= 0 && anchorEnd < m.index + 2000 ? anchorEnd + 4 : m.index + m[0].length;
    const chunk = html.slice(start, end);
    const storyId = m[1] ?? m[4] ?? null;
    const pageId = m[2] ?? null;
    if (!storyId || seen.has(storyId)) continue;
    seen.add(storyId);

    const url =
      m[4] && username && !String(username).startsWith('profile-')
        ? `https://www.facebook.com/${username}/posts/${m[4]}`
        : pageId
          ? `https://www.facebook.com/permalink.php?story_fbid=${storyId}&id=${pageId}`
          : `https://www.facebook.com/${username}/posts/${storyId}`;

    const textDiv =
      chunk.match(/<div[^>]*class="[^"]*(?:userContent|_5pbx)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
      chunk.match(/<div[^>]*data-ft[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
      '';
    let text = decodeFbText(textDiv);
    text = text
      .replace(/^\s*(Full Story|Like\s*\d*|Comment\s*\d*|Share\s*\d*|View feedback|See Translation)\b/gi, '')
      .replace(/\b(Like|Comment|Share|Full Story)\s*\d*\s*(?:Like|Comment|Share|Full Story\s*\d*)*$/gi, '')
      .trim();

    const photoAnchor = chunk.match(/<a[^>]*href="[^"]*photo\.php[^"]*"[^>]*>\s*<img[^>]*src="(https?:\/\/[^"]+)"/i)?.[1];
    const cdnImg = chunk.match(/<img[^>]*src="(https?:\/\/[^"]*(?:scontent|fbcdn)[^"]*)"/i)?.[1];
    const imageUrl = (photoAnchor ?? cdnImg) ? decodeFbText(photoAnchor ?? cdnImg) : null;

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

/* ───────────────────────── bridge feed normalization ───────────────────────── */

export function parseBridgeFeed(xml, _username) {
  if (!xml) return [];
  const now = new Date();
  const chunks = String(xml).match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g) ?? [];
  const out = [];
  for (const chunk of chunks) {
    const raw = (tag) => chunk.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] ?? '';
    const grab = (tag) => decodeFbText(raw(tag).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'));
    const title = grab('title');
    const rawBody = raw('content:encoded') || raw('content') || raw('description') || raw('summary') || '';
    const bodyHtml = rawBody.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    const body = decodeFbText(bodyHtml);
    const link =
      grab('link') ||
      chunk.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1] ||
      chunk.match(/<link[^>]*href="([^"]+)"/i)?.[1] ||
      grab('guid') ||
      '';
    if (!/^https?:\/\//.test(link) && !/^www\./.test(link)) continue;
    const url = link.startsWith('http') ? link : `https://${link}`;
    const dateRaw = grab('pubDate') || grab('dc:date') || grab('published') || grab('updated');
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
      imageUrl: imageUrl && /^https?:\/\//.test(imageUrl) ? decodeFbText(imageUrl) : null,
      publishedAt,
      timeEstimated,
    });
  }
  return out;
}

/* ───────────────────────── strict RSS 2.0 serialization ───────────────────────── */

export function postsToRssXml({
  username,
  pageName,
  posts,
  selfUrl,
  sourceNote,
  now = new Date(),
}) {
  const canonical = String(username).startsWith('profile-')
    ? `https://www.facebook.com/profile.php?id=${String(username).slice('profile-'.length)}`
    : `https://www.facebook.com/${username}/`;
  const lines = [];
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
  if (sourceNote) {
    lines.push(`    <!-- ${escapeXml(sourceNote).replace(/-{2,}/g, '-')} -->`);
  }
  for (const post of (posts || []).slice(0, 40)) {
    lines.push(`    <item>`);
    lines.push(`      <title>${escapeXml(titleForPost(post, pageName))}</title>`);
    lines.push(`      <link>${escapeXml(post.url)}</link>`);
    lines.push(
      `      <guid isPermaLink="${post.url.startsWith('http') && /facebook\.com/.test(post.url) ? 'true' : 'false'}">${escapeXml(post.url)}</guid>`,
    );
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
  return lines.join('\n');
}

/* ───────────────────────── fetch layer ───────────────────────── */

const UA = 'Mozilla/5.0 (compatible; NowBeyBot/1.0; +https://nowbey-v2.vercel.app)';

async function fetchTextSafe(url, timeoutMs, fetchImpl = globalThis.fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a Facebook page to its posts: bridge first (configured, reliable),
 * direct mbasic HTML second (best-effort).
 */
export async function fetchFacebookPosts(
  username,
  env = process.env,
  timeoutMs = 9000,
  adminBridges = {},
  fetchImpl = globalThis.fetch,
) {
  const pageName = fbPageName(username, env);
  const bridge = fbBridgeUrl(username, env, adminBridges);
  if (bridge) {
    const xml = await fetchTextSafe(bridge, timeoutMs, fetchImpl);
    if (xml) {
      const posts = parseBridgeFeed(xml, username);
      if (posts.length) {
        return {
          posts,
          source: { kind: 'bridge', pageName, url: bridge },
          note: `bridge feed ${new URL(bridge).host}`,
        };
      }
      return {
        posts,
        source: { kind: 'bridge', pageName, url: bridge },
        note: 'bridge feed answered but contained no items',
      };
    }
  }
  const html = await fetchTextSafe(`https://mbasic.facebook.com/${username}`, timeoutMs, fetchImpl);
  const posts = html ? parseFacebookHtml(html, username) : [];
  const note = !html
    ? `Facebook did not answer this server (blocked or unreachable) — configure a bridge feed for @${username} via site_settings.fb_bridges or FB_RSS_BRIDGES`
    : posts.length === 0
      ? `Facebook answered with a login wall or markup we could not read — configure a bridge feed for @${username} via site_settings.fb_bridges or FB_RSS_BRIDGES`
      : 'public mobile page';
  return { posts, source: { kind: 'direct', pageName, username }, note };
}

/**
 * Convenience helper used by both GET /api/rss/facebook and the in-process
 * wire/alerts engines: resolves posts and returns normalized RSS 2.0 XML.
 */
export async function fetchFacebookRssXml({
  username,
  pageName: explicitPageName,
  env = process.env,
  timeoutMs = 9000,
  adminBridges = {},
  selfUrl,
  fetchImpl = globalThis.fetch,
}) {
  const resolved = await fetchFacebookPosts(username, env, timeoutMs, adminBridges, fetchImpl);
  const pageName = explicitPageName || resolved.source.pageName;
  const xml = postsToRssXml({
    username,
    pageName,
    posts: resolved.posts,
    selfUrl:
      selfUrl ||
      `https://nowbey-v2.vercel.app/api/rss/facebook?page=${encodeURIComponent(username)}`,
    sourceNote: `source: ${resolved.source.kind}; ${resolved.note}; posts: ${resolved.posts.length}`,
  });
  return { ...resolved, pageName, xml };
}
