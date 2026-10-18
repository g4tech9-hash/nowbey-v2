/**
 * Secure storage has a per-value size ceiling (2 KB on Android, and a warning long before that). A draft or a
 * queue is JSON and can easily exceed it, so values are split into fixed-size pieces and reassembled.
 *
 * Pure, because a bug here loses the only copy of somebody's report.
 */

/** Split a string into pieces no larger than `size`, never breaking a surrogate pair. */
export function toChunks(value: string, size: number = 1_400): string[] {
  if (value === "") return [""];
  const out: string[] = [];
  let i = 0;
  while (i < value.length) {
    let end = Math.min(i + size, value.length);
    // Do not cut an emoji or an accented character in half: a lone surrogate cannot be stored and read back.
    const code = value.charCodeAt(end - 1);
    if (end < value.length && code >= 0xd800 && code <= 0xdbff) end -= 1;
    out.push(value.slice(i, end));
    i = end;
  }
  return out;
}

export function fromChunks(parts: readonly string[]): string {
  return parts.join("");
}

/** The key a chunk lives under. Index 0 also carries the count, written last so a torn write is detectable. */
export function chunkKey(base: string, index: number): string {
  return `${base}#${index}`;
}

export function manifestKey(base: string): string {
  return `${base}#n`;
}
