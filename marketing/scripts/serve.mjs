/**
 * Tiny static server for the launch kit gallery.
 *
 *   node scripts/serve.mjs        → http://localhost:4173
 *
 * Node's built-ins only; no dependency. Adds HTTP Range support so the reels
 * can be scrubbed in the browser (a plain file server returns 200 for a <video>
 * and Chrome then refuses to seek).
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let path = normalize(join(ROOT, url));
  if (!path.startsWith(ROOT)) return res.writeHead(403).end("Forbidden");

  let stat;
  try {
    stat = statSync(path);
    if (stat.isDirectory()) {
      path = join(path, "index.html");
      stat = statSync(path);
    }
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    return;
  }

  const type = TYPES[extname(path).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;

  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const [startRaw, endRaw] = range.replace("bytes=", "").split("-");
    const start = startRaw ? Number(startRaw) : 0;
    const end = endRaw ? Math.min(Number(endRaw), stat.size - 1) : stat.size - 1;
    if (start >= stat.size || start > end) {
      res.writeHead(416, { "content-range": `bytes */${stat.size}` }).end();
      return;
    }
    res.writeHead(206, {
      "content-type": type,
      "content-range": `bytes ${start}-${end}/${stat.size}`,
      "accept-ranges": "bytes",
      "content-length": end - start + 1,
      "cache-control": "no-cache",
    });
    createReadStream(path, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    "content-type": type,
    "content-length": stat.size,
    "accept-ranges": "bytes",
    "cache-control": "no-cache",
  });
  createReadStream(path).pipe(res);
}).listen(PORT, HOST, () => {
  console.log(`NowBey launch kit → http://${HOST}:${PORT}`);
});
