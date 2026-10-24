#!/usr/bin/env node
/**
 * NOWBEY — STORM KIT
 * ---------------------------------------------------------------------------
 * Six weather months out of twelve, this is the most important thing the
 * product does. The assets exist so that when a system is named, nobody is
 * designing under pressure at 11pm.
 *
 *   node scripts/build-storm.mjs
 *
 *     out/storm/storm-01-warning-1080.png   1:1   the warning itself
 *     out/storm/storm-02-warning-story.png  9:16  same, for a story + link sticker
 *     out/storm/storm-03-prep-1080.png      1:1   before it arrives
 *     out/storm/storm-04-after-1080.png     1:1   once it has passed
 *
 * The claims here are the ones the code actually implements
 * (src/lib/alerts.ts): a storm report reaches every verified email subscriber
 * for that island whatever categories they picked and whatever plan they are
 * on, and "annoying"-severity reports stay quiet unless they are storms.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { svgDoc, render } from "./lib.mjs";
import { T, text, rr, circle, measure, mark, wordmark } from "./postkit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out", "storm");
mkdirSync(OUT, { recursive: true });

const save = (name, svg, width) => {
  const png = render(svg, width);
  writeFileSync(join(OUT, name), png);
  console.log(`  → storm/${name}  ${Math.round(png.length / 1024)} KB`);
};

const INK = "#04211d";
const ALERT = T.danger; // #ff7f6b — the token the map itself uses for danger

/* ── shared furniture ─────────────────────────────────────────────────────── */

function shell(W, H, { tint = ALERT, glowY = 0.12 } = {}) {
  return `<defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="#0f1e26"/>
      <stop offset="0.55" stop-color="#0c151d"/>
      <stop offset="1" stop-color="#081016"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="${glowY}" r="0.62">
      <stop offset="0" stop-color="${tint}" stop-opacity="0.30"/>
      <stop offset="0.55" stop-color="${tint}" stop-opacity="0.07"/>
      <stop offset="1" stop-color="${tint}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#eafcfa" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ground)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>`;
}

/** A diagonal hazard band, cut by the frame — reads as urgency, not decoration. */
function bands(W, H, tint = ALERT) {
  return `<g opacity="0.5">
    <path d="M ${-W * 0.1} ${H * 0.86} L ${W * 0.9} ${H * 1.02}" stroke="${tint}" stroke-opacity="0.18" stroke-width="3"/>
    <path d="M ${-W * 0.1} ${H * 0.94} L ${W * 0.95} ${H * 1.1}" stroke="${tint}" stroke-opacity="0.12" stroke-width="2"/>
  </g>`;
}

function tag(label, x, y, { tint = ALERT, size = 15 } = {}) {
  // letterSpacing manually: measure() does not know about `tracking`, so a
  // tracked mono label comes out wider than the pill unless it is added back.
  const w = measure(label, T.font.mono, 700, size) + label.length * size * 0.14 + 58;
  return {
    width: w,
    svg: `<g>
      ${rr(x, y, w, 40, 20, "rgba(255,127,107,0.14)", { stroke: tint, strokeOpacity: 0.55 })}
      ${circle(x + 20, y + 20, 4.5, tint)}
      ${text(label, x + 34, y + 25, { family: T.font.mono, weight: 700, size, fill: "#ffe9e4", tracking: 0.14 })}
    </g>`,
  };
}

function footer(W, H, pad, { note = "nowbey-v2.vercel.app", y = null } = {}) {
  const yy = y ?? H - pad;
  return `<g>
    ${text(note, pad, yy, { family: T.font.sans, weight: 600, size: 24, fill: "#eafcfa" })}
    ${text("Free to look · no account needed", W - pad, yy, {
      family: T.font.sans, weight: 400, size: 20, fill: "#9aafb3", anchor: "end",
    })}
  </g>`;
}

/* ── 1 · the warning, square ──────────────────────────────────────────────── */

function warning(W = 1080, H = 1080) {
  const pad = 84;
  let y = pad + 30;

  let body = `${shell(W, H)}${bands(W, H)}`;

  body += `<g transform="translate(${pad},${pad - 26})">
    ${mark(0, -46, 52, { tile: "rgba(255,127,107,0.10)" })}
    ${wordmark(70, 0, 30)}
  </g>`;

  y = pad + 96;
  const t = tag("STORM WARNING", pad, y);
  body += t.svg;

  // The headline is the one thing that must be readable at thumbnail size.
  y += 132;
  body += text("If a storm", pad, y, {
    family: T.font.display, weight: 800, size: 104, fill: "#ffffff", tracking: -0.035,
  });
  body += text("is named,", pad, y + 104, {
    family: T.font.display, weight: 800, size: 104, fill: "#ffffff", tracking: -0.035,
  });
  body += text("you hear it.", pad, y + 208, {
    family: T.font.display, weight: 800, size: 104, fill: ALERT, tracking: -0.035,
  });

  // The promise, stated as the code implements it.
  y += 300;
  const lines = [
    "Storm reports reach every alert subscriber on",
    "that island — whatever categories you picked,",
    "whatever plan you are on. That is not a feature",
    "we can switch off.",
  ];
  lines.forEach((line, i) => {
    body += text(line, pad, y + i * 38, {
      family: T.font.sans, weight: i === 0 ? 600 : 400, size: 26,
      fill: i === 0 ? "#f3f1ea" : "#b9c8c9",
    });
  });

  // the one action
  y += 176;
  const label = "Set alerts for your island";
  const w = measure(label, T.font.sans, 700, 26) + 84;
  body += `<g>
    ${rr(pad, y, w, 72, 36, ALERT)}
    ${text(label, pad + 42, y + 46, { family: T.font.sans, weight: 700, size: 26, fill: INK })}
    ${text("nowbey-v2.vercel.app/alerts", pad, y + 116, {
      family: T.font.mono, weight: 700, size: 19, fill: "#9aafb3", tracking: 0.06,
    })}
  </g>`;

  body += footer(W, H, pad, { y: H - pad + 6, note: "Live for New Providence · other islands soon" });
  return svgDoc(W, H, body);
}

/* ── 2 · the warning, story ───────────────────────────────────────────────── */

function warningStory(W = 1080, H = 1920) {
  const pad = 84;
  let body = `${shell(W, H, { glowY: 0.3 })}${bands(W, H)}`;

  body += `<g transform="translate(${pad},${pad + 40})">
    ${mark(0, -46, 52, { tile: "rgba(255,127,107,0.10)" })}
    ${wordmark(70, 0, 30)}
  </g>`;

  const t = tag("STORM WARNING", pad, H * 0.17);
  body += t.svg;

  let y = H * 0.17 + 150;
  for (const [i, line] of ["STORM", "WARNING", "IS ON"].entries()) {
    body += text(line, pad, y + i * 132, {
      family: T.font.display, weight: 800, size: 132,
      fill: i === 2 ? ALERT : "#ffffff", tracking: -0.04,
    });
  }

  const note = ["Every alert subscriber on the island", "gets it. Free. Whatever plan you are on."];
  note.forEach((line, i) => {
    body += text(line, pad, y + 396 + i * 44, {
      family: T.font.sans, weight: 500, size: 30, fill: "#e2eeec",
    });
  });

  // Story-safe: the link sticker sits mid-frame, so the card goes just above it
  // rather than at the bottom, where Instagram's reply bar covers it.
  body += `<g transform="translate(${pad},${H * 0.575})">
    ${rr(0, 0, W - pad * 2, 96, 24, "rgba(255,127,107,0.14)", { stroke: ALERT, strokeOpacity: 0.5 })}
    ${text("Tap the link · set alerts for your area", pad * 0 + 34, 58, {
      family: T.font.sans, weight: 700, size: 30, fill: "#ffffff",
    })}
  </g>`;
  body += `<g transform="translate(${pad},${H * 0.575 + 150})">
    ${text("Live for New Providence · other islands soon", 0, 0, {
      family: T.font.sans, weight: 500, size: 22, fill: "#9aafb3",
    })}
  </g>`;

  return svgDoc(W, H, body);
}

/* ── 3 · before it arrives ────────────────────────────────────────────────── */

function prep(W = 1080, H = 1080) {
  const pad = 84;
  let body = `${shell(W, H, { tint: "#f8cf6b", glowY: 0.1 })}${bands(W, H, "#f8cf6b")}`;

  body += `<g transform="translate(${pad},${pad - 26})">
    ${mark(0, -46, 52, { tile: "rgba(248,207,107,0.10)" })}
    ${wordmark(70, 0, 30)}
  </g>`;

  const t = tag("BEFORE IT ARRIVES", pad, pad + 96, { tint: "#f8cf6b" });
  body += t.svg;

  body += text("Four things", pad, pad + 248, {
    family: T.font.display, weight: 800, size: 92, fill: "#ffffff", tracking: -0.035,
  });
  body += text("worth doing now.", pad, pad + 342, {
    family: T.font.display, weight: 800, size: 92, fill: "#f8cf6b", tracking: -0.035,
  });

  const items = [
    ["Set alerts for your island", "One email field. Verified once, then it is done."],
    ["Pin your known flood spots", "The lane that always goes. Save everyone the guess."],
    ["Screenshot the map", "If the power goes, you still have the last known state."],
    ["Check what is open", "nowbey-v2.vercel.app/open-now — essential services, verified."],
  ];
  let y = pad + 404;
  items.forEach(([head, sub], i) => {
    body += `<g>
      ${rr(pad, y, 48, 48, 14, "rgba(248,207,107,0.14)", { stroke: "rgba(248,207,107,0.45)" })}
      ${text(String(i + 1), pad + 16, y + 33, {
        family: T.font.mono, weight: 700, size: 22, fill: "#f8cf6b",
      })}
      ${text(head, pad + 70, y + 22, { family: T.font.sans, weight: 700, size: 28, fill: "#f3f1ea" })}
      ${text(sub, pad + 70, y + 54, { family: T.font.sans, weight: 400, size: 21, fill: "#9aafb3" })}
    </g>`;
    y += 96;
  });

  body += footer(W, H, pad, { y: H - pad + 6 });
  return svgDoc(W, H, body);
}

/* ── 4 · after it has passed ──────────────────────────────────────────────── */

function after(W = 1080, H = 1080) {
  const pad = 84;
  let body = `${shell(W, H, { tint: "#3fd6c0", glowY: 0.08 })}${bands(W, H, "#3fd6c0")}`;

  body += `<g transform="translate(${pad},${pad - 26})">
    ${mark(0, -46, 52, { tile: "rgba(63,214,192,0.10)" })}
    ${wordmark(70, 0, 30)}
  </g>`;

  const t = tag("AFTER THE STORM", pad, pad + 96, { tint: T.accent });
  body += t.svg;

  body += text("The map is", pad, pad + 248, {
    family: T.font.display, weight: 800, size: 92, fill: "#ffffff", tracking: -0.035,
  });
  body += text("still the record.", pad, pad + 342, {
    family: T.font.display, weight: 800, size: 92, fill: T.accent, tracking: -0.035,
  });

  const lines = [
    "Power still off on your road? Water still running",
    "brown? A line still down across the lane?",
    "",
    "Report it, or confirm the neighbour who did. It is",
    "how the next person knows before they drive.",
  ];
  lines.forEach((line, i) => {
    body += text(line, pad, pad + 416 + i * 38, {
      family: T.font.sans, weight: 400, size: 26, fill: "#b9c8c9",
    });
  });

  body += `<g>
    ${rr(pad, pad + 604, W - pad * 2, 92, 24, "rgba(63,214,192,0.12)", { stroke: "rgba(63,214,192,0.45)" })}
    ${text("Confirm what you can see — it takes four taps", pad + 34, pad + 658, {
      family: T.font.sans, weight: 700, size: 27, fill: "#eafcfa",
    })}
  </g>`;

  body += footer(W, H, pad, { y: H - pad + 6 });
  return svgDoc(W, H, body);
}

/* ── run ──────────────────────────────────────────────────────────────────── */

console.log("Storm kit");
save("storm-01-warning-1080.png", warning(), 1080);
save("storm-02-warning-story.png", warningStory(), 1080);
save("storm-03-prep-1080.png", prep(), 1080);
save("storm-04-after-1080.png", after(), 1080);
