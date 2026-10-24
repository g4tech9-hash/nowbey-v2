/**
 * NOWBEY MARKETING — VIDEO ENGINE
 * ---------------------------------------------------------------------------
 * Renders the three reels as real frames, not a slideshow of stills: every
 * frame re-draws the app scene from parameters, so the UI genuinely moves —
 * pins drop onto the map, the map pushes in, a category chip takes the tap,
 * characters type into the report field, toggles flip, the success tick
 * springs in.
 *
 * Two tracks per reel:
 *   1. the app — an SVG scene rendered per frame at 2× the phone size;
 *   2. the world — a still photograph (or the ambient room), composited once.
 *
 * Frames are piped to ffmpeg (imageio-ffmpeg's own binary, so nothing has to
 * be installed on the machine) and come out as a 1080×1920 H.264 MP4 that
 * TikTok, Reels and Facebook all accept as-is.
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import { createCanvas, loadImage, GlobalFonts } from "./canvas.mjs";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Register the product's own typefaces with the canvas so `ctx.font` can name
// them exactly as the design system does ("800 84px Brico800").
const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "fonts", "static");
for (const f of readdirSync(FONT_DIR).filter((n) => n.endsWith(".ttf"))) {
  GlobalFonts.registerFromPath(join(FONT_DIR, f));
}
import { compositeScreen, quadBox } from "./composite.mjs";
import { QUADS } from "./geometry.mjs";
import { photoPath } from "./photos.mjs";
import { svgDoc, render } from "./lib.mjs";
import { sceneMap, sceneReport, sceneAlerts, sceneSuccess } from "./scenes.mjs";
import { T, text, rr, circle, measure, hexA, mark, wordmark } from "./postkit.mjs";

export const FPS = 30;
export const W = 1080;
export const H = 1920;

/* ------------------------------------------------------------------ tween */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** Progress of t inside [start, end], 0..1. */
export const at = (t, start, end) => clamp((t - start) / Math.max(1e-6, end - start));
export const easeOut = (p) => 1 - Math.pow(1 - p, 3);
export const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
/** Springy overshoot, for anything the user "taps". */
export const spring = (p) => {
  if (p >= 1) return 1;
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
/** Typewriter helper: how much of `str` is visible by time t. */
export const typed = (str, t, start, end) => str.slice(0, Math.round(str.length * at(t, start, end)));

/* -------------------------------------------------------------- ffmpeg io */

/**
 * Find an ffmpeg binary, in order of preference:
 *   1. $FFMPEG — set this if you keep ffmpeg somewhere unusual;
 *   2. a local node_modules/ffmpeg-static (declared as an optional install);
 *   3. the imageio-ffmpeg python package's own binary, if a Python has it;
 *   4. whatever `ffmpeg` is on PATH.
 * The build fails loudly if none of those exist, rather than writing a
 * zero-frame file.
 */
function ffmpegBin() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  for (const c of ["ffmpeg-static", "@ffmpeg-installer/ffmpeg"]) {
    try {
      const mod = require(c);
      const p = typeof mod === "string" ? mod : mod?.path;
      if (p && existsSync(p)) return p;
    } catch {
      /* optional */
    }
  }
  for (const py of [process.env.PYTHON, "python3", "python"]) {
    if (!py) continue;
    try {
      const p = execFileSync(py, ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (p && existsSync(p)) return p;
    } catch {
      /* try the next one */
    }
  }
  return "ffmpeg";
}

/** Pipe raw RGBA frames into ffmpeg → H.264 MP4 (yuv420p, faststart). */
export async function encode(name, frames, { fps = FPS } = {}) {
  mkdirSync("out/video", { recursive: true });
  const out = `out/video/${name}.mp4`;
  const bin = ffmpegBin();
  const args = [
    "-y",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-s",
    `${W}x${H}`,
    "-r",
    String(fps),
    "-i",
    "pipe:0",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "19",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-movflags",
    "+faststart",
    "-an",
    out,
  ];
  const proc = spawn(bin, args, { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => {
    proc.on("error", rej);
    proc.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`))));
  });
  for (const buf of frames) {
    if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once("drain", r));
  }
  proc.stdin.end();
  await done;
  return out;
}

/* -------------------------------------------------------------- world art */

/** The ambient room, pre-rendered once as a PNG. */
function roomBg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="a" cx="0.12" cy="0" r="0.9">
        <stop offset="0" stop-color="#22b8a4" stop-opacity="0.30"/>
        <stop offset="0.6" stop-color="#22b8a4" stop-opacity="0.07"/>
        <stop offset="1" stop-color="#0c151d" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="b" cx="0.95" cy="0.12" r="0.8">
        <stop offset="0" stop-color="#c7402f" stop-opacity="0.16"/>
        <stop offset="0.6" stop-color="#c7402f" stop-opacity="0.04"/>
        <stop offset="1" stop-color="#0c151d" stop-opacity="0"/>
      </radialGradient>
      <pattern id="g" width="56" height="56" patternUnits="userSpaceOnUse">
        <path d="M56 0H0V56" fill="none" stroke="rgba(122,186,190,0.075)" stroke-width="1"/>
      </pattern>
      <radialGradient id="v" cx="0.5" cy="0.45" r="0.8">
        <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#04090d" stop-opacity="0.6"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#0c151d"/>
    <rect width="${W}" height="${H}" fill="url(#a)"/>
    <rect width="${W}" height="${H}" fill="url(#b)"/>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect width="${W}" height="${H}" fill="url(#v)"/>
  </svg>`;
  return render(svg, W);
}

/** Screenshot of the app at the phone aspect, as a PNG buffer. */
function phoneScreen(scene, aspect, opts, width = 780) {
  const w = 390;
  const h = Math.round(w / aspect);
  return render(svgDoc(w, h, scene(w, h, opts)), width);
}

/* ------------------------------------------------------------- device draw */

/** Draw the phone frame + a live app screen into a canvas context. */
async function drawDevice(ctx, screenBuf, x, y, w, aspect, alpha = 1) {
  const img = await loadImage(screenBuf);
  const bezel = Math.round(w * 0.026);
  const r = Math.round(w * 0.12);
  const iw = w - bezel * 2;
  const ih = iw / aspect;
  const h = ih + bezel * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  // shadow
  ctx.shadowColor = "rgba(2,7,11,0.75)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 30;
  roundRect(ctx, x, y, w, h, r);
  const bez = ctx.createLinearGradient(x, y, x + w, y + h);
  bez.addColorStop(0, "#33485a");
  bez.addColorStop(0.4, "#0e1a23");
  bez.addColorStop(1, "#2a3d4d");
  ctx.fillStyle = bez;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // screen
  ctx.save();
  roundRect(ctx, x + bezel, y + bezel, iw, ih, r - bezel);
  ctx.clip();
  ctx.drawImage(img, x + bezel, y + bezel, iw, ih);
  const sheen = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
  sheen.addColorStop(0, "rgba(255,255,255,0.10)");
  sheen.addColorStop(0.32, "rgba(255,255,255,0.02)");
  sheen.addColorStop(0.6, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x + bezel, y + bezel, iw, ih);
  ctx.restore();
  // rim
  ctx.strokeStyle = "rgba(200,232,232,0.26)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, r);
  ctx.stroke();
  // dynamic island
  ctx.fillStyle = "#05090c";
  roundRect(ctx, x + w / 2 - w * 0.086, y + bezel + w * 0.05, w * 0.172, w * 0.05, w * 0.025);
  ctx.fill();
  ctx.restore();
  return { w, h };
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/* --------------------------------------------------------------- type art */

/** Draw the headline block + CTA + brand onto a canvas (per frame). */
function drawOverlay(ctx, { t, eyebrowStr, headlineStr, subStr, ctaStr, footStr, inStart = 0.05, outStart = 99, brandY = 300, headSize = 84, maxLines = 3 }) {
  const PAD = 84;
  const appear = easeOut(at(t, inStart, inStart + 0.5));
  const fadeOut = 1 - easeInOut(at(t, outStart, outStart + 0.45));
  const alpha = appear * fadeOut;
  if (alpha <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, (1 - appear) * 34);

  // brand lock, top-left
  ctx.font = "800 34px Brico800";
  drawMark(ctx, PAD, brandY - 44, 54);
  ctx.fillStyle = T.textPrimary;
  ctx.fillText("Now", PAD + 70, brandY);
  const nowW = ctx.measureText("Now").width;
  ctx.fillStyle = T.accent;
  ctx.fillText("Bey", PAD + 70 + nowW, brandY);

  // eyebrow
  const ey = brandY + 152;
  ctx.fillStyle = T.accent;
  ctx.beginPath();
  ctx.arc(PAD + 6, ey - 7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexA(T.accent, 0.28);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(PAD + 6, ey - 7, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "700 21px JBMono700";
  ctx.fillStyle = T.accent;
  drawTracked(ctx, eyebrowStr.toUpperCase(), PAD + 26, ey, 0.2 * 21);

  // headline: emphasise the words between the | marks
  const H = textLines(headlineStr, `800 ${headSize}px Brico800`, W - PAD * 2, ctx, maxLines);
  let y = ey + 76;
  for (const line of H.lines) {
    let x = PAD;
    for (const part of line) {
      ctx.font = `800 ${H.size}px Brico800`;
      ctx.fillStyle = part.em ? T.accent : T.textPrimary;
      ctx.fillText(part.text, x, y);
      x += ctx.measureText(part.text).width + ctx.measureText(" ").width;
    }
    y += H.size * 1.02;
  }
  // support
  if (subStr) {
    ctx.font = "400 30px Inter400";
    ctx.fillStyle = T.textSecondary;
    const s = wrapText(ctx, subStr, W - PAD * 2 - 30);
    y += 8;
    for (const line of s) {
      ctx.fillText(line, PAD, y);
      y += 46;
    }
  }
  if (ctaStr) {
    y += 22;
    ctx.font = "700 28px Inter700";
    const cw = ctx.measureText(ctaStr).width + 76;
    ctx.fillStyle = T.accent;
    roundRect(ctx, PAD, y - 8, cw, 74, 37);
    ctx.fill();
    ctx.fillStyle = T.textOnAccent;
    ctx.fillText(ctaStr, PAD + 38, y + 40);
  }
  if (footStr) {
    ctx.font = "400 21px Inter400";
    ctx.fillStyle = T.textTertiary;
    ctx.fillText(footStr, PAD, H - 96);
  }
  ctx.restore();
}

function drawMark(ctx, x, y, size) {
  const s = size / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(12,21,29,0.6)";
  roundRect(ctx, 1.5, 1.5, 37, 37, 12);
  ctx.fill();
  ctx.strokeStyle = T.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, 8.5);
  ctx.bezierCurveTo(16.1, 8.5, 13, 11.5, 13, 15.3);
  ctx.bezierCurveTo(13, 20.2, 20, 26.5, 20, 26.5);
  ctx.bezierCurveTo(20, 26.5, 27, 20.2, 27, 15.3);
  ctx.bezierCurveTo(27, 11.5, 23.9, 8.5, 20, 8.5);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = T.warning;
  ctx.beginPath();
  ctx.arc(20, 15.2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTracked(ctx, str, x, y, tracking) {
  const prev = ctx.textAlign;
  let cx = x;
  for (const ch of str) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
  ctx.textAlign = prev;
}

function wrapText(ctx, str, maxW) {
  const words = str.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Same mixed-emphasis wrapping as the static kit, but measuring real text. */
function textLines(str, font, maxW, ctx, maxLines = 3) {
  let size = parseInt(font.match(/(\d+)px/)[1], 10);
  const parts = String(str).split("|");
  const build = (sz) => {
    ctx.font = font.replace(/\d+px/, `${sz}px`);
    const tokens = [];
    parts.forEach((p, i) => p.trim().split(/\s+/).filter(Boolean).forEach((w) => tokens.push({ text: w, em: i % 2 === 1 })));
    const lines = [];
    let cur = [];
    let w = 0;
    const space = ctx.measureText(" ").width;
    for (const tk of tokens) {
      const tw = ctx.measureText(tk.text).width;
      if (w + tw > maxW && cur.length) {
        lines.push(cur);
        cur = [];
        w = 0;
      }
      cur.push(tk);
      w += tw + space;
    }
    if (cur.length) lines.push(cur);
    return lines;
  };
  let lines = build(size);
  while (lines.length > maxLines && size > 48) {
    size -= 2;
    lines = build(size);
  }
  return { lines, size };
}

/* ------------------------------------------------------------------ videos */

const DURATION = 8;

/**
 * Video 1 — THE MAP. A real phone in a real Bahamian street; the map pushes
 * in, pins drop, a neighbour's confirmation lands.
 */
export async function videoMap() {
  const photo = "photo-story-a.png";
  const geo = QUADS[photo];
  const aspect = quadBox(geo.quad).aspect;
  const frames = [];
  const total = DURATION * FPS;
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    const zoom = 1 + 0.14 * easeInOut(at(t, 0.4, 3.4));
    const shiftY = -14 * easeInOut(at(t, 0.4, 3.4));
    const drops = [0.9, 1.5, 2.1, 2.7, 3.3];
    const pinScale = drops.reduce((m, d) => Math.max(m, spring(at(t, d, d + 0.35))), 0.001);
    const chip = spring(at(t, 3.9, 4.25));
    const screen = phoneScreen(
      sceneMap,
      aspect,
      { zoom, shiftY, reveal: chip, showConfirm: t > 3.9, pinScale: Math.min(1, pinScale) },
      620,
    );
    const composed = await compositeScreen({
      photo: photoPath(photo),
      screen,
      quad: geo.quad,
      radius: geo.radius,
      reflection: geo.reflection,
      brightness: geo.brightness,
      glow: geo.glow + 0.2 * at(t, 3.9, 4.6),
      res: 3,
    });
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const s = Math.max(W / composed.width, H / composed.height) * (1 + 0.05 * easeInOut(at(t, 0, DURATION)));
    const dw = composed.width * s;
    const dh = composed.height * s;
    ctx.drawImage(composed, (W - dw) * 0.5, (H - dh) * 0.62, dw, dh);

    // graded scrims so type always reads
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    top.addColorStop(0, "rgba(12,21,29,0.94)");
    top.addColorStop(0.45, "rgba(12,21,29,0.62)");
    top.addColorStop(1, "rgba(12,21,29,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * 0.6);
    const bot = ctx.createLinearGradient(0, H - 420, 0, H);
    bot.addColorStop(0, "rgba(12,21,29,0)");
    bot.addColorStop(1, "rgba(12,21,29,0.92)");
    ctx.fillStyle = bot;
    ctx.fillRect(0, H - 420, W, 420);

    if (t < 4.2) {
      drawOverlay(ctx, {
        t,
        eyebrowStr: "Community map",
        headlineStr: "See what's|happening,|before you drive.",
        subStr: "Neighbour reports on one clear map.",
        inStart: 0.1,
        outStart: 3.7,
      });
    } else {
      drawEndCard(ctx, t, 4.2, "Open the map", "Island by island.");
    }
    frames.push(rawFrom(canvas));
  }
  return encode("01-map-countdown", frames);
}

/** Video 2 — REPORT. The four-step flow, typed live, ending on the tick. */
export async function videoReport() {
  const frames = [];
  const total = DURATION * FPS;
  const room = await loadImage(roomBg());
  const aspect = 390 / 744;
  const phrase = "Water across the lane";
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    const step = t < 2.6 ? 1 : t < 5.3 ? 2 : 3;
    const type = typed(phrase, t, 3.0, 4.6);
    const done = t > 5.6;
    const scene = done ? sceneSuccess : sceneReport;
    const opts = done ? { pop: spring(at(t, 5.6, 6.0)) } : { step, typed: type.length / phrase.length, typedText: type };
    const screen = phoneScreen(scene, aspect, opts, 780);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(room, 0, 0, W, H);

    // the phone rises into place, and settles smaller on the success beat so
    // the closing line and CTA have room above it
    const settle = easeInOut(at(t, 5.55, 6.05));
    const w = 660 - 100 * settle;
    const x = (W - w) / 2;
    const y = 700 + (1 - easeOut(at(t, 0.15, 0.6))) * 40 + 175 * settle;
    // accent bloom behind the phone
    const g = ctx.createRadialGradient(W / 2, y + 620, 100, W / 2, y + 620, 760);
    g.addColorStop(0, "rgba(34,184,164,0.30)");
    g.addColorStop(1, "rgba(34,184,164,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    await drawDevice(ctx, screen, x, y, w, aspect);
    drawOverlay(ctx, {
      t,
      eyebrowStr: "Report a hazard",
      headlineStr: done ? "That's it.|It's on the map." : "Four steps.|Twenty|seconds.",
      subStr: done ? "Neighbours nearby see it straight away." : "A guided flow. Your draft survives a dropped signal.",
      ctaStr: done ? "Report a hazard" : null,
      inStart: 0.1,
      outStart: 99,
      brandY: 230,
      headSize: 82,
      outStart: 5.95,
    });
    if (t > 6.5) drawEndCard(ctx, t, 6.5, "Report a hazard", "Four steps. Twenty seconds.");
    frames.push(rawFrom(canvas));
  }
  return encode("02-report-flow", frames);
}

/** Video 3 — ALERTS. Toggles flip; the free-storm promise lands. */
export async function videoAlerts() {
  const frames = [];
  const total = DURATION * FPS;
  const room = await loadImage(roomBg());
  const aspect = 390 / 744;
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    const flooding = t > 1.1;
    const roads = t > 1.9;
    const power = t > 4.4;
    const storm = spring(at(t, 2.8, 3.2));
    const screen = phoneScreen(sceneAlerts, aspect, { flooding, roads, power, storm }, 780);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(room, 0, 0, W, H);
    const w = 660;
    const x = (W - w) / 2;
    const y = 700 + (1 - easeOut(at(t, 0.15, 0.6))) * 40;
    const g = ctx.createRadialGradient(W / 2, y + 620, 100, W / 2, y + 620, 760);
    g.addColorStop(0, "rgba(34,184,164,0.28)");
    g.addColorStop(1, "rgba(34,184,164,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    await drawDevice(ctx, screen, x, y, w, aspect);

    // give the storm promise its own beat: the card inside the app lifts
    const lift = spring(at(t, 2.8, 3.2));
    if (lift > 0.01) {
      const g2 = ctx.createRadialGradient(W / 2, y + 830, 40, W / 2, y + 830, 420);
      g2.addColorStop(0, `rgba(248,207,107,${0.18 * Math.min(1, lift)})`);
      g2.addColorStop(1, "rgba(248,207,107,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, y + 560, W, 560);
    }

    drawOverlay(ctx, {
      t,
      brandY: 230,
      headSize: 82,
      eyebrowStr: "Email alerts",
      headlineStr: "Your island.|Your alerts.",
      subStr: "Pick what matters. Storm warnings are free, forever.",
      ctaStr: t > 5.5 ? "Set up alerts" : null,
      inStart: 0.1,
      outStart: 5.95,
    });
    if (t > 6.5) drawEndCard(ctx, t, 6.5, "Set up alerts", "Island by island.");
    frames.push(rawFrom(canvas));
  }
  return encode("03-alerts-setup", frames);
}

/** The closing card every reel lands on: dim the frame, then sign off. */
function drawEndCard(ctx, t, start, ctaStr, footStr) {
  const a = easeOut(at(t, start, start + 0.5));
  if (a <= 0) return;
  ctx.save();
  // dim the whole frame rather than punching a band across it
  ctx.fillStyle = `rgba(9,15,21,${0.93 * a})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  ctx.translate(0, (1 - a) * 26);

  drawMark(ctx, 84, 620, 84);
  ctx.font = "800 46px Brico800";
  ctx.fillStyle = T.textPrimary;
  ctx.fillText("Now", 188, 690);
  const nowW = ctx.measureText("Now").width;
  ctx.fillStyle = T.accent;
  ctx.fillText("Bey", 188 + nowW, 690);

  ctx.font = "800 112px Brico800";
  ctx.fillStyle = T.textPrimary;
  ctx.fillText("Know before", 80, 890);
  ctx.fillStyle = T.accent;
  ctx.fillText("you go.", 80, 1010);

  ctx.font = "400 34px Inter400";
  ctx.fillStyle = T.textSecondary;
  ctx.fillText(footStr, 84, 1076);

  ctx.font = "700 32px Inter700";
  const cw = ctx.measureText(ctaStr).width + 88;
  ctx.fillStyle = T.accent;
  roundRect(ctx, 84, 1124, cw, 88, 44);
  ctx.fill();
  ctx.fillStyle = T.textOnAccent;
  ctx.fillText(ctaStr, 84 + 44, 1180);

  ctx.font = "400 24px Inter400";
  ctx.fillStyle = T.textTertiary;
  ctx.fillText("Free to look. No account needed.", 84, 1268);
  ctx.restore();
}

/** Copy a Skia canvas into a raw RGBA buffer for ffmpeg. */
function rawFrom(canvas) {
  const { data } = canvas.getContext("2d").getImageData(0, 0, W, H);
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}
