import sharp from "sharp";

/** Something wrong with an uploaded photo, with a message that is safe to show the member. */
export class PhotoError extends Error {}

export type ProcessedPhoto = { data: Buffer; thumb: Buffer; width: number; height: number };

type Kind = "jpeg" | "png" | "webp";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DECODE = { limitInputPixels: 40_000_000, failOn: "error" as const };

/**
 * Looks at the first bytes to see what a file really is, whatever it is called. Only JPEG, PNG and WebP ever reach
 * the image library. Without this, an upload disguised as a .jpg could be handed to image decoders for formats we
 * never meant to support (HEIF, SVG, TIFF and others), which is where most image-library security holes live.
 */
function sniff(b: Buffer): Kind | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(PNG_SIGNATURE)) return "png";
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
}

/**
 * Turns whatever was uploaded into two clean JPEGs. Decoding and re-encoding is deliberate: it
 * strips hidden data such as the GPS position and camera details phones attach to photos,
 * and it means only real images (never scripts renamed to .jpg) are ever stored or served.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  const kind = sniff(input);
  if (!kind) throw new PhotoError("Photos must be JPEG, PNG or WebP.");
  try {
    const meta = await sharp(input, DECODE).metadata();
    if (meta.format !== kind) throw new PhotoError("One of your photos could not be read. Try a different JPEG or PNG.");
    if (!meta.width || !meta.height) throw new PhotoError("One of your photos could not be read.");

    // rotate() applies the phone's orientation first; metadata is then dropped from the output by default.
    const base = () => sharp(input, DECODE).rotate().flatten({ background: "#ffffff" });
    const full = await base()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const thumb = await base()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
    return { data: full.data, thumb, width: full.info.width, height: full.info.height };
  } catch (e) {
    if (e instanceof PhotoError) throw e;
    throw new PhotoError("One of your photos could not be read. Try a different JPEG or PNG.");
  }
}
