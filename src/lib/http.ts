import { NextResponse } from "next/server";

export const jsonError = (error: string, status = 400) =>
  NextResponse.json({ error }, { status });

/**
 * Blocks cross-site form-POST CSRF on cookie-authed mutations.
 * Same-page fetch sends Origin matching host (or no Origin for native/curl);
 * a forged evil.com form sends Origin: https://evil.com.
 */
export function hasBadOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(req.url).host;
  } catch {
    return true;
  }
}

export function badOrigin(): NextResponse {
  return NextResponse.json({ error: "Bad origin." }, { status: 403 });
}
