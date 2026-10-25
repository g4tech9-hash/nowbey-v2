import { getScheme } from "./theme";

export type CategoryKey =
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

/** Labels and blurbs follow the web source of truth (src/lib/categories.ts). */
// Category colours are the web's --cat-* tokens (src/styles/pulse/tokens.css)
// transcribed — BOTH themes, because Daylight has its own deep category hues and
// is explicitly "not an inverted night". `color` resolves against the current
// scheme when read, so category pins, badges and chips repaint on a theme switch.

function cat(label: string, dark: string, light: string, blurb: string): { label: string; color: string; blurb: string } {
  return {
    label,
    blurb,
    get color() {
      return getScheme() === "light" ? light : dark;
    },
  };
}

export const CATEGORIES: Record<CategoryKey, { label: string; color: string; blurb: string }> = {
  flood: cat("Flooding", "#6fd0ff", "#0a5f8c", "Standing water, washover, flash flood"), // --cat-flooding
  storm: cat("Storm", "#ffe39a", "#7a5300", "Squall, surge, hurricane watch"), // --cat-storm
  power: cat("Power", "#f8cf6b", "#7a5300", "Outage, lines down, generator"), // --cat-power
  water: cat("Water", "#35d6e6", "#05606e", "No water, main break, boil notice"), // --cat-water
  crime: cat("Safety", "#ff8ba6", "#a01c3c", "Theft, break-in, suspicious activity"), // --cat-safety
  road: cat("Road", "#ff9d8a", "#8a4106", "Pothole, blockage, closure"), // --cat-road
  marine: cat("Marine", "#6eeadb", "#0a6a5c", "Debris, grounding, sea state"), // --cat-marine
  fire: cat("Fire", "#ff7f6b", "#a11d12", "Brush or structure fire, smoke"), // --cat-fire
  health: cat("Health", "#b39cff", "#5b2ec4", "Assistance, medical, rescue"), // --cat-health
  trash: cat("Sanitation", "#afe85f", "#45680b", "Missed pickup, dumping"), // --cat-sanitation
  event: cat("Community", "#ff8fb8", "#a3265c", "Junkanoo, regatta, fundraiser"), // --cat-community
  notice: cat("Notice", "#9fb4bb", "#4c5a61", "General heads-up"), // --cat-notice
  accident: cat("Car Accident", "#ff9d8a", "#8a4106", "Traffic accident, road blockage, or vehicle hazard"), // --cat-accident
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export function categoryOf(key: string) {
  return CATEGORIES[key as CategoryKey] ?? CATEGORIES.notice;
}

export const LIFE_KINDS: Record<string, { label: string; color: string }> = {
  food: { label: "Eats & drinks", color: "#ffb454" },
  event: { label: "Events", color: "#f472b6" },
  beach: { label: "Beaches & sights", color: "#2ee6d0" },
  night: { label: "Nightlife", color: "#a78bfa" },
  tip: { label: "Local tips", color: "#ffd766" },
};

export const REACTIONS: Record<"like" | "love" | "thanks" | "wow" | "sad", { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  thanks: { emoji: "🙏", label: "Thanks" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
};
export const REACTION_KEYS = Object.keys(REACTIONS) as (keyof typeof REACTIONS)[];

/** The most-used reactions on an item, most popular first. */
export function topReactions(counts: Partial<Record<keyof typeof REACTIONS, number>>, n = 3): (keyof typeof REACTIONS)[] {
  return REACTION_KEYS.filter((k) => (counts[k] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, n);
}

export const FLAG_REASONS: Record<string, string> = {
  spam: "Spam or an advert",
  offensive: "Rude or offensive",
  unsafe: "Unsafe or misleading",
  wrong: "Wrong place or details",
  other: "Something else",
};

export const PARISHES = [
  "New Providence",
  "Grand Bahama",
  "Abaco",
  "Bimini",
  "Cat Island",
  "Crooked Island",
  "Eleuthera",
  "Exuma",
  "Inagua",
  "Long Island",
  "Berry Islands",
  "Acklins",
  "Mayaguana",
  "San Salvador",
  "Andros",
  "Spanish Wells",
  "Harbour Island",
  "Cay Sal Bank",
];

export const BAHAMAS_CENTER = { lat: 25.0629, lng: -77.3417 };

/** ONE severity scale — 4 levels, matching the web source of truth (src/lib/severity.ts). */
export const SEVERITY = ["Minor", "Lane blocked", "Road blocked", "Dangerous"];

export const TIER_NAMES: Record<string, string> = { conch: "Conch", rock: "Rock Sound", admiral: "Admiral" };

/** Same two boxes the website uses: the main islands, and Cay Sal Bank. Keeps out Florida and most of Cuba. */
export function inBahamas(lat: number, lng: number): boolean {
  const main = lat >= 20.7 && lat <= 27.4 && lng >= -79.6 && lng <= -72.5;
  const caySal = lat >= 23.3 && lat <= 24.3 && lng >= -80.6 && lng <= -79.4;
  return main || caySal;
}

export function formatCoord(value: number, axis: "lat" | "lng"): string {
  const dir = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}° ${dir}`;
}

export function timeAgo(iso: string): string {
  const secs = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
