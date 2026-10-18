/**
 * PULSE PREFS — the only place a device-local preference is read or written.
 *
 * Everything here is localStorage + a data attribute on <html>, applied before
 * paint by the boot script in src/app/layout.tsx so a returning visitor never
 * sees the wrong theme flash. Nothing here talks to the server: the admin's
 * *default* is server-rendered, the visitor's *choice* always wins locally.
 *
 * Storage keys keep their pre-Pulse names (`nb_mode`, `nb_simple`,
 * `nb_low_data`) on purpose — 30k+ phones already hold those values and a
 * redesign must not quietly reset someone's accessibility settings.
 */

export type PulseTheme = "dark" | "light";
export type PulseMotion = "full" | "off";
export type PulseTextSize = "default" | "large";
export type PulseContrast = "default" | "more";

export const PULSE_KEYS = {
  theme: "nb_mode",
  motion: "nb_motion",
  textSize: "nb_textsize",
  contrast: "nb_contrast",
  simple: "nb_simple",
  lowData: "nb_low_data",
  live: "nb_live",
  saved: "nb_saved",
  island: "nb_island",
} as const;

/** Layer 2's own surface colour, for <meta name="theme-color">. */
export const PULSE_META_COLOR: Record<PulseTheme, string> = {
  dark: "#000000",
  light: "#f7f3ec",
};

export const PULSE_THEME_EVENT = "nb:theme";
/**
 * Emitted by every preference writer, not just the theme.
 *
 * A tab never receives its own `storage` events, so without this the motion,
 * text-size, contrast and live-mode controls would only agree with each other
 * across a reload — and `usePrefStore` in src/lib/pulse/store.ts listens for it
 * so a change in the Settings picker repaints the header toggle in the same
 * frame.
 */
export const PULSE_PREF_EVENT = "nb:prefs";

function isTheme(v: unknown): v is PulseTheme {
  return v === "dark" || v === "light";
}

export function readTheme(): PulseTheme | null {
  if (typeof document === "undefined") return null;
  const attr = document.documentElement.dataset.theme;
  if (isTheme(attr)) return attr;
  try {
    const stored = localStorage.getItem(PULSE_KEYS.theme);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Writes one preference and its attribute. Called from effects only, so it is
 * safe on the server (returns early) and never disagrees with the boot script.
 */
function setAttr(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (value === null) delete root.dataset[name];
  else root.dataset[name] = value;
}

function persist(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode, a full quota, a locked-down webview: the preference still
       applies for this visit, it just does not survive a reload */
  }
}

/**
 * Applies light or dark. Also mirrors onto the legacy `data-mode` attribute and
 * dispatches `nb:theme`, because three generations of components listen for that
 * event name (ModeToggle, the map's tile tint, the splash screen).
 */
export function applyTheme(theme: PulseTheme, opts: { persist?: boolean } = {}) {
  if (typeof document === "undefined") return;
  setAttr("theme", theme);
  setAttr("mode", theme); // legacy mirror — remove once nothing reads data-mode
  if (opts.persist !== false) persist(PULSE_KEYS.theme, theme);
  try {
    const color = PULSE_META_COLOR[theme];
    // Next renders one theme-color meta per media query; both are updated so a
    // OS chrome recolour never disagrees with the page.
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.setAttribute("content", color);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
    }
  } catch {
    /* never break the page over a meta tag */
  }
  window.dispatchEvent(new CustomEvent(PULSE_THEME_EVENT, { detail: theme }));
}

/** One line, so a writer never forgets that a second subscriber exists. */
function notifyPrefs() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PULSE_PREF_EVENT));
}

export function toggleTheme(): PulseTheme {
  const next: PulseTheme = readTheme() === "light" ? "dark" : "light";
  applyTheme(next);
  return next;
}

/** Motion is a preference, not a decoration: honour it the same way. */
export function applyMotion(motion: PulseMotion) {
  setAttr("motion", motion === "off" ? "off" : null);
  persist(PULSE_KEYS.motion, motion === "off" ? "off" : null);
  notifyPrefs();
}

export function readMotion(): PulseMotion {
  if (typeof window === "undefined") return "full";
  try {
    if (localStorage.getItem(PULSE_KEYS.motion) === "off") return "off";
  } catch {
    /* ignore */
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "off" : "full";
  } catch {
    return "full";
  }
}

export function applyTextSize(size: PulseTextSize) {
  setAttr("textsize", size === "large" ? "large" : null);
  setAttr("simple", size === "large" ? "true" : "false"); // legacy alias
  persist(PULSE_KEYS.textSize, size === "large" ? "large" : null);
  persist(PULSE_KEYS.simple, size === "large" ? "1" : "0");
  notifyPrefs();
}

export function readTextSize(): PulseTextSize {
  if (typeof document === "undefined") return "default";
  const attr = document.documentElement.dataset.textsize;
  if (attr === "large") return "large";
  try {
    return localStorage.getItem(PULSE_KEYS.textSize) === "large" || localStorage.getItem(PULSE_KEYS.simple) === "1"
      ? "large"
      : "default";
  } catch {
    return "default";
  }
}

export function applyContrast(contrast: PulseContrast) {
  setAttr("contrast", contrast === "more" ? "more" : null);
  persist(PULSE_KEYS.contrast, contrast === "more" ? "more" : null);
  notifyPrefs();
}

export function readContrast(): PulseContrast {
  if (typeof document === "undefined") return "default";
  const attr = document.documentElement.dataset.contrast;
  if (attr === "more") return "more";
  try {
    return localStorage.getItem(PULSE_KEYS.contrast) === "more" ? "more" : "default";
  } catch {
    return "default";
  }
}

export function applyLowData(on: boolean) {
  setAttr("lowData", on ? "true" : "false");
  persist(PULSE_KEYS.lowData, on ? "1" : "0");
  notifyPrefs();
}

export function readLowData(): boolean {
  try {
    return localStorage.getItem(PULSE_KEYS.lowData) === "1";
  } catch {
    return false;
  }
}

/**
 * The pre-paint script. Inlined with the request nonce (see src/lib/csp.ts) and
 * kept side-effect-free: a throw here must never take the page down, hence the
 * single try/catch around all of it. Order matters — theme first, because
 * everything else is measured against the painted surface.
 */
export function pulseBootScript(defaultTheme: PulseTheme, opts: { splash?: boolean } = {}): string {
  const splash = opts.splash
    ? `try{if(sessionStorage.getItem("nb_splash"))document.documentElement.setAttribute("data-splash-seen","1")}catch(e){}`
    : "";
  return [
    `try{(function(){var d=${JSON.stringify(defaultTheme)};var m=null;`,
    `try{m=localStorage.getItem(${JSON.stringify(PULSE_KEYS.theme)})}catch(e){}`,
    `if(m!=="dark"&&m!=="light"){m=d;`,
    `if(!m||(m!=="dark"&&m!=="light")){try{m=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}catch(e){m="dark"}}}`,
    `var r=document.documentElement;`,
    // data-theme is the Pulse contract; data-mode stays as the legacy mirror.
    `r.setAttribute("data-theme",m);r.setAttribute("data-mode",m);`,
    // Motion, text size, contrast and data weight are all read off the root too.
    `var g=function(k){try{return localStorage.getItem(k)}catch(e){return null}};`,
    `if(g("nb_motion")==="off"||(g("nb_motion")===null&&matchMedia("(prefers-reduced-motion: reduce)").matches))r.setAttribute("data-motion","off");`,
    `var ts=g("nb_textsize")==="large"||g("nb_simple")==="1";`,
    `r.setAttribute("data-textsize",ts?"large":"default");r.setAttribute("data-simple",ts?"true":"false");`,
    `r.setAttribute("data-contrast",g("nb_contrast")==="more"?"more":"default");`,
    `r.setAttribute("data-low-data",g("nb_low_data")==="1"?"true":"false");`,
    `})();}catch(e){}`,
    splash,
  ].join("");
}
