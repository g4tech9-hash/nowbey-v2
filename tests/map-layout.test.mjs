/**
 * Desktop /map must stay a bounded workspace, not a page-length list.
 *
 * Regression guard for the 2026-10-16 screenshot ("pins run the entire length
 * of the page"): the desktop rail used lg:overflow-visible with the grid at
 * items-start, so all ~160 pins laid out in document flow and the map
 * scrolled away. These are source/CSS assertions on purpose — they run in the
 * hermetic `npm test` gate with no browser, database or server, exactly like
 * tests/redirect.test.mjs. Pixel proof stays with scripts/mobile-audit.mjs
 * and the device checklist.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("src/app/map/page.tsx");
const css = read("src/app/globals.css");

test("the desktop map workspace has a viewport-bounded height", () => {
  assert.ok(page.includes("nb-map-workspace"), "the /map grid must opt into the bounded workspace");
  assert.match(
    css,
    /@media \(min-width: 1024px\)\s*\{\s*\.nb-map-workspace\s*\{[^}]*height: calc\(100dvh/,
    "the workspace height must be derived from the viewport on desktop",
  );
});

test("the pin list scrolls inside the rail on desktop, never in page flow", () => {
  assert.ok(!page.includes("overscroll-contain px-3 pb-3 lg:overflow-visible"), "the rail's scroll box must not be opened up on desktop");
  assert.ok(!page.includes("lg:items-start"), "the grid must stretch its columns to the workspace height");
  assert.ok(!page.includes("lg:h-auto"), "the rail must not size to its content on desktop");
  assert.match(page, /nb-scroll[^"]*overflow-y-auto/, "the list keeps its own scrollbar");
});

test("the map fills its column instead of a fixed clamp that scrolls away", () => {
  assert.ok(!page.includes("lg:h-[clamp(420px,68vh,720px)]"), "the old capped map height must not return");
  assert.ok(page.includes("lg:h-full"), "the map column fills the workspace");
});

test("the rail renders a page of rows at a time, with a way to grow it", () => {
  assert.match(page, /visible\.slice\(0, listLimit\)/, "rows are windowed, not all mounted at once");
  assert.ok(page.includes("Show more pins"), "the rest of the list stays one tap away");
});

test("pin codes are unique per category, so a legend can decode them", () => {
  const geo = read("src/lib/geo.ts");
  const codes = [...geo.matchAll(/pin: "([A-Z]{2})"/g)].map((m) => m[1]);
  assert.ok(codes.length >= 13, "every category needs a pin code");
  assert.equal(new Set(codes).size, codes.length, `pin codes must be unique, got: ${codes.join(",")}`);
  assert.ok(page.includes("What the pins mean"), "the map page must ship the legend");
});
