/**
 * NOWBEY MARKETING — BATCH 2 ASSETS (1080×1080)
 * ---------------------------------------------------------------------------
 * Three new feed posts for the Batch 2 social set (see SOCIAL-BATCH-2.md).
 * They are built from the same primitives as build-posts.mjs — bg, headline,
 * sub, cta, ticks, brandLock, device, and the real app scenes — so nothing here
 * can drift from the interface it is advertising.
 *
 *   09-report-strip    the four-step report flow, four real screens in a row
 *   10-who-tells-you   "official alerts vs the neighbour layer" — the honest
 *                      version of the alerts post. Describes public systems;
 *                      carries NO police or government seal, and makes no
 *                      claim that NowBey integrates MARCO Alert.
 *   11-question        a typographic question poster. Deliberately no UI:
 *                      it should read as a neighbour's post, not a screenshot.
 *
 * Copy rules inherited from the product, not invented for marketing:
 *  · British spelling — "neighbour", "harbour".
 *  · No claim beyond the build: email alerts are live, SMS and iOS push are
 *    not; the map is live for New Providence only.
 *  · Storm warnings are free — a promise the code keeps
 *    (src/lib/alerts.ts, stormOverride).
 *  · Screens are examples and say so; the map carries SAMPLE MAP VIEW.
 *
 * Run:  node scripts/build-batch2.mjs        → out/posts/09,10,11
 */

import { mkdirSync } from "node:fs";
import { svgDoc, render, save } from "./lib.mjs";
import {
  bg, eyebrow, headline, sub, brandLock, cta, ticks,
  T, text, rr, circle, line, measure, wrap, hexA,
} from "./postkit.mjs";
import { chip, label } from "./ui.mjs";
import { device } from "./layouts.mjs";
import { sceneReport } from "./scenes.mjs";

const W = 1080;
const H = 1080;
const PAD = 72;
const COLW = W - PAD * 2;

mkdirSync("out/posts", { recursive: true });

/** Render an app screen at the phone breakpoint, exactly as build-posts.mjs does. */
function appScreen(scene, aspect, opts = {}, width = 1200) {
  const w = 390;
  const h = Math.round(w / aspect);
  return render(svgDoc(w, h, scene(w, h, opts)), width);
}

const ASPECT = 390 / 744;

/* ------------------------------------------------- shared: bottom-left foot */

/** The coverage dot + line, bottom-left, matching splitLayout's placement. */
function footLine(str, y = H - 66) {
  return `${circle(PAD + 5, y - 8, 4, T.accent)}${text(str, PAD + 20, y, {
    family: T.font.sans, weight: 500, size: 19, fill: T.textSecondary,
  })}`;
}

/** The top-right honesty chip, matching deviceLayout's footnote placement. */
function topFoot(str) {
  const tw = measure(str, T.font.sans, 400, 19);
  return `${circle(W - PAD - tw - 16, 104, 4, T.accent)}${text(str, W - PAD, 112, {
    family: T.font.sans, weight: 400, size: 19, fill: T.textTertiary, anchor: "end",
  })}`;
}

/* ------------------------------------------------------- 09 · report strip */

/**
 * Four real report screens in a row, joined by one teal progress line — the
 * whole flow readable in a single glance. Each panel shows the stepper at a
 * different step, and the typed line only appears once the copy step is reached,
 * so the strip reads left to right as a sequence rather than four identical
 * screenshots.
 */
function reportStrip() {
  const steps = [
    { n: "01", label: "WHAT IS IT", opts: { step: 0 } },
    { n: "02", label: "DROP THE PIN", opts: { step: 1 } },
    { n: "03", label: "SAY WHAT|YOU SEE", opts: { step: 2, typed: 0.45 } },
    { n: "04", label: "POST IT", opts: { step: 3, typed: 1 } },
  ];

  let body = bg(W, H);
  body += brandLock(PAD, 112, { markSize: 50, wordmarkSize: 30 });
  body += ticks(W, H, 40, 22);
  body += topFoot("Screens are examples");

  let y = 178;
  body += eyebrow("Report a hazard", PAD + 6, y + 22, { size: 17 });
  y += 30 + 14;

  const head = headline("Four steps. Twenty seconds.|Your lane is warned.", 0, 0, COLW - 40, {
    size: 58, min: 38, maxLines: 2,
  });
  body += `<g transform="translate(${PAD},${y})">${head.svg}</g>`;
  y += head.height + 54;

  /* the four panels ------------------------------------------------------- */
  // Beads and step labels sit ABOVE their screen, like column headers, so the
  // progress line reads 01→04 and the CTA row below keeps the whole band.
  const n = steps.length;
  const gap = 18;
  const dw = 214;
  const stripW = dw * n + gap * (n - 1);
  const x0 = Math.round((W - stripW) / 2);
  const cy = y; // the progress line's centre, through the beads
  const devH = Math.round((dw - 2 * 6) / ASPECT) + 2 * 6;
  const dy = cy + 90;

  // one line through all four steps, drawn first so the beads sit on top
  body += line(x0 + dw / 2, cy, x0 + stripW - dw / 2, cy, hexA(T.accent, 0.34), 3, { strokeLinecap: "round" });

  steps.forEach((s, i) => {
    const x = x0 + i * (dw + gap);
    const png = appScreen(sceneReport, ASPECT, s.opts, 900);
    const cx = x + dw / 2;
    body += circle(cx, cy, 21, i < n - 1 ? T.accent : T.bgBase, { stroke: T.accent, strokeWidth: 2.5 });
    if (i < n - 1) {
      body += `<g transform="translate(${cx - 8},${cy - 6})" stroke="${T.textOnAccent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6.4 5.6 11 15 1.6"/></g>`;
    } else {
      body += text(s.n, cx, cy + 6.5, { family: T.font.mono, weight: 700, size: 17, fill: T.accent, anchor: "middle" });
    }
    s.label.split("|").forEach((ln, k) => {
      body += text(ln, cx, cy + 44 + k * 21, {
        family: T.font.mono, weight: 700, size: 14.5, tracking: 0.12,
        fill: i === n - 1 ? T.accent : T.textSecondary, anchor: "middle",
      });
    });
    body += device(png, x, dy, dw, ASPECT).svg;
  });

  /* bottom: the CTA row and the coverage line ------------------------------ */
  const c = cta("Report a hazard", PAD, H - 168, { h: 62, size: 24 });
  body += c.svg;
  body += text("nowbey.com/report", PAD + c.width + 28, H - 168 + 40, {
    family: T.font.mono, weight: 700, size: 20, fill: T.textTertiary, tracking: 0.06,
  });
  body += footLine("Live for New Providence · your draft survives a dropped signal");

  return svgDoc(W, H, body);
}

/* -------------------------------------------------- 10 · who tells you what */

/**
 * The honest alerts post. Two columns: what officials send, and what the
 * neighbour layer covers. Public systems are described in words only — no
 * seal, badge or logo — because nothing here is a partnership.
 */
function whoTellsYou() {
  const OFFICIAL = [
    ["MARCO Alert", "A missing child. Issued by the Royal Bahamas Police Force."],
    ["Hurricane warnings", "NEMA and the Met Office, through official channels."],
    ["How it reaches you", "Straight to your phone through your carrier."],
  ];
  const NOWBEY = [
    ["Is your lane passable", "Right now, at 7:40 this morning."],
    ["Is the line down", "On your street, not across the island."],
    ["Has the water gone off", "At your end of the road."],
  ];

  const gap = 32;
  const pw = Math.round((COLW - gap) / 2); // 452
  const py = 380;
  const ph = 452;
  const inPad = 26;

  let body = bg(W, H);
  body += brandLock(PAD, 112, { markSize: 50, wordmarkSize: 30 });
  body += ticks(W, H, 40, 22);
  body += topFoot("No seals, no logos — described, not endorsed");

  let y = 178;
  body += eyebrow("Alerts", PAD + 6, y + 22, { size: 17 });
  y += 30 + 14;
  // `headline()` alternates plain/emphasised by part index: 0 plain, 1 accent.
  // Two parts per visual line keeps the accent on "your phone." and "your street."
  const head = headline("Official alerts reach|your phone.|Neighbours reach|your street.", 0, 0, COLW - 40, {
    size: 56, min: 36, maxLines: 2,
  });
  body += `<g transform="translate(${PAD},${y})">${head.svg}</g>`;

  /** One panel: tinted header, three rows, and a promise card at the foot. */
  const panel = (px, color, title, rows, promise, promiseColor) => {
    let s = rr(px, py, pw, ph, T.r.lg, hexA(color, 0.06), { stroke: hexA(color, 0.26) });
    s += circle(px + inPad, py + 44, 6, color);
    s += text(title, px + inPad + 18, py + 51, {
      family: T.font.mono, weight: 700, size: 16, fill: color, tracking: 0.14,
    });
    s += line(px + inPad, py + 74, px + pw - inPad, py + 74, hexA(color, 0.2), 1);

    let ry = py + 106;
    rows.forEach(([t, d]) => {
      s += text(t, px + inPad, ry, { family: T.font.sans, weight: 700, size: 21, fill: T.textPrimary });
      const lines = wrap(d, T.font.sans, 400, 17.5, pw - inPad * 2);
      lines.forEach((ln, i) => {
        s += text(ln, px + inPad, ry + 26 + i * 23, { family: T.font.sans, weight: 400, size: 17.5, fill: T.textTertiary });
      });
      ry += 26 + lines.length * 23 + 14;
    });

    // the promise card, pinned to the panel's foot
    const ch = 74;
    const cy2 = py + ph - inPad - ch;
    s += rr(px + inPad, cy2, pw - inPad * 2, ch, 16, hexA(promiseColor, 0.1), { stroke: hexA(promiseColor, 0.34) });
    const plines = wrap(promise, T.font.sans, 600, 17.5, pw - inPad * 2 - 40);
    plines.forEach((ln, i) => {
      s += text(ln, px + inPad + 20, cy2 + 30 + i * 23, { family: T.font.sans, weight: 600, size: 17.5, fill: promiseColor });
    });
    return s;
  };

  body += panel(PAD, T.info, "OFFICIAL — STRAIGHT FROM OFFICIALS", OFFICIAL,
    "In an emergency, call 911 / 919.", T.danger);
  body += panel(PAD + pw + gap, T.accent, "NOWBEY — THE LAYER NEXT DOOR", NOWBEY,
    "Free email alerts. Storm warnings always sent, always free.", T.warning);

  const c = cta("Set up email alerts", PAD, py + ph + 34, { h: 62, size: 24 });
  body += c.svg;
  body += text("nowbey.com/alerts", PAD + c.width + 28, py + ph + 34 + 40, {
    family: T.font.mono, weight: 700, size: 20, fill: T.textTertiary, tracking: 0.06,
  });
  body += footLine("Live for New Providence · email is the alert channel available today");

  return svgDoc(W, H, body);
}

/* ------------------------------------------------------- 11 · the question */

/**
 * A question poster with no screen in it. The answer chips are drawn in the
 * product's own category hues, so the post still looks like NowBey without
 * showing a single piece of UI.
 */
function questionPoster() {
  const ANSWERS = [
    { label: "Check the gully", color: T.cat.water },
    { label: "Move the car", color: T.cat.road },
    { label: "Charge the phones", color: T.cat.power },
    { label: "Call Granny", color: T.cat.community },
  ];

  let body = bg(W, H, { hue: "a" });
  body += brandLock(PAD, 112, { markSize: 50, wordmarkSize: 30 });
  body += ticks(W, H, 40, 22);

  let y = 172;
  body += eyebrow("Community question", PAD + 6, y + 22, { size: 17 });
  y += 30 + 16;

  // `headline()` alternates plain/accent by part index, so the whole first
  // block is one plain part and the punchline is the emphasised second.
  const head = headline("What do you do before the rain|mash up?", 0, 0, COLW - 20, {
    size: 96, min: 54, maxLines: 3,
  });
  body += `<g transform="translate(${PAD},${y})">${head.svg}</g>`;
  y += head.height + 22;

  const subBlock = sub("Everybody has a routine. Tell us yours — what do you check first, and what should your neighbours copy?", 0, 0, COLW - 150, { size: 26 });
  body += `<g transform="translate(${PAD},${y})">${subBlock.svg}</g>`;
  y += subBlock.height + 40;

  // answer chips, wrapped to the column, in their real category hues
  const SIZE = 25;
  const CH = 62;
  let cx = PAD;
  const drawChip = (lbl, color, accentDot) => {
    const w = measure(lbl, T.font.sans, 700, SIZE) + 62 + (accentDot ? 26 : 0);
    if (cx + w > W - PAD) { cx = PAD; y += CH + 16; }
    body += rr(cx, y, w, CH, CH / 2, color ? hexA(color, 0.12) : "rgba(255,255,255,0.05)", {
      stroke: color ? hexA(color, 0.4) : T.borderDefault,
    });
    if (accentDot) body += circle(cx + 26, y + CH / 2, 5, T.accent);
    body += text(lbl, cx + (accentDot ? 44 : 31), y + CH / 2 + SIZE * 0.35, {
      family: T.font.sans, weight: 700, size: SIZE, fill: color ?? T.textPrimary,
    });
    cx += w + 14;
  };
  ANSWERS.forEach((a) => drawChip(a.label, a.color, false));
  drawChip("Something else  ↓", null, true);
  y += CH + 46;

  const c = cta("Comment below", PAD, y, { h: 62, size: 24 });
  body += c.svg;
  body += text("We read every one, and we will credit the best.", PAD + c.width + 28, y + 40, {
    family: T.font.sans, weight: 400, size: 19, fill: T.textTertiary,
  });

  // bottom-left stays clear above the foot line — Facebook drops the avatar there
  body += footLine("Live for New Providence · nowbey.com");

  return svgDoc(W, H, body);
}

/* -------------------------------------------------------------------- run */

console.log("Batch 2 assets");
save("posts/09-report-strip.png", render(reportStrip(), 1080));
save("posts/10-who-tells-you.png", render(whoTellsYou(), 1080));
save("posts/11-question.png", render(questionPoster(), 1080));
