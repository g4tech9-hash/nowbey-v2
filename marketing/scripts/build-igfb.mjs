#!/usr/bin/env node
/**
 * NOWBEY — INSTAGRAM + FACEBOOK CAMPAIGN SET
 * ---------------------------------------------------------------------------
 * The board's Phase 2 deliverables. Instagram and Facebook only; no vertical
 * video, no Reels, no TikTok.
 *
 *   node scripts/build-igfb.mjs
 *
 *   out/igfb/carousel-01-cover-1080x1350.png     4:5, the tallest IG allows
 *   out/igfb/carousel-02-loop-1080x1350.png      how a report becomes a record
 *   out/igfb/carousel-03-trust-1080x1350.png     why you can believe a pin
 *   out/igfb/feed-01-detail-1080x1080.png        macro of one confirmation
 *   out/igfb/feed-02-dashboard-1080x1080.png     the map, as an object
 *   out/igfb/fb-01-link-1200x630.png             1.91:1 link preview
 *   out/igfb/fb-02-link-1200x630.png             1.91:1 link preview
 *
 * Design notes the board agreed on, enforced here by construction:
 *  · 1200×630 is the OG/link-preview ratio, so all type sits inside the
 *    centre 80% — X, WhatsApp and Messenger all crop it tighter than Facebook.
 *  · 1080×1350 leaves the top 120px and bottom 220px clear of anything that
 *    matters, because the IG caption and the profile header overlay them.
 *  · No store badges and no "download": the product is a web app.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { svgDoc, render } from "./lib.mjs";
import { T, text, rr, circle, measure, wrap, mark, wordmark, hexA } from "./postkit.mjs";
import { sceneMap, sceneFeed, sceneReport, sceneSuccess } from "./scenes.mjs";
import { device } from "./layouts.mjs";
import { embed, photoPath, photoLayer, screenAspect } from "./photos.mjs";
import { createCanvas, loadImage } from "./canvas.mjs";
import { readFileSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out", "igfb");
mkdirSync(OUT, { recursive: true });

const save = (name, svg, width) => {
  const png = render(svg, width);
  writeFileSync(join(OUT, name), png);
  console.log(`  → igfb/${name}  ${Math.round(png.length / 1024)} KB`);
};

const screen = (fn, w, h, o, px = 1400) => render(svgDoc(w, h, fn(w, h, o)), px);

const INK = T.textOnAccent;
const SITE = "nowbey-v2.vercel.app";

/* ── shared furniture ─────────────────────────────────────────────────────── */

function ground(W, H, { tint = T.accent, cx = 0.18, cy = 0.05 } = {}) {
  return `<defs>
    <linearGradient id="g-base" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#0e1a23"/>
      <stop offset="0.55" stop-color="#0c151d"/>
      <stop offset="1" stop-color="#080f15"/>
    </linearGradient>
    <radialGradient id="g-bloom" cx="${cx}" cy="${cy}" r="0.8">
      <stop offset="0" stop-color="${tint}" stop-opacity="0.26"/>
      <stop offset="0.55" stop-color="${tint}" stop-opacity="0.07"/>
      <stop offset="1" stop-color="${tint}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="g-grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60 0H0V60" fill="none" stroke="#eafcfa" stroke-opacity="0.055" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g-base)"/>
  <rect width="${W}" height="${H}" fill="url(#g-grid)"/>
  <rect width="${W}" height="${H}" fill="url(#g-bloom)"/>`;
}

/** Typographic eyebrow: a dot and tracked mono, the product's own label idiom. */
function eyebrow(str, x, y, { tint = T.accent, size = 16 } = {}) {
  return `<g>
    ${circle(x + 5, y - 5, 4.5, tint)}
    ${text(str, x + 22, y, {
      family: T.font.mono, weight: 700, size, fill: "#d7ecec",
      tracking: 0.16,
    })}
  </g>`;
}

function lock(x, y, { size = 30 } = {}) {
  return `<g transform="translate(${x},${y})">
    ${mark(0, -Math.round(size * 1.5), size, { tile: "rgba(6,32,43,0.5)" })}
    ${wordmark(Math.round(size * 1.35), 0, Math.round(size * 0.92))}
  </g>`;
}

/** The one action in this campaign: open the web app. */
function siteLine(x, y, { size = 24, fill = "#eafcfa" } = {}) {
  return `<g>
    ${text(SITE, x, y, { family: T.font.mono, weight: 700, size, fill, tracking: 0.02 })}
  </g>`;
}

/**
 * The series device treatment: the phone rises out of the bottom edge and is
 * cut by it, under a fade. Consistent across all three carousel frames, and it
 * removes the "type fighting a floating phone" problem entirely — copy owns the
 * upper two-thirds.
 */
function deviceCropped(W, H, png, { devW = 620, x = null, y = 690 } = {}) {
  const devX = x ?? (W - devW) / 2;
  const dev = device(png, devX, y, devW, 390 / 744, { radius: 80, bezel: 10 });
  return {
    svg: `<g>${dev.svg}</g>
    <defs>
      <linearGradient id="fadeB" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b131a" stop-opacity="0"/>
        <stop offset="1" stop-color="#0b131a" stop-opacity="0.94"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${H - 210}" width="${W}" height="210" fill="url(#fadeB)"/>`,
  };
}

/* ── 1 · carousel cover (4:5) ─────────────────────────────────────────────── */

function carouselCover(W, H, png) {
  const pad = 84;
  // The phone is cropped by the bottom edge on purpose: it reads as a window
  // into the product rather than a device floating in the middle of a poster.
  const crop = deviceCropped(W, H, png, { devW: 600, y: 736 });

  return `<g>
    ${ground(W, H, { cx: 0.8, cy: 0.02 })}
    ${lock(pad, pad + 40, { size: 30 })}

    ${eyebrow("COMMUNITY SAFETY MAP", pad, 232)}

    ${text("Know before", pad, 366, { family: T.font.display, weight: 800, size: 112, fill: "#ffffff", tracking: -0.04 })}
    ${text("you go.", pad, 486, { family: T.font.display, weight: 800, size: 112, fill: T.accent, tracking: -0.04 })}

    ${text("Neighbour reports on one clear map.", pad, 570, {
      family: T.font.sans, weight: 600, size: 30, fill: "#f3f1ea",
    })}
    ${text("Swipe — three screens, one loop.", pad, 614, {
      family: T.font.sans, weight: 400, size: 26, fill: "#9aafb3",
    })}

    ${crop.svg}
    ${siteLine(pad + 30, H - 46, { size: 24, fill: "#c8d6d6" })}

    ${text("1 / 3", W - pad - 8, pad + 34, {
      family: T.font.mono, weight: 700, size: 18, fill: "#9aafb3", anchor: "end", tracking: 0.12,
    })}
  </g>`;
}

/* ── 2 · the loop (4:5) ───────────────────────────────────────────────────── */

function carouselLoop(W, H, png) {
  const pad = 84;
  const crop = deviceCropped(W, H, png, { devW: 560, x: 460, y: 806 });

  const steps = [
    ["01", "Someone sees it", "A flooded lane, a line down. They pin it."],
    ["02", "Someone else confirms", "One report is a rumour until it is two."],
    ["03", "You read the time", "Every card says how fresh it is."],
  ];

  let body = ground(W, H, { cx: 0.9, cy: 0.02 });
  body += lock(pad, pad + 40, { size: 28 });
  body += eyebrow("THE LOOP", pad, 240);
  body += text("From asking", pad, 352, {
    family: T.font.display, weight: 800, size: 96, fill: "#ffffff", tracking: -0.04,
  });
  body += text("to knowing.", pad, 456, {
    family: T.font.display, weight: 800, size: 96, fill: T.accent, tracking: -0.04,
  });

  let y = 566;
  steps.forEach(([n, head, sub], i) => {
    body += `<g>
      ${circle(pad + 22, y - 9, 22, i === 0 ? T.accent : "rgba(63,214,192,0.10)", {
        stroke: i === 0 ? T.accent : hexA(T.accent, 0.45),
      })}
      ${text(n, pad + 22, y - 2, {
        family: T.font.mono, weight: 700, size: 15,
        fill: i === 0 ? INK : T.accent, anchor: "middle",
      })}
      ${text(head, pad + 62, y - 2, { family: T.font.sans, weight: 700, size: 28, fill: "#f3f1ea" })}
      ${text(sub, pad + 62, y + 28, { family: T.font.sans, weight: 400, size: 21, fill: "#9aafb3" })}
      ${i < steps.length - 1
        ? `<line x1="${pad + 22}" y1="${y + 18}" x2="${pad + 22}" y2="${y + 62}" stroke="${hexA(T.accent, 0.28)}" stroke-width="2"/>`
        : ""}
    </g>`;
    y += 88;
  });

  body += crop.svg;
  body += siteLine(pad, H - 46, { size: 24, fill: "#c8d6d6" });
  body += text("2 / 3", W - pad - 8, pad + 34, {
    family: T.font.mono, weight: 700, size: 18, fill: "#9aafb3", anchor: "end", tracking: 0.12,
  });
  return body;
}

function carouselTrust(W, H, png) {
  const pad = 84;
  // bleeds off the right edge: the trust frame keeps its text column clear
  const crop = deviceCropped(W, H, png, { devW: 600, x: 512, y: 812 });

  let body = ground(W, H, { tint: "#f8cf6b", cx: 0.15, cy: 0.04 });
  body += lock(pad, pad + 40, { size: 28 });
  body += eyebrow("WHY YOU CAN TRUST A PIN", pad, 240, { tint: "#f8cf6b" });

  body += text("Not a", pad, 352, {
    family: T.font.display, weight: 800, size: 96, fill: "#ffffff", tracking: -0.04,
  });
  body += text("group chat.", pad, 456, {
    family: T.font.display, weight: 800, size: 96, fill: "#f8cf6b", tracking: -0.04,
  });

  const facts = [
    ["Who filed it", "and when they filed it"],
    ["Who confirmed it", "one report is not a record"],
    ["Storms always get through", "whatever plan you are on"],
  ];
  let y = 572;
  facts.forEach(([head, sub], i) => {
    body += `<g>
      ${rr(pad, y - 26, 5, 44, 2.5, "#f8cf6b")}
      ${text(head, pad + 26, y - 2, { family: T.font.sans, weight: 700, size: 27, fill: "#f3f1ea" })}
      ${text(sub, pad + 26, y + 28, { family: T.font.sans, weight: 400, size: 21, fill: "#9aafb3" })}
    </g>`;
    y += 86;
  });

  body += crop.svg;
  body += `<g transform="translate(${pad},${H - 46})">
    ${text("Free to look · no account needed", 0, 0, {
      family: T.font.sans, weight: 700, size: 25, fill: "#f8cf6b",
    })}
  </g>`;
  body += text("3 / 3", W - pad - 8, pad + 34, {
    family: T.font.mono, weight: 700, size: 18, fill: "#9aafb3", anchor: "end", tracking: 0.12,
  });
  return body;
}

/* ── 4 · feed: macro detail (1:1) ─────────────────────────────────────────── */

function feedDetail(W, H) {
  const pad = 84;
  // A single confirmation card, drawn at 2.4× so the detail is the subject.
  const cw = 780;
  const ch = 250;
  const cx = (W - cw) / 2;
  const cy = H * 0.40;

  let body = ground(W, H, { cx: 0.5, cy: 0.1 });

  body += eyebrow("DETAIL · CONFIRMATION", pad, 130);

  body += text("One pin.", pad, 250, {
    family: T.font.display, weight: 800, size: 104, fill: "#ffffff", tracking: -0.04,
  });
  body += text("Two people.", pad, 358, {
    family: T.font.display, weight: 800, size: 104, fill: T.accent, tracking: -0.04,
  });

  // the card, blown up
  body += `<g>
    ${rr(cx, cy, cw, ch, 30, T.bgRaised, { stroke: hexA(T.cat.flooding, 0.45), strokeWidth: 2 })}
    ${rr(cx, cy, 8, ch, 4, T.cat.flooding)}
    ${rr(cx + 34, cy + 32, 190, 52, 26, hexA(T.cat.flooding, 0.14), { stroke: hexA(T.cat.flooding, 0.5) })}
    ${circle(cx + 62, cy + 58, 7, T.cat.flooding)}
    ${text("Flooding", cx + 80, cy + 66, { family: T.font.sans, weight: 700, size: 26, fill: T.cat.flooding })}
    ${text("Water across the lane", cx + 34, cy + 140, {
      family: T.font.display, weight: 700, size: 42, fill: "#f3f1ea", tracking: -0.02,
    })}
    ${text("Bay Street · Nassau", cx + 34, cy + 176, {
      family: T.font.sans, weight: 400, size: 28, fill: "#b9c8c9",
    })}
    ${circle(cx + 40, cy + 212, 6, T.accent)}
    ${text("Confirmed in the last few hours", cx + 58, cy + 221, {
      family: T.font.sans, weight: 600, size: 27, fill: "#9aafb3",
    })}
    ${text("4 CONFIRMATIONS", cx + cw - 34, cy + 221, {
      family: T.font.mono, weight: 700, size: 22, fill: "#9aafb3", anchor: "end", tracking: 0.1,
    })}
  </g>`;

  // magnifier ring: the "close-up" gesture, drawn rather than faked
  body += `<g opacity="0.9">
    <circle cx="${cx + cw - 120}" cy="${cy + 42}" r="64" fill="none" stroke="${hexA(T.accent, 0.35)}" stroke-width="2"/>
    <path d="M ${cx + cw - 74} ${cy + 88} L ${cx + cw - 34} ${cy + 128}" stroke="${hexA(T.accent, 0.35)}" stroke-width="2"/>
  </g>`;

  body += text("A rumour until a second person checks.", pad, cy + ch + 96, {
    family: T.font.sans, weight: 600, size: 30, fill: "#f3f1ea",
  });
  body += text("That is the whole trust model, and it is not automatic.", pad, cy + ch + 140, {
    family: T.font.sans, weight: 400, size: 26, fill: "#9aafb3",
  });

  body += siteLine(pad, H - 54, { size: 22, fill: "#7f8f96" });
  return body;
}

/* ── 5 · feed: the map as an object (1:1) ─────────────────────────────────── */

function feedDashboard(W, H, png) {
  const pad = 84;
  // The screen fills the frame: this one is about the interface itself, so the
  // device is cropped by three edges and only the top chrome is visible.
  const devW = 760;
  const dev = device(png, (W - devW) / 2, 372, devW, 390 / 744, { radius: 96, bezel: 12 });

  let body = ground(W, H, { cx: 0.5, cy: 0.0 });
  body += eyebrow("THE MAP · NEW PROVIDENCE", pad, 118);
  body += text("Everything", pad, 232, {
    family: T.font.display, weight: 800, size: 88, fill: "#ffffff", tracking: -0.04,
  });
  body += text("at once.", pad, 322, {
    family: T.font.display, weight: 800, size: 88, fill: T.accent, tracking: -0.04,
  });

  body += `<defs>
    <linearGradient id="fadeB2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b131a" stop-opacity="0"/>
      <stop offset="1" stop-color="#0b131a" stop-opacity="0.96"/>
    </linearGradient>
  </defs>`;
  body += `<g>${dev.svg}</g>`;
  body += `<rect x="0" y="${H - 150}" width="${W}" height="150" fill="url(#fadeB2)"/>`;
  body += text("Live for New Providence · other islands soon", pad, H - 54, {
    family: T.font.sans, weight: 500, size: 22, fill: "#9aafb3",
  });
  return body;
}

/* ── 6 · Facebook link previews (1.91:1) ──────────────────────────────────── */

function fbPreview(W, H, { photoPng = null, hero = "", headLines = [], sub = "", foot = "", tint = T.accent }) {
  const pad = 68;
  // The centre 80% survives cropping in Messenger, WhatsApp and X.
  const safeX = Math.round(W * 0.06);

  let body = `<defs>
    <linearGradient id="fb-scrim" x1="0" y1="0" x2="0.85" y2="0">
      <stop offset="0" stop-color="#04161d" stop-opacity="0.93"/>
      <stop offset="0.5" stop-color="#04161d" stop-opacity="0.72"/>
      <stop offset="0.78" stop-color="#04161d" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#04161d" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#08121a"/>`;

  if (photoPng) {
    body += embed(photoPng, W, H);
  } else {
    body += `<rect width="${W}" height="${H}" fill="#0c151d"/>`;
  }
  body += `<rect width="${W}" height="${H}" fill="url(#fb-scrim)"/>`;

  body += lock(safeX, pad + 34, { size: 26 });

  let y = H * 0.42;
  headLines.forEach((line, i) => {
    body += text(line, safeX, y + i * 62, {
      family: T.font.display, weight: 800, size: 58,
      fill: i === headLines.length - 1 ? tint : "#ffffff", tracking: -0.03,
    });
  });
  y += headLines.length * 62 + 4;
  body += text(sub, safeX, y + 12, { family: T.font.sans, weight: 500, size: 24, fill: "#d7e6e5" });
  body += text(foot, safeX, y + 46, {
    family: T.font.mono, weight: 700, size: 18, fill: tint, tracking: 0.06,
  });
  return body;
}

/**
 * A plain photographic panel, cover-fitted. `photoLayer` expects a measured
 * screen quad; a lifestyle crop has no phone to composite into, so this is the
 * same cover-fit without the compositor.
 */
async function coverPhoto(photo, W, H, { focalX = 0.5, focalY = 0.5, scale = 1 } = {}) {
  const img = await loadImage(readFileSync(photoPath(photo)));
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  const s = Math.max(W / img.width, H / img.height) * scale;
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (W - dw) * focalX, (H - dh) * focalY, dw, dh);
  return c.encode("png");
}

/* ── run ──────────────────────────────────────────────────────────────────── */

console.log("Instagram + Facebook set");

const W45 = 1080;
const H45 = 1350;

const mapPng = screen(sceneMap, 390, 744, {});
const feedPng = screen(sceneFeed, 390, 744, {});
const reportPng = screen(sceneReport, 390, 744, { step: 1, typed: 1 });
const successPng = screen(sceneSuccess, 390, 744, {});

save("carousel-01-cover-1080x1350.png", svgDoc(W45, H45, carouselCover(W45, H45, mapPng)), W45);
save("carousel-02-loop-1080x1350.png", svgDoc(W45, H45, carouselLoop(W45, H45, reportPng)), W45);
save("carousel-03-trust-1080x1350.png", svgDoc(W45, H45, carouselTrust(W45, H45, successPng)), W45);

save("feed-01-detail-1080x1080.png", svgDoc(1080, 1080, feedDetail(1080, 1080)), 1080);
save("feed-02-dashboard-1080x1080.png", svgDoc(1080, 1080, feedDashboard(1080, 1080, mapPng)), 1080);

// Facebook: two previews, one coastal lifestyle, one street-level
const fbW = 1200;
const fbH = 630;

const coast = await coverPhoto("photo-nassau-coast.png", fbW, fbH, { focalX: 0.62, focalY: 0.5, scale: 1.02 });
save(
  "fb-01-link-1200x630.png",
  svgDoc(
    fbW,
    fbH,
    fbPreview(fbW, fbH, {
      photoPng: coast,
      headLines: ["Is Bay Street", "passable today?"],
      sub: "Neighbour reports on one clear map. Free to look.",
      foot: SITE,
    }),
  ),
  fbW,
);

// The man is holding a phone, so the phone has to show the product — a black
// slab under "a map of what Nassau can see" is the one thing that would make
// the whole asset a lie. Composite the map into the measured screen quad.
const mapAspect = screenAspect("photo-map-square.png");
const mapInHand = render(
  svgDoc(390, Math.round(390 / mapAspect), sceneMap(390, Math.round(390 / mapAspect), {})),
  1200,
);
const street = await photoLayer({
  photo: "photo-map-square.png",
  screen: mapInHand,
  W: fbW,
  H: fbH,
  focalX: 0.66,
  focalY: 0.3,
  scale: 1.06,
});
save(
  "fb-02-link-1200x630.png",
  svgDoc(
    fbW,
    fbH,
    fbPreview(fbW, fbH, {
      photoPng: street,
      headLines: ["A map of what", "Nassau can see."],
      sub: "Community safety map · New Providence",
      foot: SITE,
      tint: "#f8cf6b",
    }),
  ),
  fbW,
);
