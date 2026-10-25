/**
 * NowBey theme system — the exact values of the approved web palette
 * (src/styles/pulse/tokens.css, both themes, 2026-10-20 sync).
 *
 * The web is the colour source of truth; when a token moves there, it moves
 * here. Never re-tune these locally. `THEMES.dark` resolves the web's
 * [data-theme="dark"] (Ocean Night v2) Layer 2 tokens; `THEMES.light` resolves
 * [data-theme="light"] (warm sand). Category and severity hues follow too
 * (src/geo.ts holds the category twins).
 *
 * How theme-awareness works without rewriting every screen:
 *  - `color` is a live proxy: `color.bg` resolves against the *current* scheme
 *    at the moment it is read, so render-time `style={{ backgroundColor: color.bg }}`
 *    follows the theme the next time that component paints.
 *  - `useTheme()` subscribes a component to scheme changes (and exposes the
 *    mode setter). Every screen calls it once so a theme change repaints the
 *    tree; shared kit (src/ui.tsx) calls it too and is self-sufficient.
 *  - `ThemeMode` is "dark" | "light" | "system"; "system" follows the phone's
 *    setting via React Native's useColorScheme, pushed in by the root layout.
 *
 * The legacy keys (bg/panel/panel2/panel3/line/tide/tideLight/tidePale/conch/
 * conchLight/sun/sand/text/muted/subtle) are kept so every existing screen keeps
 * compiling. The tier names beside them (abyss 975–600, ink 100–400,
 * tide 650–200, semantic ok/warn/danger/info, severity sev-1..4) mirror the
 * web bridge vocabulary and resolve to the same values. Severity is one
 * 4-level scale (Minor → Dangerous); the old sev-5 tier is gone.
 */
import { useSyncExternalStore } from "react";

export type Scheme = "dark" | "light";
export type ThemeMode = Scheme | "system";

export type Palette = {
  // Surfaces — the app canvas ramp (web --bg-base .. --bg-active).
  bg: string;
  panel: string;
  panel2: string;
  panel3: string;
  abyss975: string;
  abyss950: string;
  abyss900: string;
  abyss850: string;
  abyss800: string;
  abyss700: string;
  abyss600: string;

  // Ink — text tiers.
  text: string;
  muted: string;
  subtle: string;
  ink100: string;
  ink200: string;
  ink300: string;
  ink400: string;

  // Tide — brand accent.
  tide: string;
  tideLight: string;
  tidePale: string;
  tide650: string;
  tide600: string;
  tide500: string;
  tide400: string;
  tide300: string;
  tide200: string;

  // Line + signal accents.
  line: string;
  conch: string;
  conchLight: string;
  conch600: string;
  conch500: string;
  conch400: string;
  sun: string;
  sun600: string;
  sun500: string;
  sun400: string;
  sand: string;
  sand100: string;
  sand50: string;
  rum: string;

  // Semantic.
  ok500: string;
  ok600: string;
  warn500: string;
  warn600: string;
  danger500: string;
  danger600: string;
  info500: string;
  info600: string;

  // Severity ramp — one 4-level scale (web --sev-1..--sev-4). sev-5 is retired.
  sev1: string;
  sev2: string;
  sev3: string;
  sev4: string;

  // Translucent fills that used to be hardcoded rgba() in components.
  chipBg: string;
  inputBg: string;
  ghostBg: string;
  track: string;
};

/** Dark — Ocean Night v2 (tokens.css [data-theme="dark"]). */
const dark: Palette = {
  // Surfaces.
  bg: "#0c151d", // --bg-base
  panel: "#152230", // --card-bg → --bg-raised
  panel2: "#152230", // --bg-raised
  panel3: "#243546", // --bg-hover
  abyss975: "#0c151d",
  abyss950: "#0c151d",
  abyss900: "#152230",
  abyss850: "#152230",
  abyss800: "#243546",
  abyss700: "#2c4052", // --bg-active
  abyss600: "rgba(160, 214, 210, 0.62)", // --border-strong

  // Ink.
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

  // Severity ramp.
  sev1: "#afe85f",
  sev2: "#f8cf6b",
  sev3: "#ff9a52",
  sev4: "#ff7f6b",

  // Translucent fills.
  chipBg: "rgba(255,255,255,0.06)",
  inputBg: "rgba(3,18,27,0.7)",
  ghostBg: "rgba(255,255,255,0.07)",
  track: "rgba(255,255,255,0.12)",
};

/** Light — warm sand (tokens.css [data-theme="light"]). A design, not an inversion. */
const light: Palette = {
  // Surfaces — paper on sand.
  bg: "#f7f3ec", // --bg-base
  panel: "#ffffff", // --card-bg → --bg-raised
  panel2: "#ffffff", // --bg-raised
  panel3: "#ece3d3", // --bg-hover
  abyss975: "#f7f3ec",
  abyss950: "#f7f3ec",
  abyss900: "#ffffff",
  abyss850: "#ffffff",
  abyss800: "#ece3d3",
  abyss700: "#e2d6c1", // --bg-active
  abyss600: "rgba(52, 38, 20, 0.55)", // --border-strong

  // Ink — deep teal-ink, not black.
  text: "#16232b", // --text-primary
  muted: "#3d4f57", // --text-secondary
  subtle: "#56696f", // --text-tertiary
  ink100: "#16232b",
  ink200: "#3d4f57",
  ink300: "#56696f",
  ink400: "#56696f",

  // Tide — the accent goes deep enough to hold contrast on paper.
  tide: "#0b6f64", // --accent
  tideLight: "#075e55", // --accent-hover / --text-accent
  tidePale: "#075e55", // --text-accent
  tide650: "#075e55",
  tide600: "#0b6f64",
  tide500: "#0b6f64",
  tide400: "#075e55",
  tide300: "#075e55",
  tide200: "#075e55",

  // Line + signal accents (warm ink translucents, never grey).
  line: "rgba(52, 38, 20, 0.18)", // --border-default
  conch: "#b03328", // --danger
  conchLight: "#b03328",
  conch600: "#b03328",
  conch500: "#b03328",
  conch400: "#b03328",
  sun: "#8a5b06", // --warning
  sun600: "#8a5b06",
  sun500: "#8a5b06",
  sun400: "#8a5b06",
  sand: "#16232b", // sand-100 → --text-primary
  sand100: "#16232b",
  sand50: "#16232b",
  rum: "#4c5a61", // --cat-notice

  // Semantic.
  ok500: "#1c6b45", // --success
  ok600: "#1c6b45",
  warn500: "#8a5b06",
  warn600: "#8a5b06",
  danger500: "#b03328",
  danger600: "#b03328",
  info500: "#0a5f8c", // --info
  info600: "#0a5f8c",

  // Severity ramp (light twins — never inverted hues).
  sev1: "#1c6b45",
  sev2: "#8a5b06",
  sev3: "#b45310",
  sev4: "#b03328",

  // Translucent fills (warm ink).
  chipBg: "rgba(52,38,20,0.06)",
  inputBg: "#efe7d9", // --input-bg → --bg-sunken
  ghostBg: "rgba(52,38,20,0.06)",
  track: "rgba(52,38,20,0.15)",
};

export const THEMES: Record<Scheme, Palette> = { dark, light };

/* ------------------------------------------------------------------ *
 * Theme store — one mutable scheme, one listener set, no context churn.
 * ------------------------------------------------------------------ */

let currentScheme: Scheme = "dark";
let mode: ThemeMode = "dark";
let deviceScheme: Scheme = "dark";
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((fn) => fn());

function resolved(): Scheme {
  return mode === "system" ? deviceScheme : mode;
}

export function getScheme(): Scheme {
  return currentScheme;
}

export function getMode(): ThemeMode {
  return mode;
}

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The phone's own setting, pushed in by the root layout's useColorScheme(). */
export function setDeviceScheme(s: Scheme) {
  if (s === deviceScheme) return;
  deviceScheme = s;
  const next = resolved();
  if (next !== currentScheme) {
    currentScheme = next;
    emit();
  }
}

/** Picks a mode ("dark" | "light" | "system"). Callers persist it; see loadThemeMode/saveThemeMode. */
export function applyThemeMode(m: ThemeMode) {
  mode = m;
  const next = resolved();
  if (next !== currentScheme) {
    currentScheme = next;
    emit();
  } else {
    emit(); // mode label changed (e.g. light → system-on-light): pickers must still repaint
  }
}

/** Restores the saved mode at start-up, before the first real screen paints. */
export async function loadThemeMode(): Promise<void> {
  const saved = await readSavedMode();
  if (saved) applyThemeMode(saved);
}

export async function saveThemeMode(m: ThemeMode): Promise<void> {
  applyThemeMode(m);
  await writeSavedMode(m);
}

async function readSavedMode(): Promise<ThemeMode | null> {
  try {
    const { getThemeMode } = await import("./storage");
    const raw = await getThemeMode();
    return raw === "dark" || raw === "light" || raw === "system" ? raw : null;
  } catch {
    return null;
  }
}

async function writeSavedMode(m: ThemeMode): Promise<void> {
  try {
    const { setThemeMode } = await import("./storage");
    await setThemeMode(m);
  } catch {
    /* not saving is harmless — the choice just starts over next launch */
  }
}

/**
 * Live palette: `color.bg` reads the current scheme at the moment of access.
 * Palettes are frozen plain objects behind the proxy, so this is safe and cheap.
 */
export const color: Palette = new Proxy({} as Palette, {
  get: (_target, key: string) => THEMES[currentScheme][key as keyof Palette],
});

/** The 4pt spacing scale. */
export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  // The 2026-10 mobile spec's card geometry (web: `rounded-2xl`). Cards move to
  // 16 while sheets keep xl2 (24), so a card and the sheet above it still read
  // as different layers.
  card: 16,
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
 * and falls back to the top of the scale). Follows the current scheme.
 * Category colours live in src/geo.ts — the one category table.
 */
export function sevColor(level: number): string {
  const n = Math.min(Math.max(Math.round(level) || 1, 1), 4);
  return THEMES[currentScheme][`sev${n}` as "sev1" | "sev2" | "sev3" | "sev4"];
}

/**
 * Subscribes the calling component to theme changes (re-renders it on a switch)
 * and hands over the mode control. Call once at the top of every screen and any
 * component that paints with `color`.
 */
export function useTheme(): {
  scheme: Scheme;
  mode: ThemeMode;
  colors: Palette;
  setMode: (m: ThemeMode) => Promise<void>;
} {
  // Snapshot = "scheme:mode" so a mode change that resolves to the same scheme
  // (Daylight → Match system on a light phone) still repaints the pickers.
  useSyncExternalStore(subscribeTheme, () => `${getScheme()}:${getMode()}`);
  const scheme = getScheme();
  return { scheme, mode: getMode(), colors: THEMES[scheme], setMode: saveThemeMode };
}

export default { color, radius, type, space, easing };
