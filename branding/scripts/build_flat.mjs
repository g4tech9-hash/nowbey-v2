/**
 * NowBey — wordmark lockups, avatars and the flat brand sheet.
 * Vector only (resvg), so every asset stays crisp from 32px to print.
 *
 *   node scripts/build_flat.mjs
 *
 * Writes SVG sources to out/svg/ and PNGs to out/png/.
 */

import { Resvg } from "@resvg/resvg-js";
import * as fontkit from "fontkit";
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { flatMark } from "./mark-flat.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = join(ROOT, "fonts");
const SVG_DIR = join(ROOT, "out", "svg");
const PNG_DIR = join(ROOT, "out", "png");
mkdirSync(SVG_DIR, { recursive: true });
mkdirSync(PNG_DIR, { recursive: true });

const FONT_FILES = readdirSync(FONT_DIR)
  .filter((f) => f.endsWith(".ttf"))
  .map((f) => join(FONT_DIR, f));

const C = {
  ivory: "#F7F3EC",
  ivoryDeep: "#EFE7D9",
  navy: "#0A2A43",
  navyDeep: "#071A2B",
  navyPanel: "#0A1D2E",
  aqua: "#3FD6C0",
  aquaDeep: "#0B6F64",
  aquaMid: "#17AE99",
  gold: "#F4B942",
  cream: "#F3F1EA",
  muted: "#9AAFB3",
  nightText: "#E8F4F2",
};

/* ------------------------------------------------------------ primitives */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const display = fontkit.openSync(join(FONT_DIR, "Brico800.ttf"));

/** advance width of `str` at `size`, with CSS-style em tracking */
function measure(str, size, tracking = 0) {
  const run = display.layout(str);
  const n = [...str].length;
  return (run.advanceWidth / display.unitsPerEm) * size + tracking * size * Math.max(0, n - 1);
}

/** tracked display type; `w` is the advance width, useful for centring runs */
function type(str, x, y, o = {}) {
  const { size = 100, fill = C.navy, anchor = "start", tracking = -0.03, weight = 800 } = o;
  return `<text x="${r(x)}" y="${r(y)}" font-family="Brico${weight}" font-size="${r(size)}" fill="${fill}"${
    anchor !== "start" ? ` text-anchor="${anchor}"` : ""
  }${tracking ? ` letter-spacing="${r(tracking * size)}"` : ""}>${esc(str)}</text>`;
}

const r = (v) => Math.round(v * 100) / 100;
const doc = (w, h, body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

function render(svg, width, out, { bg = null } = {}) {
  const png = new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Brico800" },
    fitTo: { mode: "width", value: width },
    background: bg ?? "rgba(0,0,0,0)",
  }).render().asPng();
  writeFileSync(out, png);
  console.log("  →", out.replace(ROOT + "/", ""), `${Math.round(png.length / 1024)} KB`);
}

function saveSvg(svg, name) {
  writeFileSync(join(SVG_DIR, name), svg);
}

/**
 * The lockup: the mark, then “Now” + “Bey”. `gap` and `cap` are in units of
 * the wordmark's cap height so the pairing holds at any size.
 */
function lockup({ mode = "light", cap = 100, gap = 0.54, spaced = false } = {}) {
  const night = mode === "night";
  const ink = night ? C.nightText : C.navy;
  const accent = night ? C.aqua : C.aquaDeep;
  const size = cap / 0.72; // Bricolage cap height ≈ 0.72em
  const markSize = cap * 1.86;
  const words = spaced ? ["Now", "Bey"] : ["Now", "Bey"];
  const join_ = spaced ? " " : "";
  const nowW = measure(words[0], size, -0.03);
  const beyW = measure(words[1], size, -0.03);
  const gapW = spaced ? size * 0.19 : 0;
  const textW = nowW + gapW + beyW;
  const width = markSize + cap * gap + textW;
  const height = markSize;
  const baseline = height / 2 + cap / 2;

  const mark = embed(flatMark({ mode, arcs: true }), 0, 0, markSize);
  return {
    width,
    height,
    body:
      mark +
      type(words[0], markSize + cap * gap, baseline, { size, fill: ink }) +
      type(words[1], markSize + cap * gap + nowW + gapW, baseline, { size, fill: accent }),
    svg:
      doc(
        r(width),
        r(height),
        mark +
          type(words[0], markSize + cap * gap, baseline, { size, fill: ink }) +
          type(words[1], markSize + cap * gap + nowW + gapW, baseline, { size, fill: accent }),
      ),
  };
}

/**
 * Inline an SVG document as a translated/scaled <g>. Pass `size` to hit an
 * exact width, or `scale` to multiply the document's own coordinates.
 * Ids are namespaced per embed so gradients and masks never collide.
 */
let uid = 0;
function embed(svg, x, y, size, scale = null) {
  const ns = `e${uid++}-`;
  const inner = svg
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace(/\bid="([^"]+)"/g, (_, v) => `id="${ns}${v}"`)
    .replace(/url\(#([^)]+)\)/g, (_, v) => `url(#${ns}${v})`);
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const k = scale ?? size / viewBox[2];
  return `<g transform="translate(${r(x)},${r(y)}) scale(${r(k)})">${inner}</g>`;
}

/** stacked lockup: mark above, wordmark beneath */
function stacked({ mode = "light", markSize = 300, cap = 118 } = {}) {
  const night = mode === "night";
  const ink = night ? C.nightText : C.navy;
  const accent = night ? C.aqua : C.aquaDeep;
  const size = cap / 0.72;
  const nowW = measure("Now", size, -0.03);
  const beyW = measure("Bey", size, -0.03);
  const textW = nowW + beyW;
  const width = Math.max(markSize, textW);
  const gapY = cap * 0.52;
  const baseline = markSize + gapY + cap;
  const height = baseline + cap * 0.18;
  const cx = width / 2;
  const body =
    embed(flatMark({ mode }), cx - markSize / 2, 0, markSize) +
    type("Now", cx - textW / 2, baseline, { size, fill: ink }) +
    type("Bey", cx - textW / 2 + nowW, baseline, { size, fill: accent });
  return { width, height, body, svg: doc(r(width), r(height), body) };
}

/* --------------------------------------------------------------- assets */

console.log("flat mark");
for (const mode of ["light", "night"]) {
  const svg = flatMark({ mode });
  saveSvg(svg, `nowbey-mark-${mode}.svg`);
  render(svg, 1024, join(PNG_DIR, `nowbey-mark-${mode}-1024.png`));
}

console.log("horizontal lockups");
for (const mode of ["light", "night"]) {
  const l = lockup({ mode, cap: 100 });
  saveSvg(l.svg, `nowbey-lockup-h-${mode}.svg`);
  render(l.svg, 1600, join(PNG_DIR, `nowbey-lockup-h-${mode}.png`));
}
{
  const l = lockup({ mode: "light", cap: 100, spaced: true });
  saveSvg(l.svg, "nowbey-lockup-h-light-spaced.svg");
  render(l.svg, 1600, join(PNG_DIR, "nowbey-lockup-h-light-spaced.png"));
}

console.log("stacked lockups");
for (const mode of ["light", "night"]) {
  const s = stacked({ mode });
  saveSvg(s.svg, `nowbey-lockup-stacked-${mode}.svg`);
  render(s.svg, 1200, join(PNG_DIR, `nowbey-lockup-stacked-${mode}.png`));
}

/* ---------------------------- profile pictures with the wordmark ------ */

function avatar({ mode = "light", size = 1080, tagline = "COMMUNITY MAP · THE BAHAMAS", caption = true } = {}) {
  const night = mode === "night";
  const ink = night ? C.cream : C.navy;
  const accent = night ? C.aqua : C.aquaDeep;
  const bg0 = night ? "#0B2233" : C.ivory;
  const bg1 = night ? C.navyDeep : C.ivoryDeep;
  const glow = night ? "rgba(63,214,192,0.20)" : "rgba(63,214,192,0.16)";

  const cap = size * 0.108;
  const ts = cap / 0.72;
  const nowW = measure("Now", ts, -0.03);
  const beyW = measure("Bey", ts, -0.03);
  const textW = nowW + beyW;
  const markSize = size * 0.44;
  const markY = size * 0.215;
  const baseline = markY + markSize + size * 0.115;

  const defs = `
    <radialGradient id="bg" cx="0.5" cy="0.34" r="0.85">
      <stop offset="0" stop-color="${night ? "#123449" : "#FFFFFF"}"/>
      <stop offset="1" stop-color="${bg1}"/>
    </radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.45">
      <stop offset="0" stop-color="${glow}"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>`;

  const body = `
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    <rect width="${size}" height="${size}" fill="url(#glow)"/>
    ${embed(flatMark({ mode }), (size - markSize) / 2, markY, markSize)}
    ${type("Now", size / 2 - textW / 2, baseline, { size: ts, fill: ink })}
    ${type("Bey", size / 2 - textW / 2 + nowW, baseline, { size: ts, fill: accent })}
    ${
      caption
        ? `<text x="${size / 2}" y="${baseline + size * 0.075}" font-family="Brico800" font-size="${r(
            size * 0.0285,
          )}" fill="${night ? "rgba(232,244,242,0.66)" : "rgba(22,35,43,0.62)"}" text-anchor="middle" letter-spacing="${r(
            size * 0.0285 * 0.2,
          )}">${esc(tagline)}</text>`
        : ""
    }`;

  const svg = doc(size, size, body, defs);
  return { svg, width: size, height: size };
}

console.log("profile pictures with wordmark");
for (const mode of ["light", "night"]) {
  const a = avatar({ mode });
  saveSvg(a.svg, `nowbey-pfp-wordmark-${mode}.svg`);
  render(a.svg, 1080, join(PNG_DIR, `nowbey-pfp-wordmark-${mode}-1080.png`));
}

/* --------------------------------------------- mark-only flat avatars -- */

function avatarMarkOnly({ mode = "light", size = 1080 } = {}) {
  const night = mode === "night";
  const bg0 = night ? "#0B2233" : C.ivory;
  const defs = `<radialGradient id="bg" cx="0.44" cy="0.30" r="0.9">
      <stop offset="0" stop-color="${bg0}"/>
      <stop offset="1" stop-color="${night ? C.navyDeep : C.ivoryDeep}"/>
    </radialGradient>`;
  const m = size * 0.66;
  return doc(
    size,
    size,
    `<rect width="${size}" height="${size}" fill="url(#bg)"/>${embed(
      flatMark({ mode }),
      (size - m) / 2,
      (size - m) / 2,
      m,
    )}`,
    defs,
  );
}

for (const mode of ["light", "night"]) {
  const svg = avatarMarkOnly({ mode });
  saveSvg(svg, `nowbey-pfp-flat-${mode}.svg`);
  render(svg, 1080, join(PNG_DIR, `nowbey-pfp-flat-${mode}-1080.png`));
  for (const px of [512, 256, 128, 64]) {
    render(svg, px, join(PNG_DIR, `nowbey-pfp-flat-${mode}-${px}.png`));
  }
}

/* --------------------------------------------------------- proof sheet */

function sheet() {
  const W = 2200;
  const H = 1500;
  const P = 80;
  const panel = (x, y, w, h, fill, stroke) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${fill}"${
      stroke ? ` stroke="${stroke}" stroke-width="1.5"` : ""
    }/>`;

  const lightL = lockup({ mode: "light", cap: 74 });
  const nightL = lockup({ mode: "night", cap: 74 });
  const spaced = lockup({ mode: "light", cap: 74, spaced: true });

  const body = `
    <rect width="${W}" height="${H}" fill="#0B1A24"/>
    <text x="${P}" y="72" font-family="Brico800" font-size="30" fill="#E8F4F2">NowBey — brand sheet</text>
    <text x="${W - P}" y="72" font-family="Brico800" font-size="18" fill="rgba(232,244,242,0.5)" text-anchor="end">flat mark · lockups · avatars</text>

    ${panel(P, 110, 970, 380, C.ivory, "rgba(255,255,255,0.10)")}
    ${embed(lightL.svg, P + 70, 210, null, 0.78)}
    <text x="${P + 70}" y="452" font-family="Brico800" font-size="17" fill="rgba(22,35,43,0.55)" letter-spacing="3.4">PRIMARY LOCKUP · LIGHT</text>

    ${panel(P + 1010, 110, 1020, 380, "#0A1D2E", "rgba(63,214,192,0.22)")}
    ${embed(nightL.svg, P + 1080, 210, null, 0.78)}
    <text x="${P + 1080}" y="452" font-family="Brico800" font-size="17" fill="rgba(232,244,242,0.55)" letter-spacing="3.4">PRIMARY LOCKUP · NIGHT</text>

    ${panel(P, 530, 970, 380, C.ivory, "rgba(255,255,255,0.10)")}
    ${embed(spaced.svg, P + 70, 630, null, 0.78)}
    <text x="${P + 70}" y="872" font-family="Brico800" font-size="17" fill="rgba(22,35,43,0.55)" letter-spacing="3.4">SPACED VARIANT · “NOW BEY”</text>

    ${panel(P + 1010, 530, 480, 380, "#0A1D2E", "rgba(63,214,192,0.22)")}
    ${embed(avatarMarkOnly({ mode: "night" }), P + 1010 + 40, 570, 300)}
    <text x="${P + 1010 + 40}" y="872" font-family="Brico800" font-size="17" fill="rgba(232,244,242,0.55)" letter-spacing="3.4">AVATAR · NIGHT</text>

    ${panel(P + 1540, 530, 490, 380, C.ivory, "rgba(255,255,255,0.10)")}
    ${embed(avatarMarkOnly({ mode: "light" }), P + 1540 + 40, 570, 300)}
    <text x="${P + 1540 + 40}" y="872" font-family="Brico800" font-size="17" fill="rgba(22,35,43,0.55)" letter-spacing="3.4">AVATAR · LIGHT</text>

    ${panel(P, 950, 2020, 450, "#0A1D2E", "rgba(63,214,192,0.22)")}
    ${embed(avatar({ mode: "night" }).svg, P + 60, 980, 390)}
    ${embed(avatar({ mode: "light" }).svg, P + 500, 980, 390)}
    ${embed(avatarMarkOnly({ mode: "light" }), P + 940, 980, 390)}
    ${embed(avatarMarkOnly({ mode: "night" }), P + 1380, 980, 390)}
    <text x="${P + 60}" y="1400" font-family="Brico800" font-size="17" fill="rgba(232,244,242,0.5)" letter-spacing="3.4">1080 × 1080 — safe inside a circular crop</text>`;

  return doc(W, H, body);
}

console.log("sheet");
const s = sheet();
saveSvg(s, "nowbey-vector-sheet.svg");
render(s, 2200, join(ROOT, "out", "nowbey-vector-sheet.png"), { bg: "#0B1A24" });
