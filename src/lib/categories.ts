/**
 * ONE SOURCE OF TRUTH for categories.
 * Every page, filter, legend, map pin and news classifier reads from here.
 * Do not duplicate this list elsewhere.
 */

export type CategoryId =
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

export type CategoryDef = {
  id: CategoryId;
  label: string;
  shortLabel: string;
  description: string;
  defaultSeverity: 1 | 2 | 3 | 4;
  // Pulse token names (CSS var references) — keep in sync with tokens.css
  token: string;
  tokenMuted: string;
  icon: string; // lucide icon name for documentation; actual icon in pulse/glyph.tsx
  legacyPin: string; // old two-letter code, kept for migration only
};

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  flood: {
    id: "flood",
    label: "Flooding",
    shortLabel: "Flood",
    description: "Standing water, washover, flash flood",
    defaultSeverity: 3,
    token: "var(--cat-flooding)",
    tokenMuted: "var(--cat-flooding-muted)",
    icon: "droplets",
    legacyPin: "FL",
  },
  storm: {
    id: "storm",
    label: "Storm",
    shortLabel: "Storm",
    description: "Squall, surge, hurricane watch",
    defaultSeverity: 4,
    token: "var(--cat-storm)",
    tokenMuted: "var(--cat-storm-muted)",
    icon: "cloud-lightning",
    legacyPin: "ST",
  },
  power: {
    id: "power",
    label: "Power",
    shortLabel: "Power",
    description: "Outage, lines down, generator",
    defaultSeverity: 3,
    token: "var(--cat-power)",
    tokenMuted: "var(--cat-power-muted)",
    icon: "zap",
    legacyPin: "PW",
  },
  water: {
    id: "water",
    label: "Water",
    shortLabel: "Water",
    description: "No water, main break, boil notice",
    defaultSeverity: 3,
    token: "var(--cat-water)",
    tokenMuted: "var(--cat-water-muted)",
    icon: "waves",
    legacyPin: "WA",
  },
  crime: {
    id: "crime",
    label: "Safety",
    shortLabel: "Safety",
    description: "Theft, break-in, suspicious activity",
    defaultSeverity: 3,
    token: "var(--cat-safety)",
    tokenMuted: "var(--cat-safety-muted)",
    icon: "shield-alert",
    legacyPin: "SF",
  },
  road: {
    id: "road",
    label: "Road",
    shortLabel: "Road",
    description: "Pothole, blockage, closure",
    defaultSeverity: 2,
    token: "var(--cat-road)",
    tokenMuted: "var(--cat-road-muted)",
    icon: "traffic-cone",
    legacyPin: "RD",
  },
  marine: {
    id: "marine",
    label: "Marine",
    shortLabel: "Marine",
    description: "Debris, grounding, sea state",
    defaultSeverity: 2,
    token: "var(--cat-marine)",
    tokenMuted: "var(--cat-marine-muted)",
    icon: "anchor",
    legacyPin: "MR",
  },
  fire: {
    id: "fire",
    label: "Fire",
    shortLabel: "Fire",
    description: "Brush or structure fire, smoke",
    defaultSeverity: 4,
    token: "var(--cat-fire)",
    tokenMuted: "var(--cat-fire-muted)",
    icon: "flame",
    legacyPin: "FR",
  },
  health: {
    id: "health",
    label: "Health",
    shortLabel: "Health",
    description: "Assistance, medical, rescue",
    defaultSeverity: 3,
    token: "var(--cat-health)",
    tokenMuted: "var(--cat-health-muted)",
    icon: "cross",
    legacyPin: "HL",
  },
  trash: {
    id: "trash",
    label: "Sanitation",
    shortLabel: "Sanitation",
    description: "Missed pickup, dumping",
    defaultSeverity: 1,
    token: "var(--cat-sanitation)",
    tokenMuted: "var(--cat-sanitation-muted)",
    icon: "trash-2",
    legacyPin: "TR",
  },
  event: {
    id: "event",
    label: "Community",
    shortLabel: "Community",
    description: "Junkanoo, regatta, fundraiser",
    defaultSeverity: 1,
    token: "var(--cat-community)",
    tokenMuted: "var(--cat-community-muted)",
    icon: "star",
    legacyPin: "EV",
  },
  notice: {
    id: "notice",
    label: "Notice",
    shortLabel: "Notice",
    description: "General heads-up",
    defaultSeverity: 1,
    token: "var(--cat-notice)",
    tokenMuted: "var(--cat-notice-muted)",
    icon: "info",
    legacyPin: "NT",
  },
  accident: {
    id: "accident",
    label: "Car Accident",
    shortLabel: "Accident",
    description: "Traffic accident, road blockage, or vehicle hazard",
    defaultSeverity: 3,
    token: "var(--cat-accident)",
    tokenMuted: "var(--cat-accident-muted)",
    icon: "car",
    legacyPin: "AC",
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === "string" && v in CATEGORIES;
}

export function categoryFor(v: string | null | undefined): CategoryDef {
  if (v && v in CATEGORIES) return CATEGORIES[v as CategoryId];
  return CATEGORIES.notice;
}

/** Grouped for the alerts page picker */
export const CATEGORY_GROUPS: { label: string; ids: CategoryId[] }[] = [
  { label: "Hazards", ids: ["flood", "storm", "fire", "crime", "road", "accident", "marine"] },
  { label: "Utilities", ids: ["power", "water", "health", "trash"] },
  { label: "Community", ids: ["event", "notice"] },
];
