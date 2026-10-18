/**
 * THE CATEGORY LIST — one list, one place.
 *
 * Every surface that shows a category reads this file: the feed card, the map
 * marker and key, the report form, the wire, the alerts page, the admin queues
 * and the legends. Before this file the labels lived in `geo.ts` and the icons
 * and colours lived in `ui/pulse/glyph.tsx`, so the two drifted (the map legend
 * showed eight kinds, the alerts page showed thirteen, and the pin codes were
 * two letters that nobody could read).
 *
 * This module is deliberately plain data with no React and no imports, so it can
 * be used from the server, from a client component and from a unit test.
 *
 * Fields:
 *   id              the stable key, stored in the database
 *   label           the name a resident reads
 *   token           the Layer 2 CSS variable that paints the signal
 *   color           the legacy hex, kept only for the few places that still need a
 *                   literal colour (the map key swatch). Prefer `token`.
 *   pin             the legacy two-letter map code, kept for saved preferences only
 *   glyph           the icon name, resolved to a component in `ui/pulse/glyph.tsx`
 *   description     one plain line, used in the report form and the legends
 *   defaultSeverity the severity a report of this kind starts at
 *   group           the family the alerts page groups its chips by
 */

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

/** The families the alerts page groups its chips by. */
export type CategoryGroup = "hazards" | "utilities" | "community";

export const CATEGORY_GROUPS: { key: CategoryGroup; label: string; blurb: string }[] = [
  { key: "hazards", label: "Hazards", blurb: "Flooding, storms, road damage, fire and accidents" },
  { key: "utilities", label: "Utilities", blurb: "Power, water and sanitation" },
  { key: "community", label: "Community", blurb: "Events and general notices" },
];

export type CategoryDef = {
  id: CategoryKey;
  label: string;
  token: string;
  color: string;
  pin: string;
  glyph: string;
  description: string;
  defaultSeverity: number;
  group: CategoryGroup;
};

export const CATEGORY_DEFS: Record<CategoryKey, CategoryDef> = {
  flood: {
    id: "flood",
    label: "Flooding",
    token: "var(--cat-flooding)",
    color: "#38bdf8",
    pin: "FL",
    glyph: "wave",
    description: "Standing water, washover, flash flood",
    defaultSeverity: 2,
    group: "hazards",
  },
  storm: {
    id: "storm",
    label: "Storm",
    token: "var(--cat-storm)",
    color: "#fbbf24",
    pin: "ST",
    glyph: "cloud",
    description: "Squall, surge, hurricane watch",
    defaultSeverity: 3,
    group: "hazards",
  },
  power: {
    id: "power",
    label: "Power",
    token: "var(--cat-power)",
    color: "#facc15",
    pin: "PW",
    glyph: "bolt",
    description: "Outage, lines down, generator",
    defaultSeverity: 2,
    group: "utilities",
  },
  water: {
    id: "water",
    label: "Water",
    token: "var(--cat-water)",
    color: "#22d3ee",
    pin: "WA",
    glyph: "drop",
    description: "No water, main break, boil notice",
    defaultSeverity: 2,
    group: "utilities",
  },
  crime: {
    id: "crime",
    label: "Safety",
    token: "var(--cat-safety)",
    color: "#fb7185",
    pin: "SF",
    glyph: "shield",
    description: "Theft, break-in, suspicious",
    defaultSeverity: 3,
    group: "hazards",
  },
  road: {
    id: "road",
    label: "Road",
    token: "var(--cat-road)",
    color: "#f97316",
    pin: "RD",
    glyph: "cone",
    description: "Pothole, blockage, closure",
    defaultSeverity: 2,
    group: "hazards",
  },
  marine: {
    id: "marine",
    label: "Marine",
    token: "var(--cat-marine)",
    color: "#2dd4bf",
    pin: "MR",
    glyph: "anchor",
    description: "Debris, grounding, sea state",
    defaultSeverity: 2,
    group: "hazards",
  },
  fire: {
    id: "fire",
    label: "Fire",
    token: "var(--cat-fire)",
    color: "#ef4444",
    pin: "FR",
    glyph: "flame",
    description: "Brush or structure fire, smoke",
    defaultSeverity: 3,
    group: "hazards",
  },
  health: {
    id: "health",
    label: "Health",
    token: "var(--cat-health)",
    color: "#a78bfa",
    pin: "HL",
    glyph: "cross",
    description: "Assistance, medical, rescue",
    defaultSeverity: 3,
    group: "hazards",
  },
  trash: {
    id: "trash",
    label: "Sanitation",
    token: "var(--cat-sanitation)",
    color: "#84cc16",
    pin: "TR",
    glyph: "bin",
    description: "Missed pickup, dumping",
    defaultSeverity: 1,
    group: "utilities",
  },
  event: {
    id: "event",
    label: "Community",
    token: "var(--cat-community)",
    color: "#f472b6",
    pin: "EV",
    glyph: "star",
    description: "Junkanoo, regatta, fundraiser",
    defaultSeverity: 1,
    group: "community",
  },
  notice: {
    id: "notice",
    label: "Notice",
    token: "var(--cat-notice)",
    color: "#94a3b8",
    pin: "NT",
    glyph: "info",
    description: "General heads-up",
    defaultSeverity: 1,
    group: "community",
  },
  accident: {
    id: "accident",
    label: "Car accident",
    token: "var(--cat-accident)",
    color: "#ef4444",
    pin: "AC",
    glyph: "car",
    description: "Traffic accident, road blockage, or vehicle hazard",
    defaultSeverity: 3,
    group: "hazards",
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_DEFS) as CategoryKey[];

/** Never throws: an unknown key falls back to Notice, so a card is never blank. */
export function categoryDef(key: string | null | undefined): CategoryDef {
  return CATEGORY_DEFS[(key ?? "notice") as CategoryKey] ?? CATEGORY_DEFS.notice;
}

/** The categories in one family, in the order they should read. */
export function categoriesInGroup(group: CategoryGroup): CategoryDef[] {
  return CATEGORY_KEYS.map((k) => CATEGORY_DEFS[k]).filter((c) => c.group === group);
}
