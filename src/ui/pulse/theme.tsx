"use client";

import { useCallback } from "react";
import { usePrefStore } from "@/lib/pulse/store";
import { Moon, Radio, Sun } from "lucide-react";
import {
  applyContrast,
  applyLowData,
  applyMotion,
  applyTextSize,
  applyTheme,
  readContrast,
  readLowData,
  readMotion,
  readTextSize,
  readTheme,
  toggleTheme,
  PULSE_PREF_EVENT,
  PULSE_THEME_EVENT,
  type PulseContrast,
  type PulseMotion,
  type PulseTextSize,
  type PulseTheme,
} from "@/lib/pulse/prefs";
import { CatBadge } from "./badge";

/**
 * The theme half of the design system: read the applied value, write it, and
 * keep the three things that must agree in step — localStorage,
 * `document.documentElement.dataset.theme` and `meta[name="theme-color"]`.
 *
 * `usePulseTheme` is the single hook every control uses, so the header toggle,
 * the Settings picker and the palette can never show different answers.
 */
export function usePulseTheme(fallback: PulseTheme = "dark") {
  // Reading the applied value through the store means there is no "first render
  // with the default, second render with the truth": a header toggle and the
  // Settings picker show the same answer on the frame they mount. The writers in
  // prefs.ts dispatch the event, so a change anywhere repaints everywhere.
  const theme = usePrefStore(readTheme, fallback, [PULSE_THEME_EVENT, PULSE_PREF_EVENT]);

  // applyTheme already persists, repaints the root attribute and updates
  // meta[name="theme-color"]; re-storing its result in local state was a third
  // copy of the same fact, and the one that could drift.
  const set = useCallback((next: PulseTheme) => applyTheme(next), []);

  return { theme, setTheme: set, flip: () => toggleTheme() };
}

/** Sun/moon icon button for the header. Announces itself to a screen reader. */
export function ThemeToggle({ onAnnounce }: { onAnnounce?: (message: string) => void } = {}) {
  const { theme, flip } = usePulseTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => {
        flip();
        onAnnounce?.(dark ? "Light theme on" : "Dark theme on");
      }}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme — warm sand, for daylight" : "Dark theme — true black, for a phone in a power cut"}
      className="nb-btn nb-btn-ghost pulse-tight"
      style={{ width: 44, minWidth: 44, padding: 0, borderRadius: "var(--pulse-shape-pill)" }}
    >
      {dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
      <span className="sr-only">{dark ? "Switch to light theme" : "Switch to dark theme"}</span>
    </button>
  );
}

/** The Settings picker: two named cards, not a mystery switch. */
export function ThemePicker() {
  const { theme, setTheme } = usePulseTheme();
  const options: { value: PulseTheme; label: string; blurb: string; icon: React.ReactNode }[] = [
    { value: "dark", label: "Night", blurb: "True black for OLED, glowing teal signals, easy on a phone in an outage.", icon: <Moon size={16} aria-hidden /> },
    { value: "light", label: "Daylight", blurb: "Warm sand paper, deep teal ink, its own category hues — not an inverted night.", icon: <Sun size={16} aria-hidden /> },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Theme">
      {options.map((o) => {
        const on = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(o.value)}
            className="pulse-card pulse-card-pad pulse-press text-start"
            style={on ? { borderColor: "var(--border-accent)", boxShadow: "var(--pulse-glow-teal)" } : undefined}
          >
            <span className="flex items-center gap-2 text-[13.5px] font-extrabold text-primary">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-default bg-hover text-accent">{o.icon}</span>
              {o.label}
              {on ? <span className="nb-label ml-auto text-accent">On</span> : null}
            </span>
            <span className="mt-2 block text-[12.5px] leading-[1.6] text-tertiary">{o.blurb}</span>
            <span className="mt-3 flex gap-1.5">
              {["var(--cat-flooding)", "var(--cat-power)", "var(--cat-road)", "var(--cat-safety)"].map((t) => (
                <span key={t} className="h-2 w-8 rounded-full" style={{ background: t }} aria-hidden />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Every accessibility preference Pulse owns. The names of the setters are the
 * contract in src/lib/pulse/prefs.ts, so a change here is a change everywhere.
 */
export function AccessibilityPicker() {
  // Four primitives, not one object: useSyncExternalStore compares snapshots with
  // Object.is, so a fresh `{…}` on every read would look like a change forever.
  const motion = usePrefStore(readMotion, "full" as PulseMotion, [PULSE_PREF_EVENT]);
  const textSize = usePrefStore(readTextSize, "default" as PulseTextSize, [PULSE_PREF_EVENT]);
  const contrast = usePrefStore(readContrast, "default" as PulseContrast, [PULSE_PREF_EVENT]);
  const lowData = usePrefStore(readLowData, false, [PULSE_PREF_EVENT]);
  // The apply* calls below are the whole write path: they persist, repaint the
  // root, and dispatch PULSE_PREF_EVENT, which is what makes these four reads
  // current again. Holding a copy in state here would be a second answer to
  // keep in sync — and the row objects still read `prefs`, so that is the name.
  const prefs = { motion, textSize, contrast, lowData };

  const rows: { key: keyof typeof prefs; label: string; detail: string; type: "switch" | "select"; options?: { value: string; label: string }[] }[] = [
    { key: "motion", label: "Animations", detail: "Spring entrances, button presses and the ticker. Turn off for less motion.", type: "select", options: [{ value: "full", label: "Full" }, { value: "off", label: "Reduced" }] },
    { key: "textSize", label: "Text size", detail: "Larger type across the site, and bigger tap targets.", type: "select", options: [{ value: "default", label: "Normal" }, { value: "large", label: "Large" }] },
    { key: "contrast", label: "Contrast", detail: "Stronger edges and lighter panels for bright daylight.", type: "select", options: [{ value: "default", label: "Normal" }, { value: "more", label: "High" }] },
    { key: "lowData", label: "Use less data", detail: "Skips decorative imagery and heavy map layers.", type: "switch" },
  ];

  return (
    <ul className="grid gap-2">
      {rows.map((row) => {
        const value = prefs[row.key];
        return (
          <li key={row.key} className="pulse-card-inner flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-[12rem] flex-1">
              <span className="block text-[13.5px] font-bold text-primary">{row.label}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-tertiary">{row.detail}</span>
            </span>
            {row.type === "switch" ? (
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(value)}
                aria-label={`${row.label} — ${row.detail}`}
                className="nb-toggle"
                onClick={() => applyLowData(!value)}
              />
            ) : (
              <span className="pulse-seg" role="group" aria-label={row.label}>
                {row.options!.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={value === o.value}
                    onClick={() => {
                      if (row.key === "motion") applyMotion(o.value as PulseMotion);
                      if (row.key === "textSize") applyTextSize(o.value as PulseTextSize);
                      if (row.key === "contrast") applyContrast(o.value as PulseContrast);
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Live mode: the feed polls while it is on and stops when it is off. Default on
 * for the island the user is on, remembered per device, and announced, because
 * "the feed stopped moving" is exactly the thing you must not have to guess.
 */
export const LIVE_KEY = "nb_live";

export const LIVE_EVENT = "nb:live";

export function useLiveMode(fallback = true) {
  // "on"/"off" strings, not "true"/"false": the key predates Pulse and a member
  // who set it in the console should still be honoured. Read through the store so
  // the toggle reflects the saved value on the frame it appears, and the feed
  // does not poll for a beat before it learns you turned it off.
  const live = usePrefStore(readLive, fallback, [LIVE_EVENT, PULSE_PREF_EVENT]);
  const set = useCallback((next: boolean) => {
    try {
      localStorage.setItem(LIVE_KEY, next ? "on" : "off");
    } catch {
      /* a device that will not store is a device that keeps polling this visit */
    }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(LIVE_EVENT, { detail: next }));
  }, []);
  return { live, setLive: set };
}

function readLive(): boolean | null {
  const stored = localStorage.getItem(LIVE_KEY);
  return stored === "on" ? true : stored === "off" ? false : null;
}

export function LiveModeToggle({ onAnnounce }: { onAnnounce?: (m: string) => void } = {}) {
  const { live, setLive } = useLiveMode();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={live}
      aria-label="Live mode — new signals arrive at the top of the feed"
      onClick={() => {
        setLive(!live);
        onAnnounce?.(live ? "Live mode off. The feed will not update by itself." : "Live mode on. New signals arrive at the top.");
      }}
      className="pulse-chip"
      data-on={live ? "true" : undefined}
    >
      <Radio size={13} aria-hidden />
      {live ? "Live" : "Paused"}
    </button>
  );
}

/** Small helper the styleguide and tests use to prove the badge/colour link. */
export function CategoryLegend({ categories }: { categories: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {categories.map((c) => (
        <CatBadge key={c} category={c} size="sm" />
      ))}
    </span>
  );
}
