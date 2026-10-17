/*
 * Next.js instrumentation: records server-side request errors (RSC renders, route handlers,
 * server actions) into the same client_errors table as the browser reports — one place the
 * admin can see "what crashed, where, how often" during the beta. No SDK, no external service.
 */

/**
 * Development convenience, awaited before the server takes its first request: with no
 * DATABASE_URL, boot the embedded dev Postgres (migrations applied, demo content seeded) so a
 * fresh clone works with `npm run dev` alone. Production is skipped on purpose — an
 * unconfigured deployment must stay obviously unconfigured (the "setup not finished" pages and
 * 503 APIs), not silently pretend to work.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.trim()) return;
  try {
    const { initDevDatabase } = await import("@/db/dev");
    await initDevDatabase();
  } catch (err) {
    // A dev database that will not start must not take the dev server down with it: without the
    // handle parked on the slot, every page simply shows the setup notice as it did before.
    console.error("[db] embedded dev database failed to start — pages will show the setup notice:", err);
  }
}

export async function onRequestError(
  err: { digest?: string; message?: string; stack?: string },
  request: { path?: string; url?: string; method?: string; headers?: Headers },
  context: { routerKind?: string; routePath?: string; routeType?: string },
): Promise<void> {
  // Edge/middleware runtime has no pg pool; database errors are recorded only from node.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { recordError } = await import("@/lib/errortracking");
    await recordError({
      kind: "server",
      message: `${err.message ?? "Request error"}${err.digest ? ` (digest ${err.digest})` : ""}`,
      stack: typeof err.stack === "string" ? err.stack : undefined,
      url: request.path ?? request.url ?? context.routePath ?? null,
      userAgent: request.headers?.get("user-agent"),
    });
  } catch {
    // The error reporter must never throw inside a request that is already failing.
  }
}
