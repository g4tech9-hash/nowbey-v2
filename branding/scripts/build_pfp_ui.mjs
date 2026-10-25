/**
 * NOWBEY — PROFILE PICTURES, DRAWN FROM THE PRODUCT UI
 * ---------------------------------------------------------------------------
 * Not a lookalike: this imports the app's own drawing code and sets type in
 * the app's own faces, so the avatar cannot drift from the interface.
 *
 *   bg()        the product backdrop — teal bloom, technical grid, vignette
 *   emblemDisc  the kit's profile emblem: teal disc, filled pin, wave
 *   mark()      the app header mark: rounded tile, stroked pin, amber core
 *   T, text     tokens and type from scripts/tokens.mjs / ui.mjs
 *
 * Layout adapts to the output size rather than being scaled down wholesale —
 * a wordmark shrunk to 64px is noise, so below 160px the emblem takes the
 * whole frame and the type drops away.
 *
 *   node scripts/build_pfp_ui.mjs
 *
 * Writes out/ui/: 1080 masters, circle crops, and a size ladder where each
 * rung is laid out for the size it will actually be displayed at.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = "../../Downloads/nowbey-full-kit/nowbey-kit/scripts";
const { svgDoc, render } = await import(`${KIT}/lib.mjs`);
const { T, text, measure, mark } = await import(`${KIT}/ui.mjs`);
const { bg } = await import(`${KIT}/postkit.mjs`);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out", "ui");
mkdirSync(OUT, { recursive: true });

const r2 = (v) => Math.round(v * 100) / 100;

/* --------------------------------------------------------------- tokens */

const NIGHT = {
  day: false,
  disc: "#3fd6c0",
  discTop: "#62e4d2",
  discBottom: "#2bb9a6",
  glyph: "#04211d",
  core: "#3fd6c0",
  ring: "rgba(4,33,29,0.10)",
  ink: T.textPrimary,
  accent: T.accent,
  muted: T.textTertiary,
  tile: "rgba(12,21,29,0.72)",
  coreTile: T.warning,
};

const DAY = {
  day: true,
  disc: "#0b6f64",
  discTop: "#128a7c",
  discBottom: "#07564d",
  glyph: "#ffffff",
  core: "#0b6f64",
  ring: "rgba(255,255,255,0.16)",
  ink: T.light.textPrimary,
  accent: T.light.accent,
  muted: T.light.textTertiary,
  tile: "rgba(255,255,255,0.72)",
  coreTile: T.light.accent,
};

/* --------------------------------------------------------------- ground */

/** The product backdrop. Light mode is the same construction in daylight tokens. */
function ground(W, hue = "a", day = false) {
  if (!day) return bg(W, W, { hue });
  const L = T.light;
  return `<defs>
      <radialGradient id="warm" cx="0.5" cy="0.32" r="0.78">
        <stop offset="0" stop-color="#ffffff" stop-opacity="1"/>
        <stop offset="0.6" stop-color="#fdfaf4" stop-opacity="0.85"/>
        <stop offset="1" stop-color="${L.bgSunken}" stop-opacity="0.5"/>
      </radialGradient>
      <pattern id="gridL" width="54" height="54" patternUnits="userSpaceOnUse">
        <path d="M54 0H0V54" fill="none" stroke="${L.borderSubtle}" stroke-width="1"/>
      </pattern>
      <radialGradient id="vigL" cx="0.5" cy="0.46" r="0.8">
        <stop offset="0.6" stop-color="#efe7d9" stop-opacity="0"/>
        <stop offset="1" stop-color="#e4d9c6" stop-opacity="0.5"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${W}" fill="${L.bgBase}"/>
    <rect width="${W}" height="${W}" fill="url(#warm)"/>
    <rect width="${W}" height="${W}" fill="url(#gridL)" opacity="0.9"/>
    <rect width="${W}" height="${W}" fill="url(#vigL)"/>`;
}

/* --------------------------------------------------------------- pieces */

/**
 * “Now” + “Bey” with a space — the mark's own two-tone treatment, at the
 * product's display tracking. Returns the svg and its width.
 */
function wordmarkSpaced(cx, baseline, cap, p, gap = 0.26, tracking = -0.02) {
  const size = cap / 0.72;
  const nowW = measure("Now", T.font.display, 800, size, tracking);
  const beyW = measure("Bey", T.font.display, 800, size, tracking);
  const gapW = gap * size;
  const total = nowW + gapW + beyW;
  const x = cx - total / 2;
  return {
    width: total,
    svg:
      text("Now", x, baseline, {
        family: T.font.display,
        weight: 800,
        size,
        fill: p.ink,
        tracking,
      }) +
      text("Bey", x + nowW + gapW, baseline, {
        family: T.font.display,
        weight: 800,
        size,
        fill: p.accent,
        tracking,
      }),
  };
}

/** Mono eyebrow, centred — the product's `label()` idiom at avatar scale. */
function eyebrow(str, cx, y, size, fill) {
  const tracking = 0.22;
  const w = measure(str, T.font.mono, 700, size, tracking);
  return text(str, cx - w / 2, y, {
    family: T.font.mono,
    weight: 700,
    size,
    tracking,
    fill,
  });
}

/**
 * The kit's profile emblem, with a movable centre so it can share the frame
 * with type: teal disc, filled pin, knockout core, wave.
 */
function emblemDisc({ W, cx, cy, r, p }) {
  const scale = (r * 1.46) / 40;
  return `<g>
    <defs>
      <radialGradient id="discGrad" cx="0.34" cy="0.24" r="0.9">
        <stop offset="0" stop-color="${p.discTop}"/>
        <stop offset="0.62" stop-color="${p.disc}"/>
        <stop offset="1" stop-color="${p.discBottom}"/>
      </radialGradient>
      <radialGradient id="discSheen" cx="0.3" cy="0.22" r="0.6">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="url(#discGrad)"/>
    <circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="url(#discSheen)"/>
    <circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r - W * 0.006)}" fill="none"
      stroke="${p.ring}" stroke-width="${r2(W * 0.0032)}"/>
    <g transform="translate(${r2(cx)},${r2(cy)}) scale(${r2(scale)}) translate(-20,-19)">
      <path d="M20 7.2c-4.3 0-7.8 3.4-7.8 7.6 0 5.5 7.8 12.6 7.8 12.6s7.8-7.1 7.8-12.6c0-4.2-3.5-7.6-7.8-7.6Z" fill="${p.glyph}"/>
      <circle cx="20" cy="14.8" r="3" fill="${p.core}"/>
      <path d="M7 33.4c3.7-3.5 6.4 2.3 10.2 0 3.8-2.3 5.7 2.7 9.8 0"
        stroke="${p.glyph}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.88"/>
    </g>
  </g>`;
}

/* ---------------------------------------------------------------- layout */

/**
 * Three tiers, because one design cannot serve 1080px and 64px:
 *   full     mark + wordmark + coverage line
 *   medium   mark + wordmark, both larger, no coverage line
 *   compact  mark only, filling the safe circle
 */
function tierFor(px) {
  if (px >= 400) return "full";
  if (px >= 160) return "medium";
  return "compact";
}

function emblemAvatar(px, p) {
  const tier = tierFor(px);
  const W = 1000; // layout space; resvg scales to px
  let body = ground(W, "a", p.day);

  if (tier === "compact") {
    body += emblemDisc({ W, cx: W / 2, cy: W / 2, r: W * 0.365, p });
    return svgDoc(W, W, body);
  }

  if (tier === "medium") {
    body += emblemDisc({ W, cx: W / 2, cy: W * 0.378, r: W * 0.262, p });
    body += wordmarkSpaced(W / 2, W * 0.752, W * 0.118, p).svg;
    return svgDoc(W, W, body);
  }

  body += emblemDisc({ W, cx: W / 2, cy: W * 0.375, r: W * 0.225, p });
  body += wordmarkSpaced(W / 2, W * 0.722, W * 0.092, p).svg;
  body += eyebrow("COMMUNITY MAP  ·  THE BAHAMAS", W / 2, W * 0.792, W * 0.0205, p.muted);
  return svgDoc(W, W, body);
}

function tileAvatar(px, p) {
  const tier = tierFor(px);
  const W = 1000;
  let body = ground(W, "b", p.day);

  const tile = tier === "compact" ? W * 0.72 : tier === "medium" ? W * 0.50 : W * 0.40;
  const tileY = tier === "compact" ? (W - tile) / 2 : tier === "medium" ? W * 0.145 : W * 0.168;

  body += mark(W / 2 - tile / 2, tileY, tile, {
    tile: p.tile,
    accent: p.accent,
    core: p.coreTile,
  });

  if (tier === "medium") body += wordmarkSpaced(W / 2, W * 0.752, W * 0.118, p).svg;
  if (tier === "full") {
    body += wordmarkSpaced(W / 2, W * 0.722, W * 0.092, p).svg;
    body += eyebrow("COMMUNITY MAP  ·  THE BAHAMAS", W / 2, W * 0.792, W * 0.0205, p.muted);
  }
  return svgDoc(W, W, body);
}

/* ----------------------------------------------------------------- write */

/** Square wrapper so `fitTo` gets both dimensions; lib.mjs ignores a lone width. */
function save(name, svg, px) {
  const png = render(svg, px, px);
  writeFileSync(join(OUT, name), png);
  console.log("  →", `out/ui/${name}`, `${Math.round(png.length / 1024)} KB`);
}

/** Everything inside a circle clip, so the corners go transparent. */
const LAYOUT = 1000; // every avatar is composed in this square, then scaled

function withCircle(svg, size = LAYOUT) {
  const open = svg.indexOf(">") + 1;
  const close = svg.lastIndexOf("</svg>");
  const defs = `<defs><clipPath id="pfpCircle"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></clipPath></defs>`;
  return svg.slice(0, open) + defs + `<g clip-path="url(#pfpCircle)">` + svg.slice(open, close) + `</g>` + svg.slice(close);
}

const LADDER = [1080, 512, 256, 128, 64];

const variants = [
  ["nowbey-pfp-ui-night", emblemAvatar, NIGHT],
  ["nowbey-pfp-ui-day", emblemAvatar, DAY],
  ["nowbey-pfp-ui-tile-night", tileAvatar, NIGHT],
  ["nowbey-pfp-ui-tile-day", tileAvatar, DAY],
];

for (const [base, fn, p] of variants) {
  for (const px of LADDER) {
    save(`${base}-${px}.png`, fn(px, p), px);
  }
  save(`${base}-circle.png`, withCircle(fn(1080, p)), 1080);
}

// vector sources for the two primaries
writeFileSync(join(OUT, "nowbey-pfp-ui-night.svg"), emblemAvatar(1080, NIGHT));
writeFileSync(join(OUT, "nowbey-pfp-ui-day.svg"), emblemAvatar(1080, DAY));
console.log("done");
