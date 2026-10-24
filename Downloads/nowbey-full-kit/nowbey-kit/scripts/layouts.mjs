/**
 * NOWBEY MARKETING — LAYOUT TEMPLATES
 * ---------------------------------------------------------------------------
 * Three composures, each drawn from the product's own landing page:
 *
 *  split   — type column on the canvas, photograph as a full-height panel.
 *            (landing hero: copy left, phone right)
 *  poster  — photograph across the top, type beneath it on the grid.
 *            (landing feature sections: numbered rows, mock above/below)
 *  device  — no photograph: a device frame on the ambient room, with the app
 *            at full size and floating UI callouts. The phone bleeds off the
 *            bottom edge, so the app reads as a window, not a sticker.
 *
 * Every block is measured before it is placed (postkit returns heights), and
 * blocks are stacked with explicit gaps — no baseline arithmetic by hand, so a
 * headline that wraps to three lines pushes the CTA down instead of colliding
 * with it.
 */

import { bg, eyebrow as eyebrowArt, EYEBROW_H, headline, sub, brandLock, footnote, cta, ticks, T, text, rr, circle, measure, hexA, mark, wordmark } from "./postkit.mjs";
import { embed } from "./photos.mjs";

/* ------------------------------------------------------------- device art */

/**
 * A phone frame with the app inside: bezel, rounded corners, dynamic island,
 * side buttons, drop shadow, glass sheen. `aspect` is the app screen's own
 * width/height, so the frame always matches the UI it holds.
 */
export function device(screenPng, x, y, w, aspect = 390 / 744, o = {}) {
  const bezel = o.bezel ?? Math.max(6, Math.round(w * 0.026));
  const r = o.radius ?? Math.round(w * 0.12);
  const inner = r - bezel;
  const iw = w - bezel * 2;
  const ih = iw / aspect;
  const h = ih + bezel * 2;
  const id = `dev${Math.round(x)}${Math.round(y)}${Math.round(w)}`;
  return {
    w,
    h,
    svg: `<defs>
      <clipPath id="${id}-screen"><rect x="${x + bezel}" y="${y + bezel}" width="${iw}" height="${ih}" rx="${inner}"/></clipPath>
      <filter id="${id}-shadow" x="-40%" y="-20%" width="180%" height="150%">
        <feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#02070b" flood-opacity="0.7"/>
      </filter>
      <linearGradient id="${id}-bezel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#33485a"/>
        <stop offset="0.4" stop-color="#0e1a23"/>
        <stop offset="1" stop-color="#2a3d4d"/>
      </linearGradient>
      <linearGradient id="${id}-sheen" x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.11"/>
        <stop offset="0.3" stop-color="#ffffff" stop-opacity="0.02"/>
        <stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <g filter="url(#${id}-shadow)">${rr(x, y, w, h, r, `url(#${id}-bezel)`)}</g>
    ${rr(x + 1.5, y + 1.5, w - 3, h - 3, r - 1.5, "none", { stroke: "rgba(200,232,232,0.26)", strokeWidth: 1.5 })}
    <g clip-path="url(#${id}-screen)">
      <image href="data:image/png;base64,${screenPng.toString("base64")}" x="${x + bezel}" y="${y + bezel}" width="${iw}" height="${ih}" preserveAspectRatio="none"/>
      <rect x="${x + bezel}" y="${y + bezel}" width="${iw}" height="${ih}" fill="url(#${id}-sheen)"/>
    </g>
    ${rr(x + bezel, y + bezel, iw, ih, inner, "none", { stroke: "rgba(0,0,0,0.5)", strokeWidth: 2 })}
    ${rr(x + w / 2 - w * 0.086, y + bezel + w * 0.05, w * 0.172, w * 0.05, w * 0.025, "#05090c")}
    ${rr(x - 3, y + h * 0.18, 3, h * 0.05, 1.5, "#33485a")}
    ${rr(x - 3, y + h * 0.26, 3, h * 0.08, 1.5, "#33485a")}
    ${rr(x + w, y + h * 0.22, 3, h * 0.09, 1.5, "#33485a")}`,
  };
}

/** A floating callout card that overlaps the device, like the landing page's. */
export function callout(x, y, w, o = {}) {
  const { title, line, color = T.accent, icon = "check" } = o;
  const h = o.h ?? 84;
  const icons = {
    check: `<path d="M1 6.5 5.4 11 13 1.5"/>`,
    bell: `<path d="M3 8a5 5 0 1 1 10 0c0 3.4 1.4 4.2 1.4 4.2H1.6S3 11.4 3 8Zm3 6.4a2 2 0 0 0 4 0"/>`,
    pin: `<path d="M8 15s5-4.6 5-8A5 5 0 1 0 3 7c0 3.4 5 8 5 8Zm0-6.4a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z"/>`,
    up: `<path d="M8 14V2M3 6.5 8 1.5l5 5"/>`,
  };
  return {
    h,
    w,
    svg: `<g>
      ${rr(x, y, w, h, 22, "rgba(16,30,41,0.95)", { stroke: "rgba(148,206,202,0.22)" })}
      ${rr(x + 18, y + h / 2 - 22, 44, 44, 15, hexA(color, 0.16), { stroke: hexA(color, 0.45) })}
      <g transform="translate(${x + 32},${y + h / 2 - 9})" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">${icons[icon] ?? icons.check}</g>
      ${text(title, x + 78, y + h / 2 - 4, { family: T.font.sans, weight: 700, size: 24, fill: T.textPrimary })}
      ${text(line, x + 78, y + h / 2 + 23, { family: T.font.sans, weight: 400, size: 19, fill: T.textTertiary })}
    </g>`,
  };
}

function deviceGlow(x, y, w, h, id, color = "#22b8a4", strength = 0.55) {
  return `<defs><radialGradient id="${id}">
      <stop offset="0" stop-color="${color}" stop-opacity="${0.4 * strength}"/>
      <stop offset="0.55" stop-color="${color}" stop-opacity="${0.11 * strength}"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </radialGradient></defs>
    <ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w * 0.95}" ry="${h * 0.7}" fill="url(#${id})"/>`;
}

/* ---------------------------------------------------------------- stacking */

/** Draw a stack of measured blocks from a top origin. Returns { svg, height }. */
function stack(x, top, blocks, gap = 20) {
  let y = top;
  let svg = "";
  blocks.forEach((b, i) => {
    if (!b) return;
    svg += `<g transform="translate(${x},${y})">${b.svg}</g>`;
    y += b.height + (i === blocks.length - 1 ? 0 : gap);
  });
  return { svg, height: y - top, bottom: y };
}

const eyebrowBlock = (str, o = {}) => ({
  height: EYEBROW_H + (o.pad ?? 0),
  svg: eyebrowArt(str, o.dx ?? 0, 22, { size: o.size ?? 18, dot: o.dot }),
});

const ctaBlock = (str, o = {}) => {
  const c = cta(str, 0, 0, { h: o.h ?? 64, size: o.size ?? 25 });
  return { svg: c.svg, height: c.height, width: c.width };
};

/* ---------------------------------------------------------------- layouts */

/** TYPE COLUMN + PHOTO PANEL. */
export function splitLayout(W, H, p) {
  const { photoPng, eyebrowStr, headlineStr, subStr, ctaStr, footStr, panelW = Math.round(W * 0.56) } = p;
  const panelX = W - panelW;
  const pad = 72;
  const colW = panelX - pad - 48;

  let body = bg(W, H);
  body += embed(photoPng, panelW, H, panelX, 0);
  body += `<defs><linearGradient id="panelFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${T.bgBase}" stop-opacity="0.88"/>
      <stop offset="0.45" stop-color="${T.bgBase}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${T.bgBase}" stop-opacity="0"/>
    </linearGradient></defs>
    <rect x="${panelX}" y="0" width="${Math.round(panelW * 0.1)}" height="${H}" fill="url(#panelFade)"/>
    <rect x="${panelX}" y="0" width="1" height="${H}" fill="rgba(148,206,202,0.14)"/>`;

  const head = headline(headlineStr, 0, 0, colW, { size: p.headSize ?? 68, min: 38, maxLines: p.maxLines ?? 4 });
  const blocks = [
    eyebrowBlock(eyebrowStr, { size: 17 }),
    { ...head },
    subStr ? sub(subStr, 0, 0, colW - 6, { size: 25 }) : null,
    ctaStr ? ctaBlock(ctaStr, { h: 62, size: 24 }) : null,
  ];
  const total = blocks.reduce((a, b) => a + (b ? b.height : 0), 0) + 26 * (blocks.filter(Boolean).length - 1);
  const top = Math.max(180, (H - total) / 2 + 18);

  body += brandLock(pad, 112, { markSize: 50, wordmarkSize: 30 });
  body += stack(pad, top, blocks, 26).svg;
  if (footStr) {
    body += circle(pad + 5, H - 74, 4, T.accent);
    body += text(footStr, pad + 20, H - 66, { family: T.font.sans, weight: 500, size: 19, fill: T.textSecondary });
  }
  return body;
}

/** PHOTOGRAPH IN A TOP PANEL, TYPE BENEATH. */
export function posterLayout(W, H, p) {
  const { photoPng, eyebrowStr, headlineStr, subStr, ctaStr, footStr } = p;
  const pad = 72;
  const colW = W - pad * 2;

  // Measure the type block BEFORE drawing, so the photo panel can give up the
  // exact number of pixels the copy needs. Without this the sub-headline runs
  // underneath the CTA pill whenever the copy wraps to two lines.
  const head = headline(headlineStr, 0, 0, colW - (ctaStr ? 40 : 0), { size: p.headSize ?? 70, min: 42, maxLines: p.maxLines ?? 3 });
  const subArt = subStr ? sub(subStr, 0, 0, colW - 20, { size: 25 }) : null;
  const blockH = 22 + EYEBROW_H + 14 + head.height + 18 + (subArt ? subArt.height : 0);

  let photoH = p.photoH ?? Math.round(H * 0.62);
  let ctaBelow = false;
  if (ctaStr) {
    const roomForPhoto = H - 192 - blockH; // 192 = CTA row (62) + its clearance
    if (roomForPhoto >= Math.round(H * 0.46)) photoH = Math.min(photoH, roomForPhoto);
    else {
      // Not enough room for the pill on the CTA row - drop it under the sub.
      ctaBelow = true;
      photoH = Math.max(240, Math.min(photoH, H - pad - blockH - 96));
    }
  }

  let body = bg(W, H);
  body += embed(photoPng, W, photoH, 0, 0);
  body += `<defs><linearGradient id="topScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${T.bgBase}" stop-opacity="0.72"/>
      <stop offset="1" stop-color="${T.bgBase}" stop-opacity="0"/>
    </linearGradient></defs>
    <rect x="0" y="0" width="${W}" height="200" fill="url(#topScrim)"/>
    <defs><linearGradient id="posterFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${T.bgBase}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${T.bgBase}" stop-opacity="0.3"/>
      <stop offset="1" stop-color="${T.bgBase}" stop-opacity="0.98"/>
    </linearGradient></defs>
    <rect x="0" y="${photoH - 280}" width="${W}" height="280" fill="url(#posterFade)"/>`;
  body += brandLock(pad, 112, { markSize: 50, wordmarkSize: 30 });
  body += ticks(W, H, 40, 22);

  let y = photoH + 22;
  body += eyebrowArt(eyebrowStr, pad + 6, y + 22, { size: 17 });
  y += EYEBROW_H + 14;
  body += `<g transform="translate(${pad},${y})">${head.svg}</g>`;
  y += head.height + 18;
  if (subArt) {
    body += `<g transform="translate(${pad},${y})">${subArt.svg}</g>`;
    y += subArt.height;
  }
  if (ctaStr) {
    const cw = measure(ctaStr, T.font.sans, 700, 24) + 64;
    const c = ctaBelow
      ? cta(ctaStr, pad, y + 30, { h: 62, size: 24 })
      : cta(ctaStr, W - pad - cw, H - 168, { h: 62, size: 24 });
    body += c.svg;
  }
  if (footStr) {
    const tw = measure(footStr, T.font.sans, 500, 19);
    const chipW = tw + 54;
    body += rr(W - pad - chipW, 78, chipW, 44, 22, "rgba(10,20,28,0.82)", { stroke: "rgba(148,206,202,0.2)" });
    body += circle(W - pad - chipW + 22, 100, 4.5, T.accent);
    body += text(footStr, W - pad - 24, 106, { family: T.font.sans, weight: 500, size: 19, fill: T.textSecondary, anchor: "end" });
  }
  return body;
}

/**
 * DEVICE ON THE AMBIENT ROOM — the app itself is the hero.
 * The phone is sized from its own screen aspect and bleeds off the bottom
 * edge by `bleed` px, so the frame never floats mid-canvas. Callouts anchor to
 * the phone's own geometry: `{ at: "left" | "right", dy, ... }`.
 */
export function deviceLayout(W, H, p) {
  const {
    screenPng,
    aspect = 390 / 744,
    eyebrowStr,
    headlineStr,
    subStr,
    footStr,
    deviceW = Math.round(W * 0.5),
    callouts = [],
    headSize = 58,
    maxLines = 2,
    bleed = 96,
    glow = 0.6,
  } = p;
  const pad = 72;

  let body = bg(W, H);
  body += brandLock(pad, 112, { markSize: 50, wordmarkSize: 30 });
  body += ticks(W, H, 40, 22);

  const head = headline(headlineStr, 0, 0, W - pad * 2 - 40, { size: headSize, min: 40, maxLines });
  const subBlock = subStr ? sub(subStr, 0, 0, W - pad * 2 - 40, { size: 25 }) : null;
  let y = 236;
  body += eyebrowArt(eyebrowStr, pad + 6, y + 22, { size: 17 });
  y += EYEBROW_H + 14;
  body += `<g transform="translate(${pad},${y})">${head.svg}</g>`;
  y += head.height + 16;
  if (subBlock) {
    body += `<g transform="translate(${pad},${y})">${subBlock.svg}</g>`;
    y += subBlock.height;
  }

  const dev = device(screenPng, 0, 0, deviceW, aspect);
  const dx = (W - deviceW) / 2;
  const dy = y + 44;

  body += deviceGlow(dx, dy, deviceW, dev.h, "dglow", "#22b8a4", glow);
  body += `<g transform="translate(${dx},${dy})">${dev.svg}</g>`;
  for (const c of callouts) {
    const cw = c.w ?? 320;
    const cx = c.at === "right" ? Math.min(W - 40 - cw, dx + deviceW - 46) : Math.max(40, dx - cw + 46);
    body += callout(cx, dy + (c.dy ?? 320), cw, c).svg;
  }
  // the bleed: fade the bottom of the phone into the canvas
  body += `<defs><linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${T.bgBase}" stop-opacity="0"/>
      <stop offset="1" stop-color="${T.bgBase}" stop-opacity="1"/>
    </linearGradient></defs>
    <rect x="0" y="${H - bleed - 40}" width="${W}" height="${bleed + 40}" fill="url(#depth)"/>`;
  // the footnote sits under the wordmark, never over the app
  if (footStr) {
    body += circle(W - pad - measure(footStr, T.font.sans, 400, 19) - 16, 104, 4, T.accent);
    body += text(footStr, W - pad, 112, { family: T.font.sans, weight: 400, size: 19, fill: T.textTertiary, anchor: "end" });
  }
  return body;
}

export { bg, headline, sub, brandLock, footnote, cta, ticks, T, text, rr, circle, measure, hexA, mark, wordmark, embed, eyebrowArt as eyebrow };
