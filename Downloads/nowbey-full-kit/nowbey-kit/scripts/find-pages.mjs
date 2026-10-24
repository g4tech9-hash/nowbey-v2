#!/usr/bin/env node
/**
 * FINDS YOUR PAGE (AND ITS INSTAGRAM ACCOUNT)
 * ---------------------------------------------------------------------------
 *   node scripts/find-pages.mjs
 *
 * "Pages visible: none" has three causes and they look identical from the API:
 *   · pages_show_list was never granted;
 *   · you authorised as a different Facebook profile;
 *   · the Page lives inside a Business portfolio with a limited role.
 *
 * This walks every place a Page can hide — /me/accounts, then each Business
 * portfolio's owned/client Pages — and prints ready-to-paste .env lines.
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
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const V = process.env.GRAPH_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${V}`;
const T = process.env.META_TOKEN;

if (!T) {
  console.error("\n✗ META_TOKEN is not set (put it in .env).\n");
  process.exit(1);
}

async function get(path, params = {}) {
  const q = new URLSearchParams({ ...params, access_token: T });
  try {
    const r = await fetch(`${GRAPH}${path}?${q}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) return { error: j.error?.message || `HTTP ${r.status}` };
    return j;
  } catch (e) {
    return { error: `could not reach graph.facebook.com (${e.message})` };
  }
}

const found = new Map(); // id → { id, name, ig, source, tasks }

function add(page, source) {
  if (!page?.id) return;
  const prev = found.get(page.id) || {};
  found.set(page.id, {
    ...prev,
    id: page.id,
    name: page.name || prev.name || "(unnamed)",
    ig: page.instagram_business_account || prev.ig || null,
    tasks: page.tasks || prev.tasks || null,
    source: prev.source ? `${prev.source}, ${source}` : source,
  });
}

const FIELDS = "id,name,tasks,instagram_business_account{id,username}";

console.log("\nLooking for Pages this token can reach\n" + "─".repeat(66));

const me = await get("/me", { fields: "id,name" });
if (me.error) {
  console.error(`✗ token problem: ${me.error}`);
  console.error(`  If that says "could not reach", you are offline or behind a proxy.\n`);
  process.exit(1);
}
console.log(`token belongs to: ${me.name || me.id}`);

// 1 — the normal route
const accounts = await get("/me/accounts", { fields: FIELDS, limit: "100" });
if (accounts.error) {
  console.log(`\n1. /me/accounts — error: ${accounts.error}`);
} else {
  console.log(`\n1. /me/accounts — ${accounts.data?.length || 0} Page(s)`);
  for (const p of accounts.data || []) add(p, "direct");
}

// 2 — business portfolios
const biz = await get("/me/businesses", { fields: "id,name", limit: "100" });
if (biz.error) {
  console.log(`\n2. /me/businesses — error: ${biz.error}`);
} else {
  console.log(`\n2. /me/businesses — ${biz.data?.length || 0} portfolio(s)`);
  for (const b of biz.data || []) {
    console.log(`   · ${b.name} (${b.id})`);
    for (const edge of ["owned_pages", "client_pages"]) {
      const pages = await get(`/${b.id}/${edge}`, { fields: FIELDS, limit: "100" });
      if (pages.error) {
        console.log(`       ${edge}: ${pages.error}`);
        continue;
      }
      const n = pages.data?.length || 0;
      console.log(`       ${edge}: ${n}`);
      for (const p of pages.data || []) add(p, `portfolio:${b.name}`);
    }
  }
}

// 3 — permissions, so the cause is obvious
const perms = await get("/me/permissions");
const granted = (perms.data || []).filter((p) => p.status === "granted").map((p) => p.permission);
console.log(`\n3. granted permissions — ${granted.length ? granted.join(", ") : "none recorded"}`);

console.log("\n" + "─".repeat(66));

if (!found.size) {
  console.log(`
Nothing found. In order of likelihood:

  A. pages_show_list was not granted when the token was generated.
     Graph API Explorer → right-hand Permissions panel → tick
     pages_show_list, pages_read_engagement, pages_manage_posts,
     instagram_basic, instagram_content_publish, business_management
     → THEN click Generate Access Token. Adding a permission afterwards
     does not change an existing token.

  B. You are logged into Graph API Explorer as a different Facebook profile
     than the one that administers the Page. Log out, log in as the Page's
     admin, generate again.

  C. The Page has no role for you yet. Check:
     https://business.facebook.com/settings → Accounts → Pages

  D. The token is a System User token whose Page asset was never assigned.
     Business Settings → Users → System users → your user → Add assets → Pages.

You can always read the ids by hand instead — Page ID:
  business.facebook.com/settings → Accounts → Pages → "ID" column
Instagram Business id: Accounts → Instagram accounts → "ID" column
`);
  process.exit(1);
}

console.log(`Found ${found.size} Page(s):\n`);
for (const p of found.values()) {
  const ig = p.ig ? `@${p.ig.username || "?"} (${p.ig.id})` : "no Instagram account linked";
  console.log(`  ${p.name}`);
  console.log(`    id: ${p.id}`);
  console.log(`    instagram: ${ig}`);
  console.log(`    your role: ${p.tasks || "(not reported — needs pages_show_list)"}`);
  console.log(`    via: ${p.source}\n`);
}

const withIg = [...found.values()].filter((p) => p.ig);
const pick = withIg[0] || [...found.values()][0];

console.log("─".repeat(66));
console.log("Paste this into .env (it is the Page with an Instagram account linked):\n");
console.log(`  FB_PAGE_ID=${pick.id}`);
if (pick.ig) console.log(`  IG_USER_ID=${pick.ig.id}`);
if (!pick.ig) {
  console.log(`\n  ⚠ that Page has no Instagram Business account attached yet:`);
  console.log(`    Instagram app → Settings → Account type and tools → Switch to professional`);
  console.log(`    → Business → Connect a Facebook Page → choose "${pick.name}"`);
  console.log(`    Then run this script again and the IG_USER_ID will appear.`);
}
console.log("\nThen: node scripts/preflight.mjs\n");
