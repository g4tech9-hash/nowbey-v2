"use client";

import { useEffect, useState } from "react";

/**
 * One-tap Simple View in the header (larger words, larger buttons, less clutter). It shares its storage key and
 * root attribute with the full display options in the footer, so the two always agree.
 */
export function SimpleViewToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let simple = false;
    try {
      simple = localStorage.getItem("nb_simple") === "1";
    } catch {}
    const frame = requestAnimationFrame(() => setOn(simple));
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    document.documentElement.dataset.simple = next ? "true" : "false";
    try {
      localStorage.setItem("nb_simple", next ? "1" : "0");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title="Simple view: larger words and buttons, less clutter"
      className={`hidden min-h-[36px] items-center rounded-full border px-2.5 py-1 text-[12px] font-bold md:inline-flex ${
        on ? "border-accent-hover bg-accent/18 text-text-accent" : "hairline text-secondary hover:bg-white/5"
      }`}
    >
      Simple view
    </button>
  );
}
