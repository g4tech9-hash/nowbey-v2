/**
 * Minimal .env writer.
 *
 * Handles the ways a hand-edited .env usually goes wrong: a key that already
 * exists (replace in place, don't append a second line), a key present but
 * empty, CRLF files from Notepad, and a file with no trailing newline.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * Set `key=value` pairs in `path`, creating the file if needed.
 * @param {string} path
 * @param {Record<string,string>} pairs
 * @returns {{ written: string[], replaced: string[] }}
 */
export function writeEnvFile(path, pairs) {
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.length ? text.replace(/\r\n/g, "\n").split("\n") : [];

  const written = [];
  const replaced = [];

  for (const [key, value] of Object.entries(pairs)) {
    if (value == null || value === "") continue;
    const idx = lines.findIndex((l) => new RegExp(`^\\s*${key}\\s*=`).test(l));
    if (idx >= 0) {
      lines[idx] = `${key}=${value}`;
      replaced.push(key);
    } else {
      // keep a blank line before appending, so the file stays readable
      if (lines.length && lines[lines.length - 1] !== "") lines.push("");
      lines.push(`${key}=${value}`);
      written.push(key);
    }
  }

  let out = lines.join(eol);
  if (!out.endsWith(eol)) out += eol;
  writeFileSync(path, out);
  return { written, replaced };
}
