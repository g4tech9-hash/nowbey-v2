/**
 * How long a report stays "current" without anyone touching it. Road and power reports go stale fast;
 * a notice or community event stays useful longer. These are judgement calls, not measured, and they only
 * drive labels. Nothing is hidden or deleted because a report is old.
 */
import type { CategoryKey } from "./geo";

const HOUR = 60 * 60 * 1000;

const THRESHOLD_HOURS: Partial<Record<CategoryKey, number>> = {
  power: 3,
  flood: 6,
  storm: 6,
  water: 6,
  road: 24,
  accident: 6,
  fire: 6,
  crime: 12,
  marine: 12,
  health: 24,
  trash: 48,
  event: 72,
  notice: 48,
};

const DEFAULT_HOURS = 12;

export type Freshness = "current" | "aging" | "stale";

/** `updatedAt` is the last time anyone confirmed, cleared, or updated the report. */
export function freshnessFor(category: string, updatedAt: string | Date, now: number): { level: Freshness; hoursAgo: number } {
  const hoursAgo = Math.max(0, (now - new Date(updatedAt).getTime()) / HOUR);
  const limit = THRESHOLD_HOURS[category as CategoryKey] ?? DEFAULT_HOURS;
  if (hoursAgo <= limit) return { level: "current", hoursAgo };
  if (hoursAgo <= limit * 3) return { level: "aging", hoursAgo };
  return { level: "stale", hoursAgo };
}

/** Plain-language age, for labels: "5 min ago", "3 h ago", "2 days ago". */
export function ageLabel(hoursAgo: number): string {
  if (hoursAgo < 1) return `${Math.max(1, Math.round(hoursAgo * 60))} min ago`;
  if (hoursAgo < 48) return `${Math.round(hoursAgo)} h ago`;
  return `${Math.round(hoursAgo / 24)} days ago`;
}
