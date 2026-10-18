"use client";

/**
 * Sun/Moon theme toggle (Master Build Section 4). Persists to localStorage
 * (nb_mode — the same key the site has always used) and flips the
 * data-mode attribute before paint via the boot script in the root layout.
 *
 * Hydration-safe: the server renders the site default (the value SSR used for
 * data-mode), and an rAF callback syncs to the visitor's saved preference
 * right after mount (the repo's pattern — never setState in the effect body).
 */
import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ModeKey = "dark" | "light";

function readMode(): ModeKey {
  const v = document.documentElement.getAttribute("data-mode");
  return v === "light" ? "light" : "dark";
}

export function ThemeToggle({ defaultMode = "dark" }: { defaultMode?: ModeKey }) {
  const [mode, setMode] = useState<ModeKey>(defaultMode);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMode(readMode()));
    const onMode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "dark" || detail === "light") setMode(detail);
    };
    window.addEventListener("nb:mode", onMode);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("nb:mode", onMode);
    };
  }, []);

  const flip = useCallback(() => {
    const next: ModeKey = mode === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("nb_mode", next);
    } catch {
      /* private mode — the switch still works for this visit */
    }
    document.documentElement.setAttribute("data-mode", next);
    try {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", next === "light" ? "#F8FAFC" : "#040810");
    } catch {
      /* never break the page for a meta tag */
    }
    setMode(next);
    window.dispatchEvent(new CustomEvent("nb:mode", { detail: next }));
  }, [mode]);

  const dark = mode === "dark";
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="nbx-btn nbx-btn-ghost h-11 w-11 rounded-full p-0"
    >
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
