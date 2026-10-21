/**
 * NowBey Pulse — Design Tokens for React Native
 * 1:1 bridge from src/styles/pulse/tokens.css (Ocean Night v2 / Warm Sand)
 * This is the ONLY color/spacing source beyond theme.ts — components never hardcode values.
 *
 * Architecture:
 * - Re-exports `color`, `radius`, `space`, `type` from theme.ts (live-proxy, theme-aware)
 * - Adds motion, elevation, and semantic aliases that web's @theme bridge provides
 * - No literals: every value resolves from Layer 2 (semantic) tokens
 */

export { color, radius, space, type, easing, sevColor, getScheme, THEMES } from "../theme";
export type { Palette, Scheme, ThemeMode } from "../theme";

// ── Layout constants (mirror --pulse-* CSS vars) ──
export const layout = {
  headerH: 60,
  navbarH: 64,
  fabSize: 56,
  pageMax: 1440,
  streamMax: 680,
  railLeft: 224,
  railRight: 340,
} as const;

/**
 * Stacking order — the single source for z-index. Nothing may hardcode a
 * zIndex again: screen furniture used to carry ad-hoc values (zIndex 999 in
 * BottomSheet, elevation 10 inline on the FAB) and they fought each other as
 * soon as a sheet and a FAB were on screen together.
 *
 * Elevation (shadow) pairs with these through the `elevation` scale below.
 */
export const z = {
  content: 0,
  header: 10, // sticky screen header
  fab: 20, // the centre Report disc
  tabbar: 30, // bottom navigation plate
  backdrop: 900, // sheet scrim
  sheet: 1000, // bottom sheet / modal content
  toast: 1100, // toasts and blocking alerts
} as const;

// ── Motion durations (ms) — mirror --pulse-duration-* ──
export const duration = {
  tap: 120,
  state: 200,
  enter: 340,
  sweep: 560,
  shimmer: 1400,
} as const;

// ── Easing curves (for reanimated withTiming) ──
export const easings = {
  // spring: cubic-bezier(0.34, 1.56, 0.64, 1) — overshoot, zero JS
  spring: { damping: 22, stiffness: 140, mass: 1 },
  // Bezier approximations for Animated.timing
  standard: [0.22, 1, 0.36, 1] as const,
  emphasized: [0.05, 0.7, 0.1, 1] as const,
} as const;

// ── Elevation (shadows) — mirror --pulse-elev-* ──
export const elevation = {
  l1: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  l2: {
    shadowColor: "#000",
    shadowOpacity: 0.62,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  l3: {
    shadowColor: "#000",
    shadowOpacity: 0.72,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 26 },
    elevation: 12,
  },
  glowTeal: {
    shadowColor: "#3fd6c0",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

// ── Category → semantic color mapping (mirrors web --cat-* tokens) ──
// Actual hue resolved via geo.ts `categoryOf().color` (theme-aware getter)
// This is the fallback palette for docs/tests
export const semantic = {
  // Hazard types — user directive colors
  flooding: { bg: "#6fd0ff", label: "Flooding" }, // Blue
  power: { bg: "#f8cf6b", label: "Power" }, // Yellow/Amber
  storm: { bg: "#ffe39a", label: "Storm" },
  water: { bg: "#35d6e6", label: "Water" },
  crime: { bg: "#ff8ba6", label: "Safety" }, // Rose
  road: { bg: "#ff9d8a", label: "Road" }, // Coral
  marine: { bg: "#6eeadb", label: "Marine" }, // Teal
  fire: { bg: "#ff7f6b", label: "Fire" },
  health: { bg: "#b39cff", label: "Health" }, // Violet
  trash: { bg: "#afe85f", label: "Sanitation" }, // Lime
  event: { bg: "#ff8fb8", label: "Community" },
  notice: { bg: "#9fb4bb", label: "Notice" },
  accident: { bg: "#ff9d8a", label: "Accident" },
  // Severity scale (1-4) — web --sev-1..4
  sev1: "#afe85f",
  sev2: "#f8cf6b",
  sev3: "#ff9a52",
  sev4: "#ff7f6b",
} as const;

// ── Grid background config (blueprint pattern) ──
export const gridConfig = {
  size: 44, // web: background-size 44px 44px
  lineColor: "rgba(122,186,190,0.09)", // --pulse-grid-line
  opacity: 0.055,
} as const;
