/*
 * Self-hosted error tracking ("Sentry-lite" for the beta). Browser events, React boundary hits and
 * server request errors all land in client_errors, grouped by digest. No external service: error
 * data (which can contain a signed-in member's URL) stays inside NowBey's own database.
 * Recording an error must never throw — the reporter for a crash cannot itself be crashy.
 */
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { clientErrors } from "@/db/schema";

export type ErrorKind = "client" | "boundary" | "server";

/** Keep only the path. Query strings and fragments can carry reset tokens and are nobody's business here. */
export function cleanUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const u = new URL(raw, "https://nowbey.invalid");
    return (u.pathname || "/").slice(0, 200);
  } catch {
    return raw.split(/[?#]/)[0].slice(0, 200) || null;
  }
}

export function digestFor(kind: string, message: string, url: string | null): string {
  return createHash("sha256").update(`${kind}|${message}|${url ?? ""}`).digest("hex").slice(0, 24);
}

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
};

/** Insert or bump the group row. Returns the digest, or null when deduped/failed. */
export async function recordError(input: Recordable): Promise<string | null> {
  const message = String(input.message ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!message) return null;
  const url = cleanUrl(input.url);
  const digest = digestFor(input.kind, message, url);
  if (!stamp(digest)) return null;

  const stack = typeof input.stack === "string" ? input.stack.slice(0, 2000) : null;
  const userAgent = typeof input.userAgent === "string" ? input.userAgent.slice(0, 200) : null;
  const handle = typeof input.handle === "string" && input.handle ? input.handle.slice(0, 40) : null;

  try {
    await db
      .insert(clientErrors)
      .values({ digest, kind: input.kind, message, stack, url, handle, userAgent })
      .onConflictDoUpdate({
        target: clientErrors.digest,
        set: {
          count: sql`${clientErrors.count} + 1`,
          lastSeenAt: new Date(),
          // The newest stack is the useful one; keep the first handle so the row proves a member hit it.
          stack: sql`coalesce(excluded.stack, ${clientErrors.stack})`,
          handle: sql`coalesce(${clientErrors.handle}, excluded.handle)`,
        },
      });
    return digest;
  } catch (err) {
    console.warn(`[errors] could not record (${err instanceof Error ? err.message : err})`);
    return null;
  }
}
