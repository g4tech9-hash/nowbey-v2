#!/usr/bin/env node
/**
 * NOWBEY — PREFLIGHT
 * ---------------------------------------------------------------------------
 * Answers one question: can this machine publish right now?
 *
 *   node scripts/preflight.mjs
 *
 * Reads marketing/.env (or the real environment), then:
 *   · checks each credential is present and non-placeholder;
 *   · asks Meta who the token belongs to, which Pages it can see, and whether
 *     the chosen Page has an Instagram Business account attached;
 *   · fetches one post and one reel from KIT_BASE with no auth, to prove the
 *     media is publicly reachable with the right content type;
 *   · asks TikTok who the token belongs to.
 *
 * It never prints a token. Exit code 1 if anything fails.
 */

import { readFileSync, existsSync } from "node:fs";
import { writeEnvFile } from "./env-write.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

const V = process.env.GRAPH_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${V}`;
const { META_TOKEN, IG_USER_ID, FB_PAGE_ID, TT_TOKEN, KIT_BASE } = process.env;

const rows = [];
const suggestions = []; // ready-to-paste .env lines
const discovered = {}; // key → value, for --write
const add = (check, state, detail) => rows.push({ check, state, detail });
const ok = (c, d) => add(c, "PASS", d);
const warn = (c, d) => add(c, "WARN", d);
const fail = (c, d) => add(c, "FAIL", d);
const pending = (c, d) => add(c, "PENDING", d);

const mask = (v) => (v ? `${v.slice(0, 4)}…${v.slice(-3)} (${v.length} chars)` : "—");

async function meta() {
  if (!META_TOKEN) {
    fail("META_TOKEN", "missing — see CREDENTIALS.md step 1");
    fail("IG_USER_ID", "missing — see CREDENTIALS.md step 2");
    fail("FB_PAGE_ID", "missing — see CREDENTIALS.md step 2");
    return;
  }
  // a token pasted by hand is easy to get subtly wrong — say so plainly
  const t = META_TOKEN.trim();
  if (t !== META_TOKEN) warn("META_TOKEN format", "has leading or trailing spaces in .env — remove them");
  if (/^META_TOKEN=/.test(t)) {
    fail("META_TOKEN format", 'the line includes "META_TOKEN=" inside the value — the value should start at EAA…');
  } else if (!t.startsWith("EAA")) {
    warn("META_TOKEN format", `does not start with "EAA" (starts "${t.slice(0, 6)}…") — is this the access token, not the App ID/secret?`);
  } else if (t.length < 100) {
    warn("META_TOKEN format", `only ${t.length} characters — Meta tokens are usually 150–250; it may have been cut short when copying`);
  } else {
    ok("META_TOKEN", `present ${mask(t)}`);
  }

  // who owns the token
  let me;
  try {
    const r = await fetch(`${GRAPH}/me?fields=id,name&access_token=${META_TOKEN}`);
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error?.message || r.status);
    me = j;
    ok("Token valid", `authenticated as ${j.name || j.id}`);
  } catch (e) {
    const offline = /fetch failed|ENOTFOUND|ECONN|network/i.test(e.message || "");
    fail(
      "Token valid",
      offline
        ? `could not reach graph.facebook.com (${e.message}) — check the connection, then re-run`
        : `Meta rejected the token: ${e.message}`,
    );
    return;
  }

  // which permissions did the authorisation actually grant?
  const NEEDED = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish", "business_management"];
  const granted = [];
  try {
    const r = await fetch(`${GRAPH}/me/permissions?access_token=${META_TOKEN}`);
    const j = await r.json();
    for (const p of j.data || []) if (p.status === "granted") granted.push(p.permission);
    const missing = NEEDED.filter((p) => !granted.includes(p));
    if (missing.length) {
      warn("Permissions", `missing: ${missing.join(", ")} — tick them BEFORE clicking Generate`);
    } else {
      ok("Permissions", `${NEEDED.length}/${NEEDED.length} granted`);
    }
  } catch {
    warn("Permissions", "could not read /me/permissions");
  }

  // pages the token can post to
  let pages = [];
  try {
    const r = await fetch(`${GRAPH}/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${META_TOKEN}`);
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error?.message || r.status);
    pages = j.data || [];
    if (!pages.length) {
      warn("Pages visible", "token sees no Pages");
      if (!granted.includes("pages_show_list")) {
        console.log(
          "\n  Cause: pages_show_list was not granted, so Meta returns an empty list.\n" +
            "  Fix: Graph API Explorer → Permissions (right panel) → tick pages_show_list,\n" +
            "  pages_read_engagement, pages_manage_posts, instagram_basic,\n" +
            "  instagram_content_publish, business_management → then Generate Access Token again.\n" +
            "  Ticking a permission after a token exists does nothing; it must be set first.\n",
        );
      } else {
        console.log(
          "\n  pages_show_list is granted but the list is empty, which means one of:\n" +
            "   - you authorised as a different Facebook profile than the one that administers the Page;\n" +
            "   - the Page sits inside a Business portfolio and your role there is limited;\n" +
            "   - the Page is new and has not appeared yet.\n" +
            "  Run: node scripts/find-pages.mjs - it searches Pages, businesses and portfolios.\n",
        );
      }
    }
    else {
      ok("Pages visible", pages.map((p) => p.name).join(", "));
      if (!FB_PAGE_ID) {
        discovered.FB_PAGE_ID = pages[0].id;
        if (pages.length > 1) {
          suggestions.push(`# pick one of: ${pages.map((p) => `${p.name}=${p.id}`).join("  ")}`);
        }
        suggestions.push(`FB_PAGE_ID=${pages[0].id}`);
      }
    }
  } catch (e) {
    warn("Pages visible", `could not list Pages: ${e.message}`);
  }

  // the chosen page
  if (!FB_PAGE_ID) {
    fail("FB_PAGE_ID", pages.length ? `missing — one of: ${pages.map((p) => `${p.name}=${p.id}`).join(", ")}` : "missing — see CREDENTIALS.md step 2");
  } else {
    try {
      const r = await fetch(`${GRAPH}/${FB_PAGE_ID}?fields=id,name,instagram_business_account{id,username}&access_token=${META_TOKEN}`);
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error?.message || r.status);
      ok("FB_PAGE_ID", `${j.name} (${j.id})`);
      const ig = j.instagram_business_account;
      if (!ig) {
        fail("Instagram linked", "this Page has NO Instagram Business account attached — link it first (CREDENTIALS.md step 2)");
      } else {
        ok("Instagram linked", `@${ig.username || "?"} (${ig.id})`);
        if (IG_USER_ID && IG_USER_ID !== ig.id) {
          warn("IG_USER_ID", `set to ${IG_USER_ID} but the Page's account is ${ig.id} — use the Page one`);
        } else if (!IG_USER_ID) {
          warn("IG_USER_ID", `not set — fine, the publisher reads ${ig.id} from the Page (or run with --write)`);
          discovered.IG_USER_ID = ig.id;
          suggestions.push(`IG_USER_ID=${ig.id}`);
        } else {
          ok("IG_USER_ID", IG_USER_ID);
        }
      }
    } catch (e) {
      fail("FB_PAGE_ID", `cannot read that Page: ${e.message}`);
    }
  }
}

async function probe(url) {
  try {
    const r = await fetch(url, { headers: { range: "bytes=0-1023" } });
    const type = (r.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const len = Number(r.headers.get("content-range")?.split("/")?.[1] || r.headers.get("content-length") || 0);
    return { ok: r.ok, status: r.status, type, len };
  } catch (e) {
    return { ok: false, status: 0, type: "", len: 0, error: e.message };
  }
}

async function media() {
  if (!KIT_BASE) {
    fail("KIT_BASE", "missing — host the out/ folder, then put the URL in .env (WALKTHROUGH step 4)");
    return;
  }
  const base = KIT_BASE.replace(/\/?$/, "/");

  // Two layouts are common: the folder itself (…/posts/x.png) or the folder
  // dropped inside another (…/out/posts/x.png). Try both, keep the one that
  // actually serves the file.
  let root = await probe(base + "posts/01-map.png");
  let working = base;
  if (!root.ok || !root.type.startsWith("image/")) {
    const nested = await probe(base + "out/posts/01-map.png");
    if (nested.ok && nested.type.startsWith("image/")) {
      working = base + "out/";
      root = nested;
      suggestions.push(`KIT_BASE=${working.replace(/\/$/, "")}`);
      warn("KIT_BASE path", `the files are one level down — use ${working.replace(/\/$/, "")}`);
    }
  }

  if (!root.ok || !root.type.startsWith("image/")) {
    const isHtml = root.type === "text/html";
    const detail = root.status === 401 || root.status === 403
      ? `HTTP ${root.status} — the site is private. On Netlify: "Make public" at the bottom right.`
      : isHtml
        ? `returned an HTML page (HTTP ${root.status}), not an image — a login wall, a 404 page, or the wrong base.`
        : root.error
          ? `could not reach it (${root.error})`
          : `HTTP ${root.status}, content-type ${root.type || "unset"}`;
    fail("Media reachable", detail);
    return;
  }
  if (root.len < 1000) {
    fail("Media reachable", `only ${root.len} bytes at ${base}posts/01-map.png — is the file there?`);
    return;
  }
  ok("Media posts/01-map.png", `${root.type} · ${(root.len / 1e6).toFixed(2)} MB · public`);

  const vid = await probe(working + "video/01-map-countdown.mp4");
  if (vid.ok && vid.type.startsWith("video/")) {
    ok("Media video/01-map-countdown.mp4", `${vid.type} · ${(vid.len / 1e6).toFixed(2)} MB · public`);
  } else {
    fail("Media video/01-map-countdown.mp4", `HTTP ${vid.status || "?"} · ${vid.type || "no content-type"}`);
  }
}

async function tiktok() {
  if (!TT_TOKEN) {
    pending("TT_TOKEN", "missing — see CREDENTIALS.md step 3 (not needed if you post to TikTok in the app)");
    return;
  }
  try {
    const r = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
      headers: { authorization: `Bearer ${TT_TOKEN}` },
    });
    const j = await r.json();
    if (!r.ok || (j.error && j.error.code !== "ok")) {
      throw new Error(j.error?.message || `HTTP ${r.status}`);
    }
    const u = j.data?.user || {};
    ok("TT_TOKEN", `authenticated as ${u.display_name || u.open_id || "unknown"}`);
    warn(
      "TikTok audit",
      "token works, but public posting needs the app to pass TikTok's Content Posting audit — " +
        "unaudited apps can only post to private accounts",
    );
  } catch (e) {
    fail("TT_TOKEN", `TikTok rejected the token: ${e.message}`);
  }
}

/* ------------------------------------------------------------------ main */

console.log("\nNowBey preflight\n" + "─".repeat(62));
await meta();
await media();
await tiktok();

const w = Math.max(...rows.map((r) => r.check.length), 12);
const icon = { PASS: "✓", WARN: "!", FAIL: "✗", PENDING: "·" };
for (const r of rows) {
  console.log(`${icon[r.state]} ${r.check.padEnd(w)}  ${r.state.padEnd(7)}  ${r.detail}`);
}

const fails = rows.filter((r) => r.state === "FAIL");
console.log("─".repeat(62));

const wantWrite = process.argv.includes("--write");
const envPath = join(ROOT, ".env");

if (wantWrite && Object.keys(discovered).length) {
  const { written, replaced } = writeEnvFile(envPath, discovered);
  for (const k of written) console.log(`✓ wrote ${k} to .env`);
  for (const k of replaced) console.log(`✓ updated ${k} in .env`);
  console.log("");
}

if (suggestions.length) {
  if (wantWrite && Object.keys(discovered).length) {
    console.log("Now run it again — those are saved in .env:\n  node scripts/preflight.mjs\n");
  } else {
    console.log("Found these for you. Either paste them into .env by hand, or let this write them:");
    console.log("\n  node scripts/preflight.mjs --write\n");
    console.log("(or add these lines to .env:)");
    for (const line of suggestions) console.log(`  ${line}`);
    console.log("");
  }
}

if (fails.length) {
  console.log(`${fails.length} blocker(s). Fix those, then run this again.`);
  console.log("What each line means, and the fix: CREDENTIALS.md §\"If preflight fails\"\n");
  process.exit(1);
}
console.log("Ready to publish. Look first, then send:\n");
console.log("  node scripts/publish.mjs plan --day 1 --dry-run");
console.log("  node scripts/publish.mjs plan --day 1 --yes\n");
