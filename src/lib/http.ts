import { NextResponse } from "next/server";

export const jsonError = (error: string, status = 400) =>
  NextResponse.json({ error }, { status });

/**
 * Blocks cross-site form-POST CSRF on cookie-authed mutations.
 * Same-page fetch sends Origin matching host (or no Origin for native/curl);
 * a forged evil.com form sends Origin: https://evil.com.
 *
 * "Matching host" has to consider three views of the address, because a deployment can sit behind
 * a proxy: the browser-visible host the proxy forwarded (x-forwarded-host), the Host header, and
 * whatever the framework put in req.url. Before this, a server reached through a rewriting proxy
 * (or a dev server bound to 0.0.0.0, where req.url says 0.0.0.0 while the browser says localhost)
 * rejected every same-origin write. The session cookie is SameSite=strict on top of this check,
 * so a forged cross-site request carries no credentials either way.
 */
export function hasBadOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const presented = new URL(origin).host;
    const allowed = [
      req.headers.get("x-forwarded-host")?.split(",")[0]?.trim(),
      req.headers.get("host"),
      (() => {
        try {
          return new URL(req.url).host;
        } catch {
          return null;
        }
      })(),
    ].filter((h): h is string => Boolean(h));
    return !allowed.includes(presented);
  } catch {
    return true;
  }
}

export function badOrigin(): NextResponse {
  return NextResponse.json({ error: "Bad origin." }, { status: 403 });
}
