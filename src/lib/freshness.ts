/**
 * FRESHNESS — one function, four bands, one time line.
 *
 * The bug this file fixes: a card said "Live - Confirmed in the last few hours"
 * next to "20h ago", and next to "11 Oct". A news article carried a "Live"
 * badge, and "Nobody has checked it recently" on an article is meaningless —
 * nobody checks an article.
 *
 * So there is now one rule for the whole app:
 *
 *   Live    last confirmed under 2 hours ago
 *   Recent  last confirmed under 24 hours ago
 *   Aging   last confirmed under 72 hours ago
 *   Stale   72 hours or more — muted, folded under "Show older reports", and
 *           left off the default map pins
 *
 * A news story is not "confirmed" by anyone, so it gets its own kind: the only
 * time a story carries is when it was published.
 *
 * Every card shows ONE primary time line, built by `reportTimeLine`:
 *
 *   "Filed 6d ago - last confirmed 20h ago"
 *
 * Never two unlabelled timestamps.
 */

const HOUR = 60 * 60 * 1000;

/** What kind of thing is being dated. A story is published; a report is confirmed. */
export type FreshnessKind = "report" | "news";

export type FreshnessBand = "live" | "recent" | "aging" | "stale";

export type Freshness = {
  band: FreshnessBand;
  hoursAgo: number;
  /** The word on the badge. */
  label: string;
  /** The sentence a screen reader and a tooltip read. */
  blurb: string;
  /** True when this is too old to pin on the map by default. */
  isStale: boolean;
};

const BANDS: Record<FreshnessBand, { label: string; blurb: string }> = {
  live: { label: "Live", blurb: "Confirmed in the last two hours" },
  recent: { label: "Recent", blurb: "Confirmed within the last day" },
  aging: { label: "Needs a recheck", blurb: "Nobody has confirmed this in a few days" },
  stale: { label: "Stale", blurb: "Last confirmed over three days ago" },
};

/** The hours at which a band starts. */
export const FRESHNESS_HOURS = { live: 2, recent: 24, aging: 72 } as const;

export function hoursSince(iso: string | Date | null | undefined, now: number): number {
  if (!iso) return Infinity;
  const t = typeof iso === "string" ? Date.parse(iso) : iso.getTime();
  if (Number.isNaN(t)) return Infinity;
  // Clock skew must never make a report look like it was confirmed in the future.
  return Math.max(0, (now - t) / HOUR);
}

export function bandFor(hoursAgo: number): FreshnessBand {
  if (hoursAgo < FRESHNESS_HOURS.live) return "live";
  if (hoursAgo < FRESHNESS_HOURS.recent) return "recent";
  if (hoursAgo < FRESHNESS_HOURS.aging) return "aging";
  return "stale";
}

/**
 * The one freshness rule.
 *
 * @param lastConfirmedAt when the report was last confirmed, cleared or updated.
 *                         For a story, pass the publication time.
 * @param kind            "report" or "news"
 */
export function getFreshness(
  lastConfirmedAt: string | Date | null | undefined,
  kind: FreshnessKind = "report",
  now: number = Date.now(),
): Freshness {
  const hoursAgo = hoursSince(lastConfirmedAt, now);
  if (!Number.isFinite(hoursAgo)) {
    // No timestamp at all. That is not "fresh" and it is not "stale" — it is
    // unknown, and it reads as needing a recheck rather than as reassuring.
    return { band: "aging", hoursAgo: 0, label: BANDS.aging.label, blurb: "We have no confirmation time for this", isStale: false };
  }
  const band = bandFor(hoursAgo);
  const copy = BANDS[band];
  return {
    band,
    hoursAgo,
    label: kind === "news" ? "Published" : copy.label,
    blurb: kind === "news" ? `Published ${ageLabel(hoursAgo)}` : copy.blurb,
    isStale: band === "stale",
  };
}

/** Plain-language age, for labels: "5 min ago", "3 h ago", "2 days ago". */
export function ageLabel(hoursAgo: number): string {
  if (hoursAgo < 1) return `${Math.max(1, Math.round(hoursAgo * 60))} min ago`;
  if (hoursAgo < 48) return `${Math.round(hoursAgo)} h ago`;
  return `${Math.round(hoursAgo / 24)} days ago`;
}

/**
 * The single time line a report card shows. One line, two labelled times at
 * most, and the second half is dropped when it would repeat the first.
 */
export function reportTimeLine(
  input: { createdAt: string | Date; lastConfirmedAt?: string | Date | null },
  now: number = Date.now(),
): string {
  const filed = ageLabel(hoursSince(input.createdAt, now));
  const confirmed = input.lastConfirmedAt ? ageLabel(hoursSince(input.lastConfirmedAt, now)) : null;
  if (!confirmed) return `Filed ${filed}`;
  if (confirmed === filed) return `Filed ${filed}`;
  return `Filed ${filed} · last confirmed ${confirmed}`;
}

/** The single time line a news card shows. A story is published; that is all. */
export function publishedTimeLine(publishedAt: string | Date, now: number = Date.now()): string {
  return `Published ${ageLabel(hoursSince(publishedAt, now))}`;
}

/**
 * Reports old enough to be left off the default map pins. They are never
 * deleted — the feed still shows them, folded under "Show older reports".
 */
export function isStaleForPins(lastConfirmedAt: string | Date | null | undefined, now: number = Date.now()): boolean {
  return getFreshness(lastConfirmedAt, "report", now).isStale;
}
