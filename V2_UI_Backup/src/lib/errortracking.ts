/*
 * Self-hosted error tracking ("Sentry-lite" for the beta). Browser events, React boundary hits,
 * Expo app crashes and server request errors all land in client_errors, grouped by digest.
 * No external service: error data (which can contain a signed-in member's URL) stays inside
 * NowBey's own database. Reports carry a sanitized breadcrumb trail (pages visited, failed
 * API calls), platform and app version — the context the AI log analysis in error-ai.ts reads.
 * Recording an error must never throw — the reporter for a crash cannot itself be crashy.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { clientErrors } from "@/db/schema";
import { cleanPath, digestFor, sanitizeContextJson, scrubText, type ErrorKind } from "@/lib/error-core";

export type { ErrorKind };
/** Back-compat: earlier code imported these from this module. */
export const cleanUrl = cleanPath;
export { digestFor };

// One bad render loop should not write a row per tick: each server instance accepts a digest once a minute.
const seenRecently = new Map<string, number>();
const DEDUPE_MS = 60_000;

function stamp(digest: string): boolean {
  const now = Date.now();
  const last = seenRecently.get(digest) ?? 0;
  if (now - last < DEDUPE_MS) return false;
  seenRecently.set(digest, now);
  if (seenRecently.size > 500) seenRecently.delete(seenRecently.keys().next().value as string);
  return true;
}

export type Recordable = {
  kind: ErrorKind;
  message: unknown;
  stack?: unknown;
  url?: unknown;
  handle?: string | null;
  userAgent?: unknown;
  /** web | android | ios | server. Server errors default from kind; clients state theirs. */
  platform?: unknown;
  appVersion?: unknown;
  sessionId?: unknown;
  breadcrumbs?: unknown;
};

const PLATFORMS = ["web", "android", "ios", "server"];

/** Insert or bump the group row. Returns the digest, or null when deduped/failed. */
export async function recordError(input: Recordable): Promise<string | null> {
  const message = scrubText(input.message, 300).replace(/\s+/g, " ").trim();
  if (!message) return null;
  const url = cleanPath(input.url);
  const platformRaw = typeof input.platform === "string" ? input.platform.toLowerCase() : "";
  const platform = PLATFORMS.includes(platformRaw) ? platformRaw : input.kind === "server" ? "server" : "web";
  const digest = digestFor(input.kind, message, url, platform);
  if (!stamp(digest)) return null;

  const stack = typeof input.stack === "string" ? scrubText(input.stack, 2000) : null;
  const userAgent = typeof input.userAgent === "string" ? input.userAgent.slice(0, 200) : null;
  const handle = typeof input.handle === "string" && input.handle ? input.handle.slice(0, 40) : null;
  const appVersion = typeof input.appVersion === "string" ? scrubText(input.appVersion, 60) : null;
  const sessionId = typeof input.sessionId === "string" ? scrubText(input.sessionId, 64) : null;
  const context = sanitizeContextJson({ breadcrumbs: input.breadcrumbs });

  try {
    await db
      .insert(clientErrors)
      .values({ digest, kind: input.kind, message, stack, url, handle, userAgent, platform, appVersion, sessionId, context })
      .onConflictDoUpdate({
        target: clientErrors.digest,
        set: {
          count: sql`${clientErrors.count} + 1`,
          lastSeenAt: new Date(),
          // The newest diagnostics are the useful ones; keep the first handle so the row proves a member hit it.
          stack: sql`coalesce(excluded.stack, ${clientErrors.stack})`,
          context: sql`coalesce(excluded.context, ${clientErrors.context})`,
          appVersion: sql`coalesce(excluded.app_version, ${clientErrors.appVersion})`,
          sessionId: sql`coalesce(excluded.session_id, ${clientErrors.sessionId})`,
          handle: sql`coalesce(${clientErrors.handle}, excluded.handle)`,
        },
      });
    return digest;
  } catch (err) {
    console.warn(`[errors] could not record (${err instanceof Error ? err.message : err})`);
    return null;
  }
}
