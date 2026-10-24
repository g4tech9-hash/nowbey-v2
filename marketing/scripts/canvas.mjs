/**
 * Thin wrapper over @napi-rs/canvas (a prebuilt Skia canvas: no system cairo,
 * no node-gyp). Used only for compositing photographs — every vector asset is
 * rasterised by resvg, which is faster and crisper for type.
 */
import { createCanvas as skiaCreate, loadImage as skiaLoad, Image, GlobalFonts } from "@napi-rs/canvas";

const dim = (v) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 1) throw new Error(`createCanvas: bad dimension ${v}`);
  return n;
};
export const createCanvas = (w, h) => skiaCreate(dim(w), dim(h));
export const loadImage = (buf) => skiaLoad(buf);
export { Image, GlobalFonts };
