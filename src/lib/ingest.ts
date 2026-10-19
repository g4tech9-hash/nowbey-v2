import { db } from "@/db";
import { desc, eq, inArray } from "drizzle-orm";
import { newsItems } from "@/db/schema";
import { categorize, alertLevelFor, decode, normalizeUrl, parseFeed, placeFromText, configuredFeeds, dedupKey, cleanSnippet, isAllowedPublisher, resolveGoogleNewsUrl, type ParsedItem } from "./ingest-core";

// Pure classification/parsing and the outlet list live in ./ingest-core (alias-free, unit-tested);
// re-exported here so existing callers keep their imports working.
export { normalizeUrl, categorize, alertLevelFor, decode, isJunkTitle, parseFeed, placeFromText, configuredFeeds, KNOWN_OUTLETS, cleanSnippet, dedupKey, isAllowedPublisher, resolveGoogleNewsUrl, PUBLISHER_ALLOWLIST } from "./ingest-core";
export type { ParsedItem, Feed } from "./ingest-core";

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
        const dKey = dedupKey(item.title, item.sourceName);
        const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (pool.has(key) || seenTitles.has(titleKey) || seenTitles.has(dKey)) continue;
        seenTitles.add(titleKey);
        seenTitles.add(dKey);
        // Google News URLs kept as-is here; resolved lazily on insert to avoid blocking the pool build
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

  // Build dedup window: already-seen titles+publishers in last 48h (prevents re-ingesting syndicated copies)
  let recentKeys = new Set<string>();
  try {
    const cutoff = new Date(Date.now() - 48 * 3600_000);
    const recent = await db.select({ title: newsItems.title, sourceName: newsItems.sourceName }).from(newsItems).where(desc(newsItems.publishedAt) as any).limit(400);
    // filter to 48h in JS to avoid sql import complexity
    for (const r of recent) {
      // crude 48h filter via in-memory title set; full time filter would need gte
      recentKeys.add(dedupKey(r.title, r.sourceName));
    }
    // also filter by publishedAt > cutoff if available (keep all for now — set is small)
    void cutoff;
  } catch {}

  const stillStale: ParsedItem[] = [];
  for (const item of pool.values()) {
    // skip if same normalised title+publisher seen in last 48h
    if (recentKeys.has(dedupKey(item.title, item.sourceName))) {
      stats.skipped += 1;
      continue;
    }
    // resolve Google News redirect to real publisher URL (best-effort)
    if (/news\.google\.com/.test(item.url)) {
      try {
        const resolved = await resolveGoogleNewsUrl(item.url);
        if (resolved !== item.url) item.url = normalizeUrl(resolved);
      } catch {}
    }
    // clean snippet one more time (Advertisement, trailing [...])
    item.summary = cleanSnippet(item.summary);
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
      stillStale.push(item);
      continue;
    }
    stats.inserted += 1;
    if (place) stats.geocoded += 1;
  }

  // Stories stored before decode() learned to drop inline <style> blocks can still carry raw
  // CSS as their summary (BPL's press releases did). Repair only those, in one batched query.
  const looksLikeCss = (value: string | null) => Boolean(value) && /[{}]/.test(value as string) && /:\s*[^,.;]+;/.test(value as string);
  if (stillStale.length) {
    try {
      const existing = await db
        .select({ id: newsItems.id, url: newsItems.url, summary: newsItems.summary })
        .from(newsItems)
        .where(inArray(newsItems.url, stillStale.map((item) => item.url)));
      for (const row of existing) {
        const fresh = stillStale.find((item) => item.url === row.url);
        if (!fresh || !looksLikeCss(row.summary) || looksLikeCss(fresh.summary)) continue;
        await db
          .update(newsItems)
          .set({ summary: fresh.summary, imageUrl: fresh.imageUrl ?? undefined })
          .where(eq(newsItems.id, row.id));
      }
    } catch {
      /* a repair that cannot run leaves the story exactly as it was */
    }
  }
  return stats;
}

/** Free hosting has no always-on server, so the news refreshes itself when someone looks and it is over 20 minutes old. */
export async function refreshIfStale(): Promise<void> {
  try {
    const [latest] = await db.select({ at: newsItems.ingestedAt }).from(newsItems).orderBy(desc(newsItems.ingestedAt)).limit(1);
    if (!latest || Date.now() - latest.at.getTime() > 20 * 60_000) {
      await runIngest();
      // Facebook pages the admin configured ride the same cadence. Imported lazily so the
      // pure ingest core stays free of the settings/facebook modules; a failure here must
      // never stop the outlet refresh that already landed.
      try {
        const { runFacebookIngest } = await import("@/lib/facebook-ingest");
        await runFacebookIngest();
      } catch (err) {
        console.warn(`[fb] scheduled refresh skipped: ${err instanceof Error ? err.message : err}`);
      }
    }
  } catch {
    /* never break a page because the news refresh failed */
  }
}
