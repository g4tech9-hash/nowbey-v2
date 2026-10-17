import { NextResponse, type NextRequest } from "next/server";
import { CORS_HEADERS, UNSAFE_METHODS, classifyOrigin, originExempt } from "@/lib/origin";
import { buildCsp, isWorkerScriptPath, newNonce } from "@/lib/csp";

/**
 * Turns a web address with broken % escapes ("/life/%", "/api/photos/%E0%A4%A") into a plain 400 before it reaches
 * any page or route. Without this the framework answers them with a 500 error, which looks like a crash and fills the logs.
 */
export function proxy(req: NextRequest) {
  const path = new URL(req.url).pathname;

  // Deferred launch features are unreachable as well as hidden. This prevents stale bookmarks,
  // mobile clients, or direct API calls from bypassing the Nassau MVP scope.
  const lifeOff = process.env.NEXT_PUBLIC_FEATURE_ISLAND_LIFE !== "true" && (path === "/life" || path.startsWith("/life/") || path === "/api/life" || path.startsWith("/api/life/"));
  const gasOff = process.env.NEXT_PUBLIC_FEATURE_GAS_TRACKER !== "true" && (path === "/gas" || path.startsWith("/gas/") || path === "/api/gas" || path.startsWith("/api/gas/"));
  if (lifeOff || gasOff) {
    return path.startsWith("/api/")
      ? NextResponse.json({ error: "Not found" }, { status: 404 })
      : new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  try {
    decodeURIComponent(path);
  } catch {
    return path.startsWith("/api/")
      ? NextResponse.json({ error: "That web address is not valid." }, { status: 400 })
      : new NextResponse("That web address is not valid.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  if (path.startsWith("/api/")) return api(req, path);
  return page(req);
}

/**
 * Pages get a fresh nonce for scripts. The policy is report-only for now (see src/lib/csp.ts): the browser logs
 * what it would block, and the framework reads the nonce from the request header to tag its own scripts.
 */
function page(req: NextRequest) {
  // Service-worker scripts get no page policy: see isWorkerScriptPath in src/lib/csp.ts.
  if (isWorkerScriptPath(new URL(req.url).pathname)) return NextResponse.next();
  const nonce = newNonce();
  const csp = buildCsp(nonce);
  // Start from the incoming headers: passing a new Headers object would drop cookies and everything else.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", new URL(req.url).pathname);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy-Report-Only", csp);
  return res;
}

/** CORS allowlist and the cross-site write wall for every API route (rules in src/lib/origin.ts). */
function api(req: NextRequest, path: string) {
  const verdict = classifyOrigin(req);
  const cors: Record<string, string> = verdict.kind === "allowed" ? { "Access-Control-Allow-Origin": verdict.origin, ...CORS_HEADERS } : {};

  if (req.method === "OPTIONS") {
    // A preflight from an origin that is not on the list gets no CORS headers, so the browser stops there.
    return new NextResponse(null, { status: 204, headers: { ...cors, Vary: "Origin" } });
  }

  if (UNSAFE_METHODS.has(req.method) && verdict.kind === "foreign" && !originExempt(path)) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403, headers: { Vary: "Origin" } });
  }

  const res = NextResponse.next();
  res.headers.set("Vary", "Origin");
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

export const config = {
  // Everything except the framework's own static files and images.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
