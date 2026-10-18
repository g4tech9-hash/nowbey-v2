"use client";

import { usePulseTheme } from "@/ui/pulse/theme";

/**
 * The header's brightness switch.
 *
 * It is a thin wrapper on `usePulseTheme` now, and that is the point: the
 * button in the header, the picker on Settings and the ⌘K command all read and
 * write the same three things — localStorage, `document.documentElement.dataset
 * .theme` and `meta[name="theme-color"]` — through one function, so they cannot
 * disagree. `defaultMode` is still accepted (the server renders the admin's
 * default before paint) so every existing call site keeps compiling.
 */
export function ModeToggle({ defaultMode: _defaultMode }: { defaultMode?: "dark" | "light" } = {}) {
  const { theme, flip } = usePulseTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode — warm sand, for daylight" : "Dark mode — true black, for a phone in an outage"}
      className="nb-btn nb-btn-ghost pulse-tight"
      style={{ width: 44, minWidth: 44, height: 44, padding: 0, borderRadius: "var(--pulse-shape-pill)" }}
    >
      {dark ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 14.5A8.4 8.4 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
        </svg>
      )}
    </button>
  );
}
