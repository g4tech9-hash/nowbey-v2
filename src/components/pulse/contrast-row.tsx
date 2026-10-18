"use client";

import { useEffect, useState } from "react";

/**
 * A measured contrast pair, not an asserted one.
 *
 * The design doc says "every text/background pair meets 4.5:1". A claim like
 * that rots the moment someone tints a token, so the styleguide computes it:
 * resolve both custom properties through `getComputedStyle` (which is the theme
 * the visitor is actually looking at), run the WCAG relative-luminance maths, and
 * print the ratio with a pass/fail. On the server there is nothing to resolve, so
 * it renders a stable placeholder rather than inventing a number.
 */
export function ContrastRow({ label, fg, bg, min = 4.5 }: { label: string; fg: string; bg: string; min?: number }) {
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const f = resolve(cs, fg);
    const b = resolve(cs, bg);
    if (f && b) setRatio(contrast(f, b));
  }, [fg, bg]);

  const ok = ratio !== null && ratio >= min;
  return (
    <div className="pulse-contrast-row" data-pass={ratio === null ? undefined : ok ? "true" : "false"}>
      <span className="min-w-0 flex-1 text-[12.5px] text-secondary">{label}</span>
      <span className="flex flex-none items-center gap-2">
        <span className="pulse-contrast-swatch" style={{ background: `var(${bg})` }} aria-hidden>
          <span style={{ color: `var(${fg})`, fontWeight: 800 }}>Aa</span>
        </span>
        <code className="font-mono text-[11.5px] tabular-nums text-tertiary">
          {ratio === null ? "measuring…" : `${ratio.toFixed(2)}:1`}
        </code>
        <span className="nb-label">{ratio === null ? `needs ${min}:1` : ok ? "pass" : "below"}</span>
      </span>
    </div>
  );
}

/** Follow a var() chain until a colour literal, resolving through the browser. */
function resolve(cs: CSSStyleDeclaration, name: string): [number, number, number] | null {
  const raw = cs.getPropertyValue(`--${name.replace(/^--/, "")}`).trim();
  if (!raw) return null;
  // Layer 3 aliases point at other aliases; resolve one hop when needed.
  const varRef = raw.match(/^var\((--[^),\s]+)/);
  const value = varRef ? cs.getPropertyValue(varRef[1]).trim() : raw;
  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const m = computed.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function lum([r, g, b]: [number, number, number]) {
  const ch = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(fg: [number, number, number], bg: [number, number, number]) {
  const a = lum(fg);
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
