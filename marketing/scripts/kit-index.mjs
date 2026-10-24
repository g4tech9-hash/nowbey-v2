#!/usr/bin/env node
/**
 * Writes out/index.html — a plain file listing for the kit.
 *
 * Why: when you drag `out/` onto a static host (Netlify Drop, Pages, an S3
 * bucket) the root has no index, so the site looks broken ("Page not found")
 * even though every asset is fine. This gives the root something to show and a
 * clickable list of every file, which is also handy for downloading one asset.
 *
 *   node scripts/kit-index.mjs
 */

import { readdirSync, writeFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");

const list = (dir) => {
  try {
    return readdirSync(join(OUT, dir)).filter((f) => !f.startsWith(".")).sort();
  } catch {
    return [];
  }
};
const kb = (dir, f) => Math.round(statSync(join(OUT, dir, f)).size / 1024);

const section = (title, dir, note) => {
  const files = list(dir);
  if (!files.length) return "";
  return `
  <h2>${title}<small>${note}</small></h2>
  <ul>
    ${files
      .map(
        (f) => `<li><a href="${dir}/${f}">${f}</a><span>${kb(dir, f)} KB</span></li>`,
      )
      .join("\n    ")}
  </ul>`;
};

const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NowBey — launch kit files</title>
<style>
  body{margin:0;background:#0c151d;color:#f3f1ea;
    font:15px/1.6 Inter,-apple-system,"Segoe UI",Roboto,sans-serif}
  .w{max-width:860px;margin:0 auto;padding:56px 24px 80px}
  h1{font-size:30px;letter-spacing:-.02em;margin:0 0 6px}
  .lede{color:#b9c8c9;margin:0 0 8px}
  .ok{display:inline-block;margin:18px 0 0;padding:10px 16px;border-radius:999px;
    background:rgba(175,232,95,.12);border:1px solid rgba(175,232,95,.4);color:#afe85f;
    font:700 12px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}
  h2{margin:44px 0 8px;font:700 13px/1 ui-monospace,monospace;letter-spacing:.16em;
    text-transform:uppercase;color:#3fd6c0}
  h2 small{display:block;margin-top:8px;font:400 14px/1.5 Inter,sans-serif;
    letter-spacing:0;text-transform:none;color:#9aafb3}
  ul{list-style:none;margin:14px 0 0;padding:0;border-top:1px solid rgba(148,206,202,.14)}
  li{display:flex;justify-content:space-between;gap:16px;padding:11px 2px;
    border-bottom:1px solid rgba(148,206,202,.1)}
  li a{color:#f3f1ea;text-decoration:none;border-bottom:1px solid rgba(63,214,192,.35)}
  li a:hover{color:#3fd6c0}
  li span{color:#9aafb3;font:600 12px ui-monospace,monospace;white-space:nowrap}
  footer{margin-top:56px;color:#9aafb3;font-size:13px}
</style>
</head>
<body>
<div class="w">
  <h1>NowBey — launch kit</h1>
  <p class="lede">You are looking at the published media folder. Every file below is the exact asset to
    upload or point the publisher at. Root-level links work because this page sits at the site root.</p>
  <span class="ok">Hosting works · make sure this site is public</span>
  ${section("Feed posts", "posts", "1080×1080 · Instagram feed, Facebook")}
  ${section("Stories + reel covers", "stories", "1080×1920 · Stories, Reels covers")}
  ${section("Reels", "video", "8s · 1080×1920 · 30fps · H.264")}
  ${section("Brand", "brand", "Profile photo · covers · preview sheet")}
  <h2>Contact sheet<small>Every asset on one page.</small></h2>
  <ul><li><a href="CONTACT_SHEET.png">CONTACT_SHEET.png</a><span>${kb("", "CONTACT_SHEET.png")} KB</span></li></ul>
  <footer>NowBey · Stay Safe, Bahamas — map and email alerts live for New Providence.
    Storm warnings always sent, free, for everyone.</footer>
</div>
</body>
</html>
`;

writeFileSync(join(OUT, "index.html"), html);
console.log("✓ out/index.html");
