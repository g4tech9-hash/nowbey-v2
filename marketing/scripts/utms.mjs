#!/usr/bin/env node
/**
 * NOWBEY — TRACKED LINKS
 * ---------------------------------------------------------------------------
 * Every caption points at `nowbey-v2.vercel.app`. That is right for a human
 * reading it, and useless for knowing which post worked: all 19 Instagram
 * entries arrive as the same referral.
 *
 * This writes a tiny redirect page per caption into `out/go/<slug>/`, hosted
 * with the rest of the kit, with the UTM already baked in:
 *
 *     /go/ig-01-map/   →   https://nowbey-v2.vercel.app?utm_source=instagram
 *                          &utm_medium=social&utm_campaign=launch
 *                          &utm_content=ig-01-map
 *
 * Put THAT in the Instagram bio / link sticker and in the Facebook posts. The
 * caption text keeps the plain domain, because a tracked URL in a caption looks
 * like spam and gets fewer taps.
 *
 *   node scripts/utms.mjs            # writes the redirect pages + links.json
 *   node scripts/utms.mjs --print    # just show the table
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out", "go");

for (const name of [".env", ".env.local"]) {
  const p = join(ROOT, name);
  if (!existsSync(p)) continue;
  for (const raw of readFileSync(p, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

/** Where the tracked links land. The app, NOT the media host. */
const SITE = process.env.SITE_BASE || "https://nowbey-v2.vercel.app";
/** Where the redirect pages will be served from — the same host as the kit. */
const KIT = (process.env.KIT_BASE || "").replace(/\/+$/, "");

const CAMPAIGN = process.env.UTM_CAMPAIGN || "launch";

const printOnly = process.argv.includes("--print");

/* ── the captions that carry a call to action ─────────────────────────────── */

const plan = JSON.parse(readFileSync(join(ROOT, "captions", "plan.json"), "utf8"));

const SOURCE = { ig: "instagram", fb: "facebook", tt: "tiktok" };
const MEDIUM = { ig: "social", fb: "social", tt: "social" };

const rows = new Map(); // slug → { url, platform, day, label, file }

for (const e of plan) {
  const file = e.caption;
  if (!file) continue;
  const abs = join(ROOT, file);
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, "utf8");
  if (!/nowbey/i.test(text)) continue; // no link in this caption

  // A re-share of the same asset needs its own content value, or the two
  // land in the same analytics row and the comparison is impossible.
  const slug = basename(file, ".txt").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  if (rows.has(slug)) continue;

  rows.set(slug, {
    slug,
    platform: e.platform,
    day: e.day,
    label: e.label || e.asset || file,
  });
}

/* ── build ────────────────────────────────────────────────────────────────── */

const links = {};

for (const { slug, platform, day, label } of rows.values()) {
  const q = new URLSearchParams({
    utm_source: SOURCE[platform] || platform,
    utm_medium: MEDIUM[platform] || "social",
    utm_campaign: CAMPAIGN,
    utm_content: slug,
  });
  const target = `${SITE}${SITE.includes("?") ? "&" : "?"}${q}`;
  links[slug] = { day, platform, label, target, page: `/go/${slug}/` };

  if (printOnly) continue;

  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });
  // A meta refresh works everywhere — in-app browsers, old WebViews, no JS.
  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>NowBey — opening…</title>
<meta http-equiv="refresh" content="0;url=${target.replace(/&/g, "&amp;")}">
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c151d;
    color:#f3f1ea;font:16px/1.6 Inter,-apple-system,"Segoe UI",sans-serif;text-align:center;padding:24px}
  a{color:#3fd6c0}
  .dot{width:10px;height:10px;border-radius:50%;background:#3fd6c0;margin:0 auto 18px}
</style>
</head>
<body>
<div>
  <div class="dot"></div>
  <p>Opening NowBey…</p>
  <p><a href="${target.replace(/&/g, "&amp;")}">Tap here if nothing happens</a></p>
</div>
</body>
</html>
`,
  );
}

if (!printOnly) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "links.json"), JSON.stringify(links, null, 2) + "\n");
}

/* ── report ───────────────────────────────────────────────────────────────── */

const keys = Object.keys(links);
console.log(`\nTracked links — ${keys.length} pages${printOnly ? " (dry)" : ` → out/go/`}\n`);

if (!KIT) {
  console.log("! KIT_BASE is not set in .env, so the full URLs cannot be built yet.");
  console.log("  Set it, then run this again.\n");
}

for (const k of keys) {
  const l = links[k];
  const full = KIT ? `${KIT}${l.page}` : `${l.page}`;
  console.log(`day ${String(l.day).padStart(2)}  ${l.platform.toUpperCase()}  ${full}`);
  console.log(`        → ${l.target}`);
}

console.log(`
Where these go:
  · Instagram bio link and the story link sticker  → the matching /go/ page
  · Facebook post body                              → the matching /go/ page
  · caption TEXT stays as the plain domain — a tracked URL in a caption
    reads as spam and gets fewer taps.

Rebuild after adding a caption:  node scripts/utms.mjs
`);
