import { NextResponse, after } from "next/server";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { maybeAutoAnalyze } from "@/lib/error-ai";
import { recordError, type ErrorKind } from "@/lib/errortracking";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { readJson } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

const KINDS: ErrorKind[] = ["client", "boundary", "server", "app"];

/**
 * Receives crash reports from the browser and the Expo app (window.onerror, unhandled
 * rejections, error boundaries, React Native's global handler), each with a sanitized
 * breadcrumb trail. Anonymous by design (errors happen before sign-in too); the handle,
 * when present, comes from the session — never from the request body. sendBeacon-friendly:
 * always 204, even when recording fails. After recording, a throttled background pass
 * lets Gemini diagnose new groups (error-ai.ts); the cron does the same on a schedule.
 */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const gate = hit(`err:${clientIp(req)}`, 40, 10 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "error reports");

  const body = await readJson(req).catch(() => null);
  if (!body) return new NextResponse(null, { status: 204 });
  const kind: ErrorKind = KINDS.includes(body.kind) ? body.kind : "client";

  let handle: string | null = null;
  try {
    const viewer = await getViewer();
    handle = viewer.handle;
  } catch {
    // Sign-in state is nice to have, never required to record a crash.
  }

  const digest = await recordError({
    kind,
    message: body.message,
    stack: body.stack,
    url: body.url,
    handle,
    userAgent: req.headers.get("user-agent"),
    platform: body.platform,
    appVersion: body.appVersion,
    sessionId: body.sessionId,
    breadcrumbs: body.breadcrumbs,
  });
  // New group (or a revived bug): queue an automatic AI diagnosis, throttled per instance.
  if (digest) after(() => maybeAutoAnalyze());
  return new NextResponse(null, { status: 204 });
}
