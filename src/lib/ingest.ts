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

// Pure classification/parsing lives in ./ingest-core (alias-free, unit-tested); re-exported here so
// existing callers keep their imports working.
export { normalizeUrl, categorize, alertLevelFor, decode, isJunkTitle, parseFeed, placeFromText } from "./ingest-core";
export type { ParsedItem } from "./ingest-core";
import { categorize, alertLevelFor, decode, normalizeUrl, parseFeed, placeFromText, type ParsedItem } from "./ingest-core";
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
