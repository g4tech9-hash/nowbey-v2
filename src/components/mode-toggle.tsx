"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { isModeKey, type ModeKey } from "@/lib/themes";

const KEY = "nb_mode";

function currentMode(): ModeKey {
  if (typeof document === "undefined") return "dark";
  const v = document.documentElement.getAttribute("data-mode");
  return isModeKey(v) ? v : "dark";
}

/** Sun/moon switch. Stores the choice locally so it survives reloads and wins over the site default. */
export function ModeToggle({ defaultMode }: { defaultMode: ModeKey }) {
  // Boot script already set data-mode before paint, so reading it lazily is correct on first client render.
  const [mode, setMode] = useState<ModeKey>(() => (typeof document === "undefined" ? defaultMode : currentMode()));

  useEffect(() => {
    const onMode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (isModeKey(detail)) setMode(detail);
    };
    window.addEventListener("nb:mode", onMode);
    return () => window.removeEventListener("nb:mode", onMode);
  }, []);

  const flip = useCallback(() => {
    const next: ModeKey = mode === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode etc. — the switch still works for this visit */
    }
    document.documentElement.setAttribute("data-mode", next);
    try {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", next === "light" ? "var(--color-ink)" : "var(--color-panel)");
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
      className="grid h-10 w-10 place-items-center rounded-full border hairline bg-white/5 text-sand-100 transition hover:bg-white/10 sm:h-9 sm:w-9"
    >
      {dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
    </button>
  );
}
