import { NextResponse, type NextRequest } from "next/server";

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
  return NextResponse.next();
}

export const config = {
  // Everything except the framework's own static files and images.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
