#!/usr/bin/env node
/**
 * Alias codemod — retire the legacy colour vocabulary (abyss-/ink-/sand-/tide-/
 * conch-/sun-/rum-/ok-*) in favour of the Pulse semantic names.
 *
 * PIXEL-IDENTICAL by construction: every mapping targets an existing utility
 * whose bridge variable points at the SAME value variable as the alias
 * (verified against the compiled CSS, e.g. --color-ink-300: var(--text-tertiary)
 * ≡ --color-tertiary: var(--text-tertiary)). Only the names in className
 * strings change; rendered colours cannot move.
 *
 * NOT touched (already semantic — bridge maps them to themselves):
 *   warn-*, danger-*, info-*
 *
 * Requires the bridge twins added in src/app/globals.css first:
 *   --color-accent-hover, --color-text-accent, --color-warn-400,
 *   --color-success-600/500/400
 *
 * Usage:  node scripts/alias-codemod.mjs [--apply]   (default: dry run)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

/** alias suffix → semantic suffix (each pair shares one value variable). */
const MAP = {
  "abyss-975": "base",
  "abyss-950": "base",
  "abyss-900": "raised",
  "abyss-850": "raised",
  "abyss-800": "hover",
  "abyss-700": "active",
  "abyss-600": "strong",
  "ink-100": "primary",
  "ink-200": "secondary",
  "ink-300": "tertiary",
  "ink-400": "tertiary",
  "sand-100": "primary",
  "sand-50": "primary",
  "tide-650": "accent-hover",
  "tide-600": "accent",
  "tide-500": "accent",
  "tide-400": "accent-hover",
  "tide-300": "text-accent",
  "tide-200": "text-accent",
  "conch-600": "danger-600",
  "conch-500": "danger-500",
  "conch-400": "danger-400",
  "sun-600": "warn-600",
  "sun-500": "warn-500",
  "sun-400": "warn-400",
  "rum-500": "cat-notice",
  "ok-600": "success-600",
  "ok-500": "success-500",
  "ok-400": "success-400",
};

const counts = new Map();
const fileTotals = new Map();

function* tsxFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* tsxFiles(p);
    else if (e.name.endsWith(".tsx")) yield p;
  }
}

for (const file of tsxFiles(join(ROOT, "src"))) {
  const src = readFileSync(file, "utf8");
  let out = src;
  for (const [alias, target] of Object.entries(MAP)) {
    // Match the alias only as a utility-token suffix: preceded by a real prefix
    // (bg-/text-/… — never by another dash, so var(--abyss-900) is untouched),
    // and followed by an opacity modifier or a genuine token boundary. The
    // match is the alias alone so /50-style modifiers survive verbatim.
    const re = new RegExp(`(?<!-)-${alias}(?=(?:/\\d+)?(?![-\\w]))`, "g");
    out = out.replace(re, () => {
      counts.set(alias, (counts.get(alias) ?? 0) + 1);
      return `-${target}`;
    });
  }
  if (out !== src) {
    fileTotals.set(file, true);
    if (APPLY) writeFileSync(file, out);
  }
}

console.log(APPLY ? "APPLIED — replacements per alias:" : "DRY RUN — matches per alias:");
for (const [alias, n] of [...counts].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${alias} → ${MAP[alias]}`);
}
console.log(
  `total: ${[...counts.values()].reduce((s, n) => s + n, 0)} replacements across ${fileTotals.size} files`,
);
