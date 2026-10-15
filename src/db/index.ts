import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * The connection string is read when the first query runs, not when this module is imported. Every page, route
 * handler and the root layout import `@/db`, so a missing DATABASE_URL used to throw while `next build` was still
 * collecting route configuration and took the whole deployment down — including builds that never run a query
 * (Vercel Preview deployments, CI checks). Now the build finishes and the problem shows up where it belongs: as a
 * named error on the request that actually needed the database.
 */
function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — add it to the environment for this deployment (on Vercel: Settings → Environment Variables, tick every environment you deploy).",
    );
  }
  return url;
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: NodePgDatabase;
};

function makePool(): Pool {
  const created = new Pool({
    connectionString: requireDatabaseUrl(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  // Without this handler, one dropped idle connection would crash the whole server.
  created.on("error", (err) => console.error("[db] idle connection error:", err.message));
  return created;
}

/** One pool per process, opened on first use. A process that never queries the database never opens a socket. */
export function getPool(): Pool {
  return (globalForDb.__arenaNextJsPostgresqlPool ??= makePool());
}

/** The query client, built once on first use from the pool above. */
export function getDb(): NodePgDatabase {
  return (globalForDb.__arenaNextJsPostgresqlDb ??= drizzle(getPool()));
}

/**
 * Wrappers so `import { db } from "@/db"` and `import { pool } from "@/db"` keep working unchanged: every member
 * access is forwarded to the real object, which is created on first touch. The module itself stays import-safe, so
 * building without a database can never fail on this file again.
 */
export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    return Reflect.get(getPool(), prop, receiver);
  },
});

/** The query client used everywhere: `db.select()`, `db.insert()`, `db.execute()`. */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
