/**
 * NOWBEY MARKETING — POST / STORY LAYOUT KIT
 * ---------------------------------------------------------------------------
 * The layout language for social assets, in the product's own grammar:
 * mono eyebrow with a pulsing dot → display headline with a teal emphasis →
 * one sentence of support copy → the app as the proof → wordmark + a real CTA.
 *
 * Everything is drawn in a 1080-wide coordinate space (the platform's own
 * size) so line breaks are predictable. Stories are 1080×1920, feed posts
 * 1080×1080, Reels covers 1080×1920.
 */

import { T, text, paragraph, rr, circle, line, measure, wrap, esc, mark, wordmark, wordmarkWidth, label, chip, hexA, rng } from "./ui.mjs";
import { AMBIENT } from "./tokens.mjs";

/* ------------------------------------------------------------ backgrounds */

/**
 * The "room": deep canvas, two ambient blooms, the 44px measurement grid
 * from the landing page, and a film of noise. Same recipe as
 * landing.module.css `.landing::before/::after`.
 */
export function bg(W, H, o = {}) {
  const { vignette = true, grid = true, noise = true, hue = "a" } = o;
  const bloomA = hue === "b" ? AMBIENT.ambientB : AMBIENT.ambientA;
  return `<defs>
      <radialGradient id="bloomA" cx="0.14" cy="-0.04" r="0.85">
        <stop offset="0" stop-color="${bloomA}" stop-opacity="1"/>
        <stop offset="0.6" stop-color="${bloomA}" stop-opacity="0.35"/>
        <stop offset="1" stop-color="${bloomA}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="bloomB" cx="0.92" cy="0.1" r="0.75">
        <stop offset="0" stop-color="${AMBIENT.ambientB}" stop-opacity="0.9"/>
        <stop offset="0.65" stop-color="${AMBIENT.ambientB}" stop-opacity="0.25"/>
        <stop offset="1" stop-color="${AMBIENT.ambientB}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vig" cx="0.5" cy="0.46" r="0.78">
        <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#04090d" stop-opacity="0.55"/>
      </radialGradient>
      <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
        <path d="M54 0H0V54" fill="none" stroke="${AMBIENT.gridLine}" stroke-width="1"/>
      </pattern>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="n"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="${T.bgBase}"/>
    <rect width="${W}" height="${H * 0.9}" fill="url(#bloomA)"/>
    <rect width="${W}" height="${H * 0.7}" fill="url(#bloomB)"/>
    ${grid ? `<rect width="${W}" height="${H}" fill="url(#grid)" opacity="0.85"/>` : ""}
    ${vignette ? `<rect width="${W}" height="${H}" fill="url(#vig)"/>` : ""}
    ${noise ? `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.05"/>` : ""}`;
}

/** Vertical dark scrim for type over a photograph. */
export function scrim(W, H, o = {}) {
  const { from = 0.2, to = 0.96, top = false } = o;
  const dir = top ? [0, 1] : [1, 0];
  return `<defs>
    <linearGradient id="scrimG" x1="0" y1="${dir[0]}" x2="0" y2="${dir[1]}">
      <stop offset="0" stop-color="${T.bgBase}" stop-opacity="0"/>
      <stop offset="0.35" stop-color="${T.bgBase}" stop-opacity="${from * 0.55}"/>
      <stop offset="0.7" stop-color="${T.bgBase}" stop-opacity="${from + (to - from) * 0.5}"/>
      <stop offset="1" stop-color="${T.bgBase}" stop-opacity="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#scrimG)"/>`;
}

/* ------------------------------------------------------------- typography */

/** Eyebrow: teal mono caps with a lit dot — the product's section marker. */
export const EYEBROW_H = 30;
export function eyebrow(str, x, y, o = {}) {
  const color = o.color ?? T.accent;
  return `<g>
    ${o.dot === false ? "" : circle(x + 5, y - 4, 5, colodr(color))}
    ${o.dot === false ? "" : circle(x + 5, y - 4, 10, "none", { stroke: hexA(color, 0.28) })}
    ${text(str.toUpperCase(), x + (o.dot === false ? 0 : 22), y, {
      family: T.font.mono,
      weight: 700,
      size: o.size ?? 21,
      fill: color,
      tracking: 0.22,
    })}
  </g>`;
}
const colodr = (c) => c;

/**
 * Headline. `em` words render in the accent, exactly like the landing's
 * <em> emphasis. Auto-fits down to the requested line count.
 */
export function headline(str, x, y, maxWidth, o = {}) {
  const {
    size = 78,
    min = 46,
    weight = 800,
    fill = T.textPrimary,
    accent = T.accent,
    lineHeight = 1.04,
    maxLines = 3,
    family = T.font.display,
  } = o;
  const parts = String(str).split("|"); // "plain | emphasised | plain"
  // Find the largest size that fits maxLines.
  let s = size;
  let layout = null;
  while (s >= min) {
    layout = layoutMixed(parts, family, weight, s, maxWidth);
    if (layout.lines.length <= maxLines) break;
    s -= 2;
  }
  let out = "";
  const capOffset = s * 0.79; // baseline from the top of the block
  layout.lines.forEach((lineParts, i) => {
    let cx = x;
    const yy = y + capOffset + i * s * lineHeight;
    lineParts.forEach((p) => {
      out += text(p.text, cx, yy, { family, weight, size: s, fill: p.em ? accent : fill, tracking: -0.03 });
      cx += measure(p.text, family, weight, s, -0.03) + (p.space ? measure(" ", family, weight, s, -0.03) : 0);
    });
  });
  return {
    svg: out,
    height: capOffset + (layout.lines.length - 1) * s * lineHeight + s * 0.24,
    size: s,
    lines: layout.lines.length,
  };
}

function layoutMixed(parts, family, weight, size, maxWidth) {
  // tokens: {text, em, spaceAfter}
  const tokens = [];
  parts.forEach((p, i) => {
    const words = p.trim().split(/\s+/).filter(Boolean);
    words.forEach((w, j) => tokens.push({ text: w, em: i % 2 === 1, space: true }));
  });
  const lines = [];
  let cur = [];
  let curW = 0;
  const spaceW = measure(" ", family, weight, size, -0.03);
  for (const tk of tokens) {
    const w = measure(tk.text, family, weight, size, -0.03);
    if (curW + w > maxWidth && cur.length) {
      // trim the trailing space of the previous token
      cur[cur.length - 1] = { ...cur[cur.length - 1], space: false };
      lines.push(cur);
      cur = [];
      curW = 0;
    }
    cur.push(tk);
    curW += w + spaceW;
  }
  if (cur.length) {
    cur[cur.length - 1] = { ...cur[cur.length - 1], space: false };
    lines.push(cur);
  }
  return { lines };
}

/** Support copy: 2 lines max, quiet. */
export function sub(str, x, y, maxWidth, o = {}) {
  const size = o.size ?? 30;
  const p = paragraph(str, x, y + size * 0.78, maxWidth, {
    family: T.font.sans,
    weight: 400,
    size,
    lineHeight: 1.5,
    fill: o.fill ?? T.textSecondary,
  });
  return { svg: p.svg, height: p.height + size * 0.2, lines: p.lines.length };
}

/* ------------------------------------------------------------------ chrome */

/** Wordmark + mark, bottom-left, with the URL set in mono. */
export function brandLock(x, y, o = {}) {
  const size = o.markSize ?? 54;
  return `<g>
    ${mark(x, y - size + 6, size, { tile: "rgba(12,21,29,0.55)" })}
    ${wordmark(x + size + 16, y, o.wordmarkSize ?? 34)}
  </g>`;
}

/** Small print: coverage / honesty line that the product itself uses. */
export function footnote(str, x, y, o = {}) {
  return text(str, x, y, {
    family: T.font.sans,
    weight: 400,
    size: o.size ?? 20,
    fill: o.fill ?? T.textTertiary,
    tracking: 0,
  });
}

/** The CTA pill, drawn to the width of its label. */
export function cta(strLabel, x, y, o = {}) {
  const size = o.size ?? 27;
  const h = o.h ?? 62;
  const w = measure(strLabel, T.font.sans, 700, size) + 76;
  return {
    width: w,
    height: h,
    svg: `<g>
      ${rr(x, y, w, h, h / 2, o.variant === "ghost" ? "rgba(255,255,255,0.06)" : T.accent, o.variant === "ghost" ? { stroke: T.borderDefault } : {})}
      ${text(strLabel, x + w / 2, y + h / 2 + size * 0.35, {
        family: T.font.sans,
        weight: 700,
        size,
        fill: o.variant === "ghost" ? T.textPrimary : T.textOnAccent,
        anchor: "middle",
      })}
    </g>`,
  };
}

/** Store row: App Store / Google Play badges as flat dark pills. */
export function storeRow(x, y, o = {}) {
  const badge = (labelStr, subStr, glyph) => {
    const w = o.w ?? 226;
    const h = o.h ?? 62;
    return `<g>
      ${rr(x, y, w, h, 14, "rgba(255,255,255,0.05)", { stroke: T.borderDefault })}
      ${glyph}
      ${text(subStr, x + 56, y + 26, { family: T.font.sans, weight: 400, size: 13, fill: T.textTertiary })}
      ${text(labelStr, x + 56, y + 48, { family: T.font.sans, weight: 700, size: 20, fill: T.textPrimary })}
    </g>`;
  };
  const apple = `<g transform="translate(${x + 20},${y + 16})" fill="${T.textPrimary}">
      <path d="M16.4 2.3c1.1-1.3 1.8-3 1.6-4.8-1.6.1-3.4 1-4.5 2.3-1 1.1-1.8 2.9-1.6 4.6 1.7.1 3.4-.9 4.5-2.1Z" transform="translate(0,4) scale(1.1)"/>
      <path d="M18.4 5.6c-2.4-.1-4.4 1.4-5.5 1.4-1.1 0-2.8-1.3-4.7-1.3-2.4 0-4.6 1.4-5.9 3.6-2.5 4.3-.6 10.7 1.8 14.2 1.2 1.7 2.6 3.6 4.5 3.5 1.8-.1 2.5-1.2 4.7-1.2s2.8 1.2 4.7 1.1c1.9 0 3.2-1.7 4.4-3.5 1.4-2 2-4 2-4.1-.1 0-3.8-1.5-3.9-5.9 0-3.7 3-5.5 3.1-5.6-1.7-2.5-4.4-2.8-5.2-2.8Z" transform="translate(0,4) scale(0.72)"/>
    </g>`;
  const play = `<g transform="translate(${x + 18},${y + 16})">
      <path d="M2 2 L24 15 L2 28 Z" fill="${T.textPrimary}" opacity="0.9"/>
    </g>`;
  return `${badge("App Store", "Download on the", apple)}${badge("Google Play", "GET IT ON", play).replace(`x="${x}"`, `x="${x + (o.w ?? 226) + 14}"`).replace(`translate(${x + 18}`, `translate(${x + (o.w ?? 226) + 32}`).replace(`translate(${x + 56}`, `translate(${x + (o.w ?? 226) + 70}`)}`;
}

/** Corner ticks, the "camera viewfinder" motif the brand uses on frames. */
export function ticks(W, H, inset = 34, len = 26, color = "rgba(148,206,202,0.28)") {
  const c = (x, y, dx, dy) => `<path d="M${x} ${y + dy * len} L${x} ${y} L${x + dx * len} ${y}" fill="none" stroke="${color}" stroke-width="2"/>`;
  return `<g>${c(inset, inset, 1, 1)}${c(W - inset, inset, -1, 1)}${c(inset, H - inset, 1, -1)}${c(W - inset, H - inset, -1, -1)}</g>`;
}

export { T, text, rr, circle, line, measure, wrap, esc, mark, wordmark, wordmarkWidth, label, chip, hexA, rng };
