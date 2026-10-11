import { db } from "@/db";
import { desc } from "drizzle-orm";
import { newsItems } from "@/db/schema";
import { GAZETTEER, PARISHES, type CategoryKey } from "@/lib/geo";

export type Feed = { name: string; url: string; /** Used to find the outlet through Google News if its own feed does not answer. */ domain?: string };

/*
 * Bahamian outlets. Each is tried through its own feed first. If that feed is down or blocks us, the same
 * outlet is found through Google News (a "site:" search), so one broken feed does not silence a newspaper.
 * Anything that still fails is listed in the ingest stats, never hidden.
 */
export const KNOWN_OUTLETS: Feed[] = [
  { name: "Eyewitness News", url: "https://ewnews.com/feed", domain: "ewnews.com" },
  { name: "Tribune 242", url: "https://www.tribune242.com/feed", domain: "tribune242.com" },
  { name: "The Nassau Guardian", url: "https://thenassauguardian.com/feed", domain: "thenassauguardian.com" },
  { name: "Our News", url: "https://ournews.bs/feed", domain: "ournews.bs" },
  { name: "Bahamas Press", url: "https://www.bahamaspress.com/feed", domain: "bahamaspress.com" },
  { name: "Bahamas Weekly", url: "https://www.thebahamasweekly.com/feed", domain: "thebahamasweekly.com" },
  { name: "Loop Bahamas", url: "https://loopnews.com/bahamas/feed", domain: "loopnews.com" },
  { name: "ZNS Bahamas", url: "https://znsbahamas.com/feed", domain: "znsbahamas.com" },
  { name: "Bahamas Information Services", url: "https://www.bahamas.gov.bs/feed", domain: "bahamas.gov.bs" },
  { name: "Bahamas Investor", url: "https://www.bahamasinvestor.com/feed", domain: "bahamasinvestor.com" },
  { name: "Bahamas Local", url: "https://bahamaslocal.com/feed", domain: "bahamaslocal.com" },
];

/**
 * All feeds in use: the outlets above plus anything in NEWS_FEEDS. Facebook pages (242 In The Know, The Bahamas
 * Times) cannot be read directly, since Facebook blocks it; give a page's RSS address from a service such as
 * rss.app or fetchrss.com instead:
 *   NEWS_FEEDS="242 In The Know|https://rss.app/feeds/xxxx.xml,The Bahamas Times|https://rss.app/feeds/yyyy.xml"
 */
export function configuredFeeds(): Feed[] {
  const raw = process.env.NEWS_FEEDS ?? "";
  const extra = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const i = entry.indexOf("|");
      return { name: (i < 0 ? "" : entry.slice(0, i)).trim(), url: (i < 0 ? entry : entry.slice(i + 1)).trim() };
    })
    .filter((f) => f.url.startsWith("http"))
    .map((f) => ({ ...f, name: f.name || new URL(f.url).hostname }));
  const have = new Set(extra.map((f) => f.url));
  return [...KNOWN_OUTLETS.filter((f) => !have.has(f.url)), ...extra];
}

/** The same story reached by two links (tracking tags, trailing slash, http/https) must be stored once. */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_|ref$|oc$)/i.test(k)) u.searchParams.delete(k);
    u.hostname = u.hostname.replace(/^www\./, "");
    u.protocol = "https:";
    return u.toString().replace(/\/+$/, "");
  } catch {
    return raw;
  }
}

/*
 * Word boundaries matter: a bare /road/ also matches "broadcast", /gun/ matches "begun",
 * /burn/ matches "Burnside". Each rule below only fires on whole words.
 */
const CATEGORY_RULES: [CategoryKey, RegExp][] = [
  ["storm", /\b(?:hurricane|tropical (?:storm|depression)|storm surge|nor.?easter|cyclone|squall)\b/i],
  ["flood", /\b(?:flood(?:s|ed|ing)?|high water|drainage|washover|standing water)\b/i],
  ["power", /\b(?:outages?|blackouts?|power (?:cut|failure|line|outage)s?|electricity|generators?|load shed(?:ding)?)\b/i],
  ["water", /\b(?:potable|water (?:main|supply|shortage)|boil (?:water )?notice)\b/i],
  ["crime", /\b(?:murder(?:ed)?|shoot(?:ing|out)?|shot|guns?|gunmen|gunman|robber(?:y|ies)|burglar(?:y|ies|s)?|theft|stolen|assault(?:ed)?|armed|carjack(?:ing|ed)?)\b/i],
  ["marine", /\b(?:vessel|boat|capsiz(?:ed|ing)|grounding|coast guard|marina|shipwreck|ferry|ferries)\b/i],
  ["fire", /\b(?:fire|fires|blaze|wildfire|smoke)\b/i],
  ["health", /\b(?:ministry of health|dengue|cholera|medical|ambulance|rescue[ds]?|hospital)\b/i],
  ["road", /\b(?:roads?|potholes?|bridges?|traffic|accident|collision|road closure|repaving)\b/i],
  ["event", /\b(?:junkanoo|regatta|festival|concert|parade|fundrais(?:er|ing))\b/i],
];

/*
 * "high" is for things people must act on (warnings, evacuations, emergencies). "watch" is a category that
 * affects people (crime, flooding, power, fire) but is only worth an editor's look. Nothing is emailed
 * until an editor presses Send alert.
 */
const HIGH_ALERT = /\b(?:hurricane|tropical storm|storm (?:watch|warning)|evacuat\w*|shelters? (?:open|opened)|curfew|lockdown|boil[- ]water|state of emergency|tsunami|flash flood\w*|amber alert|missing (?:child|girl|boy|teen|person)|active shooter|power outage)\b/i;
const WATCH_CATEGORIES: CategoryKey[] = ["storm", "flood", "fire", "marine", "power", "water", "crime", "health"];

export function alertLevelFor(input: string, category: CategoryKey): "high" | "watch" | "none" {
  if (HIGH_ALERT.test(input)) return "high";
  return WATCH_CATEGORIES.includes(category) ? "watch" : "none";
}

export function categorize(input: string): CategoryKey {
  for (const [key, re] of CATEGORY_RULES) if (re.test(input)) return key;
  return "notice";
}

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "\u2019",
  lsquo: "\u2018",
  ldquo: "\u201c",
  rdquo: "\u201d",
  hellip: "\u2026",
  ndash: "\u2013",
  mdash: "\u2014",
};

function decode(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => safeChar(Number(n)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function safeChar(code: number): string {
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

type ParsedItem = {
  title: string;
  url: string;
  summary: string;
  publishedAt: Date;
  sourceName: string;
  imageUrl: string | null;
};

export function parseFeed(xml: string, sourceName: string): ParsedItem[] {
  const chunks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g) ?? [];
  const out: ParsedItem[] = [];
  for (const chunk of chunks) {
    const raw = (tag: string) => chunk.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "";
    const grab = (tag: string) => decode(raw(tag));
    const title = grab("title");
    // RSS has <link>url</link>; Atom has <link href="url"/>.
    const link =
      grab("link") ||
      chunk.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1] ||
      chunk.match(/<link[^>]*href="([^"]+)"/i)?.[1] ||
      grab("guid") ||
      "";
    if (!title || !/^https?:\/\//.test(link)) continue;
    const dateRaw = grab("pubDate") || grab("dc:date") || grab("published") || grab("updated");
    let publishedAt = dateRaw ? new Date(dateRaw) : new Date();
    // A missing or nonsense date, or one in the future, would pin a story to the top forever.
    if (Number.isNaN(publishedAt.getTime()) || publishedAt.getTime() > Date.now() + 3600_000) publishedAt = new Date();
    // The full body (content:encoded) often has text and a picture when <description> is empty.
    const body = raw("content:encoded") || raw("content") || raw("description") || raw("summary");
    const bodyHtml = body.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
    const imageMatch =
      chunk.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image[^"]*"/i)?.[1] ??
      chunk.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i)?.[1] ??
      bodyHtml.match(/<img[^>]*\ssrc=["']([^"']+)["']/i)?.[1] ??
      null;
    const gSource = grab("source");
    out.push({
      title: title.replace(gSource ? new RegExp(`\\s+[-\u2013|]\\s+${escapeRe(gSource)}$`) : /$^/, "").slice(0, 300),
      url: link.slice(0, 600),
      summary: decode(bodyHtml).slice(0, 480),
      publishedAt,
      sourceName: gSource && /news\.google\.com/.test(link) ? gSource : sourceName,
      imageUrl: imageMatch && /^https?:\/\//.test(imageMatch) ? imageMatch : null,
    });
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word match, so "andros" does not match "Alexandros" and "abaco" does not match "tabaco". */
function hasWord(hay: string, term: string): boolean {
  return new RegExp(`(?<![a-z0-9])${escapeRe(term)}(?![a-z0-9])`).test(hay);
}

/*
 * Each place can also be found by the part of its name before the comma ("Marsh Harbour" in
 * "Marsh Harbour, Abaco"), since headlines rarely write the island. Names shared by two places,
 * like "George Town", are left out on purpose so a story is never pinned to the wrong island.
 */
type Place = (typeof GAZETTEER)[number];
const headOf = (p: Place) => p.name.split(",")[0].trim().toLowerCase();
const HEAD_COUNTS = new Map<string, number>();
for (const g of GAZETTEER) HEAD_COUNTS.set(headOf(g), (HEAD_COUNTS.get(headOf(g)) ?? 0) + 1);

function termsFor(place: Place): string[] {
  const terms = [place.name.toLowerCase(), ...place.aliases.map((a) => a.toLowerCase())];
  if (HEAD_COUNTS.get(headOf(place)) === 1) terms.push(headOf(place));
  return terms;
}

/** Cheap, offline geocoding: match street / island names inside the headline text. */
export function placeFromText(input: string): { lat: number; lng: number; parish: string; street: string } | null {
  const hay = input.toLowerCase();
  let best: { lat: number; lng: number; parish: string; street: string; score: number } | null = null;
  for (const place of GAZETTEER) {
    const terms = termsFor(place);
    for (const term of terms) {
      if (term.length < 4) continue;
      if (hasWord(hay, term)) {
        const score = term.length + (hasWord(hay, place.street.toLowerCase()) ? 6 : 0);
        if (!best || score > best.score) best = { ...place, score };
      }
    }
  }
  if (best) {
    const { score, ...rest } = best;
    void score;
    return rest;
  }
  for (const parish of PARISHES) {
    if (hasWord(hay, parish.toLowerCase())) {
      const anchor = GAZETTEER.find((g) => g.parish === parish);
      if (anchor) return { lat: anchor.lat, lng: anchor.lng, parish: anchor.parish, street: anchor.parish };
    }
  }
  return null;
}

export type IngestStats = {
  ok: string[];
  failed: { name: string; reason: string }[];
  inserted: number;
  skipped: number;
  geocoded: number;
  ranAt: string;
  throttled?: boolean;
};

// Two people tapping "Refresh" together should not fetch the outlets twice.
let lastRun = 0;
const MIN_GAP_MS = 60_000;

export async function runIngest(opts: { limit?: number } = {}): Promise<IngestStats> {
  const stats: IngestStats = { ok: [], failed: [], inserted: 0, skipped: 0, geocoded: 0, ranAt: new Date().toISOString() };
  if (Date.now() - lastRun < MIN_GAP_MS) return { ...stats, throttled: true };
  lastRun = Date.now();

  const perFeed = Math.min(40, Math.max(1, opts.limit ?? 12));
  const pool = new Map<string, ParsedItem>();
  const seenTitles = new Set<string>();

  const fetchXml = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NowBeyBot/1.0; +https://nowbey-v2.vercel.app)",
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      if (!/<item[\s>]|<entry[\s>]/.test(xml)) throw new Error("no stories in it (not a feed?)");
      return xml;
    } finally {
      clearTimeout(timer);
    }
  };

  await Promise.all(
    configuredFeeds().map(async (feed) => {
      let items: ParsedItem[] = [];
      let reason = "";
      try {
        items = parseFeed(await fetchXml(feed.url), feed.name);
      } catch (err) {
        reason = err instanceof Error ? err.message : String(err);
      }
      if (!items.length && feed.domain) {
        try {
          const q = encodeURIComponent(`site:${feed.domain} when:3d`);
          items = parseFeed(await fetchXml(`https://news.google.com/rss/search?q=${q}&hl=en-BS&gl=BS&ceid=BS:en`), feed.name);
          if (items.length) reason = "";
          else reason ||= "no stories found";
        } catch (err) {
          reason ||= err instanceof Error ? err.message : String(err);
        }
      }
      if (!items.length) {
        stats.failed.push({ name: feed.name, reason: reason || "no stories found" });
        return;
      }
      stats.ok.push(feed.name);
      for (const item of items.slice(0, perFeed)) {
        const key = normalizeUrl(item.url);
        const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (pool.has(key) || seenTitles.has(titleKey)) continue;
        seenTitles.add(titleKey);
        pool.set(key, { ...item, url: /news\.google\.com/.test(item.url) ? item.url : key });
      }
    }),
  );

  // Where a feed gave no summary or picture, read them from the story page itself (its preview tags), a few per run.
  let looked = 0;
  for (const item of pool.values()) {
    if ((item.summary && item.imageUrl) || looked >= 12 || /news\.google\.com/.test(item.url)) continue;
    looked += 1;
    try {
      const res = await fetch(item.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; NowBeyBot/1.0)" }, signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (!res.ok) continue;
      const html = (await res.text()).slice(0, 60_000);
      const meta = (prop: string) =>
        html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i"))?.[1] ??
        html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i"))?.[1];
      if (!item.summary) item.summary = decode(meta("og:description") ?? meta("description") ?? "").slice(0, 480);
      if (!item.imageUrl) {
        const img = meta("og:image");
        if (img && /^https?:\/\//.test(img)) item.imageUrl = img;
      }
    } catch {
      /* the story is still kept without them */
    }
  }

  for (const item of pool.values()) {
    const text = `${item.title} ${item.summary}`;
    const place = placeFromText(text);
    // The unique URL column makes this safe even if two refreshes run at once.
    const [row] = await db
      .insert(newsItems)
      .values({
        title: item.title,
        summary: item.summary,
        url: item.url,
        sourceName: item.sourceName,
        imageUrl: item.imageUrl,
        parish: place?.parish ?? null,
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        geocoded: Boolean(place),
        category: categorize(text),
        alertLevel: alertLevelFor(text, categorize(text)),
        publishedAt: item.publishedAt,
        review: "approved",
      })
      .onConflictDoNothing()
      .returning({ id: newsItems.id });
    if (!row) {
      stats.skipped += 1;
      continue;
    }
    stats.inserted += 1;
    if (place) stats.geocoded += 1;
  }
  return stats;
}

/** Free hosting has no always-on server, so the news refreshes itself when someone looks and it is over 20 minutes old. */
export async function refreshIfStale(): Promise<void> {
  try {
    const [latest] = await db.select({ at: newsItems.ingestedAt }).from(newsItems).orderBy(desc(newsItems.ingestedAt)).limit(1);
    if (!latest || Date.now() - latest.at.getTime() > 20 * 60_000) await runIngest();
  } catch {
    /* never break a page because the news refresh failed */
  }
}
