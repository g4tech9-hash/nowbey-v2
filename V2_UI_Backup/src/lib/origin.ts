/**
 * Cross-origin rules for /api, in one place (applied by src/proxy.ts to every API request).
 *
 * Who calls the API:
 *  - the website itself (same origin) — always allowed;
 *  - the Android/iOS app — a native client: it sends no Origin header and authenticates with a bearer
 *    token, so CORS never applies to it;
 *  - Expo web during development — a browser on another origin (http://localhost:8081), allowed only in
 *    development or when listed in ALLOWED_ORIGINS.
 *
 * Before this, every /api response said `Access-Control-Allow-Origin: *`. With the session in a cookie
 * that was one `credentials: "include"` away from letting any website read a member's account data, and
 * it advertised the private API to every origin. Now only listed origins get CORS headers, credentials
 * are never allowed cross-origin, and a write (POST/PATCH/PUT/DELETE) that arrives from an origin that is
 * neither this site nor a listed one is refused before it reaches any route — a second wall behind the
 * SameSite=Lax session cookie, covering the routes that never called hasBadOrigin themselves.
 */

const DEV_ORIGINS = ["http://localhost:8081", "http://localhost:19006", "http://127.0.0.1:8081"];

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

/** Origins other than this site that may call the API from a browser. */
export function allowedOrigins(): Set<string> {
  const list = new Set<string>();
  for (const raw of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const o = originOf(raw);
    if (o) list.add(o);
  }
  const app = originOf(process.env.APP_URL);
  if (app) list.add(app);
  if (process.env.NODE_ENV !== "production") for (const o of DEV_ORIGINS) list.add(o);
  return list;
}

/** The hosts this request can legitimately be addressed to (a proxy may rewrite Host). */
function ownHosts(req: Request): string[] {
  const hosts = [req.headers.get("x-forwarded-host")?.split(",")[0]?.trim(), req.headers.get("host")?.trim()];
  try {
    hosts.push(new URL(req.url).host);
  } catch {
    /* ignore */
  }
  return hosts.filter((h): h is string => Boolean(h));
}

export type OriginVerdict = { kind: "none" } | { kind: "same" } | { kind: "allowed"; origin: string } | { kind: "foreign" };

export function classifyOrigin(req: Request): OriginVerdict {
  const raw = req.headers.get("origin");
  if (raw === null) return { kind: "none" };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { kind: "foreign" }; // includes the literal "null" a sandboxed frame or a cross-site redirect sends
  }
  if (ownHosts(req).includes(parsed.host)) return { kind: "same" };
  if (allowedOrigins().has(parsed.origin)) return { kind: "allowed", origin: parsed.origin };
  return { kind: "foreign" };
}

export const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Server-to-server callers that never come from a browser and authenticate themselves (signatures). */
const ORIGIN_EXEMPT = new Set(["/api/billing/webhook"]);

export function originExempt(path: string): boolean {
  return ORIGIN_EXEMPT.has(path);
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-nowbey-client",
  "Access-Control-Max-Age": "600",
};
