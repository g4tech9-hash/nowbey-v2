export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;

/** Bound actual bytes, including requests that omit or lie about Content-Length. */
export async function readAvatarBody(req: Request, maxBytes = AVATAR_MAX_BYTES): Promise<Buffer> {
  if (Number(req.headers.get("content-length")) > maxBytes) throw new Error("Photo must be under 3 MB.");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Choose a photo first.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Photo must be under 3 MB.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!size) throw new Error("Choose a photo first.");
  return Buffer.concat(chunks);
}
