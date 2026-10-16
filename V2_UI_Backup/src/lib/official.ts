/*
 * Official bulletins as live map pins — the "official gov feed integration" launch item.
 * The US National Hurricane Center publishes free RSS (Atlantic outlook + a feed per active
 * cyclone). When a bulletin concerns The Bahamas, it becomes an "official" incident pin so the
 * map always carries the latest storm picture without waiting for a human to post it.
 *
 * Design rules:
 * - Dedup on the bulletin URL; a new advisory for the same named system resolves the previous
 *   pin, so the map shows current status, never a pile of old ones.
 * - Watches and warnings (severity >= 3) also fire email + push alerts at import time:
 *   safety-critical information is never paywalled and never waits for an editor wake-up.
 * - Extra sources can be added with OFFICIAL_EXTRA_FEEDS="Name|https://…/rss.xml" (same NAME|URL
 *   convention as NEWS_FEEDS) when a Bahamian agency gets a real feed.
 */
import { and, eq, gt, ilike } from "drizzle-orm";
import { db } from "@/db";
import { incidents, siteSettings } from "@/db/schema";
import { dispatchIncidentAlerts } from "@/lib/alerts";
import { categorize, normalizeUrl, parseFeed, placeFromText, type ParsedItem } from "@/lib/ingest";
import { BAHAMAS_CENTER, nearestParish, nowMs } from "@/lib/geo";
import { dispatchIncidentPush } from "@/lib/push";
import type { CategoryKey } from "@/lib/geo";

const STALE_AFTER_MS = 15 * 60_000;
const FRESH_WINDOW_MS = 72 * 3600_000;

const NHC_FEEDS = [
  { name: "US National Hurricane Center (Atlantic outlook)", url: "https://www.nhc.noaa.gov/index-at.xml" },
  // One feed slot per active cyclone; empty (no <item>) while the basin is quiet — that is fine, parseFeed rejects them.
  ...[1, 2, 3, 4, 5].map((n) => ({ name: "US National Hurricane Center (active storm)", url: `https://www.nhc.noaa.gov/nhc_at${n}.xml` })),
];

export type OfficialFeed = { name: string; url: string };

/** Built-in feeds plus any operator-added ones. Extra feeds are treated as Bahamas-relevant by definition. */
export function officialFeeds(): { feed: OfficialFeed; alwaysRelevant: boolean }[] {
  const raw = process.env.OFFICIAL_EXTRA_FEEDS ?? "";
  const extra = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const i = entry.indexOf("|");
      return { name: (i < 0 ? "" : entry.slice(0, i)).trim(), url: (i < 0 ? entry : entry.slice(i + 1)).trim() };
    })
    .filter((f) => f.url.startsWith("http"))
    .map((f) => ({ feed: { ...f, name: f.name || new URL(f.url).hostname }, alwaysRelevant: true }));
  return [...NHC_FEEDS.map((feed) => ({ feed, alwaysRelevant: false })), ...extra];
}

/** "…AT 22.3N 74.1W…" / "at 22.3°N, 74.1°W" → coordinates, or null. */
function stormCoords(text: string): { lat: number; lng: number } | null {
  const m = text.match(/(\d{1,2}(?:\.\d+)?)\s*[°\s]*([NS])\s*[,\s]\s*(\d{1,3}(?:\.\d+)?)\s*[°\s]*([WE])\b/i);
  if (!m) return null;
  const lat = (m[2].toUpperCase() === "S" ? -1 : 1) * Number(m[1]);
  const lng = (m[4].toUpperCase() === "W" ? -1 : 1) * Number(m[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// A wide gate around the islands: systems still a day or two out also matter here.
const NEAR = { latMin: 17.5, latMax: 29.5, lngMin: -81.5, lngMax: -70.5 };

/** "Hurricane Melissa" / "Tropical Storm Jerry" etc, used to retire the previous pin of the same system. */
function systemTag(title: string): string | null {
  const m = title.match(/\b(hurricane|tropical storm|tropical depression|subtropical storm|subtropical depression|post-tropical cyclone|potential tropical cyclone)\s+([A-Z][a-z]+)\b/);
  if (!m) return null;
  const kind = m[1].replace(/\b\w/g, (c) => c.toUpperCase());
  return `${kind} ${m[2]}`;
}

function severityFor(text: string): number {
  if (/\bwarning\b/i.test(text)) return 4;
  if (/\bwatch\b/i.test(text)) return 3;
  return 2;
}

type Decision = { lat: number; lng: number; parish: string; street: string | null; relevant: boolean };

/** Is this bulletin about us, and where does its pin go? */
function decide(item: ParsedItem, alwaysRelevant: boolean): Decision {
  const text = `${item.title} ${item.summary}`;
  const place = placeFromText(text);
  const coords = stormCoords(text);
  const mentions = /\bbahamas\b/i.test(text);
  const relevant = alwaysRelevant || Boolean(place) || mentions || Boolean(coords && coords.lat >= NEAR.latMin && coords.lat <= NEAR.latMax && coords.lng >= NEAR.lngMin && coords.lng <= NEAR.lngMax);
  const lat = coords?.lat ?? place?.lat ?? BAHAMAS_CENTER[0];
  const lng = coords?.lng ?? place?.lng ?? BAHAMAS_CENTER[1];
  return {
    relevant,
    lat,
    lng,
    parish: place?.parish ?? nearestParish(lat, lng),
    street: place?.street ?? (coords ? `${Math.abs(lat).toFixed(1)}°N ${Math.abs(lng).toFixed(1)}°W` : null),
  };
}

export type OfficialStats = {
  feedsOk: string[];
  feedsFailed: { name: string; reason: string }[];
  relevant: number;
  imported: number;
  resolvedOld: number;
  alerted: number;
  throttled?: boolean;
};

const LAST_RUN_KEY = "official:lastRun";

async function lastRunAt(): Promise<number> {
  try {
    const [row] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, LAST_RUN_KEY)).limit(1);
    return row ? Number(row.value) : 0;
  } catch {
    return 0;
  }
}

export async function markRun(at: number): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key: LAST_RUN_KEY, value: String(at) })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: String(at), updatedAt: new Date() } });
}

export async function runOfficialIngest(): Promise<OfficialStats> {
  const stats: OfficialStats = { feedsOk: [], feedsFailed: [], relevant: 0, imported: 0, resolvedOld: 0, alerted: 0 };
  const freshAfter = nowMs() - FRESH_WINDOW_MS;
  const base = (process.env.APP_URL ?? "").trim().replace(/\/+$/, "") || null;

  for (const { feed, alwaysRelevant } of officialFeeds()) {
    let items: ParsedItem[] = [];
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NowBeyBot/1.0; +https://nowbey-v2.vercel.app)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
        cache: "no-store",
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      items = parseFeed(await res.text(), feed.name).slice(0, 8);
      stats.feedsOk.push(feed.name);
    } catch (err) {
      // A quiet basin means empty or missing feeds; only the stats page notices.
      stats.feedsFailed.push({ name: feed.name, reason: err instanceof Error ? err.message : String(err) });
      continue;
    }

    for (const item of items) {
      if (item.publishedAt.getTime() < freshAfter) continue;
      const where = decide(item, alwaysRelevant);
      if (!where.relevant) continue;
      stats.relevant += 1;

      const url = normalizeUrl(item.url);
      const dupe = await db
        .select({ id: incidents.id })
        .from(incidents)
        .where(and(eq(incidents.sourceKind, "official"), eq(incidents.sourceUrl, url)))
        .limit(1);
      if (dupe.length) continue;

      const text = `${item.title} ${item.summary}`;
      let category: CategoryKey = categorize(text);
      if (category === "notice" || category === "event" || category === "accident") category = "storm";
      const severity = severityFor(text);
      const details = [
        item.summary ? item.summary.slice(0, 900) : "",
        "",
        `Imported automatically from the ${feed.name}. This is an official bulletin — follow the instructions of NEMA and the Department of Meteorology.`,
        "For emergencies call 919 / 911 — NowBey is not an emergency service.",
      ]
        .join("\n")
        .trim();

      const [row] = await db
        .insert(incidents)
        .values({
          title: item.title.slice(0, 140),
          details: details.slice(0, 2000) || null,
          category,
          severity,
          lat: where.lat,
          lng: where.lng,
          address: placeFromText(text)?.street ?? null,
          street: where.street,
          parish: where.parish,
          status: "active",
          confirmations: 0,
          sourceKind: "official",
          sourceName: feed.name,
          sourceUrl: url,
          authorHandle: "official",
          anonymous: false,
        })
        .returning();
      stats.imported += 1;

      // One live pin per named system: the new advisory retires the old one.
      const tag = systemTag(item.title);
      if (tag && row) {
        const resolved = await db
          .update(incidents)
          .set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(incidents.sourceKind, "official"),
              eq(incidents.status, "active"),
              ilike(incidents.title, `%${tag}%`),
              gt(incidents.createdAt, new Date(nowMs() - 30 * 86_400_000)),
            ),
          )
          .returning({ id: incidents.id });
        stats.resolvedOld += Math.max(0, resolved.filter((r) => r.id !== row.id).length);
      }

      // Watches/warnings alert subscribers and push devices immediately; lower severities stay map-only.
      if (row && severity >= 3 && base) {
        try {
          const mail = await dispatchIncidentAlerts(row, base);
          const push = await dispatchIncidentPush(row, base);
          stats.alerted += mail.sent + push.sent;
        } catch (err) {
          console.error(`[official] alert dispatch failed for ${row.id}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  }
  return stats;
}

let lastCheck = 0;

/** Called from high-traffic reads: refreshes official pins at most every 15 minutes, and never breaks the page. */
export async function refreshOfficialIfStale(): Promise<void> {
  if (nowMs() - lastCheck < 60_000) return;
  lastCheck = nowMs();
  try {
    const ran = await lastRunAt();
    if (nowMs() - ran < STALE_AFTER_MS) return;
    await runOfficialIngest();
    await markRun(nowMs());
  } catch (err) {
    console.warn(`[official] refresh skipped: ${err instanceof Error ? err.message : err}`);
  }
}
