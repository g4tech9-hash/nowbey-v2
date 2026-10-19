/**
 * "Deep-night" theme for the NowBey mobile app — the exact values of the
 * approved web palette (src/styles/pulse/tokens.css, dark theme, 2026-10-19).
 * The web is the colour source of truth; when a token moves there, it moves
 * here. Never re-tune these locally.
 *
 * The legacy keys (bg/panel/panel2/panel3/line/tide/tideLight/tidePale/conch/
 * conchLight/sun/sand/text/muted/subtle) are kept so every existing screen keeps
 * compiling. The tier names beside them (abyss 975–600, ink 100–400,
 * tide 650–200, semantic ok/warn/danger/info, severity sev-1..4) mirror the
 * web bridge vocabulary and resolve to the same values. Severity is one
 * 4-level scale (Minor → Dangerous); the old sev-5 tier is gone.
 */

export const color = {
  // Surfaces — deep-night ramp (web --bg-base .. --bg-active).
  bg: "#0c151d", // --bg-base
  panel: "#152230", // --card-bg → --bg-raised
  panel2: "#152230", // --bg-raised
  panel3: "#243546", // --bg-hover
  abyss975: "#0c151d",
  abyss950: "#0c151d",
  abyss900: "#152230",
  abyss850: "#152230",
  abyss800: "#243546",
  abyss700: "#2c4052",
  abyss600: "rgba(160, 214, 210, 0.62)", // --border-strong

  // Ink — text tiers.
  text: "#f3f1ea", // --text-primary
  muted: "#b9c8c9", // --text-secondary
  subtle: "#9aafb3", // --text-tertiary
  ink100: "#f3f1ea",
  ink200: "#b9c8c9",
  ink300: "#9aafb3",
  ink400: "#9aafb3",

  // Tide — brand accent (web teal-400/300).
  tide: "#3fd6c0", // --accent
  tideLight: "#6eeadb", // --accent-hover / --text-accent
  tidePale: "#6eeadb", // --text-accent
  tide650: "#6eeadb",
  tide600: "#3fd6c0",
  tide500: "#3fd6c0",
  tide400: "#6eeadb",
  tide300: "#6eeadb",
  tide200: "#6eeadb",

  // Line + signal accents.
  line: "rgba(148, 206, 202, 0.18)", // --border-default
  conch: "#ff7f6b", // --danger (coral-400)
  conchLight: "#ff7f6b",
  conch600: "#ff7f6b",
  conch500: "#ff7f6b",
  conch400: "#ff7f6b",
  sun: "#f8cf6b", // --warning (amber-300)
  sun600: "#f8cf6b",
  sun500: "#f8cf6b",
  sun400: "#f8cf6b",
  sand: "#f3f1ea", // sand-100 → --text-primary
  sand100: "#f3f1ea",
  sand50: "#f3f1ea",
  rum: "#9fb4bb", // --cat-notice

  // Semantic.
  ok500: "#afe85f", // --success (lime-300)
  ok600: "#afe85f",
  warn500: "#f8cf6b",
  warn600: "#f8cf6b",
  danger500: "#ff7f6b",
  danger600: "#ff7f6b",
  info500: "#6fd0ff", // --info (ocean-300)
  info600: "#6fd0ff",

  // Severity ramp — one 4-level scale (web --sev-1..--sev-4). sev-5 is retired.
  sev1: "#afe85f",
  sev2: "#f8cf6b",
  sev3: "#ff9a52",
  sev4: "#ff7f6b",
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

/**
 * Severity colour for the one 1–4 scale (clamped; a stored 5 is retired data
 * and falls back to the top of the scale). Use for meters and pin halos.
 * Category colours live in src/geo.ts — the one category table.
 */
export function sevColor(level: number): string {
  const n = Math.min(Math.max(Math.round(level) || 1, 1), 4);
  return color[`sev${n}` as keyof typeof color];
}

export default { color, radius, type, space, easing };
