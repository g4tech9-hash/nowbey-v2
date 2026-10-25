/**
 * NOWBEY — preview server
 * ---------------------------------------------------------------------------
 * A tiny static server for the brand preview. It exists because Python's
 * http.server answers with `304 Not Modified`, which lets a browser serve a
 * cached page and cached images after a rebuild — the exact bug that made a
 * tagline change look like it never happened.
 *
 * Every response is `Cache-Control: no-store`, so the preview is always the
 * current build. Asset URLs also carry a content hash, so this is belt and
 * braces: even a caching proxy in front of the sandbox cannot pin an old file.
 *
 *   node scripts/serve.mjs [port]
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8000);
const HOST = "0.0.0.0";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8",
  ".webp": "image/webp",
};

const server = createServer((req, res) => {
  // strip the query string — it is only there for cache-busting
  let path = decodeURIComponent((req.url || "/").split("?")[0]);

  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));

  // never serve outside the branding folder
  if (!file.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("forbidden");
    return;
  }

  let stat;
  try {
    stat = statSync(file);
  } catch {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(`404 — ${path}\n\nNot in this build. Try / for the preview page.`);
    return;
  }

  if (stat.isDirectory()) {
    res.writeHead(302, { Location: `${path.replace(/\/?$/, "/")}index.html` });
    res.end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
    // the preview is embedded in the Arena panel
    "X-Frame-Options": "ALLOWALL",
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Brand preview   http://localhost:${PORT}`);
  console.log(`Root            ${ROOT}`);
  console.log("Cache-Control: no-store on every response — reloads always show the current build.");
});
