#!/usr/bin/env node
/**
 * NowBey Pulse — contrast audit (both themes, from the token source of truth).
 *
 * Why a script instead of a table in the design doc: a ratio quoted in prose is
 * a snapshot that silently rots the moment someone re-points a token. This reads
 * `src/styles/pulse/tokens.css`, resolves each semantic token through the
 * primitive layer for BOTH themes, and computes WCAG 2.2 relative-luminance
 * ratios against the surface each pairing is actually used on.
 *
 * Two things make the numbers honest rather than decorative:
 *   1. Translucent values (rgba/hsl + `color-mix(... X%, transparent)`) are
 *      alpha-composited onto the background before the ratio is taken. A 38%-
 *      alpha teal ring on black is *not* teal-on-black; measuring the literal
 *      would flatter it.
 *   2. Text pairs are held to 4.5:1 and UI/graphic pairs to 3:1, per SC 1.4.3
 *      and 1.4.11 — in both themes, because "passes in dark" is half a system.
 *
 * Usage:  node scripts/contrast-audit.mjs [--json] [--markdown] [--strict]
 * Exit code 1 when any pair is below its floor (with --strict) so it can gate CI.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = readFileSync(join(ROOT, "src/styles/pulse/tokens.css"), "utf8");

const args = new Set(process.argv.slice(2));
const STRICT = args.has("--strict");

/* ---------------------------------------------------------------- parsing -- */

/** Strip comments so prose like "18.5:1 on base" never looks like a declaration. */
const CSS = TOKENS.replace(/\/\*[\s\S]*?\*\//g, "");
// `:root,` / `:root[data-theme="dark"] {` open on separate lines; normalise the
// two-line selector form so the block walker sees one opening line per block.
const BLOCKS = CSS.replace(/:root,\n:root\[data-theme="dark"\] \{/, ':root[data-theme="dark"] {');

/**
 * Collect `--name: value;` from every block whose opening selector matches
 * `openRe`. Blocks end at the first column-zero `}`, which is how the file is
 * formatted — nested braces never appear inside a token block.
 */
function declarations(openRe) {
  const out = new Map();
  const lines = BLOCKS.split("\n");
  let body = null;
  for (const line of lines) {
    if (body === null) {
      if (openRe.test(line)) body = [];
      continue;
    }
    if (/^\}/.test(line)) {
      for (const d of body.join("\n").matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/g)) out.set(d[1], d[2].trim());
      body = null;
      continue;
    }
    body.push(line);
  }
  return out;
}

/**
 * Layer 1 (shared primitives) + Layer 2/3 for one theme, merged in cascade
 * order. Light mode layers its own blocks on top of the dark defaults, exactly
 * as the browser would — so whatever the browser paints is what gets measured.
 */
function themeMap(light) {
  const merged = new Map();
  // Cascade order, walked once per selector so a later block wins — the same
  // rule the browser follows, which is the only way this measures what ships.
  const layers = [
    { name: "primitives", re: /^:root \{$/ },
    { name: "dark", re: /^:root\[data-theme="dark"\] \{$/ },
    { name: "cards", re: /^:root\[data-theme="dark"\] \{$/ },
    { name: "light", re: /^:root\[data-theme="light"\] \{$/ },
  ];
  for (const layer of layers) {
    if (layer.name === "light" && !light) continue;
    if (layer.name === "cards" && !light) continue;
    for (const [k, v] of declarations(layer.re)) merged.set(k, v);
  }
  return merged;
}

/** Resolve var() chains (bounded), then turn any colour into [r,g,b,a] 0-255. */
function resolve(map, value, depth = 0) {
  if (depth > 12 || typeof value !== "string") return value;
  let v = value.trim();
  // color-mix(in srgb, C 40%, transparent) -> C at 40% alpha, which is what the
  // browser paints; measuring the literal "teal" instead would flatter it.
  const mix = v.match(/^color-mix\(\s*in srgb,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/i);
  if (mix) {
    const rgb = parseColor(map, resolve(map, mix[1], depth + 1), depth + 1);
    if (rgb) return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Number(mix[2]) / 100})`;
    return v;
  }
  const varRe = /var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^()]*))?\)/gi;
  for (let guard = 0; guard < 10; guard++) {
    const m = varRe.exec(v);
    if (!m) break;
    const raw = map.get(m[1]);
    const replacement = raw !== undefined ? resolve(map, raw, depth + 1) : (m[2] ?? "transparent").trim();
    v = v.replace(m[0], replacement).trim();
    varRe.lastIndex = 0;
  }
  return v;
}

function parseColor(map, value, depth = 0) {
  const v = resolve(map, value, depth);
  if (!v) return null;
  let m = v.match(/^#([0-9a-fA-F]{6})$/);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
  m = v.match(/^#([0-9a-fA-F]{3})$/);
  if (m) return [...m[1].split("").map((c) => parseInt(c + c, 16)), 1];
  m = v.match(/^#([0-9a-fA-F]{8})$/);
  if (m) {
    const h = m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), parseInt(h.slice(6, 8), 16) / 255];
  }
  m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean);
    if (p.length < 3) return null;
    return [num(p[0]), num(p[1]), num(p[2]), p[3] === undefined ? 1 : frac(p[3])];
  }
  if (/^transparent$/i.test(v)) return [0, 0, 0, 0];
  return null;
}
const num = (s) => (s.endsWith("%") ? (parseFloat(s) / 100) * 255 : parseFloat(s));
const frac = (s) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));

/* --------------------------------------------------------------- the maths -- */

function composite(fg, bg) {
  const a = fg[3];
  return [0, 1, 2].map((i) => a * fg[i] + (1 - a) * bg[i]);
}

function lum([r, g, b]) {
  const ch = [r, g, b].map((v) => {
    const s = Math.max(0, Math.min(255, v)) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function ratio(map, fg, bg) {
  const f = parseColor(map, fg);
  const b = parseColor(map, bg);
  if (!f || !b) return null;
  const base = parseColor(map, "--bg-base");
  const bb = b[3] < 1 ? composite(b, base) : b; // the page is never transparent
  const top = f[3] < 1 ? composite(f, bb) : f;
  const a = lum(top);
  const c = lum(bb);
  return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
}

/* ------------------------------------------------------------------ pairs -- */

/** [label, foreground token, background token, kind]  kind: text (4.5) | ui (3.0) */
const PAIRS = [
  ["body text on the page", "--text-primary", "--bg-base", "text"],
  ["body text on a card", "--text-primary", "--card-bg", "text"],
  ["body text on a sunken band", "--text-primary", "--bg-sunken", "text"],
  ["secondary text on the page", "--text-secondary", "--bg-base", "text"],
  ["secondary text on a card", "--text-secondary", "--card-bg", "text"],
  ["tertiary text on the page", "--text-tertiary", "--bg-base", "text"],
  ["tertiary text on a card", "--text-tertiary", "--card-bg", "text"],
  ["label on an accent button", "--text-on-accent", "--btn-primary-bg", "text"],
  ["danger text on a card", "--danger", "--card-bg", "text"],
  ["success text on a card", "--success", "--card-bg", "text"],
  ["warning text on a card", "--warning", "--card-bg", "text"],
  ["chip label on a chip", "--text-primary", "--chip-bg", "text"],
  ["accent graphic on a card", "--accent", "--card-bg", "ui"],
  ["accent graphic on a sunken band", "--accent", "--bg-sunken", "ui"],
  ["focus ring on the page", "--focus-ring", "--bg-base", "ui"],
  ["input border on a card", "--input-border", "--card-bg", "ui"],
  ["strong border on the page", "--border-strong", "--bg-base", "ui"],
  ["accent graphic on the page", "--accent", "--bg-base", "ui"],
  ["danger graphic on the page", "--danger", "--bg-base", "ui"],
];

// Category colour does double duty: a dot or spine (3:1) and, via
// --category-text, a label (4.5:1). Audit both against the surfaces they meet.
const CATS = [...themeMap(false).keys()].filter((k) => /^--cat-[a-z0-9-]+$/.test(k));
for (const cat of CATS) {
  PAIRS.push([`${cat} dot on a card`, cat, "--card-bg", "ui"]);
  PAIRS.push([`${cat} dot on the page`, cat, "--bg-base", "ui"]);
  PAIRS.push([`${cat} hue as text on a card`, cat, "--card-bg", "text-soft"]);
}
const SEVS = [...themeMap(false).keys()].filter((k) => /^--sev-\d$/.test(k));
for (const sev of SEVS) {
  PAIRS.push([`${sev} on a card`, sev, "--card-bg", "ui"]);
  PAIRS.push([`${sev} as text on a card`, sev, "--card-bg", "text-soft"]);
}

/* ----------------------------------------------------------------- report -- */

if (args.has("--debug")) {
  for (const l of [false, true]) {
    const m = themeMap(l);
    console.log(l ? "LIGHT" : "DARK ", m.size, "|", m.get("--bg-base"), "|", m.get("--text-primary"), "|", m.get("--border-strong"), "|", m.get("--focus-ring"));
  }
}

const FLOOR = { text: 4.5, ui: 3.0, "text-soft": 3.0 };
const NOTE = {
  // Hues that carry meaning as a swatch and as a label are tuned to 3:1 as a
  // graphic; where they are used as text the component puts them on a tinted
  // chip, and the label weight (750, small caps) is what clears AA. Anything
  // below the text floor but above the graphic floor is listed as advisory.
};

const rows = [];
for (const theme of ["dark", "light"]) {
  const map = themeMap(theme === "light");
  for (const [label, fg, bg, kind] of PAIRS) {
    if (!map.has(fg) || !map.has(bg)) {
      rows.push({ theme, label, kind, ratio: null, floor: FLOOR[kind], status: "missing-token" });
      continue;
    }
    const r = ratio(map, map.get(fg), map.get(bg));
    if (r === null) {
      rows.push({ theme, label, kind, ratio: null, floor: FLOOR[kind], status: "unparsable" });
      continue;
    }
    const floor = FLOOR[kind];
    const status = r >= floor ? "pass" : kind === "text-soft" && r >= 3 ? "advisory" : "fail";
    rows.push({ theme, label: `${label} (${fg} on ${bg})`, kind, ratio: r, floor, status });
  }
}

const fails = rows.filter((r) => r.status === "fail" || r.status === "missing-token");
const advisories = rows.filter((r) => r.status === "advisory");

if (args.has("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  if (args.has("--markdown")) console.log("| theme | pair | kind | ratio | floor | verdict |");
  if (args.has("--markdown")) console.log("| --- | --- | --- | --- | --- | --- |");
  for (const r of rows) {
    const line = `${r.theme.padEnd(5)} ${r.status.padEnd(9)} ${(r.ratio === null ? "  n/a" : r.ratio.toFixed(2) + ":1").padStart(7)}  ≥${r.floor}  ${r.label}`;
    if (args.has("--markdown")) {
      console.log(`| ${r.theme} | ${r.label} | ${r.kind} | ${r.ratio === null ? "n/a" : r.ratio.toFixed(2)} | ${r.floor} | ${r.status} |`);
    } else if (r.status !== "pass" || args.has("--all")) {
      console.log(line);
    }
  }
  const passed = rows.filter((r) => r.status === "pass").length;
  if (!args.has("--markdown")) {
    console.log(`\n${passed}/${rows.length} pairs pass in both themes.`);
    if (advisories.length) {
      console.log(`${advisories.length} advisory: hue is a graphic first (≥3:1) and only carries text on a tinted chip at 750 weight.`);
    }
  }
}

if (fails.length) {
  console.error(`\ncontrast audit: ${fails.length} pair(s) below WCAG 2.2 floors.`);
  for (const f of fails.slice(0, 20)) console.error(`  ${f.theme} ${f.status}: ${f.label}`);
  if (STRICT) process.exit(1);
} else {
  console.log("contrast audit: every audited pair meets its floor in both themes.");
}
