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

test("street tile configuration uses the canonical OSM endpoint with linked attribution", async () => {
  const { STREET_TILES, LAYERS } = await import("../src/lib/geo.ts");
  assert.equal(STREET_TILES.url, "https://tile.openstreetmap.org/{z}/{x}/{y}.png");
  assert.match(STREET_TILES.attribution, /https:\/\/www\.openstreetmap\.org\/copyright/);
  assert.equal(STREET_TILES.maxZoom, 19);
  for (const key of ["road", "streets"]) {
    assert.equal(LAYERS[key].url, STREET_TILES.url);
    assert.equal(LAYERS[key].attribution, STREET_TILES.attribution);
    assert.equal(LAYERS[key].maxZoom, STREET_TILES.maxZoom);
  }
  assert.equal(LAYERS.streets.label, "Streets", "do not advertise dark tiles after retiring CARTO");
});

test("admin geofence and public map cannot reintroduce the rejected CARTO tiles", () => {
  const admin = read("src/components/admin-geofence-map.tsx");
  assert.match(admin, /<TileLayer \{\.\.\.STREET_TILES\}/);
  assert.doesNotMatch(admin, /cartocdn\.com/);
  assert.doesNotMatch(read("src/lib/geo.ts"), /cartocdn\.com/);
});

test("pin controls and reports share a scroll owner so controls cannot hide the list", () => {
  const scroll = page.indexOf('className="nb-pin-rail-scroll nb-scroll');
  const activity = page.indexOf('Island activity ·');
  const filters = page.indexOf('Row B — category filters');
  const reports = page.indexOf('visible.slice(0, listLimit)');
  assert.ok(scroll > 0 && scroll < activity && activity < filters && filters < reports);
  assert.match(page.slice(scroll, activity), /<details className="px-3 lg:px-0">/,
    "activity statistics start collapsed, not expanded above the reports");
  assert.equal((page.match(/overflow-y-auto/g) ?? []).length, 1,
    "avoid a second scroll container squeezed beneath fixed-height filters");
  assert.doesNotMatch(page, /lg:flex-wrap lg:overflow-visible/,
    "category chips stay in a horizontal rail instead of consuming many rows");
  assert.ok(page.indexOf('Row A — the count') < scroll, "pin count and action stay outside the scrolling controls");
});

test("member role display distinguishes effective access from the stored database role", () => {
  const actions = read("src/components/admin-user-actions.tsx");
  const member = read("src/app/admin/users/[handle]/page.tsx");
  assert.match(actions, /Effective role/);
  assert.match(actions, /Stored database role/);
  assert.match(actions, /p\.envAdmin && p\.emailVerified/);
  assert.match(actions, /disabled=\{p\.isSelf \|\| p\.envAdmin\}/,
    "display correction must not remove role editing safeguards");
  assert.match(member, /\{access\.isAdmin \? "admin" : u\.role\}/,
    "badge uses the shared access verdict, not an unverified reserved handle");
});


test("the top navigation scrolls with the document, while mobile navigation remains fixed", () => {
  const shell = read("src/components/app-shell.tsx");
  const header = shell.match(/<header className="([^"]+)"/);
  assert.ok(header, "site header exists");
  assert.doesNotMatch(header[1], /\b(sticky|fixed)\b/,
    "top navigation must not cover page content while scrolling");
  assert.match(header[1], /\brelative\b/, "keep header dropdown stacking above map controls");
  assert.match(read("src/components/nav-links.tsx"), /fixed inset-x-0 bottom-0/,
    "mobile bottom navigation stays reachable");
});

test("light mode supplies readable surfaces, header and category chips", () => {
  for (const selector of [".glass-strong", ".nb-surface", ".nb-category-chip"]) {
    assert.ok(css.includes(`html[data-mode="light"] ${selector} {`), `missing light treatment for ${selector}`);
  }
  assert.ok(css.includes('html[data-mode="light"] :is(.bg-tide-500, .bg-tide-400).text-abyss-950'));
  assert.ok(read("src/app/page.tsx").includes("--category-text"));
  assert.ok(read("src/app/page.tsx").includes("nb-category-chip"));
});

test("daylight action and chip text have WCAG AA normal-text contrast", () => {
  function luminance(hex) {
    const rgb = hex.match(/[a-f0-9]{2}/gi).map((v) => parseInt(v, 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  for (const [fg, bg] of [["ffffff", "007d70"], ["38505a", "ffffff"], ["0a1a24", "f5f3ed"]]) {
    const values = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${fg} on ${bg}`);
  }
});

test("APK map retires CARTO and required legacy text tokens exist", () => {
  assert.doesNotMatch(read("expo/src/MapCanvas.tsx"), /cartocdn\.com/);
  assert.match(read("expo/src/theme.ts"), /muted: "#[a-f0-9]+"/);
  assert.match(read("expo/src/theme.ts"), /subtle: "#[a-f0-9]+"/);
});

test("APK workflow runs a real preflight before the preview build", () => {
  const workflow = read(".github/workflows/deploy.yml");
  const eas = JSON.parse(read("expo/eas.json"));
  assert.equal(eas.build.preview.android.buildType, "apk");
  assert.equal(eas.build.preview.distribution, "internal");
  assert.ok(workflow.indexOf("npm run preflight:apk:full") < workflow.indexOf("build --platform android --profile preview"));
  assert.match(read("expo/scripts/preflight-apk.js"), /expo', 'export', '--platform', 'android/);
});
