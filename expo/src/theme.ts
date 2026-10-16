/**
 * 2026 "Tideglass" theme for the NowBey mobile app.
 *
 * The legacy keys (bg/panel/panel2/panel3/line/tide/tideLight/tidePale/conch/
 * conchLight/sun/sand/text/muted/subtle) are kept so every existing screen keeps
 * compiling — their values are the 2026 dark-mode tokens. The new tiers below
 * (abyss 975–600, ink 100–400, tide 650–200, semantic ok/warn/danger/info,
 * severity sev-1..5, category fills) are what new work should use.
 */

export const color = {
  // Surfaces — abyss 975 (deepest) to 600 (raised).
  bg: "#05141d", // abyss-975
  panel: "#071923", // abyss-950
  panel2: "#0b2231", // abyss-900
  panel3: "#123043", // abyss-800
  abyss975: "#05141d",
  abyss950: "#071923",
  abyss900: "#0b2231",
  abyss850: "#102b3d",
  abyss800: "#123043",
  abyss700: "#1a4155",
  abyss600: "#2a5568",

  // Ink — text tiers. 100 is primary, 400 is the quietest still-AAA tier.
  text: "#eaf6f4", // ink-100
  muted: "#a9cdc9", // legacy alias: ink-300
  subtle: "#6e97a0", // legacy alias: ink-400
  ink100: "#eaf6f4",
  ink200: "#cfe4e2",
  ink300: "#a9cdc9",
  ink400: "#6e97a0",

  // Tide — primary brand. 650/600 are the text-safe tiers on light surfaces.
  tide: "#00c9b7", // tide-500
  tideLight: "#2ee6d0", // tide-400
  tidePale: "#74f3e3", // tide-300
  tide650: "#00635a",
  tide600: "#00756a",
  tide500: "#00c9b7",
  tide400: "#2ee6d0",
  tide300: "#74f3e3",
  tide200: "#a9f5ea",

  // Line + brand accents.
  line: "rgba(120,220,214,0.14)",
  conch: "#ff7a6b", // conch-500
  conchLight: "#ff9d8f", // conch-400
  conch600: "#c2413c",
  conch500: "#ff7a6b",
  conch400: "#ff9d8f",
  sun: "#ffc531", // sun-500
  sun600: "#6e4e00",
  sun500: "#ffc531",
  sun400: "#ffd970",
  sand: "#f6ead8", // sand-100
  sand100: "#f6ead8",
  sand50: "#fbf4e6",
  rum: "#8a5a2b",

  // Semantic.
  ok500: "#0fd39a",
  ok600: "#065c43",
  warn500: "#f5c542",
  warn600: "#6e4e00",
  danger500: "#ff7a6b",
  danger600: "#a10e33",
  info500: "#38bdf8",
  info600: "#155e75",

  // Severity ramp — 1 quiet to 5 critical. Use for meters and pin halos.
  sev1: "#0fd39a",
  sev2: "#f5c542",
  sev3: "#fb923c",
  sev4: "#ff7a6b",
  sev5: "#f43f5e",
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl2: 24, // cards and sheets
  xl: 28,
  pill: 999,
} as const;

/** Fluid type steps (min → max px) used across the 2026 screens. */
export const type = {
  "2xs": 10,
  xs: 11,
  sm: 13,
  base: 15,
  lg: 19,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
} as const;

/** 4pt spacing scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
} as const;

/** 2026 easings — pass to Animated.timing / reanimated withTiming. */
export const easing = {
  standard: [0.2, 0, 0, 1] as const,
  emphasized: [0.05, 0.7, 0.1, 1] as const,
  exit: [0.3, 0, 0.8, 0.15] as const,
};

/** Category fills mirror the web palette (see src/lib/geo.ts). */
export const categoryColor: Record<string, string> = {
  flood: "#38bdf8",
  storm: "#f5c542",
  power: "#fbbf24",
  water: "#22d3ee",
  crime: "#ff7a6b",
  road: "#fb923c",
  marine: "#2ee6d0",
  fire: "#f43f5e",
  health: "#c084fc",
  trash: "#a3e635",
  event: "#f472b6",
  notice: "#8fa8b5",
  accident: "#fb7185",
};

/** Severity color for a 1–5 level (clamped). Use for meters and pin halos. */
export function sevColor(level: number): string {
  const n = Math.min(Math.max(Math.round(level) || 1, 1), 5);
  return color[`sev${n}` as keyof typeof color];
}

export default { color, radius, type, space, easing, categoryColor };
