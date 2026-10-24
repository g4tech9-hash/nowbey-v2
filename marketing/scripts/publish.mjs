#!/usr/bin/env node
/**
 * NOWBEY — PUBLISH CLI
 * ---------------------------------------------------------------------------
 * Posts this kit to Instagram and Facebook through Meta's Graph API, from a
 * terminal. No third-party app, no browser.
 *
 *   npm run publish -- --help
 *
 * The API needs a PUBLIC url for every image/video (Meta fetches the file
 * itself; it will not accept an upload from your laptop). So either:
 *
 *   · host `marketing/out/` somewhere reachable and pass the URLs, or
 *   · pass --base https://your-host/kit/ and give local paths — the script maps
 *     `out/posts/01-map.png` → `https://your-host/kit/posts/01-map.png`.
 *
 * Credentials (env, never in the repo):
 *   META_TOKEN     long-lived user token with instagram_basic,
 *                  instagram_content_publish, pages_show_list,
 *                  pages_manage_posts
 *   IG_USER_ID     the Instagram Business account id (17841…)
 *   FB_PAGE_ID     the Facebook Page id the account is linked to
 *
 * Everything supports --dry-run: it prints the exact HTTP calls and posts
 * nothing. Run that first — it is the cheapest way to catch a wrong id.
 *
 * Examples
 * --------
 *   # what would this do?
 *   node scripts/publish.mjs ig-post --image out/posts/01-map.png \
 *     --caption "$(sed -n '/Post 01/,/242$/p' CAMPAIGN.md)" --dry-run
 *
 *   # a single feed post
 *   node scripts/publish.mjs ig-post --image out/posts/01-map.png --caption-file cap.txt
 *
 *   # a carousel, in swipe order
 *   node scripts/publish.mjs ig-carousel \
 *     --images out/posts/06-feed.png,out/posts/01-map.png,out/posts/02-report.png,out/posts/05-confirmed.png,out/posts/03-alerts.png \
 *     --caption-file cap.txt
 *
 *   # a reel, with its poster as the cover
 *   node scripts/publish.mjs ig-reel --video out/video/01-map-countdown.mp4 \
 *     --cover out/video/01-map-countdown-poster.png --caption-file cap.txt
 *
 *   # a 24h story
 *   node scripts/publish.mjs ig-story --image out/stories/S1-map-story.png
 *
 *   # a Facebook page post, optionally scheduled
 *   node scripts/publish.mjs fb-post --image out/posts/01-map.png \
 *     --message "..." --scheduled "2026-10-27T07:00:00-04:00"
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const V = process.env.GRAPH_VERSION || "v21.0";
const BASE = `https://graph.facebook.com/${V}`;
const TOKEN = process.env.META_TOKEN;
const IG = process.env.IG_USER_ID;
const PAGE = process.env.FB_PAGE_ID;

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
NowBey publish — Instagram + Facebook from the terminal

  node scripts/publish.mjs ig-post      --image <path|url> --caption|--caption-file <s> [--dry-run]
  node scripts/publish.mjs ig-carousel  --images <a,b,c>   --caption|--caption-file <s> [--dry-run]
  node scripts/publish.mjs ig-reel      --video <path|url> [--cover <path|url>] --caption <s> [--dry-run]
  node scripts/publish.mjs ig-story     --image <path|url> [--dry-run]
  node scripts/publish.mjs fb-post      --image <path|url> --message|--message-file <s> [--link <url>] [--scheduled <iso>] [--dry-run]

Global flags
  --base <url>   public base url for the kit (maps out/posts/x.png → url/posts/x.png)
  --dry-run      print the calls, change nothing

Env
  META_TOKEN, IG_USER_ID, FB_PAGE_ID   (GRAPH_VERSION defaults to ${V})
`.trim();

/* ----------------------------------------------------------------- utils */

const dry = (o) => Boolean(o["dry-run"]);
const say = (...a) => console.log(...a);

function need(v, name) {
  if (!v) {
    console.error(`\n✗ ${name} is not set. Export it first, e.g.  export ${name}=...\n`);
    process.exit(1);
  }
  return v;
}

/** Local path → public URL, when --base is given. */
function publicUrl(ref, base) {
  if (/^https?:\/\//i.test(ref)) return ref;
  if (!base) {
    console.error(
      `\n✗ "${ref}" is a local path. Meta fetches media itself, so it needs a public URL.\n` +
        `  Either host the kit and pass --base https://your-host/kit/\n` +
        `  or pass a full https:// url.\n`,
    );
    process.exit(1);
  }
  const rel = ref.replace(/^out\//, "").replace(/^\/+/, "");
  return base.replace(/\/?$/, "/") + rel;
}

function caption(o) {
  if (o["caption-file"]) {
    const p = resolve(process.cwd(), o["caption-file"]);
    if (!existsSync(p)) {
      console.error(`✗ no such caption file: ${p}`);
      process.exit(1);
    }
    return readFileSync(p, "utf8").trim();
  }
  if (typeof o.caption === "string") return o.caption;
  return "";
}

async function call(method, path, params, isDry) {
  const url = new URL(BASE + path);
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const target = `${method} ${url.pathname}`;
  const shown = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, String(v).length > 72 ? `${String(v).slice(0, 69)}…` : v]),
  );
  say(`  → ${target}  ${JSON.stringify(shown)}`);
  if (isDry) return { id: "<dry-run>", dryRun: true };

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
    const r = await call("GET", `/${id}`, { fields: "status_code,status" }, false);
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

/* ---------------------------------------------------------------- commands */

async function igPost(o) {
  const ig = need(IG, "IG_USER_ID");
  const base = o.base;
  const isDry = dry(o);
  const image = publicUrl(need(o.image, "--image"), base);
  say(`\nInstagram feed post${isDry ? "  [dry run]" : ""}`);
  const created = await call("POST", `/${ig}/media`, { image_url: image, caption: caption(o) }, isDry);
  await call("POST", `/${ig}/media_publish`, { creation_id: created.id }, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

async function igCarousel(o) {
  const ig = need(IG, "IG_USER_ID");
  const isDry = dry(o);
  const base = o.base;
  const list = need(o.images, "--images").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length < 2 || list.length > 10) {
    console.error("✗ a carousel takes 2–10 images");
    process.exit(1);
  }
  say(`\nInstagram carousel, ${list.length} frames${isDry ? "  [dry run]" : ""}`);
  const children = [];
  for (const item of list) {
    const r = await call(
      "POST",
      `/${ig}/media`,
      { image_url: publicUrl(item, base), is_carousel_item: "true" },
      isDry,
    );
    children.push(r.id);
    say(`    · item ${children.length} ready`);
  }
  const container = await call(
    "POST",
    `/${ig}/media`,
    { media_type: "CAROUSEL", children: children.join(","), caption: caption(o) },
    isDry,
  );
  await call("POST", `/${ig}/media_publish`, { creation_id: container.id }, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

async function igReel(o) {
  const ig = need(IG, "IG_USER_ID");
  const isDry = dry(o);
  const base = o.base;
  say(`\nInstagram reel${isDry ? "  [dry run]" : ""}`);
  const params = {
    media_type: "REELS",
    video_url: publicUrl(need(o.video, "--video"), base),
    caption: caption(o),
    share_to_feed: "true",
  };
  if (o.cover) params.cover_url = publicUrl(o.cover, base);
  const created = await call("POST", `/${ig}/media`, params, isDry);
  await awaitContainer(created.id, isDry, "reel");
  await call("POST", `/${ig}/media_publish`, { creation_id: created.id }, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

async function igStory(o) {
  const ig = need(IG, "IG_USER_ID");
  const isDry = dry(o);
  const base = o.base;
  say(`\nInstagram story${isDry ? "  [dry run]" : ""}`);
  const params = { media_type: "STORIES" };
  if (o.video) {
    params.video_url = publicUrl(o.video, base);
  } else {
    params.image_url = publicUrl(need(o.image, "--image"), base);
  }
  const created = await call("POST", `/${ig}/media`, params, isDry);
  if (params.video_url) await awaitContainer(created.id, isDry, "story video");
  await call("POST", `/${ig}/media_publish`, { creation_id: created.id }, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

async function fbPost(o) {
  const page = need(PAGE, "FB_PAGE_ID");
  const isDry = dry(o);
  const base = o.base;
  const message = need(o["message-file"] ? caption({ "caption-file": o["message-file"] }) : o.message, "--message");
  say(`\nFacebook Page post${isDry ? "  [dry run]" : ""}`);

  // scheduled_publish_time is unix seconds; Meta requires 10 min – 30 days out
  const sched = o.scheduled ? Math.floor(new Date(String(o.scheduled)).getTime() / 1000) : null;

  if (o.image) {
    const params = { url: publicUrl(o.image, base), message };
    if (sched) {
      params.published = "false";
      params.scheduled_publish_time = String(sched);
    }
    const created = await call("POST", `/${page}/photos`, params, isDry);
    say(isDry ? "\n  (nothing was posted)" : `\n✓ posted${created.post_id ? ` (${created.post_id})` : ""}`);
    return;
  }
  const params = { message };
  if (o.link) params.link = o.link;
  if (sched) {
    params.published = "false";
    params.scheduled_publish_time = String(sched);
  }
  await call("POST", `/${page}/feed`, params, isDry);
  say(isDry ? "\n  (nothing was posted)" : "\n✓ posted");
}

/* ------------------------------------------------------------------- main */

const o = argv(process.argv.slice(2));
const cmd = o._[0];

if (!cmd || o.help) {
  say(USAGE);
  process.exit(0);
}

const commands = {
  "ig-post": igPost,
  "ig-carousel": igCarousel,
  "ig-reel": igReel,
  "ig-story": igStory,
  "fb-post": fbPost,
};

if (!commands[cmd]) {
  console.error(`✗ unknown command "${cmd}"\n\n${USAGE}`);
  process.exit(1);
}
if (!dry(o)) need(TOKEN, "META_TOKEN");

await commands[cmd](o);
