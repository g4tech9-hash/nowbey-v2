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

test("pin codes are unique per category, so a legend can decode them", async () => {
  // Semantics over source text: pins now derive from src/lib/categories.ts
  // through geo.ts, so check the exported list instead of regexing literals.
  const { CATEGORIES } = await import("../src/lib/geo.ts");
  const codes = Object.values(CATEGORIES).map((c) => c.pin);
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

test("the APK pipeline falls back to a local Gradle build when EAS produces nothing", () => {
  const workflow = read(".github/workflows/deploy.yml");
  const easStep = workflow.indexOf("id: eas");
  assert.ok(easStep >= 0, "the EAS step is identified");

  // The EAS step must not be allowed to end the job: its outcome is what starts the fallback.
  const continueOnError = workflow.indexOf("continue-on-error: true", easStep);
  const fallbackId = workflow.indexOf("id: fallback", easStep);
  const fallbackScript = workflow.indexOf("bash scripts/build-apk-local.sh", easStep);
  assert.ok(continueOnError > easStep, "the EAS step continues on error");
  assert.ok(fallbackId > easStep, "the fallback step exists after the EAS step");
  assert.ok(fallbackScript > fallbackId, "the fallback runs the shared local build script");
  assert.match(workflow, /if: steps\.eas\.outcome == 'failure' \|\| steps\.eas\.outcome == 'skipped'/,
    "the fallback runs when EAS failed or was skipped outright");
  assert.match(workflow, /name: nowbey-apk-fallback/, "the fallback APK is uploaded as an artifact");
  assert.match(workflow, /title=No APK was produced/, "a run without either APK still fails");
  assert.match(workflow, /- mobile-fallback/, "the manual fallback target is a dispatch option");

  // The button in the Actions tab runs the same script, so the two paths cannot drift.
  const manual = read(".github/workflows/build.yml");
  assert.match(manual, /\.\/scripts\/build-apk-local\.sh/, "build.yml uses the shared script");
  assert.match(manual, /FIREBASE_GOOGLE_SERVICES_JSON/, "and writes the Firebase config Gradle needs");

  const script = read("scripts/build-apk-local.sh");
  assert.match(script, /expo prebuild --platform android/, "the fallback prebuilds the native project");
  assert.match(script, /assembleRelease/, "and compiles a release APK with Gradle");
  assert.match(script, /google-services\.json/, "refusing to start without the Firebase config");
  assert.match(read("scripts/eas-dispatch.sh"), /mobile-fallback/, "the dispatch script knows the fallback target");
});

/**
 * The phone app spec (2026-10 mobile overhaul). These are source assertions on
 * purpose: the hermetic gate has no browser, so they pin the *rules* that the
 * screenshots asked for — one app-bar row, five tabs, scroll tracks, a CTA that
 * clears the bar — and leave pixels to scripts/mobile-audit.mjs.
 */
test("the phone header is one compact app-bar row, not the desktop chrome", () => {
  const shell = read("src/components/app-shell.tsx");
  const comps = read("src/styles/pulse/components.css");
  const nextConfig = read("next.config.ts");

  // The floating "N" over the Feed tab was Next's dev indicator, not our badge.
  assert.match(nextConfig, /devIndicators:\s*false/, "the dev indicator is off, so nothing floats over Feed");

  assert.match(shell, /pulse-header-row/, "the header opts into the app-bar row");
  assert.match(shell, /nb-tagline nb-label mt-1 block truncate/, "brand + tagline stay on the left on every width");
  assert.match(shell, /<span className="flex md:hidden">\s*<Link href="\/report" className="pulse-report-pill/, "one compact Report pill on a phone");
  assert.match(shell, /<span className="hidden md:inline-flex">\s*<Link href="\/report"/, "and the full CTA only from md up");
  // Gas ticker, theme toggle, Simple view and the account chip are desktop chrome.
  assert.match(shell, /<div className="hidden md:block">\s*<LiveTicker \/>/, "the ticker is desktop-only");
  assert.match(read("src/lib/csp.ts"), /opts\.development \? " 'unsafe-eval'" : ""/, "dev gets eval so no overlay issue badge sits over the app");
  assert.match(shell, /<span className="hidden items-center gap-2 md:flex">[\s\S]*?<SessionChip/, "account controls are desktop-only");
  assert.match(comps, /@media \(max-width: 767\.98px\)[\s\S]{0,400}--pulse-header-h: 56px/, "56px app bar on a phone");
  assert.match(comps, /\.pulse-report-pill\s*\{[\s\S]{0,400}box-shadow: var\(--pulse-glow-teal\)/, "and the pill is the teal primary");
});

test("the phone bottom bar is the spec's five tabs, with You in the fifth slot", () => {
  const links = read("src/components/nav-links.tsx");
  assert.match(links, /export const ACCOUNT_NAV[\s\S]*?href: "\/you"/, "You is a first-class destination");
  assert.match(links, /PRIMARY_NAV\[0\],\s*PRIMARY_NAV\[1\],\s*null,\s*PRIMARY_NAV\[2\],\s*ACCOUNT_NAV,/, "Feed · Map · Report · Wire · You");
  assert.ok(!/pulse-navtab"\s+aria-expanded/.test(links), "the sixth More tab is gone from the bar");
  assert.match(links, /className="pulse-sr-only"/, "but every other place is still one action away for assistive tech");
  assert.match(links, /href: "\/alerts", label: "Alerts"/, "and Alerts leads the sheet");
});

test("feed filters are scroll tracks, not stacked selects", () => {
  const controls = read("src/components/pulse/feed-controls.tsx");
  const comps = read("src/styles/pulse/components.css");
  assert.match(controls, /className="pulse-filter-tracks"/, "the three tracks exist");
  assert.ok(!controls.includes("nb-select"), "the island dropdown is a pill track now");
  assert.equal((controls.match(/pulse-filter-track/g) || []).length >= 3, true, "status, category and island each get a row");
  assert.match(comps, /\.pulse-filter-track\s*\{[\s\S]{0,400}flex-wrap: nowrap;/, "a track never wraps into a cluster");
  assert.match(comps, /\.pulse-filter-track\s*\{[\s\S]{0,400}overflow-x: auto;/, "it scrolls sideways instead");
});

test("a floating CTA clears the tab bar and sits below dialogs", () => {
  const comps = read("src/styles/pulse/components.css");
  const report = read("src/app/report/page.tsx");
  assert.match(comps, /\.pulse-action-bar-sticky,\s*\.pulse-sticky-cta\s*\{[\s\S]{0,600}z-index: 690;/, "CTA stacks above content");
  assert.match(comps, /bottom: calc\(var\(--pulse-navbar-h\) \+ var\(--pulse-safe-bottom\) \+ var\(--pulse-space-2\)\);/, "and above the nav, with a breath");
  assert.match(report, /pulse-sticky-cta pulse-step-cta/, "the report wizard's severity + Next row is that bar");
  assert.match(report, /pulse-step-cta-next/, "with one full-width primary action");
});

test("phone cards and the hazard grid follow the mobile geometry", () => {
  const comps = read("src/styles/pulse/components.css");
  assert.match(comps, /@media \(max-width: 639\.98px\)[\s\S]{0,200}\.pulse-card-pad\s*\{[\s\S]{0,120}padding: var\(--pulse-space-4\)/, "16px card padding");
  assert.match(comps, /\.pulse-pick\s*\{[\s\S]{0,200}min-height: 96px/, "hazard cells clear the 48px touch target twice over");
  assert.match(comps, /\.pulse-pick-rail\s*\{[\s\S]{0,120}width: 100%;[\s\S]{0,80}height: 2px/, "with a 2px accent bar across the top");
  assert.match(comps, /\.pulse-pick:active\s*\{[\s\S]{0,120}opacity: 0\.7/, "and explicit press feedback");
});

/**
 * The Expo app's parity with the 2026-10 mobile spec. Same reasoning as the web
 * rules above: source assertions now, pixels on a device later. These are the
 * four deltas the spec surfaced after the first APK shipped.
 */
test("the Expo tab bar raises the centre Report action", () => {
  const tabs = read("expo/app/(tabs)/_layout.tsx");
  assert.match(tabs, /function ReportTabButton/, "there is one custom centre button");
  assert.match(tabs, /tabBarButton: \(props\) => <ReportTabButton \{\.\.\.props\} \/>/, "the Report tab renders it");
  assert.match(tabs, /tabBarLabel: \(\) => null/, "and the bar does not print a second label under the disc");
  assert.match(tabs, /marginTop: -18/, "the disc breaks the bar's top edge");
  assert.match(tabs, /overflow: "visible"/, "and the bar is told not to clip it");
  assert.match(tabs, /accessibilityState=\{accessibilityState\}/, "while staying a real tab for screen readers");
});

test("Expo cards use the spec's 16px geometry", () => {
  const theme = read("expo/src/theme.ts");
  const ui = read("expo/src/ui.tsx");
  assert.match(theme, /card: 16,/, "a card radius token exists");
  assert.match(ui, /borderRadius: radius\.card/, "cards take it");
  assert.match(ui, /borderRadius: radius\.card,\s*\n\s*padding: 16,/, "with the spec's 16px inner padding");
});

test("the Expo report wizard is a hazard grid with a sticky action bar", () => {
  const report = read("expo/app/(tabs)/report.tsx");
  assert.match(report, /flexBasis: "47%"/, "categories are a two-column grid");
  assert.match(report, /minHeight: 96/, "tiles clear the 48px touch target twice over");
  assert.match(report, /height: 2, borderRadius: 1, backgroundColor: c\.color/, "each tile carries a 2px accent bar");
  assert.match(report, /opacity: pressed \? 0\.7 : 1/, "and explicit press feedback");
  assert.match(report, /paddingBottom: 128/, "the scroll clears the sticky bar");
  assert.equal((report.match(/Next: put it on the map/g) || []).length, 1, "the primary action lives in the bar, not the flow");
  assert.match(report, /label="Publish"/, "step 3 keeps Publish in the bar");
});

test("the Expo feed card header is one row", () => {
  // The Pulse rebuild moved the incident card out of the screen and into the design
  // system, so the feed's header geometry is asserted where it is now written: the
  // component `app/(tabs)/index.tsx` renders for every row.
  const feed = read("expo/app/(tabs)/index.tsx");
  const card = read("expo/src/design-system/HazardCard.tsx");
  assert.match(feed, /from "\.\.\/\.\.\/src\/design-system\/HazardCard"/, "the feed renders the design-system card");
  assert.match(card, /flexShrink: 1[\s\S]{0,200}CategoryBadge/, "the badge may shrink");
  assert.match(card, /flexShrink: 0,[\s\S]{0,80}color: color\.subtle,/, "the timestamp never does");
});
