/**
 * The JS mirror of src/styles/pulse/tokens.css.
 *
 * Anything that cannot be expressed in CSS — a canvas map layer, an SVG marker
 * fill, a Leaflet divIcon, an inline `style` prop built in a server component,
 * a test that wants to assert a value — reads it from here instead of writing a
 * hex literal. That keeps "no hardcoded colours in components" enforceable:
 * there is exactly one place a raw value is allowed to appear, and it is not a
 * component.
 *
 * The values are the *semantic* names; the hex you see is the dark (default)
 * theme's resolution. Never use these for something that must follow the
 * theme at runtime — use `var(--token)` in CSS for that. This map exists for
 * the cases where CSS custom properties cannot reach.
 */
export const PULSE_SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const PULSE_SHAPE = {
  xs: 8,
  sm: 14,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const PULSE_MOTION = {
  /** The one entrance curve: a spring, not a fade. */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inout: "cubic-bezier(0.65, 0, 0.35, 1)",
  duration: { tap: 120, state: 200, enter: 340, sweep: 560 },
  /**
   * Expressed the way a motion library would take it, so a page that later
   * adopts one can pass these straight through. The CSS layer renders this
   * exact response as `--pulse-ease-spring` + `--pulse-duration-enter`.
   */
  springConfig: { type: "spring", stiffness: 140, damping: 22 },
  shimmer: 1400,
} as const;

export const PULSE_ELEVATION = {
  1: "0 1px 2px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.035) inset",
  2: "0 12px 30px -12px rgba(0,0,0,.78), 0 1px 0 rgba(255,255,255,.055) inset",
  3: "0 30px 70px -22px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.075) inset",
  glowTeal: "0 0 0 1px rgba(63,214,192,.34), 0 12px 40px -12px rgba(63,214,192,.5)",
  glowCoral: "0 0 0 1px rgba(255,127,107,.4), 0 12px 40px -12px rgba(255,127,107,.46)",
  glowAmber: "0 0 0 1px rgba(248,207,107,.38), 0 12px 40px -12px rgba(248,207,107,.4)",
} as const;

/** Layer 2, per theme. Both themes must satisfy WCAG 2.2 AA from these values. */
export const PULSE_THEME = {
  dark: {
    "bg-base": "#000000",
    "bg-sunken": "#000000",
    "bg-raised": "#0a1116",
    "bg-overlay": "rgba(5,11,15,0.88)",
    "bg-elevated": "#101b22",
    "bg-glass": "rgba(10,17,22,0.62)",
    "bg-hover": "#16252e",
    "bg-active": "#1e313c",
    "bg-selected": "rgba(63,214,192,0.14)",
    "text-primary": "#f3f1ea",
    "text-secondary": "#b9c8c9",
    "text-tertiary": "#92a6a9",
    "text-inverse": "#06141b",
    "text-accent": "#6eeadb",
    "text-on-accent": "#04211d",
    "border-subtle": "rgba(148,206,202,0.10)",
    "border-default": "rgba(148,206,202,0.18)",
    "border-strong": "rgba(160,214,210,0.34)",
    "border-accent": "rgba(63,214,192,0.55)",
    accent: "#3fd6c0",
    "accent-hover": "#6eeadb",
    "accent-muted": "rgba(63,214,192,0.16)",
    "accent-ink": "#04211d",
    danger: "#ff7f6b",
    "danger-muted": "rgba(255,127,107,0.16)",
    warning: "#f8cf6b",
    "warning-muted": "rgba(248,207,107,0.16)",
    info: "#6fd0ff",
    "info-muted": "rgba(111,208,255,0.16)",
    success: "#afe85f",
    "success-muted": "rgba(175,232,95,0.14)",
  },
  light: {
    "bg-base": "#f7f3ec",
    "bg-sunken": "#efe7d9",
    "bg-raised": "#ffffff",
    "bg-overlay": "rgba(253,251,246,0.92)",
    "bg-elevated": "#ffffff",
    "bg-glass": "rgba(255,255,255,0.76)",
    "bg-hover": "#ece3d3",
    "bg-active": "#e2d6c1",
    "bg-selected": "rgba(11,111,100,0.12)",
    "text-primary": "#16232b",
    "text-secondary": "#3d4f57",
    "text-tertiary": "#56696f",
    "text-inverse": "#fdfbf6",
    "text-accent": "#075e55",
    "text-on-accent": "#ffffff",
    "border-subtle": "rgba(52,38,20,0.10)",
    "border-default": "rgba(52,38,20,0.18)",
    "border-strong": "rgba(52,38,20,0.32)",
    "border-accent": "rgba(11,111,100,0.45)",
    accent: "#0b6f64",
    "accent-hover": "#095b52",
    "accent-muted": "rgba(11,111,100,0.12)",
    "accent-ink": "#ffffff",
    danger: "#b03328",
    "danger-muted": "rgba(176,51,40,0.10)",
    warning: "#8a5b06",
    "warning-muted": "rgba(138,91,6,0.12)",
    info: "#0a5f8c",
    "info-muted": "rgba(10,95,140,0.10)",
    success: "#1c6b45",
    "success-muted": "rgba(28,107,69,0.12)",
  },
} as const;

export type PulseThemeKey = keyof typeof PULSE_THEME;
export type PulseSemanticToken = keyof (typeof PULSE_THEME)["dark"];

/**
 * Category signal hues for canvas/SVG consumers (the map, the landing mockups).
 * `dark` is the emissive ramp, `light` a deeper one that clears 4.5:1 on paper.
 * CSS never reads this: it uses `var(--cat-<key>)`.
 */
export const PULSE_CATEGORY_HUES = {
  flood: { dark: "#6fd0ff", light: "#0a5f8c", signal: "flooding" },
  storm: { dark: "#ffe39a", light: "#7a5300", signal: "flooding" },
  power: { dark: "#f8cf6b", light: "#7a5300", signal: "power" },
  water: { dark: "#35d6e6", light: "#05606e", signal: "water" },
  crime: { dark: "#ff8ba6", light: "#a01c3c", signal: "safety" },
  road: { dark: "#ff9d8a", light: "#8a4106", signal: "road" },
  marine: { dark: "#6eeadb", light: "#0a6a5c", signal: "marine" },
  fire: { dark: "#ff7f6b", light: "#a11d12", signal: "safety" },
  health: { dark: "#b39cff", light: "#5b2ec4", signal: "health" },
  trash: { dark: "#afe85f", light: "#45680b", signal: "sanitation" },
  event: { dark: "#ff8fb8", light: "#a3265c", signal: "safety" },
  notice: { dark: "#9fb4bb", light: "#4c5a61", signal: "safety" },
  accident: { dark: "#ff9d8a", light: "#8a4106", signal: "road" },
} as const satisfies Record<string, { dark: string; light: string; signal: string }>;

export type PulseCategoryKey = keyof typeof PULSE_CATEGORY_HUES;

/** The eight signal families the design language names, in both themes. */
export const PULSE_SIGNALS = ["flooding", "power", "road", "water", "safety", "marine", "health", "sanitation"] as const;
export type PulseSignal = (typeof PULSE_SIGNALS)[number];

/** Layer 3, resolved for canvas consumers that need a concrete value. */
export const PULSE_COMPONENT = {
  dark: {
    "card-bg": "#0a1116",
    "chip-bg": "#16252e",
    "btn-primary-bg": "#3fd6c0",
    "btn-primary-text": "#04211d",
    "input-bg": "#000000",
    "nav-active": "rgba(63,214,192,0.14)",
  },
  light: {
    "card-bg": "#ffffff",
    "chip-bg": "#efe7d9",
    "btn-primary-bg": "#0b6f64",
    "btn-primary-text": "#ffffff",
    "input-bg": "#efe7d9",
    "nav-active": "rgba(11,111,100,0.12)",
  },
} as const;

/** Flat token list — used by the token-failure guard and by tests. */
export const PULSE_CRITICAL_TOKENS: readonly PulseSemanticToken[] = [
  "bg-base",
  "bg-raised",
  "text-primary",
  "text-secondary",
  "text-tertiary",
  "border-default",
  "accent",
];

/**
 * Read a resolved semantic token off the live document. Returns null when the
 * stylesheet has not applied (the token-failure path every page must survive).
 */
export function readPulseToken(name: PulseSemanticToken): string | null {
  if (typeof document === "undefined") return null;
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return value.length > 0 ? value : null;
}

/** True when the token layer is live. Used by <PulseTokensGuard> below. */
export function pulseTokensReady(): boolean {
  return readPulseToken("text-primary") !== null;
}
