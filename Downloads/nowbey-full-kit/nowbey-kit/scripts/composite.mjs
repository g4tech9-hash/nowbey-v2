/**
 * NOWBEY MARKETING — PHOTO COMPOSITOR
 * ---------------------------------------------------------------------------
 * Puts a rendered app screen inside the screen of a real phone in a real
 * photograph — properly, which means:
 *
 *   · an exact perspective mapping onto four measured corners (so a phone held
 *     at a slight angle gets a screen that matches, not a pasted rectangle);
 *   · a rounded-rect mask with 1px anti-aliased edge — a hard rectangle over a
 *     rounded screen is the single most obvious tell of a fake mockup;
 *   · a diagonal glass sheen and a slight brightness lift, so the UI reads as
 *     emissive light under glass rather than a flat image on the photo;
 *   · per-pixel inverse mapping, so nothing is resampled twice;
 *   · an OCCLUSION pass: fingers that wrap over the phone's glass are detected
 *     in the photograph and painted back on top of the screen. Without it the
 *     screen covers the thumb and the phone reads as floating in the hand.
 *
 * Callers render their screen at the quad's own aspect ratio (see
 * `quadBox`), which removes any cropping or stretching of the UI.
 */

import { createCanvas, loadImage } from "./canvas.mjs";

/* ------------------------------------------------------------- geometry */

/** Width/height/aspect of a quad, measured on the photo plane. */
export function quadBox(quad) {
  const [tl, tr, br, bl] = quad;
  const wTop = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]);
  const wBot = Math.hypot(br[0] - bl[0], br[1] - bl[1]);
  const hL = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
  const hR = Math.hypot(br[0] - tr[0], br[1] - tr[1]);
  const w = (wTop + wBot) / 2;
  const h = (hL + hR) / 2;
  return { w, h, aspect: w / h, rotation: Math.atan2(tr[1] - tl[1], tr[0] - tl[0]) };
}

/** Perspective transform mapping the unit square to `quad` (8 coefficients). */
function unitToQuad(quad) {
  const src = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = quad[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  return solve(A, b).concat(1);
}

function solve(A, b) {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col] || 1e-9;
    for (let c = col; c <= n; c++) M[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (!f) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C || 1e-9;
  return [
    A / det,
    -(b * i - c * h) / det,
    (b * f - c * e) / det,
    B / det,
    (a * i - c * g) / det,
    -(a * f - c * d) / det,
    C / det,
    -(a * h - b * g) / det,
    (a * e - b * d) / det,
  ];
}

/* ----------------------------------------------------------- compositing */

/**
 * @param {object} p
 * @param {Buffer|string} p.photo      photograph (path or buffer)
 * @param {Buffer|string} p.screen     rendered app screen, any resolution
 * @param {number[][]} p.quad          TL, TR, BR, BL in photo pixels
 * @param {number} [p.radius]          screen corner radius, in quad px
 * @param {number} [p.reflection]      0..0.4 glass sheen
 * @param {number} [p.brightness]      emissive lift, 0.8..1.15
 * @param {number} [p.glow]            accent bloom around the phone, 0..1
 * @param {number[]} [p.glowPoint]     where the bloom centres (photo px)
 * @returns {Promise<import('@napi-rs/canvas').Canvas>}
 */
export async function compositeScreen({
  photo,
  screen,
  quad,
  radius = 16,
  reflection = 0.18,
  brightness = 1,
  glow = 0,
  glowPoint,
  res = 1,
  // Anything in front of the glass (a thumb wrapping the edge, a strap) is
  // brighter than the black phone face. Luminance above `lo` starts to
  // survive, above `hi` it is fully preserved. Pass false to disable.
  occlude = { lo: 46, hi: 86 },
  // Pull the screen in from the measured phone face by `inset` photo pixels,
  // so the phone's own black bezel/frame stays visible around the app. A screen
  // that reaches the outer edge of a phone reads as a pasted rectangle.
  inset = 0,
}) {
  const photoImg = await loadImage(photo);
  const screenImg = await loadImage(screen);
  // Composite at `res`× the photo's own pixels. The phone screen in a
  // photograph is only a few hundred pixels wide; without this the app UI is
  // drawn at that tiny size and then magnified — soft type, obvious fake.
  const W = Math.round(photoImg.width * res);
  const H = Math.round(photoImg.height * res);
  quad = quad.map(([x, y]) => [x * res, y * res]);
  radius = radius * res;
  if (inset > 0) {
    const cx = quad.reduce((a, p) => a + p[0], 0) / 4;
    const cy = quad.reduce((a, p) => a + p[1], 0) / 4;
    const k = 1 - (inset * res * 2) / Math.min(quadBox(quad).w, quadBox(quad).h);
    quad = quad.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
    radius = Math.max(2, radius - inset * res * 0.5);
  }

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(photoImg, 0, 0, W, H);

  // screen pixels
  const sw = screenImg.width;
  const sh = screenImg.height;
  const sCan = createCanvas(sw, sh);
  const sCtx = sCan.getContext("2d");
  sCtx.drawImage(screenImg, 0, 0);
  const src = sCtx.getImageData(0, 0, sw, sh).data;

  const box = quadBox(quad);
  const Hm = unitToQuad(quad); // unit square → photo
  const Hi = invert3(Hm); // photo → unit square

  // bounding box of the quad, clamped to the photo
  const xs = quad.map((p) => p[0]);
  const ys = quad.map((p) => p[1]);
  const bx0 = Math.max(0, Math.floor(Math.min(...xs)) - 1);
  const bx1 = Math.min(W - 1, Math.ceil(Math.max(...xs)) + 1);
  const by0 = Math.max(0, Math.floor(Math.min(...ys)) - 1);
  const by1 = Math.min(H - 1, Math.ceil(Math.max(...ys)) + 1);

  const rq = Math.min(radius, box.w / 2, box.h / 2); // radius in quad px
  const rx = rq / box.w;
  const ry = rq / box.h;

  const img = ctx.getImageData(0, 0, W, H);
  const out = img.data;
  // pristine copy of the photograph, for the occlusion pass
  const photoPx = occlude ? new Uint8ClampedArray(out) : null;

  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      // photo → unit square
      const w0 = Hi[6] * px + Hi[7] * py + Hi[8];
      const u = (Hi[0] * px + Hi[1] * py + Hi[2]) / w0;
      const v = (Hi[3] * px + Hi[4] * py + Hi[5]) / w0;
      if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) continue;

      // rounded-rect coverage in quad px
      const cx = Math.min(Math.max(u, rx), 1 - rx);
      const cy = Math.min(Math.max(v, ry), 1 - ry);
      const dx = (u - cx) * box.w;
      const dy = (v - cy) * box.h;
      const dist = Math.hypot(dx, dy) - rq;
      const cover = Math.min(1, Math.max(0, 0.5 - dist));
      if (cover <= 0) continue;

      // Occlusion: is there something in FRONT of the glass here? A finger
      // wrapping the frame is bright against the black phone face. Only the
      // outer band of the glass is eligible — reflections and fingerprints sit
      // in the middle of the screen and must be replaced by the UI, not kept.
      let keep = 0;
      if (photoPx) {
        const d = Math.min(u, 1 - u, 1 - v); // distance to left/right/bottom edge
        if (d < 0.2) {
          const band = Math.min(1, Math.max(0, (0.2 - d) / 0.07));
          const po = (y * W + x) * 4;
          const lum = 0.299 * photoPx[po] + 0.587 * photoPx[po + 1] + 0.114 * photoPx[po + 2];
          if (lum > occlude.lo) {
            const t = Math.min(1, (lum - occlude.lo) / (occlude.hi - occlude.lo));
            keep = band * t * t * (3 - 2 * t); // smoothstep
          }
        }
      }

      // bilinear sample of the screen
      const sx = Math.min(sw - 1, Math.max(0, u * sw - 0.5));
      const sy = Math.min(sh - 1, Math.max(0, v * sh - 0.5));
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(sw - 1, x0 + 1);
      const y1 = Math.min(sh - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;

      // glass sheen: bright along the top-left diagonal, gone by mid-screen
      const sheen = Math.max(0, 0.62 - (u * 0.66 + v * 0.5)) * reflection;
      const lift = (1 + sheen) * brightness;
      // subtle vignette so the phone's screen edges read as recessed
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const vig = edge < 0.02 ? 0.86 + edge * 7 : 1;
      const k = lift * vig;

      const a = cover * (1 - keep); // how much of the screen survives
      for (let c = 0; c < 3; c++) {
        const val =
          ((src[i00 + c] * (1 - fx) + src[i10 + c] * fx) * (1 - fy) +
            (src[i01 + c] * (1 - fx) + src[i11 + c] * fx) * fy) *
          k;
        const o = (y * W + x) * 4 + c;
        out[o] = out[o] * (1 - a) + Math.min(255, val) * a;
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  // optional accent bloom, as if the phone light spills onto the scene
  if (glow > 0) {
    const gp = glowPoint
      ? [glowPoint[0] * res, glowPoint[1] * res]
      : [(quad[0][0] + quad[2][0]) / 2, (quad[0][1] + quad[2][1]) / 2];
    const g = ctx.createRadialGradient(gp[0], gp[1], box.w * 0.2, gp[0], gp[1], box.w * 1.9);
    g.addColorStop(0, `rgba(63,214,192,${0.30 * glow})`);
    g.addColorStop(0.45, `rgba(28,140,150,${0.10 * glow})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  return canvas;
}

/** Dark-to-transparent gradient over a photo, for type legibility. */
export async function shade({ photo, from = "rgba(12,21,29,0)", to = "rgba(12,21,29,0.94)", direction = "up", stops }) {
  const img = await loadImage(photo);
  const W = img.width;
  const H = img.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const g =
    direction === "up"
      ? ctx.createLinearGradient(0, H, 0, H * 0.25)
      : direction === "down"
        ? ctx.createLinearGradient(0, 0, 0, H * 0.6)
        : ctx.createLinearGradient(0, 0, W, 0);
  if (stops) stops.forEach(([o, c]) => g.addColorStop(o, c));
  else {
    g.addColorStop(0, to);
    g.addColorStop(1, from);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return canvas;
}

export { createCanvas, loadImage };
