import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Constant-time cron guard. Returns false (and logs) when CRON_SECRET is unset. */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set — refusing to run");
    return false;
  }
  const got = req.headers.get("authorization") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function cronUnauthorized(): NextResponse {
  // 404 instead of 401 so scanners can't tell cron routes exist.
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
