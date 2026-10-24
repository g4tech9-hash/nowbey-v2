/**
 * NOWBEY MARKETING — UI KIT (SVG)
 * ---------------------------------------------------------------------------
 * A vector re-implementation of the NowBey Pulse component vocabulary:
 * app header, status bar, tab bar, chips, cards with a category spine, the
 * hazard map, toggles, the four-step report flow, the alerts screen and the
 * news wire. It is written against tokens.mjs, so what renders here is the
 * product's own design language, not a pastiche of it.
 *
 * Units: the app screens are laid out in PHONE logical px (390 wide), exactly
 * like the real mobile breakpoint. The composite layers then scale the whole
 * screen into a photo or a post.
 */

import * as fontkit from "fontkit";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { T } from "./tokens.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "fonts", "static");
const fonts = new Map();
function fontFile(family, weight) {
  return join(ROOT, `${family}${weight}.ttf`);
}
function font(family, weight) {
  const key = `${family}${weight}`;
  if (!fonts.has(key)) fonts.set(key, fontkit.openSync(fontFile(family, weight)));
  return fonts.get(key);
}

/** Advance width in px for a string set in family/weight/size. */
export function measure(str, family, weight, size, tracking = 0) {
  const f = font(family, weight);
  const run = f.layout(str);
  const chars = [...str].length;
  return (run.advanceWidth / f.unitsPerEm) * size + tracking * size * Math.max(0, chars - 1);
}

/** Greedy word wrap against a pixel width. Returns the lines. */
export function wrap(str, family, weight, size, maxWidth, tracking = 0) {
  const words = String(str).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (measure(next, family, weight, size, tracking) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ------------------------------------------------------------------ atoms */

/**
 * Real text node. `anchor` = start|middle|end, `tracking` in em (like CSS
 * letter-spacing), `opacity` 0..1.
 */
export function text(str, x, y, o = {}) {
  const {
    family = T.font.sans,
    weight = 400,
    size = 14,
    fill = T.textPrimary,
    anchor = "start",
    tracking = 0,
    opacity = 1,
    baseline = "alphabetic",
    stroke = null,
    strokeWidth = 0,
  } = o;
  return `<text x="${round(x)}" y="${round(y)}" font-family="${family}${weight}" font-size="${round(size)}" fill="${fill}"${
    anchor !== "start" ? ` text-anchor="${anchor}"` : ""
  }${tracking ? ` letter-spacing="${round(tracking * size)}"` : ""}${
    stroke ? ` stroke="${stroke}" stroke-width="${round(strokeWidth)}" paint-order="stroke" stroke-linejoin="round"` : ""
  }${opacity !== 1 ? ` opacity="${opacity}"` : ""}${
    baseline !== "alphabetic" ? ` dominant-baseline="${baseline}"` : ""
  }>${esc(str)}</text>`;
}

/** A wrapped paragraph. Returns { svg, height }. */
export function paragraph(str, x, y, maxWidth, o = {}) {
  const {
    family = T.font.sans,
    weight = 400,
    size = 13,
    lineHeight = 1.45,
    fill = T.textSecondary,
    tracking = 0,
    align = "start",
    opacity = 1,
  } = o;
  const lines = wrap(str, family, weight, size, maxWidth, tracking);
  const svg = lines
    .map((ln, i) =>
      text(ln, align === "middle" ? x + maxWidth / 2 : x, y + i * size * lineHeight, {
        family,
        weight,
        size,
        fill,
        anchor: align === "middle" ? "middle" : "start",
        tracking,
        opacity,
      }),
    )
    .join("");
  return { svg, height: lines.length * size * lineHeight, lines };
}

export function rr(x, y, w, h, r, fill, o = {}) {
  const { stroke, strokeWidth = 1, opacity = 1, dash } = o;
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(r)}" fill="${fill}"${
    stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : ""
  }${dash ? ` stroke-dasharray="${dash}"` : ""}${opacity !== 1 ? ` opacity="${opacity}"` : ""}/>`;
}

export function circle(cx, cy, r, fill, o = {}) {
  const { stroke, strokeWidth = 1, opacity = 1 } = o;
  return `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${fill}"${
    stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : ""
  }${opacity !== 1 ? ` opacity="${opacity}"` : ""}/>`;
}

export function line(x1, y1, x2, y2, stroke, width = 1, o = {}) {
  return `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${stroke}" stroke-width="${width}"${
    o.dash ? ` stroke-dasharray="${o.dash}"` : ""
  }${o.opacity !== undefined ? ` opacity="${o.opacity}"` : ""}${o.cap ? ` stroke-linecap="${o.cap}"` : ""}/>`;
}

const round = (n) => Math.round(n * 100) / 100;

/* --------------------------------------------------------------- brand art */

/** The NowBey mark: rounded tile, the pin, the wave, the amber core. */
export function mark(x, y, size = 40, o = {}) {
  const s = size / 40;
  const accent = o.accent ?? T.accent;
  const tileFill = o.tile ?? "rgba(12,21,29,0.9)";
  return `<g transform="translate(${round(x)},${round(y)}) scale(${s})">
    <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="${tileFill}" stroke="${accent}" stroke-width="2"/>
    <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="${accent}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.85"/>
    <path d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z" fill="none" stroke="${accent}" stroke-width="2.2"/>
    <circle cx="20" cy="15.2" r="2.5" fill="${o.core ?? T.warning}"/>
  </g>`;
}

/** “Now” in cream + “Bey” in teal — the product wordmark. */
export function wordmark(x, y, size = 22, o = {}) {
  const cream = o.cream ?? T.textPrimary;
  const accent = o.accent ?? T.accent;
  return `<g>${text("Now", x, y, { family: T.font.display, weight: 800, size, fill: cream, tracking: -0.02 })}${text(
    "Bey",
    x + measure("Now", T.font.display, 800, size, -0.02),
    y,
    { family: T.font.display, weight: 800, size, fill: accent, tracking: -0.02 },
  )}</g>`;
}

export function wordmarkWidth(size = 22) {
  return measure("NowBey", T.font.display, 800, size, -0.02);
}

/* --------------------------------------------------------- app primitives */

export function statusBar(x, y, w, o = {}) {
  const fg = o.fg ?? T.textPrimary;
  const cy = y + 14;
  return `<g>
    ${text("9:41", x + 26, cy + 4, { family: T.font.sans, weight: 700, size: 12, fill: fg })}
    <g transform="translate(${round(x + w - 78)},${round(cy - 5)})" fill="${fg}">
      <rect x="0" y="5" width="2.6" height="4" rx="0.8"/><rect x="4" y="3" width="2.6" height="6" rx="0.8"/>
      <rect x="8" y="1.4" width="2.6" height="7.6" rx="0.8"/><rect x="12" y="0" width="2.6" height="9" rx="0.8"/>
    </g>
    ${`<g transform="translate(${round(x + w - 58)},${round(cy - 5)})" fill="none" stroke="${fg}" stroke-width="1.5" stroke-linecap="round">
      <path d="M1 4.2A10 10 0 0 1 15 4.2"/><path d="M4 7A6.2 6.2 0 0 1 12 7"/>
      ${circle(8, 10, 1.1, fg)}
    </g>`}
    <g transform="translate(${round(x + w - 34)},${round(cy - 5)})">
      <rect x="0" y="0" width="20" height="10" rx="3" fill="none" stroke="${fg}" stroke-width="1" opacity="0.55"/>
      <rect x="1.6" y="1.6" width="13" height="6.8" rx="1.6" fill="${fg}"/>
      <rect x="21.2" y="3" width="1.8" height="4" rx="0.8" fill="${fg}" opacity="0.55"/>
    </g>
  </g>`;
}

/** App header: wordmark left, quiet icon buttons right. */
export function appHeader(x, y, w, o = {}) {
  const iconColor = o.iconColor ?? T.textTertiary;
  const bell = `<g transform="translate(${round(x + w - 62)},${round(y + 20)})" fill="none" stroke="${iconColor}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a7 7 0 1 1 14 0c0 5 2 6 2 6H1s2-1 2-6Z"/><path d="M7.4 20a2.6 2.6 0 0 0 4.6 0"/>
    </g>`;
  const search = `<g transform="translate(${round(x + w - 100)},${round(y + 20)})" fill="none" stroke="${iconColor}" stroke-width="1.7" stroke-linecap="round">
      <circle cx="8.6" cy="8.6" r="6.4"/><path d="M13.4 13.4 19 19"/>
    </g>`;
  return `<g>
    ${wordmark(x + 22, y + 30, 20)}
    ${search}${bell}
    ${circle(x + w - 22, y + 28, 13, T.bgElevated, { stroke: T.borderDefault })}
    ${text("A", x + w - 22, y + 33, { family: T.font.display, weight: 700, size: 12, fill: T.textSecondary, anchor: "middle" })}
  </g>`;
}

export function label(str, x, y, o = {}) {
  return text(str, x, y, {
    family: T.font.mono,
    weight: 700,
    size: 9.5,
    tracking: 0.16,
    fill: o.fill ?? T.textTertiary,
    anchor: o.anchor ?? "start",
    opacity: o.opacity ?? 1,
  });
}

export function h1(str, x, y, o = {}) {
  return text(str, x, y, {
    family: T.font.display,
    weight: 800,
    size: o.size ?? 26,
    fill: o.fill ?? T.textPrimary,
    tracking: -0.03,
  });
}

export function chip(str, x, y, o = {}) {
  const { color = T.textSecondary, active = false, size = 11.5, padX = 11, h = 28, fill } = o;
  const w = measure(str, T.font.sans, 700, size) + padX * 2;
  const bg = fill ?? (active ? T.accentMuted : "rgba(255,255,255,0.04)");
  const border = active ? T.borderAccent : T.borderSubtle;
  return {
    width: w,
    height: h,
    svg: `<g>${rr(x, y, w, h, h / 2, bg, { stroke: border })}${text(str, x + w / 2, y + h / 2 + size * 0.36, {
      family: T.font.sans,
      weight: 700,
      size,
      fill: active ? T.accentHover : color,
      anchor: "middle",
    })}</g>`,
  };
}

/** Category pill: hue-tinted fill + dot, exactly like incident-card.tsx. */
export function catBadge(key, lineStr, x, y, o = {}) {
  const color = T.cat[key] ?? T.textSecondary;
  const size = o.size ?? 10.5;
  const h = o.h ?? 22;
  const padX = 8;
  const dotR = 3;
  const w = measure(lineStr.toUpperCase(), T.font.sans, 700, size, 0.1) + padX * 2 + dotR * 2 + 5;
  return {
    width: w,
    svg: `<g>
      ${rr(x, y, w, h, h / 2, hexA(color, 0.08), { stroke: hexA(color, 0.24) })}
      ${circle(x + padX + dotR, y + h / 2, dotR, color)}
      ${text(lineStr.toUpperCase(), x + padX + dotR * 2 + 5, y + h / 2 + size * 0.35, {
        family: T.font.sans,
        weight: 700,
        size,
        fill: color,
        tracking: 0.1,
      })}
    </g>`,
  };
}

export function button(strSvg, x, y, w, h, o = {}) {
  const { variant = "primary", size = 13.5 } = o;
  const isPrimary = variant === "primary";
  const bg = isPrimary ? T.accent : "rgba(255,255,255,0.04)";
  const fg = isPrimary ? T.textOnAccent : T.textPrimary;
  return `<g>
    ${rr(x, y, w, h, h / 2, bg, isPrimary ? {} : { stroke: T.borderDefault })}
    ${text(strSvg, x + w / 2, y + h / 2 + size * 0.36, {
      family: T.font.sans,
      weight: 700,
      size,
      fill: fg,
      anchor: "middle",
    })}
  </g>`;
}

export function toggle(x, y, on, o = {}) {
  const w = 42,
    h = 24,
    knob = 18;
  return `<g>
    ${rr(x, y, w, h, h / 2, on ? T.accent : T.bgActive, { stroke: on ? "transparent" : T.borderDefault })}
    ${circle(on ? x + w - knob / 2 - 3 : x + knob / 2 + 3, y + h / 2, knob / 2, on ? T.textOnAccent : "#93a7ac")}
  </g>`;
}

/** A content card: raised plane, hairline, optional category spine (left edge). */
export function card(x, y, w, h, o = {}) {
  const { spine, fill = T.bgRaised, r = T.r.md, border = T.borderDefault, opacity = 1 } = o;
  return `<g opacity="${opacity}">
    ${rr(x, y, w, h, r, fill, { stroke: border })}
    ${spine ? rr(x, y + 0, 3, h, 1.5, spine) : ""}
  </g>`;
}

/** Pin glyph used on maps and cards. */
export function pin(x, y, color, size = 34, o = {}) {
  const s = size / 34;
  return `<g transform="translate(${round(x)},${round(y)}) scale(${s})" opacity="${o.opacity ?? 1}">
    <path d="M0-26c-7.2 0-13 5.6-13 12.6C-13-3.4 0 12 0 12s13-15.4 13-25.4C13-20.4 7.2-26 0-26Z" fill="${color}" stroke="#fff8d4" stroke-width="2.4"/>
    ${circle(0, -13.2, 4.4, "#241408")}
  </g>`;
}

/**
 * The hazard map. Stylised aerial of New Providence: harbour water, landmass,
 * the Bay Street grid, secondary roads, place labels and category pins.
 * `zoom` and `shift` let the video renderer push in without re-laying out.
 */
export function mapView(x, y, w, h, o = {}) {
  const { zoom = 1, shiftX = 0, shiftY = 0, pinSet = "default", night = true, labelAlpha = 1 } = o;
  const id = o.id ?? `map${Math.round(x)}${Math.round(y)}${Math.round(w)}`;
  const water = night ? "#08202b" : "#a9dcff";
  const land = night ? "#2c4c49" : "#e6dccb";
  const landEdge = night ? "#3c615c" : "#c4b193";
  const road = night ? "#97aa94" : "#c3b39a";
  const minor = night ? "#6e8577" : "#cbbda6";
  const blockFill = night ? "#33544f" : "#ded2bd";
  const labelFill = night ? T.textTertiary : T.textTertiary;

  // Pins and labels are placed as fractions of the visible map box, so the
  // same pin set reads correctly whether the map is a tall story panel or a
  // wide desktop column. Terrain itself is drawn in a 400×260 space and
  // slice-fitted, which keeps the coastline proportional.
  const pins = {
    default: [
      { fx: 0.78, fy: 0.3, c: T.cat.road },
      { fx: 0.42, fy: 0.44, c: T.cat.flooding },
      { fx: 0.16, fy: 0.74, c: T.cat.power },
      { fx: 0.58, fy: 0.62, c: T.cat.water },
      { fx: 0.28, fy: 0.26, c: T.cat.safety },
    ],
    report: [{ fx: 0.5, fy: 0.52, c: T.cat.flooding, big: true }],
    empty: [],
  }[pinSet] || [];
  const k = Math.max(w / 400, h / 260); // "slice" fit
  const cx0 = x + w / 2;
  const cy0 = y + h / 2;

  return `<g>
    <clipPath id="${id}-clip"><rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="14"/></clipPath>
    <g clip-path="url(#${id}-clip)">
      ${rr(x, y, w, h, 14, water)}
      <g transform="translate(${round(cx0)},${round(cy0)}) scale(${zoom}) translate(${round(shiftX)},${round(shiftY)}) scale(${k}) translate(-200,-130)">
        <!-- landmass: New Providence, with Nassau Harbour biting in from the east -->
        <path d="M-30 -30 L 430 -30 L 430 96 C 392 104, 368 122, 344 134 C 318 147, 300 168, 272 180 C 250 189, 236 206, 214 214 C 196 221, 182 236, 160 240 C 130 246, 96 238, 70 246 C 40 255, 10 268, -30 262 Z" fill="${land}"/>
        <path d="M430 96 C 392 104, 368 122, 344 134 C 318 147, 300 168, 272 180 C 250 189, 236 206, 214 214 C 196 221, 182 236, 160 240" fill="none" stroke="${landEdge}" stroke-width="2"/>
        <!-- built-up blocks -->
        ${cityBlocks(-24, -24, 440, 250, blockFill)}
        <!-- roads -->
        <path d="M-30 74 C 40 66, 96 82, 152 74 C 208 66, 258 82, 306 74 C 346 68, 392 76, 432 70" fill="none" stroke="${road}" stroke-width="6" stroke-linecap="round"/>
        <path d="M-30 158 C 40 152, 96 166, 156 158 C 210 151, 250 164, 286 158" fill="none" stroke="${minor}" stroke-width="2.6" stroke-dasharray="9 8"/>
        <path d="M92 -20 C 104 20, 96 54, 108 92 C 120 130, 110 158, 124 196" fill="none" stroke="${minor}" stroke-width="3"/>
        <path d="M240 -20 C 232 22, 244 58, 234 96 C 224 134, 236 160, 226 190" fill="none" stroke="${minor}" stroke-width="3"/>
        <path d="M-30 214 C 30 206, 80 220, 132 212 C 168 206, 190 214, 208 208" fill="none" stroke="${road}" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
        <path d="M156 74 L 226 96" stroke="${road}" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 7"/>
      </g>
      <!-- labels sit in the box, so they never crop at awkward aspect ratios -->
      <g opacity="${labelAlpha}">
        ${text("NEW PROVIDENCE", x + w * 0.34, y + h * 0.14, { family: T.font.mono, weight: 700, size: o.labelSize ?? 9, fill: labelFill, anchor: "middle", tracking: 0.28 })}
        ${text("BAY STREET", x + w * 0.27, y + h * 0.3, { family: T.font.mono, weight: 700, size: (o.labelSize ?? 9) * 0.9, fill: labelFill, anchor: "middle", tracking: 0.22 })}
        ${o.harbour === false ? "" : text("NASSAU HARBOUR", x + w * 0.76, y + h * 0.9, { family: T.font.mono, weight: 700, size: (o.labelSize ?? 9) * 0.95, fill: labelFill, anchor: "middle", tracking: 0.22 })}
      </g>
      <!-- pins are screen-fixed: they stay tap-sized at any map scale -->
      ${pins
        .map((p) => {
          const px = x + w * p.fx + (zoom - 1) * (x + w * p.fx - cx0) + shiftX;
          const py = y + h * p.fy + (zoom - 1) * (y + h * p.fy - cy0) + shiftY;
          const sz = (p.big ? 44 : 32) * (o.pinScale ?? 1);
          return `${p.big ? circle(px, py - sz * 0.5, sz * 0.62, "transparent", { stroke: hexA(T.accent, 0.7), strokeWidth: 2 }) : ""}${pin(px, py, p.c, sz)}`;
        })
        .join("")}
      ${
        o.caption === false
          ? ""
          : `<g>
        ${rr(x + 10, y + h - 30, 116, 20, 10, "rgba(8,20,28,0.82)", { stroke: T.borderSubtle })}
        ${text("SAMPLE MAP VIEW", x + 20, y + h - 16.5, { family: T.font.mono, weight: 700, size: 7.5, fill: T.textTertiary, tracking: 0.14 })}
      </g>`
      }
    </g>
  </g>`;
}

function cityBlocks(x, y, w, h, fill) {
  let out = "";
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 46; i++) {
    const bx = x + rnd() * w;
    const by = y + rnd() * h;
    const bw = 8 + rnd() * 22;
    const bh = 5 + rnd() * 12;
    out += `<rect x="${round(bx)}" y="${round(by)}" width="${round(bw)}" height="${round(bh)}" rx="1.5" fill="${fill}" opacity="${0.5 + rnd() * 0.5}"/>`;
  }
  return out;
}

/** Bottom tab bar — Feed, Map, Report (centre +), Wire, Alerts. */
export function tabBar(x, y, w, active = "map", o = {}) {
  const h = 62;
  const items = [
    { key: "feed", label: "Feed", icon: "M4 6h16M4 12h11M4 18h7" },
    { key: "map", label: "Map", icon: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Zm0-8.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z" },
    { key: "report", label: "Report", plus: true },
    { key: "wire", label: "Wire", icon: "M4 5h16v14H4zM4 9.5h16M8 13.5h8M8 16.5h5" },
    { key: "alerts", label: "Alerts", icon: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4 10a2.2 2.2 0 0 0 4 0" },
  ];
  const colW = w / items.length;
  let out = rr(x, y, w, h, 0, o.fill ?? "rgba(12,21,29,0.94)");
  out += line(x, y, x + w, y, o.border ?? T.borderSubtle, 1);
  items.forEach((it, i) => {
    const cx = x + colW * i + colW / 2;
    const on = it.key === active;
    const col = on ? T.accent : T.textTertiary;
    if (it.plus) {
      out += circle(cx, y + 24, 18, o.reportFill ?? T.accent);
      out += `<g transform="translate(${round(cx - 9)},${round(y + 15)})" stroke="${T.textOnAccent}" stroke-width="2.4" stroke-linecap="round"><path d="M9 0v18M0 9h18"/></g>`;
      out += text(it.label, cx, y + 54, { family: T.font.sans, weight: 700, size: 9, fill: on ? T.accent : T.textTertiary, anchor: "middle" });
    } else {
      out += `<g transform="translate(${round(cx - 10)},${round(y + 10)})" fill="none" stroke="${col}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="${it.icon}"/></g>`;
      out += text(it.label, cx, y + 50, {
        family: T.font.sans,
        weight: 700,
        size: 9,
        fill: on ? T.accent : T.textTertiary,
        anchor: "middle",
      });
    }
  });
  return out;
}

/* ------------------------------------------------------------ utilities */

/** `rgba()` from a #rrggbb + alpha (the app tints category hues this way). */
export function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Deterministic pseudo-random in [0,1) from a seed — for scattered texture. */
export function rng(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

export { T, font, fonts };
