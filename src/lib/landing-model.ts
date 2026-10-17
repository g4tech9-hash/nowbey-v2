/**
 * Domain model for the landing page's demonstration panel.
 *
 * The landing page has to show what NowBey does without a database, a session or a map
 * tile server, so it ships a small, honest model of the product's own vocabulary: hazards
 * on a map, stories on the wire, official bulletins, and the signal level each one carries.
 *
 * Everything in this file is pure. No imports, no clock, no randomness. The seed data in
 * `landing-seed.ts` fills the model; this file only describes it.
 */

/** How loudly a signal should be read. Mirrors the app's severity ramp. */
export type SignalLevel = "calm" | "watch" | "urgent" | "critical";

/** Where a line in the feed came from. */
export type FeedKind = "hazard" | "wire" | "official";

/**
 * The hazard categories the app understands. The names match `src/lib/geo.ts` so a seed
 * line reads exactly like a real one.
 */
export type FeedCategory =
  | "flood"
  | "storm"
  | "power"
  | "water"
  | "crime"
  | "road"
  | "marine"
  | "fire"
  | "health"
  | "trash"
  | "event"
  | "notice"
  | "accident";

/** One line in the demonstration feed. */
export interface FeedItem {
  id: string;
  kind: FeedKind;
  title: string;
  /** The parish or settlement the line belongs to. */
  area: string;
  category: FeedCategory;
  level: SignalLevel;
  /** How long ago the line was filed, in minutes. */
  minutesAgo: number;
  /** How many people confirmed it. */
  confirmations: number;
  /** Where it came from: a neighbour, the wire, an official bulletin. */
  source: string;
}

/** The headline numbers the hero shows. */
export interface LandingMetrics {
  reportsToday: number;
  activeHazards: number;
  parishesCovered: number;
  wireStories: number;
  alertRecipients: number;
  medianConfirmMinutes: number;
}

/** How each level is labelled and ranked. */
export const LEVEL_META: Record<SignalLevel, { label: string; rank: number }> = {
  calm: { label: "Calm", rank: 0 },
  watch: { label: "Watch", rank: 1 },
  urgent: { label: "Urgent", rank: 2 },
  critical: { label: "Critical", rank: 3 },
};

/** Every level, loudest last. Used for sorting and for the legend. */
export const SIGNAL_LEVELS: SignalLevel[] = ["calm", "watch", "urgent", "critical"];

/**
 * The app scores a report 0-4 (`src/lib/command.ts`). The landing page reads the same
 * score as a level, so a seeded line and a real report are never described differently.
 */
export function levelFromSeverity(severity: number): SignalLevel {
  if (!Number.isFinite(severity) || severity <= 0) return "calm";
  if (severity >= 4) return "critical";
  if (severity >= 3) return "urgent";
  return "watch";
}

/** Groups thousands without depending on the host's locale data. */
export function formatCount(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded));
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ",";
    out += digits[i];
  }
  return sign + out;
}

/** "just now", "12m ago", "3h ago", "2d ago" - short enough for a feed line. */
export function timeAgoLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "just now";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Counts the feed by level, always returning every level (zeroes included). */
export function countByLevel(items: FeedItem[]): Record<SignalLevel, number> {
  const counts: Record<SignalLevel, number> = { calm: 0, watch: 0, urgent: 0, critical: 0 };
  for (const item of items) counts[item.level] += 1;
  return counts;
}

/** The loudest line in the feed, or null when the feed is empty. */
export function loudest(items: FeedItem[]): FeedItem | null {
  let best: FeedItem | null = null;
  for (const item of items) {
    if (!best || LEVEL_META[item.level].rank > LEVEL_META[best.level].rank) best = item;
  }
  return best;
}

/** A one-line summary of the feed, used as the panel's status line. */
export function summariseFeed(items: FeedItem[]): string {
  if (items.length === 0) return "Nothing filed yet";
  const counts = countByLevel(items);
  const loud = loudest(items);
  if (!loud || loud.level === "calm") return `${items.length} lines on the wire, nothing urgent`;
  if (counts.critical > 0) return `${counts.critical} critical, ${counts.urgent} urgent right now`;
  return `${counts.urgent} urgent, ${counts.watch} to watch`;
}

/** The label shown on a feed line for its category. */
export const CATEGORY_LABELS: Record<FeedCategory, string> = {
  flood: "Flooding",
  storm: "Storm",
  power: "Power",
  water: "Water",
  crime: "Safety",
  road: "Road",
  marine: "Marine",
  fire: "Fire",
  health: "Health",
  trash: "Waste",
  event: "Event",
  notice: "Notice",
  accident: "Accident",
};
