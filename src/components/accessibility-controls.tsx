"use client";

import { useEffect, useState } from "react";

type Prefs = { simple: boolean; lowData: boolean };

function apply(p: Prefs) {
  const root = document.documentElement;
  root.dataset.simple = p.simple ? "true" : "false";
  root.dataset.lowData = p.lowData ? "true" : "false";
  try {
    localStorage.setItem("nb_simple", p.simple ? "1" : "0");
    localStorage.setItem("nb_low_data", p.lowData ? "1" : "0");
  } catch {}
}

export function AccessibilityControls({ compact = false }: { compact?: boolean }) {
  const [prefs, setPrefs] = useState<Prefs>({ simple: false, lowData: false });

  useEffect(() => {
    let simple = false;
    let lowData = false;
    try {
      simple = localStorage.getItem("nb_simple") === "1";
      lowData = localStorage.getItem("nb_low_data") === "1";
    } catch {}
    const frame = requestAnimationFrame(() => setPrefs({ simple, lowData }));
    return () => cancelAnimationFrame(frame);
  }, []);

  const change = (next: Prefs) => {
    setPrefs(next);
    apply(next);
  };

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "space-y-3"}>
      <PreferenceButton
        active={prefs.simple}
        label="Simple view"
        detail="Larger words, larger buttons and less visual clutter."
        onClick={() => change({ ...prefs, simple: !prefs.simple })}
        compact={compact}
      />
      <PreferenceButton
        active={prefs.lowData}
        label="Use less data"
        detail="Avoids decorative imagery and reduces map-heavy presentation."
        onClick={() => change({ ...prefs, lowData: !prefs.lowData })}
        compact={compact}
      />
    </div>
  );
}

function PreferenceButton({ active, label, detail, onClick, compact }: { active: boolean; label: string; detail: string; onClick: () => void; compact: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${compact ? "rounded-full px-3 py-1.5 text-[12px]" : "flex min-h-[58px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left"} border font-bold transition ${active ? "border-tide-400/50 bg-tide-500/18 text-tide-300" : "hairline bg-white/5 text-sand-100 hover:bg-white/10"}`}
    >
      <span aria-hidden className={`${compact ? "inline-block" : "grid h-8 w-8 shrink-0 place-items-center"} rounded-full ${active ? "bg-tide-500 text-abyss-950" : "bg-white/10"}`}>
        {active ? "✓" : "○"}
      </span>
      <span>
        <span className="block">{label}</span>
        {!compact ? <span className="mt-0.5 block text-[12px] font-normal leading-snug text-ink-400">{detail}</span> : null}
      </span>
    </button>
  );
}
