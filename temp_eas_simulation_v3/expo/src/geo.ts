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
  | "notice";

export const CATEGORIES: Record<CategoryKey, { label: string; color: string; blurb: string }> = {
  flood: { label: "Flooding", color: "#38bdf8", blurb: "Standing water, washover, flash flood" },
  storm: { label: "Storm", color: "#fbbf24", blurb: "Squall, surge, hurricane watch" },
  power: { label: "Power", color: "#facc15", blurb: "Outage, lines down, generator" },
  water: { label: "Water", color: "#22d3ee", blurb: "No water, main break, boil notice" },
  crime: { label: "Safety", color: "#fb7185", blurb: "Theft, break-in, suspicious" },
  road: { label: "Road", color: "#f97316", blurb: "Pothole, blockage, closure" },
  marine: { label: "Marine", color: "#2dd4bf", blurb: "Debris, grounding, sea state" },
  fire: { label: "Fire", color: "#ef4444", blurb: "Brush or structure fire, smoke" },
  health: { label: "Health", color: "#a78bfa", blurb: "Assistance, medical, rescue" },
  trash: { label: "Sanitation", color: "#84cc16", blurb: "Missed pickup, dumping" },
  event: { label: "Community", color: "#f472b6", blurb: "Junkanoo, regatta, fundraiser" },
  notice: { label: "Notice", color: "#94a3b8", blurb: "General heads-up" },
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

export const SEVERITY = ["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"];

export const TIER_NAMES: Record<string, string> = { conch: "Conch", rock: "Rock Sound", admiral: "Admiral" };

/** Same two boxes the website uses: the main islands, and Cay Sal Bank. Keeps out Florida and most of Cuba. */
export function inBahamas(lat: number, lng: number): boolean {
  const main = lat >= 20.7 && lat <= 27.4 && lng >= -79.6 && lng <= -72.5;
  const caySal = lat >= 23.3 && lat <= 24.3 && lng >= -80.6 && lng <= -79.4;
  return main || caySal;
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
