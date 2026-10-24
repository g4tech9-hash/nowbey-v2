/**
 * NOWBEY MARKETING — PHOTO PIPELINE
 * ---------------------------------------------------------------------------
 * Turns a photograph + an app-screen vector into the base image for a post:
 * the screen is composited into the phone's glass at the measured quad, then
 * the photograph is cover-fitted into the post canvas at the focal point the
 * layout wants.
 *
 * The result is a PNG buffer, embedded into the layout SVG as a data URI, so a
 * post is still one self-contained vector document until it is rasterised.
 */

import { createCanvas, loadImage } from "./canvas.mjs";
import { compositeScreen, quadBox } from "./composite.mjs";
import { QUADS } from "./geometry.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const photoPath = (name) => join(ROOT, "src", name);

/** Aspect the screen should be rendered at for a given phone photo. */
export function screenAspect(name) {
  return quadBox(QUADS[name].quad).aspect;
}

/**
 * Composite `screenPng` into `photoName`, then cover-fit into W×H.
 * @param {object} p
 * @param {string} p.photo    file name in marketing/src
 * @param {Buffer} p.screen   rendered app screen PNG
 * @param {number} p.W        output width
 * @param {number} p.H        output height
 * @param {number} [p.focalY] 0..1 vertical focal point of the crop (0.5 = centre)
 * @param {number} [p.focalX]
 * @param {number} [p.scale=1] extra zoom into the photo before fitting
 * @param {boolean} [p.flip]  mirror the photo (composition variety)
 */
export async function photoLayer({ photo, screen, W, H, focalY = 0.5, focalX = 0.5, scale = 1, flip = false, rect }) {
  // The output canvas is W×H when given; otherwise it is exactly the rect.
  const R = rect ?? { x: 0, y: 0, w: W, h: H };
  const CW = Math.round(W ?? R.x + R.w);
  const CH = Math.round(H ?? R.y + R.h);
  const geo = QUADS[photo];
  const composed = await compositeScreen({
    photo: photoPath(photo),
    screen,
    quad: geo.quad,
    radius: geo.radius,
    reflection: geo.reflection,
    brightness: geo.brightness,
    glow: geo.glow,
    res: geo.res ?? 3,
  });

  const out = createCanvas(CW, CH);
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#0c151d";
  ctx.fillRect(0, 0, CW, CH);

  const pw = composed.width;
  const ph = composed.height;
  const s = Math.max(R.w / pw, R.h / ph) * scale;
  const dw = pw * s;
  const dh = ph * s;
  const dx = R.x + (R.w - dw) * focalX;
  const dy = R.y + (R.h - dh) * focalY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(R.x, R.y, R.w, R.h);
  ctx.clip();
  if (flip) {
    ctx.translate(R.x * 2 + R.w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(composed, dx, dy, dw, dh);
  } else {
    ctx.drawImage(composed, dx, dy, dw, dh);
  }
  ctx.restore();
  return out.toBuffer("image/png");
}

/** Plain cover-fit of a photograph (no screen composited). */
export async function plainPhoto({ photo, W, H, focalY = 0.5, focalX = 0.5, scale = 1 }) {
  const img = await loadImage(photoPath(photo));
  const out = createCanvas(W, H);
  const ctx = out.getContext("2d");
  const s = Math.max(W / img.width, H / img.height) * scale;
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (W - dw) * focalX, (H - dh) * focalY, dw, dh);
  return out.toBuffer("image/png");
}

/**
 * Embed a PNG buffer as an SVG image element at an exact rect.
 * Every caller passes the real rect: stretching a layer to the canvas is how
 * mockups end up with squashed type, so this signature makes that a choice.
 */
export function embed(buf, W, H, X = 0, Y = 0) {
  return `<image href="data:image/png;base64,${buf.toString("base64")}" x="${X}" y="${Y}" width="${W}" height="${H}" preserveAspectRatio="none"/>`;
}

/**
 * Cover-fit focal point that lands the phone exactly where the layout wants it.
 * Returns { focalX, focalY } for photoLayer.
 */
export function fitToPhone(photo, W, H, targetX, targetY, scale = 1.25) {
  const geo = QUADS[photo];
  const [tl, tr, br, bl] = geo.quad;
  const cx = (tl[0] + tr[0] + br[0] + bl[0]) / 4;
  const cy = (tl[1] + tr[1] + br[1] + bl[1]) / 4;
  const img = PHOTO_SIZES[photo];
  const s = Math.max(W / img[0], H / img[1]) * scale;
  const dw = img[0] * s;
  const dh = img[1] * s;
  const dx = (W - dw) * 0.5;
  const dy = (H - dh) * 0.5;
  const focalX = dw === W ? 0.5 : (targetX - cx * s) / (W - dw);
  const focalY = dh === H ? 0.5 : (targetY - cy * s) / (H - dh);
  return { focalX: clamp01(focalX), focalY: clamp01(focalY), scale };
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Source photograph dimensions (so focal maths needs no async read). */
export const PHOTO_SIZES = {
  "photo-map-square.png": [1024, 1024],
  "photo-closeup-square.png": [1024, 1024],
  "photo-story-vertical.png": [768, 1376],
  "photo-laptop.png": [1376, 768],
  "photo-story-a.png": [768, 1376],
  "photo-story-b.png": [768, 1376],
};

/**
 * Focal point + zoom that puts the phone exactly where a layout wants it.
 * @param {string} photo
 * @param {{x:number,y:number,w:number,h:number}} rect  where the photo is drawn
 * @param {number} tx  phone centre, as a fraction of the rect (0..1)
 * @param {number} ty
 * @param {number} sizeFactor phone height as a fraction of the rect height
 */
export function placeInRect(photo, rect, tx, ty, sizeFactor) {
  const [tl, tr, br, bl] = QUADS[photo].quad;
  const cx = (tl[0] + tr[0] + br[0] + bl[0]) / 4;
  const cy = (tl[1] + tr[1] + br[1] + bl[1]) / 4;
  const qh = (Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) + Math.hypot(br[0] - tr[0], br[1] - tr[1])) / 2;
  const [pw, ph] = PHOTO_SIZES[photo];
  const cover = Math.max(rect.w / pw, rect.h / ph);
  const want = (sizeFactor * rect.h) / qh; // desired composed scale
  const scale = want / cover;
  const dw = pw * cover * scale;
  const dh = ph * cover * scale;
  const focalX = dw === rect.w ? 0.5 : (rect.w * tx - cx * want) / (rect.w - dw);
  const focalY = dh === rect.h ? 0.5 : (rect.h * ty - cy * want) / (rect.h - dh);
  return { focalX: clamp01(focalX), focalY: clamp01(focalY), scale };
}
