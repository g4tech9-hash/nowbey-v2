import { NextResponse } from "next/server";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { recordError, type ErrorKind } from "@/lib/errortracking";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { readJson } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

/**
 * Receives crash reports from the browser (window.onerror, unhandled rejections, error boundaries).
 * Anonymous by design (errors happen before sign-in too); the handle, when present, comes from the
 * session — never from the request body. sendBeacon-friendly: always 204, even when recording fails.
 */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const gate = hit(`err:${clientIp(req)}`, 40, 10 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "error reports");

  const body = await readJson(req).catch(() => null);
  if (!body) return new NextResponse(null, { status: 204 });
  const kind: ErrorKind = body.kind === "boundary" ? "boundary" : "client";

  let handle: string | null = null;
  try {
    const viewer = await getViewer();
    handle = viewer.handle;
  } catch {
    // Sign-in state is nice to have, never required to record a crash.
  }

  await recordError({
    kind,
    message: body.message,
    stack: body.stack,
    url: body.url,
    handle,
    userAgent: req.headers.get("user-agent"),
  });
  return new NextResponse(null, { status: 204 });
}
