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

test("every category has a unique accessible name, so a legend can decode it", () => {
  // The pin itself now draws the category glyph, not a two-letter code. The
  // code survives as the pin's accessible name, and it still has to be unique
  // or a screen reader cannot tell two pins apart.
  const categories = read("src/lib/categories.ts");
  const codes = [...categories.matchAll(/pin: "([A-Z]{2})"/g)].map((m) => m[1]);
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
  const reports = page.indexOf('visible.slice(0, listLimit).map(');
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


test("the header sticks to the Pulse rail while mobile navigation stays fixed and reachable", () => {
  const shell = read("src/components/app-shell.tsx");
  const header = shell.match(/<header className="([^"]+)"/);
  assert.ok(header, "site header exists");
  assert.match(header[1], /\bpulse-topbar\b/, "the header is the sticky rail");
  assert.match(header[1], /\bz-\[650\]/, "and stacks below the scrim, drawer and palette");
  // The stacking ladder is declared once, in the component layer. The numbers
  // are the contract: rail chrome below the scrim, the scrim below the drawer,
  // the drawer below the command palette. A page that invents its own z-index
  // is how a modal ends up under a sticky header.
  const comps = read("src/styles/pulse/components.css");
  for (const n of [620, 640, 680, 700, 720, 900, 950, 1000]) {
    assert.ok(comps.includes(`z-index: ${n};`), `the ladder declares ${n}`);
  }
  assert.match(comps, /\.pulse-nav-rail \{[\s\S]{0,160}?position: sticky;[\s\S]{0,200}?top: calc\(var\(--pulse-header-h\)/,
    "the rail hangs below the header band instead of under it");
  const headerZ = Number(header[1].match(/z-\[(\d+)\]/)[1]);
  assert.ok(headerZ > 640 && headerZ < 900, "the header outranks the island but never the scrim");
  assert.ok(headerZ < 700, "on a phone the bottom nav is the last thing under the thumb");
  const base = read("src/styles/pulse/base.css");
  assert.match(base, /\.pulse-topbar\s*\{[^}]*position: sticky;[^}]*top: 0;/,
    "the rail pins to the viewport top instead of covering content");
  assert.match(base, /\.pulse-topbar\s*\{[^}]*padding-top: var\(--pulse-safe-top\);/,
    "and clears the notch");

  const links = read("src/components/nav-links.tsx");
  assert.match(links, /className="pulse-bottom-nav"/, "mobile navigation is the fixed bar");
  assert.match(comps, /\.pulse-bottom-nav\s*\{[^}]*position: fixed;[^}]*inset: auto 0 0 0;/,
    "pinned to the bottom edge so it stays reachable");
  assert.match(comps, /\.pulse-bottom-nav\s*\{[\s\S]*?padding-bottom:[\s\S]*?safe-area-inset-bottom/,
    "and sits above the home indicator");
  assert.match(comps, /@media \(min-width: 1024px\) \{\s*\.pulse-bottom-nav \{\s*display: none;/,
    "and steps aside on desktop, where the rail owns navigation");
  // The bar renders six children (4 destinations + centre Report + More).
  // It once declared a five-column template for those six, wrapping More
  // onto a second row while the shell cleared for one. Auto-flow makes the
  // single row structural: each child takes an equal column, count-free.
  assert.match(comps, /\.pulse-bottom-nav\s*\{[\s\S]*?grid-auto-flow: column;[\s\S]*?grid-auto-columns: 1fr;/,
    "the bar lays its slots out in one row by construction, More included");
  assert.match(links, /className="fixed inset-0 z-\[760\] lg:hidden"/,
    "and the More sheet stacks above the bar (700) it is modal over, so its last rows stay tappable");
});

test("light mode supplies readable surfaces and category hues from tokens", () => {
  // The dual theme is not an override per class: light mode rebinds the semantic
  // layer, so every surface — including the ones the old app patched by hand —
  // inherits a readable pair. These are the pairs that used to need special
  // treatment, asserted where they now live.
  const pulse = read("src/styles/pulse/tokens.css");
  const comps = read("src/styles/pulse/components.css");
  assert.match(pulse, /:root\[data-theme="light"\] \{/, "light mode is a semantic block, not a class patch");
  assert.match(pulse, /--bg-base: #f7f3ec;/, "on bespoke warm sand, not inverted black");
  assert.match(pulse, /--cat-flooding: #0a5f8c;/, "with its own darker category hues");
  assert.match(comps, /:root\[data-theme="light"\] \.glass,\s*\n:root\[data-theme="light"\] \.glass-strong/,
    "and a glass treatment of its own, because frosted white on paper is invisible");
  assert.match(read("src/lib/pulse/prefs.ts"), /meta\[name="theme-color"\]/, "the browser chrome follows the theme");

  // Category colour is still routed through the Pulse map on the public surfaces.
  const controls = read("src/components/pulse/feed-controls.tsx");
  assert.match(controls, /hue: pulseCategoryMeta\(key\)\.token/, "filter chips take their hue from the category map");
  assert.match(read("src/ui/pulse/pill-row.tsx"), /"--category-text" as string\]: o\.hue/,
    "and pass it down as a token reference, never a literal");
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
  // No production/AAB profile yet — NowBey ships direct APKs, no Play Store.
  assert.equal(eas.build.production, undefined, "no production/store profile configured yet");
  const preflight = workflow.indexOf("npm run preflight:apk:full");
  const easBuild = workflow.indexOf("eas-cli@latest build");
  assert.ok(preflight >= 0, "preflight command found in workflow");
  assert.ok(easBuild >= 0, "eas build command found in workflow");
  assert.ok(preflight < easBuild, "preflight runs before the EAS build dispatch");
  assert.match(workflow, /build --platform android --profile preview/);
  const preflightScript = read("expo/scripts/preflight-apk.js");
  assert.match(preflightScript, /expo export --platform android/);
  assert.match(preflightScript, /Android package is/);
});
