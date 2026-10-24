/**
 * NOWBEY MARKETING — RENDER HARNESS
 * Vector (SVG) → raster (PNG) with the product's own three typefaces.
 * resvg does the work: no browser, no fonts installed on the machine, no
 * network at render time. Everything is deterministic, so re-running the
 * generator on a fresh clone reproduces the exact same assets.
 */

import { Resvg } from "@resvg/resvg-js";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FONT_DIR = join(ROOT, "fonts", "static");
export const OUT_DIR = join(ROOT, "out");

const fontFiles = readdirSync(FONT_DIR)
  .filter((f) => f.endsWith(".ttf"))
  .map((f) => join(FONT_DIR, f));

/** Rasterise an SVG string. `width` is the output pixel width. */
export function render(svg, width, height) {
  const r = new Resvg(svg, {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Inter400" },
    fitTo: width && height ? { mode: "width", value: width } : { mode: "original" },
    background: "rgba(0,0,0,0)",
  });
  return r.render().asPng();
}

export function save(name, buffer) {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, name);
  writeFileSync(path, buffer);
  console.log("  →", name, `${Math.round(buffer.length / 1024)} KB`);
  return path;
}

/** Render + save in one step. */
export function renderTo(name, svg, width) {
  return save(name, render(svg, width));
}

/** Wrap any fragment in a root <svg> of exact dimensions. */
export function svgDoc(w, h, body, extra = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${extra}${body}</svg>`;
}

export { ROOT };
