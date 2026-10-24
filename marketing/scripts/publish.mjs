#!/usr/bin/env node
/**
 * NOWBEY — PUBLISH CLI
 * ---------------------------------------------------------------------------
 * Posts this kit to Instagram, Facebook and TikTok from a terminal.
 *
 *   npm run publish -- --help
 *
 * Everything is driven by `captions/plan.json`, which is the launch calendar as
 * data: one entry per post, in order, with its asset and its caption file.
 *
 *     npm run publish -- plan --day 1 --base https://nowbey.com/kit --dry-run
 *     npm run publish -- plan --day 1 --base https://nowbey.com/kit --yes
 *
 * ...or post a single asset with ig-post / ig-carousel / ig-reel / ig-story /
 * fb-post / tt-post.
 *
 * WHY --base: Meta and TikTok FETCH the media from a public URL; neither
 * accepts a raw upload. Host `out/` anywhere static and pass its base url.
 *
 * CREDENTIALS (env or marketing/.env, never committed — see .env.example and
 * CREDENTIALS.md, which walks through where each value comes from):
 *   META_TOKEN   IG/FB Graph API token   (instagram_basic,
 *                instagram_content_publish, pages_show_list, pages_manage_posts)
 *   IG_USER_ID   Instagram Business account id
 *   FB_PAGE_ID   Facebook Page id
 *   TT_TOKEN     TikTok user access token (video.publish / video.upload)
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Read marketing/.env if it exists, so a filled-in .env is enough — no need to
 * export five variables in every shell. Real environment variables always win.
 */
function loadEnvFile() {
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
      if (!(key in process.env) || !process.env[key]) process.env[key] = val;
    }
  }
}
loadEnvFile();

const V = process.env.GRAPH_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${V}`;
const TIKTOK = "https://open.tiktokapis.com/v2";
const TOKEN = process.env.META_TOKEN;
const IG = process.env.IG_USER_ID;
const PAGE = process.env.FB_PAGE_ID;
const TT = process.env.TT_TOKEN;

/* ------------------------------------------------------------------ args */

function argv(list) {
  const out = { _: [] };
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = list[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

const USAGE = `
NowBey publish — Instagram + Facebook + TikTok from the terminal

PLAN (recommended)
  node scripts/publish.mjs plan --day <n|all> --base <url> (--dry-run | --yes)

SINGLE ASSETS
  node scripts/publish.mjs ig-post      --image <path|url> --caption|--caption-file <s> [--dry-run]
  node scripts/publish.mjs ig-carousel  --images <a,b,c>   --caption|--caption-file <s> [--dry-run]
  node scripts/publish.mjs ig-reel      --video <path|url> [--cover <path|url>] --caption <s> [--dry-run]
  node scripts/publish.mjs ig-story     --image|--video <path|url> [--dry-run]
  node scripts/publish.mjs fb-post      --image <path|url> --message|--message-file <s>
                                        [--link <url>] [--scheduled <iso>] [--dry-run]
  node scripts/publish.mjs tt-post      --video <path|url> [--cover-ms <ms>]
                                        --caption <s> [--privacy PUBLIC_TO_EVERYONE] [--dry-run]
  node scripts/publish.mjs tt-photo     --images <a,b,c>   --caption <s> [--dry-run]

FLAGS
  --base <url>   public base url for the kit: out/posts/x.png → <url>/posts/x.png
  --dry-run      print the calls, change nothing
  --yes          actually send (plan refuses to publish without it)

ENV
  META_TOKEN, IG_USER_ID, FB_PAGE_ID, TT_TOKEN   (GRAPH_VERSION=${V})
`.trim();

/* ----------------------------------------------------------------- utils */

const dry = (o) => Boolean(o["dry-run"]);
const say = (...a) => console.log(...a);

function need(v, name) {
  if (!v) {
    console.error(`\n✗ ${name} is not set. Export it first (see .env.example).\n`);
    process.exit(1);
  }
  return v;
}

/** Local path → public URL, when --base is given. */
function publicUrl(ref, base) {
  if (/^https?:\/\//i.test(ref)) return ref;
  if (!base) {
    console.error(
      `\n✗ "${ref}" is a local path. Meta/TikTok fetch the media themselves, so it needs a public URL.\n` +
        `  Host the kit and pass --base https://your-host/kit/  (see START_HERE.md step 3).\n`,
    );
    process.exit(1);
  }
  const rel = String(ref).replace(/^out\//, "").replace(/^\/+/, "");
  return base.replace(/\/?$/, "/") + rel;
}

function readTextFile(p) {
  const abs = resolve(process.cwd(), p);
  if (!existsSync(abs)) {
    console.error(`✗ no such file: ${abs}`);
    process.exit(1);
  }
  return readFileSync(abs, "utf8").trim();
}

function caption(o) {
  if (o["caption-file"]) return readTextFile(o["caption-file"]);
  if (typeof o.caption === "string") return o.caption;
  return "";
}

function message(o) {
  if (o["message-file"]) return readTextFile(o["message-file"]);
  return o.message;
}

function show(params) {
  const trimmed = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [
      k,
      String(v).length > 68 ? `${String(v).slice(0, 65)}…` : v,
    ]),
  );
  say(`  → ${JSON.stringify(trimmed)}`);
}

/* ------------------------------------------------------------- Graph API */

async function graph(method, path, params, isDry) {
  say(`  → ${method} ${path}`);
  show(params);
  if (isDry) return { id: "<dry-run>", dryRun: true };

  const url = new URL(GRAPH + path);
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(method === "GET" ? `${url}?${body}` : url, {
    method,
    ...(method === "GET" ? {} : { body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    console.error(`\n✗ ${res.status} ${e.type || ""} ${e.message || JSON.stringify(json)}\n`);
    process.exit(1);
  }
  return json;
}

/** Poll a video container until Meta has finished ingesting it. */
async function awaitContainer(id, isDry, label = "video") {
  if (isDry) return;
  for (let i = 0; i < 60; i++) {
    const r = await graph("GET", `/${id}`, { fields: "status_code,status" }, false);
    const state = r.status_code || "UNKNOWN";
    say(`    · ${label} ${state.toLowerCase()} (${i + 1})`);
    if (state === "FINISHED") return;
    if (state === "ERROR" || state === "EXPIRED") {
      console.error(`\n✗ Meta could not process the ${label}: ${r.status || state}\n`);
      process.exit(1);
    }
    await new Promise((r2) => setTimeout(r2, 4000));
  }
  console.error(`\n✗ timed out waiting for ${label}\n`);
  process.exit(1);
}

/* -------------------------------------------------------------- TikTok */

async function tiktok(path, body, isDry) {
  say(`  → POST ${path}`);
  show(body?.post_info ?? body ?? {});
  if (isDry) return { data: { publish_id: "<dry-run>" }, error: { code: "ok" } };

  const res = await fetch(TIKTOK + path, {
    method: "POST",
    headers: { authorization: `Bearer ${TT}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.error && json.error.code !== "ok")) {
    const e = json.error || {};
    console.error(`\n✗ TikTok ${res.status} ${e.code || ""} ${e.message || JSON.stringify(json)}\n`);
    if (e.code === "unaudited_client_can_only_post_to_private_accounts") {
      console.error(
        "  The app has not been through TikTok's Content Posting audit, so it can only post\n" +
          "  to private accounts. Post in the app until the audit clears, or switch the account\n" +
          "  to private for a test run.\n",
      );
    }
    process.exit(1);
  }
  return json;
}

async function awaitTikTok(publishId, isDry) {
  if (isDry) return;
  for (let i = 0; i < 40; i++) {
    const r = await tiktok("/post/publish/status/fetch/", { publish_id: publishId }, false);
    const state = r.data?.status || "PROCESSING";
    say(`    · tiktok ${state.toLowerCase()} (${i + 1})`);
    if (state === "PUBLISH_COMPLETE" || state === "SEND_TO_USER_INBOX") return;
    if (state === "FAILED") {
      console.error(`\n✗ TikTok could not publish: ${r.data?.fail_reason || "unknown"}\n`);
      process.exit(1);
    }
    await new Promise((r2) => setTimeout(r2, 5000));
  }
  console.error("\n✗ timed out waiting for TikTok\n");
  process.exit(1);
}

/* ------------------------------------------------------------- commands */

async function igPost(o) {
  const ig = need(IG, "IG_USER_ID");
  const isDry = dry(o);
  say(`\nInstagram feed post${isDry ? "  [dry run]" : ""}`);
  const created = await graph(
    "POST",
    `/${ig}/media`,
    { image_url: publicUrl(need(o.image, "--image"), o.base), caption: caption(o) },
    isDry,
  );
  await graph("POST", `/${ig}/media_publish`, { creation_id: created.id }, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

async function igCarousel(o) {
  const ig = need(IG, "IG_USER_ID");
  const isDry = dry(o);
  const list = need(o.images, "--images").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length < 2 || list.length > 10) {
    console.error("✗ a carousel takes 2–10 images");
    process.exit(1);
  }
  say(`\nInstagram carousel, ${list.length} frames${isDry ? "  [dry run]" : ""}`);
  const children = [];
  for (const item of list) {
    const r = await graph(
      "POST",
      `/${ig}/media`,
      { image_url: publicUrl(item, o.base), is_carousel_item: "true" },
      isDry,
    );
    children.push(r.id);
    say(`    · item ${children.length} ready`);
  }
  const container = await graph(
    "POST",
    `/${ig}/media`,
    { media_type: "CAROUSEL", children: children.join(","), caption: caption(o) },
    isDry,
  );
  await graph("POST", `/${ig}/media_publish`, { creation_id: container.id }, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

async function igReel(o) {
  const ig = need(IG, "IG_USER_ID");
  const isDry = dry(o);
  say(`\nInstagram reel${isDry ? "  [dry run]" : ""}`);
  const params = {
    media_type: "REELS",
    video_url: publicUrl(need(o.video, "--video"), o.base),
    caption: caption(o),
    share_to_feed: "true",
  };
  if (o.cover) params.cover_url = publicUrl(o.cover, o.base);
  const created = await graph("POST", `/${ig}/media`, params, isDry);
  await awaitContainer(created.id, isDry, "reel");
  await graph("POST", `/${ig}/media_publish`, { creation_id: created.id }, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

async function igStory(o) {
  const ig = need(IG, "IG_USER_ID");
  const isDry = dry(o);
  say(`\nInstagram story${isDry ? "  [dry run]" : ""}`);
  const params = { media_type: "STORIES" };
  if (o.video) params.video_url = publicUrl(o.video, o.base);
  else params.image_url = publicUrl(need(o.image, "--image"), o.base);
  const created = await graph("POST", `/${ig}/media`, params, isDry);
  if (params.video_url) await awaitContainer(created.id, isDry, "story video");
  await graph("POST", `/${ig}/media_publish`, { creation_id: created.id }, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

async function fbPost(o) {
  const page = need(PAGE, "FB_PAGE_ID");
  const isDry = dry(o);
  const text = need(message(o), "--message");
  say(`\nFacebook Page post${isDry ? "  [dry run]" : ""}`);

  // scheduled_publish_time is unix seconds; Meta allows 10 min – 30 days ahead
  const sched = o.scheduled ? Math.floor(new Date(String(o.scheduled)).getTime() / 1000) : null;

  if (o.image) {
    const params = { url: publicUrl(o.image, o.base), message: text };
    if (sched) {
      params.published = "false";
      params.scheduled_publish_time = String(sched);
    }
    const created = await graph("POST", `/${page}/photos`, params, isDry);
    say(isDry ? "\n  (nothing was posted)" : `\n✓ posted${created.post_id ? ` (${created.post_id})` : ""}`);
    return;
  }
  const params = { message: text };
  if (o.link) params.link = o.link;
  if (sched) {
    params.published = "false";
    params.scheduled_publish_time = String(sched);
  }
  await graph("POST", `/${page}/feed`, params, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

async function ttPost(o) {
  need(TT, "TT_TOKEN");
  const isDry = dry(o);
  say(`\nTikTok video${isDry ? "  [dry run]" : ""}`);
  const post_info = {
    title: caption(o).slice(0, 2200),
    privacy_level: o.privacy || "PUBLIC_TO_EVERYONE",
    disable_comment: false,
    disable_duet: false,
    disable_stitch: false,
    video_cover_timestamp_ms: Number(o["cover-ms"] || 2000),
  };
  const init = await tiktok(
    "/post/publish/video/init/",
    { post_info, source_info: { source: "PULL_FROM_URL", video_url: publicUrl(o.video, o.base) } },
    isDry,
  );
  await awaitTikTok(init.data?.publish_id, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ sent to TikTok");
}

async function ttPhoto(o) {
  need(TT, "TT_TOKEN");
  const isDry = dry(o);
  const images = need(o.images, "--images").split(",").map((s) => s.trim()).filter(Boolean);
  say(`\nTikTok photo post, ${images.length} image(s)${isDry ? "  [dry run]" : ""}`);
  const init = await tiktok(
    "/post/publish/content/init/",
    {
      post_info: {
        title: caption(o).slice(0, 2200),
        privacy_level: o.privacy || "PUBLIC_TO_EVERYONE",
        auto_add_music: true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: images.map((i) => publicUrl(i, o.base)),
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    },
    isDry,
  );
  await awaitTikTok(init.data?.publish_id, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ sent to TikTok");
}

/* ----------------------------------------------------------------- plan */

/**
 * `captions/plan.json` is the launch calendar as data. Each entry:
 * { day, platform: "ig"|"fb"|"tt", type: "post"|"carousel"|"reel"|"story"|"fbpost"|"ttvideo"|"ttphoto",
 *   asset | assets, caption, cover? }
 */
async function plan(o) {
  if (!o.day) {
    console.error("✗ --day <number|all>");
    process.exit(1);
  }
  const file = join(ROOT, "captions", "plan.json");
  const entries = JSON.parse(readFileSync(file, "utf8")).filter(
    (e) => o.day === "all" || String(e.day) === String(o.day),
  );
  if (!entries.length) {
    console.error(`✗ nothing scheduled for day ${o.day}`);
    process.exit(1);
  }
  if (!dry(o) && !o.yes) {
    console.error(
      `\nThis will publish ${entries.length} post(s) for real.\n` +
        `Re-run with --dry-run to preview, or --yes to send.\n`,
    );
    process.exit(1);
  }
  say(`\nDay ${o.day}: ${entries.length} post(s)${dry(o) ? "  [dry run]" : ""}`);

  let n = 0;
  for (const e of entries) {
    n++;
    say(`\n── ${n}/${entries.length}  ${e.platform.toUpperCase()} ${e.type}  ·  ${e.label || e.asset || ""}`);
    const common = { base: o.base, "dry-run": o["dry-run"], "caption-file": e.caption };
    if (e.platform === "ig") {
      if (e.type === "post") await igPost({ ...common, image: e.asset });
      else if (e.type === "carousel") await igCarousel({ ...common, images: e.assets.join(",") });
      else if (e.type === "reel") await igReel({ ...common, video: e.asset, cover: e.cover });
      else if (e.type === "story") await igStory({ ...common, image: e.asset });
      else throw new Error(`unknown ig type ${e.type}`);
    } else if (e.platform === "fb") {
      await fbPost({ ...common, image: e.asset, "message-file": e.caption, scheduled: e.scheduled });
    } else if (e.platform === "tt") {
      if (e.type === "ttphoto") await ttPhoto({ ...common, images: e.assets.join(",") });
      else await ttPost({ ...common, video: e.asset, "cover-ms": e.coverMs });
    } else throw new Error(`unknown platform ${e.platform}`);

    if (e.after) say(`\n   ↳ ${e.after}`);
    // TikTok rate-limits at 6 posts / 24h; keep the API calm between items
    if (!dry(o) && n < entries.length) await new Promise((r) => setTimeout(r, 2500));
  }
  say(dry(o) ? "\nDry run complete — nothing was posted.\n" : "\n✓ Plan complete.\n");
}

/* ------------------------------------------------------------------- main */

const o = argv(process.argv.slice(2));
const cmd = o._[0];

if (!cmd || o.help) {
  say(USAGE);
  process.exit(0);
}

const commands = {
  plan,
  "ig-post": igPost,
  "ig-carousel": igCarousel,
  "ig-reel": igReel,
  "ig-story": igStory,
  "fb-post": fbPost,
  "tt-post": ttPost,
  "tt-photo": ttPhoto,
};

if (!commands[cmd]) {
  console.error(`✗ unknown command "${cmd}"\n\n${USAGE}`);
  process.exit(1);
}

// `plan` checks its own tokens per-platform, so a missing TikTok token does not
// block a day that only posts to Instagram.
if (!dry(o) && cmd !== "plan") need(TOKEN, "META_TOKEN");

await commands[cmd](o);
