/**
 * TOKEN DRIFT CHECK
 * ---------------------------------------------------------------------------
 * The marketing kit keeps its own copy of the palette (tokens.mjs) so it can be
 * built without a Next.js toolchain. Copies drift. This script reads the real
 * design system — src/styles/pulse/tokens.css — and fails if any value the kit
 * depends on has moved or disappeared.
 *
 *   npm run check:tokens
 *
 * Exit code 1 on drift. Add it to CI next to `npm run audit:contrast` if you
 * want the social kit to stay honest forever.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { T } from "./tokens.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const css = readFileSync(join(ROOT, "src", "styles", "pulse", "tokens.css"), "utf8");

/** Read a custom property's literal value from the dark (:root) block. */
function prop(name) {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

/** Resolve one level of `var(--x)` indirection. */
function resolve(v) {
  if (!v) return v;
  const m = v.match(/^var\(--([\w-]+)\)$/);
  return m ? prop(m[1]) ?? v : v;
}

const checks = [
  ["bg-base", T.bgBase, "bgBase"],
  ["bg-raised", T.bgRaised, "bgRaised"],
  ["bg-elevated", T.bgElevated, "bgElevated"],
  ["text-primary", T.textPrimary, "textPrimary"],
  ["text-secondary", T.textSecondary, "textSecondary"],
  ["text-tertiary", T.textTertiary, "textTertiary"],
];

const hues = [
  ["pulse-hue-teal-400", () => T.accent, "accent"],
  ["pulse-hue-teal-300", () => T.accentHover, "accentHover"],
  ["pulse-hue-coral-400", () => T.danger, "danger"],
  ["pulse-hue-amber-300", () => T.warning, "warning"],
  ["pulse-hue-ocean-300", () => T.info, "info"],
  ["pulse-hue-lime-300", () => T.success, "success"],
  ["pulse-hue-ocean-300#flooding", () => T.cat.flooding, "cat.flooding"],
  ["pulse-hue-amber-300#power", () => T.cat.power, "cat.power"],
  ["pulse-hue-coral-300#road", () => T.cat.road, "cat.road"],
  ["pulse-hue-violet-300#health", () => T.cat.health, "cat.health"],
];

const norm = (v) => (v ?? "").toLowerCase().replace(/\s+/g, "");
let failures = 0;

for (const [name, expected, label] of checks) {
  const actual = norm(resolve(prop(name)));
  if (actual !== norm(expected)) {
    console.error(`✗ ${label}: tokens.css has ${prop(name)} (${actual}), marketing uses ${expected}`);
    failures++;
  }
}
for (const [spec, get, label] of hues) {
  const [name] = spec.split("#");
  const actual = norm(resolve(prop(name)));
  const expected = norm(get());
  if (actual !== expected) {
    console.error(`✗ ${label}: tokens.css has ${prop(name)} (${actual}), marketing uses ${expected}`);
    failures++;
  }
}

if (failures) {
  console.error(`\n${failures} token(s) drifted. Update marketing/scripts/tokens.mjs, then rebuild.`);
  process.exit(1);
}
console.log(`✓ ${checks.length + hues.length} tokens match src/styles/pulse/tokens.css`);
