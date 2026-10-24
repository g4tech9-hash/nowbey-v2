/**
 * NOWBEY MARKETING — DESIGN TOKENS
 * ---------------------------------------------------------------------------
 * Every value here is copied from the product's own design system, not
 * invented: src/styles/pulse/tokens.css (Layer 2 dark theme, "Ocean Night v2")
 * and the `@theme` bridge in src/app/globals.css.
 *
 * If a token changes in the app, change it here too — the generator reads this
 * file and nothing else, so the social assets repaint with the product.
 * `npm run check:tokens` (scripts/check-tokens.mjs) diffs these values against
 * tokens.css so drift is caught rather than shipped.
 */

export const T = {
  // ---- surfaces -----------------------------------------------------------
  bgBase: "#0c151d",
  bgSunken: "#0c151d",
  bgRaised: "#152230",
  bgElevated: "#1c2b39",
  bgHover: "#243546",
  bgActive: "#2c4052",
  bgSelected: "rgba(63,214,192,0.14)",
  bgGlass: "rgba(21,34,48,0.62)",

  // ---- type ---------------------------------------------------------------
  textPrimary: "#f3f1ea",
  textSecondary: "#b9c8c9",
  textTertiary: "#9aafb3",
  textOnAccent: "#04211d",
  textInverse: "#06141b",

  // ---- lines --------------------------------------------------------------
  borderSubtle: "rgba(148,206,202,0.10)",
  borderDefault: "rgba(148,206,202,0.18)",
  borderStrong: "rgba(160,214,210,0.62)",
  borderAccent: "rgba(63,214,192,0.55)",

  // ---- accent + signals ---------------------------------------------------
  accent: "#3fd6c0",
  accentHover: "#6eeadb",
  accentMuted: "rgba(63,214,192,0.16)",
  danger: "#ff7f6b",
  dangerMuted: "rgba(255,127,107,0.16)",
  warning: "#f8cf6b",
  warningMuted: "rgba(248,207,107,0.16)",
  info: "#6fd0ff",
  infoMuted: "rgba(111,208,255,0.16)",
  success: "#afe85f",
  successMuted: "rgba(175,232,95,0.14)",

  // category hues (dark ramp) — src/lib/categories.ts ↔ tokens.css
  cat: {
    flooding: "#6fd0ff",
    power: "#f8cf6b",
    road: "#ff9d8a",
    water: "#35d6e6",
    safety: "#ff8ba6",
    marine: "#6eeadb",
    health: "#b39cff",
    sanitation: "#afe85f",
    storm: "#ffe39a",
    fire: "#ff7f6b",
    community: "#ff8fb8",
    notice: "#9fb4bb",
    accident: "#ff9d8a",
  },

  // ---- shape --------------------------------------------------------------
  r: { xs: 8, sm: 14, md: 20, lg: 28, pill: 999 },

  // ---- light theme (warm sand) — used for the "daylight" variants ---------
  light: {
    bgBase: "#f7f3ec",
    bgSunken: "#efe7d9",
    bgRaised: "#ffffff",
    textPrimary: "#16232b",
    textSecondary: "#3d4f57",
    textTertiary: "#56696f",
    borderSubtle: "rgba(52,38,20,0.10)",
    borderDefault: "rgba(52,38,20,0.18)",
    accent: "#0b6f64",
    accentHover: "#095b52",
    onAccent: "#ffffff",
    danger: "#b03328",
    warning: "#8a5b06",
    info: "#0a5f8c",
  },

  // ---- type families (static instances in marketing/fonts/static) ----------
  font: {
    display: "Brico",
    sans: "Inter",
    mono: "JBMono",
  },
  displayTracking: "-0.02em",
};

/** Grid + ambient texture, straight from landing.module.css. */
export const AMBIENT = {
  gridLine: "rgba(122,186,190,0.085)",
  ambientA: "rgba(34,184,164,0.18)",
  ambientB: "rgba(199,64,47,0.12)",
  ambientC: "rgba(20,114,171,0.10)",
};

/** The one-sentence promise, from src/lib/brand.ts. Never paraphrased in copy. */
export const BRAND = {
  name: "NowBey",
  tagline: "Stay Safe, Bahamas",
  promise: "Know what is happening, island by island.",
  description:
    "NowBey is a community safety map and news wire for The Bahamas. Browse neighbourhood reports on aerial imagery, confirm what neighbours see, and set email alerts for your island.",
};
