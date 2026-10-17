import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * The handle src/db/dev.ts parks on globalThis once the embedded development Postgres is up.
 * Kept structural — NodePgDatabase/Pool — so this module never imports PGlite, whose WASM
 * payload must stay out of every production bundle. dev.ts casts on the way in; the casts on
 * the way out (makePool/makeDb below) cancel exactly.
 */
export type DevDatabase = { db: NodePgDatabase; pool: Pool };

/** Where the embedded dev database lives between instrumentation.register and the first query. */
export const devDbSlot = globalThis as typeof globalThis & { __nowbeyDevDatabase?: DevDatabase };

/**
 * The connection string is read when the first query runs, not when this module is imported. Every page, route
 * handler and the root layout import `@/db`, so a missing DATABASE_URL used to throw while `next build` was still
 * collecting route configuration and took the whole deployment down — including builds that never run a query
 * (Vercel Preview deployments, CI checks). Now the build finishes and the problem shows up where it belongs: as a
 * named error on the request that actually needed the database.
 */
function missingUrlError(): Error {
  const base =
    "DATABASE_URL is not set — add it to the environment for this deployment (on Vercel: Settings → Environment Variables, tick every environment you deploy).";
  const dev =
    " In development `npm run dev` boots an embedded Postgres by itself (src/db/dev.ts); it had not finished starting when this query ran — restart the dev server if it does not recover.";
  return new Error(process.env.NODE_ENV === "production" ? base : `${base}${dev}`);
}

/**
 * True when a connection string is configured, false when this deployment simply has no database yet.
 * Pages use this to render a calm "setup not finished" notice instead of crashing on the first query,
 * and route handlers use it to answer a readable 503 JSON body (the map and the forms show `error`
 * verbatim). A misconfigured deployment should look paused, not broken.
 *
 * In development the embedded Postgres (src/db/dev.ts, started by instrumentation.register)
 * counts as a database: once it is parked on the slot below the app behaves as if a URL were set.
 */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) || Boolean(devDbSlot.__nowbeyDevDatabase);
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: NodePgDatabase;
};

function makePool(): Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    const dev = devDbSlot.__nowbeyDevDatabase;
    if (dev) return dev.pool;
    throw missingUrlError();
  }
  const created = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  // Without this handler, one dropped idle connection would crash the whole server.
  created.on("error", (err) => console.error("[db] idle connection error:", err.message));
  return created;
}

function makeDb(): NodePgDatabase {
  if (!process.env.DATABASE_URL?.trim()) {
    const dev = devDbSlot.__nowbeyDevDatabase;
    if (dev) return dev.db;
    throw missingUrlError();
  }
  return drizzle(getPool());
}

/** One pool per process, opened on first use. A process that never queries the database never opens a socket. */
export function getPool(): Pool {
  return (globalForDb.__arenaNextJsPostgresqlPool ??= makePool());
}

/** The query client, built once on first use from the pool above. */
export function getDb(): NodePgDatabase {
  return (globalForDb.__arenaNextJsPostgresqlDb ??= makeDb());
}

/**
 * Wrappers so `import { db } from "@/db"` and `import { pool } from "@/db"` keep working unchanged: every member
 * access is forwarded to the real object, which is created on first touch. The module itself stays import-safe, so
 * building without a database can never fail on this file again.
 */
/**
 * Methods are bound to the real object. Without that, `pool.query(...)` ran with `this` set to the wrapper,
 * so pg's own bookkeeping (`this._clients = ...` when a client is dropped after a failed query) was written
 * onto the wrapper instead of the pool: every failed query left a phantom client behind until the pool
 * believed it was full and every later request waited 10 s for a connection and failed.
 */
function forward<T extends object>(real: () => T): ProxyHandler<T> {
  return {
    get(_target, prop) {
      const target = real();
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(_target, prop, value) {
      return Reflect.set(real(), prop, value);
    },
  };
}

export const pool = new Proxy({} as Pool, forward(getPool));

/** The query client used everywhere: `db.select()`, `db.insert()`, `db.execute()`. */
export const db = new Proxy({} as NodePgDatabase, forward(getDb));
