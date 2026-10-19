/**
 * ONE freshness function — TRUTH OVER POLISH.
 *
 * Reports and news have different freshness rules:
 * - Reports: how recently neighbours confirmed the situation is still true.
 * - News: when it was published. No "Live/Watching" for news.
 *
 * Bands for reports (based on lastConfirmedAt = updatedAt or last incidentUpdate):
 *   Live     < 2h   — confirmed very recently
 *   Recent   < 24h  — confirmed within a day
 *   Aging    < 72h  — needs a recheck
 *   Stale    > 72h  — muted, collapsed, excluded from default map pins
 */

const HOUR = 60 * 60 * 1000;

export type FreshnessBand = "live" | "recent" | "aging" | "stale";

// Back-compat alias for older callers (e.g., trustFor)
export type Freshness = "current" | "aging" | "stale";

export type FreshnessResult = {
  band: FreshnessBand;
  level: Freshness; // legacy mapping: live/recent → current, aging → aging, stale → stale
  hoursAgo: number;
  label: string;
  isStale: boolean;
};

const BAND_LABEL: Record<FreshnessBand, string> = {
  live: "Live",
  recent: "Recent",
  aging: "Needs a recheck",
  stale: "Stale",
};

function toLevel(band: FreshnessBand): Freshness {
  if (band === "live" || band === "recent") return "current";
  if (band === "aging") return "aging";
  return "stale";
}

/**
 * ONE function — every card, map pin and trust meter reads from here.
 * kind = "report" (default) or "news". News uses "Published X ago" only.
 */
export function getFreshness(
  lastConfirmedAt: string | Date | null | undefined,
  kind: "report" | "news" = "report",
  now: number = Date.now(),
): FreshnessResult {
  if (!lastConfirmedAt) {
    return { band: "stale", level: "stale", hoursAgo: Infinity, label: BAND_LABEL.stale, isStale: true };
  }
  const t = typeof lastConfirmedAt === "string" ? Date.parse(lastConfirmedAt) : lastConfirmedAt.getTime();
  if (Number.isNaN(t)) {
    return { band: "stale", level: "stale", hoursAgo: Infinity, label: BAND_LABEL.stale, isStale: true };
  }
  const hoursAgo = Math.max(0, (now - t) / HOUR);

  // News is simpler: never "Live", just age.
  if (kind === "news") {
    // news bands are display-only; we still return a band for colour
    if (hoursAgo < 24) return { band: "recent", level: "current", hoursAgo, label: `Published ${ageLabel(hoursAgo)}`, isStale: false };
    if (hoursAgo < 72) return { band: "aging", level: "aging", hoursAgo, label: `Published ${ageLabel(hoursAgo)}`, isStale: false };
    return { band: "stale", level: "stale", hoursAgo, label: `Published ${ageLabel(hoursAgo)}`, isStale: true };
  }

  let band: FreshnessBand;
  if (hoursAgo < 2) band = "live";
  else if (hoursAgo < 24) band = "recent";
  else if (hoursAgo < 72) band = "aging";
  else band = "stale";

  return { band, level: toLevel(band), hoursAgo, label: BAND_LABEL[band], isStale: band === "stale" };
}

// Legacy per-category thresholds — kept for backward compat with trustFor and existing tests.
// New code should use getFreshness() which is category-agnostic per spec.
const THRESHOLD_HOURS: Record<string, number> = {
  power: 3, flood: 6, storm: 6, water: 6, road: 24, accident: 6, fire: 6, crime: 12, marine: 12, health: 24, trash: 48, event: 72, notice: 48,
};
const DEFAULT_HOURS = 12;
export function freshnessFor(category: string, updatedAt: string | Date, now: number): { level: Freshness; hoursAgo: number } {
  const hoursAgo = Math.max(0, (now - new Date(updatedAt).getTime()) / HOUR);
  const limit = THRESHOLD_HOURS[category] ?? DEFAULT_HOURS;
  if (hoursAgo <= limit) return { level: "current", hoursAgo };
  if (hoursAgo <= limit * 3) return { level: "aging", hoursAgo };
  return { level: "stale", hoursAgo };
}

/** Plain-language age, for labels: "5 min ago", "3 h ago", "2 days ago". */
export function ageLabel(hoursAgo: number): string {
  if (!Number.isFinite(hoursAgo)) return "a while ago";
  if (hoursAgo < 1) return `${Math.max(1, Math.round(hoursAgo * 60))} min ago`;
  if (hoursAgo < 48) return `${Math.round(hoursAgo)} h ago`;
  return `${Math.round(hoursAgo / 24)} days ago`;
}

/** Single primary time line for a card: "Filed 6d ago · last confirmed 20h ago" */
export function primaryTimeLine(
  createdAt: string | Date | null | undefined,
  updatedAt: string | Date | null | undefined,
  kind: "report" | "news" = "report",
  now: number = Date.now(),
): string {
  if (kind === "news") {
    const pub = createdAt ?? updatedAt;
    if (!pub) return "";
    const h = Math.max(0, (now - new Date(pub).getTime()) / HOUR);
    return `Published ${ageLabel(h)}`;
  }

  const createdH = createdAt ? Math.max(0, (now - new Date(createdAt).getTime()) / HOUR) : null;
  const updatedH = updatedAt ? Math.max(0, (now - new Date(updatedAt).getTime()) / HOUR) : null;

  if (createdH === null && updatedH === null) return "";

  // If updatedAt is meaningfully newer than createdAt (>30 min apart), show both
  if (createdH !== null && updatedH !== null && Math.abs(createdH - updatedH) > 0.5) {
    return `Filed ${ageLabel(createdH)} · last confirmed ${ageLabel(updatedH)}`;
  }
  const h = updatedH ?? createdH ?? 0;
  return `Filed ${ageLabel(h)}`;
}
