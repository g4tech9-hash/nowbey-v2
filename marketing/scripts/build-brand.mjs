/**
 * NOWBEY — BRAND PRESENCE
 * ---------------------------------------------------------------------------
 * The two assets a social profile needs before anything else:
 *
 *   out/brand/pfp-1080.png        profile photo, 1:1, safe inside a circle
 *   out/brand/cover-1920x1080.png cover, 16:9, avatar-safe bottom-left
 *   out/brand/cover-1500x500.png  X / LinkedIn header, 3:1
 *   out/brand/pfp-dark-1080.png   alternate emblem, for light UI or print
 *
 * Everything is drawn from the same tokens, typefaces and map geometry as the
 * posts and reels, so the profile cannot drift from the campaign. The mark is
 * rebuilt as SOLID geometry rather than the app's 2px outline: at 32–48px, a
 * hairline outline turns to mush, while a filled pin on a filled disc stays
 * legible.
 *
 *   node scripts/build-brand.mjs
 */

import { svgDoc, render, FONT_DIR } from "./lib.mjs";
import { bg, headline, sub, cta, ticks, T, text, rr, circle, measure, mark, wordmark, wordmarkWidth, footnote } from "./postkit.mjs";
import { mapView, pin, hexA } from "./ui.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { createCanvas, loadImage } from "./canvas.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out", "brand");

function save(name, svg, width) {
  mkdirSync(OUT, { recursive: true });
  const png = render(svg, width);
  writeFileSync(join(OUT, name), png);
  console.log(`  → brand/${name}  ${Math.round(png.length / 1024)} KB`);
}

/* ------------------------------------------------------------ the emblem */

/**
 * Solid version of the NowBey mark, drawn in the same 40-unit coordinate space
 * as `mark()` so the silhouette is identical: rounded tile, pin, wave, core.
 * Here the tile becomes a disc (so any circular crop is intentional) and the
 * pin is filled instead of stroked.
 */
function emblemDisc({ size, teal = true }) {
  const disc = teal ? T.accent : T.bgElevated;
  const ink = teal ? "#04211d" : T.accent;
  const core = teal ? "#04211d" : T.warning;
  const c = size / 2;
  const r = size * 0.435; // leaves a margin so a tight circle crop still rings it
  const k = size * 0.01952 * 40 ** 0; // glyph unit → px, set below
  const scale = (r * 1.46) / 40; // 40-unit box → 63% of disc diameter-ish
  return `<g>
    <defs>
      <radialGradient id="disc" cx="0.34" cy="0.24" r="0.9">
        <stop offset="0" stop-color="${teal ? "#62e4d2" : "#22323f"}"/>
        <stop offset="0.62" stop-color="${disc}"/>
        <stop offset="1" stop-color="${teal ? "#2bb9a6" : "#141f2a"}"/>
      </radialGradient>
      <radialGradient id="sheen" cx="0.3" cy="0.22" r="0.6">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${c}" cy="${c}" r="${r}" fill="url(#disc)"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="url(#sheen)"/>
    <circle cx="${c}" cy="${c}" r="${r - size * 0.012}" fill="none"
      stroke="${teal ? "rgba(4,33,29,0.10)" : "rgba(63,214,192,0.16)"}" stroke-width="${size * 0.006}"/>
    <g transform="translate(${c},${c}) scale(${scale}) translate(-20,-19)">
      <!-- pin, filled: shorter than the app's outline version so the tip clears
           the wave instead of merging into it at small sizes -->
      <path d="M20 7.2c-4.3 0-7.8 3.4-7.8 7.6 0 5.5 7.8 12.6 7.8 12.6s7.8-7.1 7.8-12.6c0-4.2-3.5-7.6-7.8-7.6Z" fill="${ink}"/>
      <!-- knockout core, so the mark still reads as a located point -->
      <circle cx="20" cy="14.8" r="3" fill="${teal ? "#3fd6c0" : T.bgElevated}"/>
      <!-- the wave: community, coast, signal -->
      <path d="M7 33.4c3.7-3.5 6.4 2.3 10.2 0 3.8-2.3 5.7 2.7 9.8 0"
        stroke="${ink}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.88"/>
    </g>
  </g>`;
}

function pfp(size = 1080, { teal = true, bleed = false } = {}) {
  // A very restrained backdrop: the emblem does the work. `bleed` fills the
  // frame with the emblem instead of floating it, for hosts that crop hard.
  const body = bleed
    ? `${emblemDisc({ size: size * 1.06, teal })}`
    : `${emblemDisc({ size, teal })}`;
  return svgDoc(size, size, `<rect width="${size}" height="${size}" fill="${teal ? T.bgBase : T.bgRaised}"/>${body}`);
}

/* ------------------------------------------------------------- the cover */

/**
 * @param {number} W
 * @param {number} H
 * @param {{compact?: boolean}} o  compact = the 3:1 header, which has no room
 *                                 for a second column of type
 */
function cover(W, H, { compact = false } = {}) {
  const pad = compact ? 64 : 120;
  const mapX = compact ? W * 0.53 : W * 0.526;
  const mapY = compact ? H * 0.075 : H * 0.14;
  const mapW = compact ? W * 0.41 : W * 0.412;
  const mapH = compact ? H * 0.85 : H * 0.74;

  let body = bg(W, H, { hue: "a" });

  // ── local island light: a warm sunrise low on the right, teal water above it
  body += `<defs>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffb37a" stop-opacity="0.30"/>
      <stop offset="0.45" stop-color="#f8a86b" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#f8a86b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sea" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#35d6e6" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#35d6e6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${W * 0.83}" cy="${H * 1.02}" rx="${W * 0.34}" ry="${H * 0.42}" fill="url(#sun)"/>
  <ellipse cx="${W * 0.62}" cy="${H * 0.06}" rx="${W * 0.3}" ry="${H * 0.3}" fill="url(#sea)"/>`;

  body += ticks(W, H, compact ? 26 : 38, compact ? 20 : 28);

  /* ── left column: brand, promise, one action ─────────────────────────── */
  const lockY = compact ? 88 : 132;
  body += `<g transform="translate(${pad},${lockY})">
    ${mark(0, -46, compact ? 46 : 58, { tile: "rgba(12,21,29,0.55)" })}
    ${wordmark(compact ? 62 : 78, 0, compact ? 28 : 34)}
  </g>`;

  const eyebrowY = compact ? 150 : 214;
  body += `<g>
    ${circle(pad + 6, eyebrowY - 6, 4.5, T.accent)}
    ${text("COMMUNITY SAFETY MAP · THE BAHAMAS", pad + 22, eyebrowY, {
      family: T.font.mono, weight: 700, size: compact ? 13 : 16, fill: T.textSecondary, tracking: 0.16,
    })}
  </g>`;

  const headY = compact ? 186 : 262;
  // Two explicit lines rather than an auto-wrap: the break is a design decision
  // ("Know before / you go."), and auto-wrap kept pulling "you" up to line 1.
  const headSize = compact ? 50 : 88;
  const lh = headSize * 1.02;
  const line1 = "Know before";
  const line2 = "you go.";
  body += `<g transform="translate(${pad},${headY + headSize * 0.79})">
    ${text(line1, 0, 0, { family: T.font.display, weight: 800, size: headSize, fill: T.textPrimary, tracking: -0.035 })}
    ${text(line2, 0, lh, { family: T.font.display, weight: 800, size: headSize, fill: T.accent, tracking: -0.035 })}
  </g>`;
  const headHeight = headSize * 0.79 + lh + headSize * 0.24;
  const subY = headY + headHeight + (compact ? 18 : 20);
  const subArt = sub(
    compact
      ? "Neighbour reports on one clear map."
      : "Neighbour reports, roadside hazards and local news on one clear map. Free to look — no account needed.",
    0, 0, compact ? W * 0.32 : W * 0.34, { size: compact ? 19 : 24 },
  );
  body += `<g transform="translate(${pad},${subY})">${subArt.svg}</g>`;

  const ctaY = subY + subArt.height + (compact ? 14 : 34);
  const c = cta("nowbey.com", pad, ctaY, { h: compact ? 48 : 60, size: compact ? 19 : 23 });
  body += c.svg;

  if (!compact) {
    // Under the action, never in the canvas floor: the bottom-left corner has to
    // stay clear for the avatar overlay on Facebook and LinkedIn.
    body += `<g>
      ${circle(pad + 5, ctaY + c.height + 44, 4.5, T.accent)}
      ${text("Live for New Providence. Other islands soon.", pad + 22, ctaY + c.height + 51, {
        family: T.font.sans, weight: 400, size: 19, fill: T.textTertiary,
      })}
    </g>`;
  }

  /* ── right column: the map, as the hero proof ────────────────────────── */
  body += `<g>
    ${rr(mapX - 14, mapY - 14, mapW + 28, mapH + 28, compact ? 22 : 30, "rgba(10,20,28,0.78)", { stroke: "rgba(148,206,202,0.20)" })}
    ${mapView(mapX, mapY, mapW, mapH, {
      id: "coverMap",
      zoom: 1.06,
      pinScale: compact ? 1.25 : 1.65,
      labelSize: compact ? 9 : 12,
    })}
  </g>`;

  // live pill, top-left of the map panel
  const pillW = compact ? 108 : 132;
  const pillH = compact ? 30 : 38;
  body += `<g>
    ${rr(mapX + 16, mapY + 16, pillW, pillH, pillH / 2, "rgba(8,20,28,0.92)", { stroke: hexA(T.danger, 0.55) })}
    ${circle(mapX + 16 + (compact ? 18 : 22), mapY + 16 + pillH / 2, compact ? 4 : 5, T.danger)}
    ${text("LIVE MAP", mapX + 16 + (compact ? 30 : 38), mapY + 16 + pillH / 2 + (compact ? 4 : 5), {
      family: T.font.mono, weight: 700, size: compact ? 9 : 12, fill: T.textPrimary, tracking: 0.14,
    })}
  </g>`;

  // the confirmation beat, overlapping the panel's lower-left edge
  if (!compact) {
    const cw = 470;
    const ch = 104;
    const cx = mapX - 96;
    const cy = mapY + mapH - 168;
    body += `<g>
      ${rr(cx, cy, cw, ch, 22, "rgba(12,26,36,0.96)", { stroke: hexA(T.accent, 0.3) })}
      ${rr(cx + 20, cy + 24, 56, 56, 18, hexA(T.accent, 0.15), { stroke: hexA(T.accent, 0.42) })}
      <g transform="translate(${cx + 34},${cy + 38})" stroke="${T.accent}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M2 12 11 21 25 3"/>
      </g>
      ${text("A neighbour confirmed", cx + 94, cy + 46, { family: T.font.sans, weight: 700, size: 25, fill: T.textPrimary })}
      ${text("Bay Street flooding · 4 confirmations · just now", cx + 94, cy + 76, { family: T.font.sans, weight: 400, size: 19, fill: T.textTertiary })}
    </g>`;
  }

  // category legend under the panel — the colour language, named once
  if (!compact) {
    const items = [
      ["Flooding", T.cat.flooding],
      ["Power", T.cat.power],
      ["Road", T.cat.road],
      ["Water", T.cat.water],
    ];
    let lx = mapX;
    const ly = mapY + mapH + 52;
    body += `<g>${items
      .map(([label, colour]) => {
        const w = measure(label, T.font.sans, 600, 18) + 46;
        const out = `${rr(lx, ly - 24, w, 40, 20, "rgba(12,21,29,0.6)", { stroke: T.borderSubtle })}
          ${circle(lx + 20, ly - 4, 5, colour)}
          ${text(label, lx + 32, ly + 2, { family: T.font.sans, weight: 600, size: 18, fill: T.textSecondary })}`;
        lx += w + 12;
        return out;
      })
      .join("")}</g>`;
  }

  return svgDoc(W, H, body);
}

/* ------------------------------------------------------------- proof sheet */

/**
 * How the pair actually appears: Facebook's cover layout puts the avatar over
 * the lower-left of the banner, which is exactly the corner this design keeps
 * empty. This sheet proves the safe zone and shows the emblem at real sizes.
 */
async function preview() {
  const W = 1400;
  const H = 1040;
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0a1219";
  ctx.fillRect(0, 0, W, H);

  const cover = await loadImage(join(OUT, "cover-1920x1080.png"));
  const wide = await loadImage(join(OUT, "cover-1500x500.png"));
  const pfp = await loadImage(join(OUT, "pfp-1080.png"));
  const dark = await loadImage(join(OUT, "pfp-dark-1080.png"));

  const label = (str, x, y, fill, font) => {
    ctx.fillStyle = fill;
    ctx.font = font;
    ctx.fillText(str, x, y);
  };

  /* 1 — 16:9 banner as a Facebook Page header */
  const bw = 760;
  const bh = bw * (1080 / 1920);
  const bx = 60;
  const by = 60;
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  ctx.fillRect(bx, by, bw, bh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, by, bw, bh);
  ctx.clip();
  ctx.drawImage(cover, bx, by, bw, bh);
  ctx.restore();

  const as = 132;
  const ax = bx + 30;
  const ay = by + bh - as * 0.58;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax + as / 2, ay + as / 2, as / 2 + 5, 0, Math.PI * 2);
  ctx.fillStyle = "#0a1219";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ax + as / 2, ay + as / 2, as / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(pfp, ax, ay, as, as);
  ctx.restore();

  ctx.strokeStyle = "rgba(175,232,95,0.45)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx, by, bw, bh);
  label("FACEBOOK · 16:9", bx, by - 14, "rgba(63,214,192,0.95)", "700 14px JBMono700, JetBrains Mono");

  /* 2 — 3:1 header as an X / LinkedIn banner */
  const ww = 470;
  const wh = ww * (500 / 1500);
  const wx = 870;
  const wy = 60;
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  ctx.fillRect(wx, wy, ww, wh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(wx, wy, ww, wh);
  ctx.clip();
  ctx.drawImage(wide, wx, wy, ww, wh);
  ctx.restore();
  const xs = 84;
  const xax = wx + 22;
  const xay = wy + wh - xs * 0.6;
  ctx.save();
  ctx.beginPath();
  ctx.arc(xax + xs / 2, xay + xs / 2, xs / 2 + 4, 0, Math.PI * 2);
  ctx.fillStyle = "#0a1219";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(xax + xs / 2, xay + xs / 2, xs / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(pfp, xax, xay, xs, xs);
  ctx.restore();
  ctx.strokeStyle = "rgba(175,232,95,0.45)";
  ctx.strokeRect(wx, wy, ww, wh);
  label("X / LINKEDIN · 3:1", wx, wy - 14, "rgba(63,214,192,0.95)", "700 14px JBMono700, JetBrains Mono");

  label("the avatar lands here, and", wx, wy + wh + 42, "rgba(175,232,95,0.95)", "700 17px Inter700, Inter");
  label("there is nothing behind it", wx, wy + wh + 66, "rgba(185,200,201,0.85)", "400 16px Inter400, Inter");

  /* 3 — the emblem at real sizes */
  label("PFP AT REAL SIZE  ·  CIRCLE CROP (IG / FB)  ·  SQUARE CROP (X)", bx, 552, "rgba(63,214,192,0.95)", "700 14px JBMono700, JetBrains Mono");

  const sizes = [112, 72, 48, 32];
  const circleMidY = 638;
  const squareTop = 760;
  let x = bx;
  for (const img of [pfp, dark]) {
    for (const size of sizes) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + 56, circleMidY, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x + 56 - size / 2, circleMidY - size / 2, size, size);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, squareTop, size, size);
      ctx.clip();
      ctx.drawImage(img, x, squareTop, size, size);
      ctx.restore();
      x += 128;
    }
    x += 34;
  }

  label("Legible to 32px: the pin, its knockout core and the wave all survive the crop.", bx, 940, "rgba(154,175,179,0.9)", "400 17px Inter400, Inter");
  label("Same emblem, disc on teal (default) and disc on slate (for light feeds and print).", bx, 972, "rgba(154,175,179,0.7)", "400 16px Inter400, Inter");

  writeFileSync(join(OUT, "preview.png"), await c.encode("png"));
  console.log("  → brand/preview.png");
}

/* ------------------------------------------------------------------- run */

console.log("Brand assets");
save("pfp-1080.png", pfp(1080, { teal: true }), 1080);
save("pfp-dark-1080.png", pfp(1080, { teal: false }), 1080);
save("cover-1920x1080.png", cover(1920, 1080), 1920);
save("cover-1500x500.png", cover(1500, 500, { compact: true }), 1500);
await preview();
