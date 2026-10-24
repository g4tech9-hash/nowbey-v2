#!/usr/bin/env node
/**
 * NOWBEY — TOKEN DOCTOR
 * ---------------------------------------------------------------------------
 * Answers: is my Meta token alive, how long has it got, and can I make it last?
 *
 *   node scripts/token-extend.mjs           # report only, changes nothing
 *   node scripts/token-extend.mjs --extend  # exchange for a 60-day token and
 *                                           # write it back into .env
 *
 * Meta's rules, which the script cannot bend:
 *   · An **expired** token can never be extended. You generate a new one first.
 *   · A short-lived user token (~1 hour) can be exchanged once for a 60-day one.
 *   · A 60-day token can be exchanged again before it dies, and the clock resets.
 *   · A Page token derived from a long-lived user token does not expire.
 *
 * The exchange needs your app's id and secret. Add them to .env as APP_ID and
 * APP_SECRET (Business settings → Apps → your app → Settings → Basic → App
 * secret → Show). They are used only to talk to graph.facebook.com.
 */

import { readFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeEnvFile } from "./env-write.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV = join(ROOT, ".env");

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
const { META_TOKEN, APP_ID, APP_SECRET } = process.env;
const doExtend = process.argv.includes("--extend");

const WANTED = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
];

const say = (s = "") => console.log(s);
const rule = () => say("─".repeat(66));

/** One place where the network can fail, so the failure reads like English. */
async function call(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(
      `could not reach graph.facebook.com (${e.cause?.code || e.code || "network error"}) — ` +
        "check the internet connection, VPN or firewall, then run this again",
    );
  }
  try {
    return await res.json();
  } catch {
    throw new Error(`graph.facebook.com answered ${res.status} with something that is not JSON`);
  }
}

if (!META_TOKEN) {
  say("✗ META_TOKEN is empty in .env — there is nothing to inspect.");
  say("  Get one: https://developers.facebook.com/tools/explorer/  (CREDENTIALS.md step 1)");
  process.exit(1);
}

/* ── who is this token, and how long has it got? ─────────────────────────── */

say("");
say("NowBey · token doctor");
rule();

const appToken = APP_ID && APP_SECRET ? `${APP_ID}|${APP_SECRET}` : null;

let info = null;
try {
  if (appToken) {
    const j = await call(
      `${GRAPH}/debug_token?input_token=${encodeURIComponent(META_TOKEN)}` +
        `&access_token=${encodeURIComponent(appToken)}`,
    );
    if (j.error) throw new Error(`${j.error.message} (type ${j.error.type})`);
    info = j.data;
  }
} catch (e) {
  say(`! Could not inspect the token: ${e.message}`);
  say("  Falling back to a plain /me call.");
}

if (!info) {
  let j;
  try {
    j = await call(`${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(META_TOKEN)}`);
  } catch (e) {
    say("");
    say(`✗ ${e.message}`);
    process.exit(1);
  }
  if (j.error) {
    say("");
    say(`✗ The token is dead: ${j.error.message}`);
    say("");
    if (/expired|session/i.test(j.error.message)) {
      say("  An expired token cannot be extended — Meta has already deleted it.");
      say("  Make a new one, then immediately run this script with --extend:");
      say("    1. https://developers.facebook.com/tools/explorer/  → pick the NowBey app");
      say("    2. tick: " + WANTED.join(", "));
      say("    3. Generate Access Token → copy it into META_TOKEN in .env");
      say("    4. node scripts/token-extend.mjs --extend");
    }
    process.exit(1);
  }
  say("");
  say(`· Token works. Acting as ${j.name || j.id} (${j.id}).`);
  say("  Add APP_ID and APP_SECRET to .env to see the expiry date and scopes.");
  process.exit(0);
}

const expired = info.expires_at === 0 ? null : new Date(info.expires_at * 1000);
const daysLeft = expired ? (expired - Date.now()) / 86_400_000 : null;
const isPageToken = info.type === "PAGE";

say("");
say(`· Type        ${info.type}${info.app_id ? `  (app ${info.app_id})` : ""}`);
say(`· Valid       ${info.is_valid ? "yes" : "NO"}`);
say(
  `· Expires     ${
    isPageToken && info.expires_at === 0
      ? "never — this is a Page token, keep it"
      : expired
        ? `${expired.toISOString().slice(0, 16).replace("T", " ")}  (${daysLeft.toFixed(1)} days)`
        : "never"
  }`,
);

const granted = new Set(info.scopes || []);
const missing = WANTED.filter((s) => !granted.has(s));
say(`· Scopes      ${granted.size} granted`);
if (missing.length) {
  say(`  ✗ missing   ${missing.join(", ")}`);
  say("  Publishing will fail until those are ticked on a new token.");
} else {
  say("  ✓ all six publishing scopes present");
}

/* ── the exchange ────────────────────────────────────────────────────────── */

if (!info.is_valid) {
  say("");
  say("✗ Meta reports this token is not valid any more.");
  say("  Generate a fresh one in the Explorer, then run:  node scripts/token-extend.mjs --extend");
  process.exit(1);
}

if (daysLeft !== null && daysLeft > 50 && !isPageToken) {
  say("");
  say("✓ Nothing to do — this token already has a long life left.");
  process.exit(0);
}
if (isPageToken && info.expires_at === 0) {
  say("");
  say("✓ Nothing to do — Page tokens do not expire.");
  process.exit(0);
}

if (!appToken) {
  say("");
  say("To exchange this for a 60-day token, the script needs your app credentials:");
  say("  Business settings → Apps → NowBey → Settings → Basic → App secret → Show");
  say("  then add to .env:");
  say("    APP_ID=<app id>");
  say("    APP_SECRET=<app secret>");
  say("");
  say("Or do it by hand, no secret required:");
  say("  https://developers.facebook.com/tools/debugger/ → paste token → Debug");
  say("  → bottom of the page → Extend Access Token → copy the new one into .env");
  process.exit(0);
}

if (!doExtend) {
  say("");
  say("This token can still be exchanged for ~60 days. Run with --extend to do it now:");
  say("    node scripts/token-extend.mjs --extend");
  process.exit(0);
}

say("");
say("Exchanging for a long-lived token…");
const url =
  `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
  `&client_id=${encodeURIComponent(APP_ID)}` +
  `&client_secret=${encodeURIComponent(APP_SECRET)}` +
  `&fb_exchange_token=${encodeURIComponent(META_TOKEN)}`;

let out;
try {
  out = await call(url);
} catch (e) {
  say(`✗ ${e.message}`);
  say("  No change was made to .env.");
  process.exit(1);
}

if (out.error) {
  say(`✗ Exchange failed: ${out.error.message}`);
  say("  No change was made to .env.");
  process.exit(1);
}

const fresh = out.access_token;
if (!fresh) {
  say("✗ Meta returned no token. No change was made to .env.");
  process.exit(1);
}

if (existsSync(ENV)) copyFileSync(ENV, join(ROOT, ".env.bak"));
writeEnvFile(ENV, { META_TOKEN: fresh });

// confirm what we actually got
const check = await call(
  `${GRAPH}/debug_token?input_token=${encodeURIComponent(fresh)}` +
    `&access_token=${encodeURIComponent(appToken)}`,
);

const exp = check?.data?.expires_at ? new Date(check.data.expires_at * 1000) : null;
say("");
say(`✓ New token written to .env${existsSync(join(ROOT, ".env.bak")) ? " (old one saved as .env.bak)" : ""}.`);
if (exp) {
  const d = (exp - Date.now()) / 86_400_000;
  say(`  Good until ${exp.toISOString().slice(0, 16).replace("T", " ")} — ${d.toFixed(0)} days.`);
}
say("");
say("Next: node scripts/preflight.mjs   →   node scripts/publish.mjs plan --day 1 --yes");
say("");
say("To stop doing this every two months, make a System User token instead —");
say("it never expires. CREDENTIALS.md § \"Keep it forever\".");
