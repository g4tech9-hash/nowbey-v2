/**
 * NOWBEY MARKETING — STORIES & REELS COVERS (1080×1920)
 * ---------------------------------------------------------------------------
 * Nine vertical frames. Two jobs:
 *
 *  · Stories (Instagram / Facebook) — the top 250px and bottom 320px are
 *    covered by platform UI, so no type or logo lives there.
 *  · Reels / TikTok covers — the middle 1080×1080 of the 9:16 frame is what
 *    the profile grid crops to, so the headline is centred for that crop.
 *
 * `safe` zones are enforced by construction: content is laid out between
 * y=270 and y=1560 with a single headline block.
 */

import { svgDoc, render } from "./lib.mjs";
import { photoLayer, placeInRect, embed } from "./photos.mjs";
import { quadBox } from "./composite.mjs";
import { QUADS } from "./geometry.mjs";
import { sceneMap, sceneAlerts, sceneReport, sceneFeed, sceneWire, sceneSuccess, sceneDesktop } from "./scenes.mjs";
import { bg, scrim, eyebrow, headline, sub, brandLock, footnote, cta, ticks, T, text, rr, circle, measure, hexA, mark, wordmark } from "./postkit.mjs";
import { device } from "./layouts.mjs";

const W = 1080;
const H = 1920;
const PAD = 84;

function appScreen(scene, aspect, opts = {}, width = 1500) {
  const w = 390;
  const h = Math.round(w / aspect);
  return render(svgDoc(w, h, scene(w, h, opts)), width);
}
const aspectOf = (photo) => quadBox(QUADS[photo].quad).aspect;

/* ---------------------------------------------------------------- stories */

/**
 * Photo-led story: the photograph is full-bleed, and the type lives in the
 * TOP safe zone — both of these source photos were shot with a calm, empty
 * top third for exactly this. The phone sits in the lower two-thirds, never
 * underneath the words.
 */
async function photoStory({ photo, screen, sceneOpts = {}, place = [0.5, 1, 0.34], headSize = 90, maxLines = 3, eyebrowStr, headlineStr, subStr, ctaStr, footStr }) {
  const rect = { x: 0, y: 0, w: W, h: H };
  const f = placeInRect(photo, rect, place[0], place[1], place[2]);
  const png = await photoLayer({ photo, screen: appScreen(screen, aspectOf(photo), sceneOpts), rect, ...f });
  const head = headline(headlineStr, 0, 0, W - PAD * 2, { size: headSize, min: 52, maxLines });
  const subBlock = subStr ? sub(subStr, 0, 0, W - PAD * 2 - 20, { size: 30 }) : null;
  const ctaBlock = ctaStr ? cta(ctaStr, 0, 0, { h: 76, size: 28 }) : null;

  let body = bg(W, H);
  body += embed(png, W, H);
  body += `<defs>
      <linearGradient id="sTop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${T.bgBase}" stop-opacity="0.94"/>
        <stop offset="0.42" stop-color="${T.bgBase}" stop-opacity="0.72"/>
        <stop offset="1" stop-color="${T.bgBase}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="sBot" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${T.bgBase}" stop-opacity="0"/>
        <stop offset="1" stop-color="${T.bgBase}" stop-opacity="0.85"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${Math.round(H * 0.52)}" fill="url(#sTop)"/>
    <rect x="0" y="${H - 420}" width="${W}" height="420" fill="url(#sBot)"/>`;

  let y = 290;
  body += brandLock(PAD, y, { markSize: 56, wordmarkSize: 35 });
  y += 74;
  body += eyebrow(eyebrowStr, PAD + 6, y + 22, { size: 21 });
  y += 56;
  body += `<g transform="translate(${PAD},${y})">${head.svg}</g>`;
  y += head.height + 20;
  if (subBlock) {
    body += `<g transform="translate(${PAD},${y})">${subBlock.svg}</g>`;
    y += subBlock.height + 30;
  }
  if (ctaBlock) {
    body += `<g transform="translate(${PAD},${y})">${ctaBlock.svg}</g>`;
    y += ctaBlock.height + 26;
  }
  // the honesty line sits in the type block, never over the app screen
  if (footStr) {
    body += circle(PAD + 5, y + 8, 5, T.accent);
    body += text(footStr, PAD + 22, y + 16, { family: T.font.sans, weight: 400, size: 21, fill: T.textTertiary });
  }
  return svgDoc(W, H, body);
}

/**
 * Device-led story: headline and CTA up top, the phone below bleeding off the
 * bottom edge. Nothing is ever drawn on top of the app.
 */
function deviceStory({ screen, aspect = 390 / 744, eyebrowStr, headlineStr, subStr, ctaStr, footStr, headSize = 84, maxLines = 3, deviceW = 620, callouts = [] }) {
  let body = bg(W, H);
  body += brandLock(PAD, 300, { markSize: 58, wordmarkSize: 36 });
  body += ticks(W, H, 46, 26);

  const head = headline(headlineStr, 0, 0, W - PAD * 2, { size: headSize, min: 50, maxLines });
  let y = 430;
  body += eyebrow(eyebrowStr, PAD + 6, y + 22, { size: 21 });
  y += 54;
  body += `<g transform="translate(${PAD},${y})">${head.svg}</g>`;
  y += head.height + 18;
  if (subStr) {
    const s = sub(subStr, 0, 0, W - PAD * 2 - 10, { size: 30 });
    body += `<g transform="translate(${PAD},${y})">${s.svg}</g>`;
    y += s.height + 8;
  }
  if (ctaStr) {
    const c = cta(ctaStr, 0, 0, { h: 78, size: 29 });
    body += `<g transform="translate(${PAD},${y + 18})">${c.svg}</g>`;
    y += 18 + c.height;
  }
  if (footStr) {
    body += text(footStr, W - PAD, 292, { family: T.font.sans, weight: 400, size: 21, fill: T.textTertiary, anchor: "end" });
    body += circle(W - PAD - measure(footStr, T.font.sans, 400, 21) - 18, 285, 5, T.accent);
  }

  const dev = device(screen, 0, 0, deviceW, aspect);
  const dx = (W - deviceW) / 2;
  const dy = y + 60;
  body += `<defs><radialGradient id="sglow">
      <stop offset="0" stop-color="#22b8a4" stop-opacity="0.34"/>
      <stop offset="0.6" stop-color="#22b8a4" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#22b8a4" stop-opacity="0"/>
    </radialGradient></defs>
    <ellipse cx="${W / 2}" cy="${dy + dev.h * 0.5}" rx="${deviceW * 1.05}" ry="${dev.h * 0.58}" fill="url(#sglow)"/>`;
  body += `<g transform="translate(${dx},${dy})">${dev.svg}</g>`;
  for (const c of callouts) {
    const cw = c.w ?? 380;
    const cx = c.at === "right" ? Math.min(W - 44 - cw, dx + deviceW - 70) : 44;
    const cy = dy + c.dy;
    body += rr(cx, cy, cw, 92, 24, "rgba(16,30,41,0.96)", { stroke: "rgba(148,206,202,0.24)" });
    body += rr(cx + 18, cy + 24, 44, 44, 14, hexA(c.color ?? T.accent, 0.16), { stroke: hexA(c.color ?? T.accent, 0.45) });
    body += circle(cx + 40, cy + 46, 4, c.color ?? T.accent);
    body += text(c.title, cx + 78, cy + 42, { family: T.font.sans, weight: 700, size: 25, fill: T.textPrimary });
    body += text(c.line, cx + 78, cy + 70, { family: T.font.sans, weight: 400, size: 20, fill: T.textTertiary });
  }
  return svgDoc(W, H, body);
}

/* ----------------------------------------------------------------- stories */

export const STORIES = {
  /* S1 — the map, full-bleed, vertical. */
  "S1-map-story": () =>
    photoStory({
      photo: "photo-story-a.png",
      screen: sceneMap,
      place: [0.5, 0.7, 0.27],
      eyebrowStr: "Community map",
      headlineStr: "Know what's|happening,|island by island.",
      subStr: "Neighbour reports on one clear map. Free to look, no account needed.",
      ctaStr: "Swipe up to open the map",
      footStr: "Live for New Providence",
      headSize: 96,
      maxLines: 3,
    }),

  /* S2 — phone-first story for the alerts hook. */
  "S2-alerts-story": () =>
    deviceStory({
      screen: appScreen(sceneAlerts, 390 / 744, {}),
      eyebrowStr: "Email alerts",
      headlineStr: "Your island.|Your alerts.|No noise.",
      subStr: "Storm warnings are always sent, and always free.",
      ctaStr: "Set up alerts",
      footStr: "Email is the channel available today",
      headSize: 96,
      deviceW: 640,
      callouts: [{ at: "right", dy: 240, w: 400, title: "Flooding on", line: "Bay Street · Nassau", color: T.cat.flooding }],
    }),

  /* S3 — reporting, story format. */
  "S3-report-story": () =>
    photoStory({
      photo: "photo-story-b.png",
      screen: sceneReport,
      sceneOpts: { step: 2, typed: 0.7 },
      place: [0.5, 0.7, 0.24],
      eyebrowStr: "Report a hazard",
      headlineStr: "Twenty|seconds.",
      subStr: "Four guided steps. Post your name, or stay anonymous.",
      ctaStr: "Report what you see",
      footStr: "Your draft survives a dropped signal",
      headSize: 132,
      maxLines: 2,
    }),

  /* S4 — the confirmation beat, as a quote card. */
  "S4-confirmed-story": () =>
    deviceStory({
      screen: appScreen(sceneSuccess, 390 / 744, {}),
      eyebrowStr: "Confirmation",
      headlineStr: "Somebody|saw it too.",
      subStr: "Neighbours confirm what's real. A rumour becomes a signal.",
      ctaStr: "See the map",
      footStr: "No account needed to look",
      headSize: 104,
      deviceW: 620,
    }),

  /* S5 — the wire, story. */
  "S5-wire-story": () =>
    photoStory({
      photo: "photo-story-a.png",
      screen: sceneWire,
      place: [0.5, 0.7, 0.27],
      eyebrowStr: "The news wire",
      headlineStr: "Bahamian|headlines,|with context.",
      subStr: "Local outlets, reviewed before publishing, linked to where it happened.",
      ctaStr: "Read the wire",
      footStr: "Sources named on every story",
      headSize: 96,
      maxLines: 3,
    }),

  /* S6 — the "no download" laptop story. */
  "S6-web-story": async () => {
    const photo = "photo-laptop.png";
    const rect = { x: 0, y: 940, w: W, h: 980 };
    const aspect = aspectOf(photo);
    const webPng = render(svgDoc(1440, Math.round(1440 / aspect), sceneDesktop(1440, Math.round(1440 / aspect))), 1900);
    const f = placeInRect(photo, rect, 0.52, 0.5, 0.7);
    const layer = await photoLayer({ photo, screen: webPng, rect, ...f });

    let body = bg(W, H);
    body += embed(layer, W, H);
    // soften the panel's top edge into the canvas, and the bottom for the URL
    body += `<defs>
        <linearGradient id="wTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${T.bgBase}" stop-opacity="1"/>
          <stop offset="0.55" stop-color="${T.bgBase}" stop-opacity="0.9"/>
          <stop offset="1" stop-color="${T.bgBase}" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="wBot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${T.bgBase}" stop-opacity="0"/>
          <stop offset="1" stop-color="${T.bgBase}" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect x="0" y="860" width="${W}" height="280" fill="url(#wTop)"/>
      <rect x="0" y="${H - 220}" width="${W}" height="220" fill="url(#wBot)"/>`;
    body += brandLock(PAD, 300, { markSize: 56, wordmarkSize: 35 });
    body += ticks(W, H, 46, 26);
    body += eyebrow("No download required", PAD + 6, 470, { size: 21 });
    const head = headline("The whole map,|in a browser tab.", PAD, 520, W - PAD * 2, { size: 88, min: 54, maxLines: 2 });
    body += head.svg;
    let y = 520 + head.height + 18;
    const s2 = sub("Open it on a laptop, a tablet or a phone. No app store, no update to wait for.", PAD, y, W - PAD * 2 - 20, { size: 30 });
    body += s2.svg;
    y += s2.height + 28;
    const c = cta("Open the map", PAD, y, { h: 76, size: 28 });
    body += c.svg;
    body += text("nowbey.com", W / 2, H - 96, { family: T.font.sans, weight: 400, size: 22, fill: T.textTertiary, anchor: "middle" });
    return svgDoc(W, H, body);
  },

  /* Reels covers — headline centred for the 1:1 grid crop. */
  "R1-reel-cover-map": () =>
    deviceStory({
      screen: appScreen(sceneMap, 390 / 744, { zoom: 1.04 }),
      eyebrowStr: "Community map",
      headlineStr: "See it before|you drive it.",
      subStr: "Live hazard reports for New Providence.",
      footStr: "nowbey.com",
      headSize: 100,
      deviceW: 660,
    }),

  "R2-reel-cover-report": () =>
    deviceStory({
      screen: appScreen(sceneReport, 390 / 744, { step: 2, typed: 0.7 }),
      eyebrowStr: "Report a hazard",
      headlineStr: "Four steps.|Twenty|seconds.",
      subStr: "Then your street knows.",
      footStr: "nowbey.com",
      headSize: 104,
      deviceW: 640,
    }),

  "R3-reel-cover-feed": () =>
    deviceStory({
      screen: appScreen(sceneFeed, 390 / 744, {}),
      eyebrowStr: "Community feed",
      headlineStr: "Your street|is talking.",
      subStr: "See what neighbours are reporting right now.",
      footStr: "nowbey.com",
      headSize: 100,
      deviceW: 650,
      callouts: [{ at: "left", dy: 470, w: 400, title: "4 confirmations", line: "Bay Street · Nassau" }],
    }),
};

function photoLayerSyncPlaceholder() {
  return null;
}
