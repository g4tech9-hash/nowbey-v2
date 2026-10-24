#!/usr/bin/env node
/**
 * NOWBEY — METRICS
 * ---------------------------------------------------------------------------
 * Pulls the only numbers that are available without a paid third party:
 * account size, and per-post reach / saves / shares / interactions.
 *
 *   node scripts/metrics.mjs              # last 30 days, prints a table
 *   node scripts/metrics.mjs --days 7
 *   node scripts/metrics.mjs --csv        # also writes metrics-<date>.csv
 *
 * What it CANNOT tell you: taps on your tracked links. Those numbers live in
 * whatever analytics the app uses (Vercel Web Analytics / GA / Plausible) —
 * open it, filter by utm_campaign = launch, and read utm_content to see which
 * caption earned the visit. This script tells you which POST got seen; the
 * analytics tells you which post sent someone to the app. Read them together.
 *
 * Writes metrics-<date>.md next to it, so a weekly run leaves a trail.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
const { META_TOKEN, FB_PAGE_ID } = process.env;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const DAYS = Number(arg("days", 30));
const WANT_CSV = process.argv.includes("--csv");

if (!META_TOKEN) {
  console.error("\n✗ META_TOKEN is not set in .env.\n");
  process.exit(1);
}

const say = console.log;

async function get(path, params) {
  const q = new URLSearchParams({ ...params, access_token: META_TOKEN });
  const res = await fetch(`${GRAPH}${path}?${q}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `${res.status} on ${path}`);
  }
  return json;
}

/* ── who are we ───────────────────────────────────────────────────────────── */

say("");
say("NowBey · metrics");
say("─".repeat(66));

let page = null;
try {
  page = await get(`/${FB_PAGE_ID}`, {
    fields: "name,followers_count,fan_count,instagram_business_account{id,username}",
  });
  say(`Facebook  ${page.name}`);
  say(`  followers ${page.followers_count ?? "—"}   likes ${page.fan_count ?? "—"}`);
} catch (e) {
  say(`Facebook  ✗ ${e.message}`);
}

let ig = page?.instagram_business_account || null;
if (ig?.id) {
  try {
    const d = await get(`/${ig.id}`, { fields: "username,followers_count,media_count" });
    ig = { ...ig, ...d };
    say(`Instagram @${ig.username}`);
    say(`  followers ${ig.followers_count ?? "—"}   posts ${ig.media_count ?? "—"}`);
  } catch (e) {
    say(`Instagram ✗ ${e.message}`);
  }
} else {
  say("Instagram ✗ no business account attached to this Page");
}

/* ── per post ─────────────────────────────────────────────────────────────── */

const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();

async function igPosts() {
  if (!ig?.id) return [];
  const r = await get(`/${ig.id}/media`, {
    fields: "id,caption,media_type,media_product_type,timestamp,permalink",
    limit: "50",
  });
  const out = [];
  for (const m of r.data || []) {
    const row = {
      platform: "IG",
      kind: m.media_product_type || m.media_type,
      at: m.timestamp,
      id: m.id,
      url: m.permalink,
      text: (m.caption || "").split("\n")[0].slice(0, 46),
      reach: "",
      saved: "",
      shares: "",
      interactions: "",
      note: "",
    };
    // Metrics differ by media product type, and Meta renames them between
    // versions. Ask for the safe set, then widen if the API refuses.
    const attempts = [
      ["reach,saved,shares,total_interactions", {}],
      ["impressions,reach,saved", {}],
      ["plays,reach", { media_product_type: "REELS" }],
    ];
    for (const [metric] of attempts) {
      try {
        const ins = await get(`/${m.id}/insights`, { metric });
        const pick = (n) => ins.data?.find((d) => d.name === n)?.values?.[0]?.value ?? "";
        row.reach = pick("reach");
        row.saved = pick("saved");
        row.shares = pick("shares");
        row.interactions = pick("total_interactions") || pick("impressions") || "";
        if (row.reach === "" && row.interactions === "") {
          row.reach = pick("plays");
        }
        break;
      } catch (e) {
        row.note = e.message.split(".")[0].slice(0, 40);
      }
    }
    out.push(row);
  }
  return out.filter((r) => String(r.at) >= since);
}

async function fbPosts() {
  const r = await get(`/${FB_PAGE_ID}/posts`, {
    fields: "id,message,created_time,permalink_url,insights.metric(post_impressions_unique,post_reactions_by_type_total)",
    limit: "50",
  });
  return (r.data || [])
    .filter((m) => String(m.created_time) >= since)
    .map((m) => {
      const ins = m.insights?.data || [];
      const reach = ins.find((d) => d.name === "post_impressions_unique")?.values?.[0]?.value ?? "";
      const reactions = ins.find((d) => d.name === "post_reactions_by_type_total")?.values?.[0]?.value;
      const total = typeof reactions === "object" && reactions ? Object.values(reactions).reduce((a, b) => a + b, 0) : "";
      return {
        platform: "FB",
        kind: "POST",
        at: m.created_time,
        id: m.id,
        url: m.permalink_url,
        text: (m.message || "").split("\n")[0].slice(0, 46),
        reach,
        saved: "",
        shares: "",
        interactions: total,
        note: "",
      };
    });
}

let rows = [];
for (const fn of [igPosts, fbPosts]) {
  try {
    rows.push(...(await fn()));
  } catch (e) {
    say(`! ${fn.name} failed: ${e.message}`);
  }
}
rows.sort((a, b) => String(a.at).localeCompare(String(b.at)));

/* ── report ───────────────────────────────────────────────────────────────── */

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(2)}%` : "—");
const num = (v) => (v === "" || v == null ? "—" : Number(v).toLocaleString("en-GB"));

say("");
say(`Last ${DAYS} days · ${rows.length} post(s)`);
say("");

const header = ["date", "plat", "kind", "reach", "saved", "shares", "interact", "rate", "caption"];
const widths = [10, 4, 9, 7, 6, 7, 9, 7];
say(header[0].padEnd(widths[0]) + header.slice(1, 8).map((h, i) => h.padEnd(widths[i + 1])).join("") + "caption");
say("─".repeat(100));

const saves = rows.filter((r) => r.saved !== "");
for (const r of rows) {
  const reach = Number(r.reach) || 0;
  const engage = (Number(r.saved) || 0) + (Number(r.shares) || 0) + (Number(r.interactions) || 0);
  say(
    String(r.at).slice(0, 10).padEnd(widths[0]) +
      r.platform.padEnd(widths[1]) +
      String(r.kind).slice(0, 8).padEnd(widths[2]) +
      num(r.reach).padEnd(widths[3]) +
      num(r.saved).padEnd(widths[4]) +
      num(r.shares).padEnd(widths[5]) +
      num(r.interactions).padEnd(widths[6]) +
      (reach ? pct(engage, reach) : "—").padEnd(widths[7]) +
      r.text,
  );
}

say("");
if (saves.length) {
  saves.sort((a, b) => Number(b.saved || 0) - Number(a.saved || 0));
  say("Most saved — the posts people thought worth keeping:");
  for (const r of saves.slice(0, 3)) say(`  · ${r.saved} saves  ${r.platform} ${String(r.at).slice(0, 10)}  ${r.text}`);
} else {
  say("No saves/insights came back. Either nothing is posted yet, or the token");
  say("lacks instagram_basic / pages_read_engagement — run: node scripts/preflight.mjs");
}

say("");
say("Remember: reach is not intent. Which caption produced a visit is in the app's");
say("analytics, filtered by utm_campaign=launch and read by utm_content.");

/* ── files ────────────────────────────────────────────────────────────────── */

const stamp = new Date().toISOString().slice(0, 10);
const md = [
  `# NowBey metrics — ${stamp}`,
  "",
  `Facebook followers ${page?.followers_count ?? "—"} · likes ${page?.fan_count ?? "—"}`,
  `Instagram @${ig?.username ?? "—"} followers ${ig?.followers_count ?? "—"} · posts ${ig?.media_count ?? "—"}`,
  "",
  `| date | platform | kind | reach | saved | shares | interactions | caption |`,
  `| --- | --- | --- | --- | --- | --- | --- | --- |`,
  ...rows.map(
    (r) =>
      `| ${String(r.at).slice(0, 10)} | ${r.platform} | ${r.kind} | ${num(r.reach)} | ${num(r.saved)} | ${num(r.shares)} | ${num(r.interactions)} | ${String(r.text).replace(/\|/g, "/")} |`,
  ),
  "",
].join("\n");

writeFileSync(join(ROOT, `metrics-${stamp}.md`), md);
say("");
say(`→ metrics-${stamp}.md`);

if (WANT_CSV) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    ["date", "platform", "kind", "id", "reach", "saved", "shares", "interactions", "url", "caption"],
    ...rows.map((r) => [r.at, r.platform, r.kind, r.id, r.reach, r.saved, r.shares, r.interactions, r.url, r.text]),
  ]
    .map((line) => line.map(esc).join(","))
    .join("\n");
  writeFileSync(join(ROOT, `metrics-${stamp}.csv`), csv + "\n");
  say(`→ metrics-${stamp}.csv`);
}
say("");
