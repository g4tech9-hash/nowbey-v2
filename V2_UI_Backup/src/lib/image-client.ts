/**
 * Shrinks a photo in the browser before upload, so a 12 MB phone picture becomes a few hundred KB.
 * Redrawing it on a canvas also drops the hidden GPS position phones add to photos.
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not a photo.");

  let source: ImageBitmap | HTMLImageElement;
  let revoke: (() => void) | null = null;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older browsers: decode through an <img> instead.
    const url = URL.createObjectURL(file);
    revoke = () => URL.revokeObjectURL(url);
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("This photo format is not supported. Try a JPEG or PNG."));
      img.src = url;
    });
  }

  try {
    const w = "naturalWidth" in source ? source.naturalWidth : source.width;
    const h = "naturalHeight" in source ? source.naturalHeight : source.height;
    if (!w || !h) throw new Error("This photo could not be read.");
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot prepare photos.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("This photo could not be prepared.");
    return blob;
  } finally {
    if ("close" in source) source.close();
    revoke?.();
  }
}
