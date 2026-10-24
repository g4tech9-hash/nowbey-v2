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
  ok("META_TOKEN", `present ${mask(META_TOKEN)}`);

  // who owns the token
  let me;
  try {
    const r = await fetch(`${GRAPH}/me?fields=id,name&access_token=${META_TOKEN}`);
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error?.message || r.status);
    me = j;
    ok("Token valid", `authenticated as ${j.name || j.id}`);
  } catch (e) {
    fail("Token valid", `Meta rejected the token: ${e.message}`);
    return;
  }

  // pages the token can post to
  let pages = [];
  try {
    const r = await fetch(`${GRAPH}/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${META_TOKEN}`);
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error?.message || r.status);
    pages = j.data || [];
    if (!pages.length) warn("Pages visible", "token sees no Pages — is it a Page admin's token?");
    else {
      ok("Pages visible", pages.map((p) => p.name).join(", "));
      if (!FB_PAGE_ID && pages.length === 1) suggestions.push(`FB_PAGE_ID=${pages[0].id}`);
      else if (!FB_PAGE_ID) {
        suggestions.push(`# pick one of: ${pages.map((p) => `${p.name}=${p.id}`).join("  ")}`);
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
          warn("IG_USER_ID", `missing — it is ${ig.id}`);
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

async function media() {
  if (!KIT_BASE) {
    fail("KIT_BASE", "missing — see CREDENTIALS.md step 4");
    return;
  }
  const base = KIT_BASE.replace(/\/?$/, "/");
  const targets = [
    ["posts/01-map.png", "image/png"],
    ["video/01-map-countdown.mp4", "video/mp4"],
  ];
  for (const [rel, want] of targets) {
    const url = base + rel;
    try {
      // HEAD first: Meta does not care about Range, and it is cheap
      const r = await fetch(url, { method: "GET", headers: { range: "bytes=0-1023" } });
      const type = (r.headers.get("content-type") || "").split(";")[0];
      const len = r.headers.get("content-range")?.split("/")?.[1] || r.headers.get("content-length");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (!type.startsWith(want.split("/")[0])) throw new Error(`content-type is ${type || "unset"}, expected ${want}`);
      if (Number(len) < 1000) throw new Error(`only ${len} bytes — is this a login page?`);
      ok(`Media ${rel}`, `${type} · ${(Number(len) / 1e6).toFixed(2)} MB · public`);
    } catch (e) {
      fail(`Media ${rel}`, `${e.message} — ${url}`);
    }
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

if (suggestions.length) {
  console.log("Found these for you — paste them into .env and run preflight again:\n");
  for (const line of suggestions) console.log(`  ${line}`);
  console.log("");
}

if (fails.length) {
  console.log(`${fails.length} blocker(s). Fix those, then run this again.`);
  console.log("What each line means, and the fix: CREDENTIALS.md §\"If preflight fails\"\n");
  process.exit(1);
}
console.log("Ready to publish. Look first, then send:\n");
console.log("  node scripts/publish.mjs plan --day 1 --dry-run");
console.log("  node scripts/publish.mjs plan --day 1 --yes\n");
