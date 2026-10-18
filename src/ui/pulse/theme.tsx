"use client";

import { useCallback, useEffect, useState } from "react";
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
export function usePulseTheme() {
  // The boot script in layout.tsx already set data-theme before paint, so the
  // first client read is authoritative and there is no flash to correct.
  const [theme, setTheme] = useState<PulseTheme>(() => readTheme() ?? "dark");

  useEffect(() => {
    const onTheme = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "dark" || detail === "light") setTheme(detail);
    };
    window.addEventListener(PULSE_THEME_EVENT, onTheme);
    return () => window.removeEventListener(PULSE_THEME_EVENT, onTheme);
  }, []);

  // Keep the attribute in sync if the server re-renders with a different default.
  useEffect(() => {
    const applied = readTheme();
    if (applied && applied !== theme) setTheme(applied);
  }, [theme]);

  const set = useCallback((next: PulseTheme) => {
    applyTheme(next);
    setTheme(next);
  }, []);

  return { theme, setTheme: set, flip: () => setTheme(toggleTheme()) };
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
  const [prefs, setPrefs] = useState({
    motion: "full" as PulseMotion,
    textSize: "default" as PulseTextSize,
    contrast: "default" as PulseContrast,
    lowData: false,
  });

  useEffect(() => {
    setPrefs({ motion: readMotion(), textSize: readTextSize(), contrast: readContrast(), lowData: readLowData() });
  }, []);

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
                onClick={() => {
                  const next = !value;
                  setPrefs((p) => ({ ...p, [row.key]: next }));
                  applyLowData(Boolean(next));
                }}
              />
            ) : (
              <span className="pulse-seg" role="group" aria-label={row.label}>
                {row.options!.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={value === o.value}
                    onClick={() => {
                      setPrefs((p) => ({ ...p, [row.key]: o.value }));
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

export function useLiveMode(fallback = true) {
  const [live, setLive] = useState(fallback);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LIVE_KEY);
      if (stored === "on" || stored === "off") setLive(stored === "on");
    } catch {
      /* ignore */
    }
  }, []);
  const set = useCallback((next: boolean) => {
    setLive(next);
    try {
      localStorage.setItem(LIVE_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nb:live", { detail: next }));
  }, []);
  return { live, setLive: set };
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
