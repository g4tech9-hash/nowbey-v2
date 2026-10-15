import { createHash } from "node:crypto";

/**
 * The rate limiter itself, free of Next.js imports so the hermetic tests can load it directly.
 * Routes import from `@/lib/ratelimit`, which re-exports all of this plus the 429 response helper.
 *
 * Two layers of rate limiting.
 *
 * 1. `hit` / `exhausted` / `record` / `forget` — a small in-memory sliding window. It protects one server
 *    process. Cheap, synchronous, and the right tool for routes where a per-instance cap is enough
 *    (comments, reactions, geocoding).
 *
 * 2. `sharedHit` / `sharedExhausted` / `sharedRecord` / `sharedForget` — the same four verbs backed by the
 *    `rate_limits` table (src/db/add-security-fixes.sql), so every serverless instance shares one count.
 *    Used where a per-instance count is not good enough: sign-in failures, sign-ups, reset links and
 *    password checks. On Vercel each cold instance starts with an empty Map, so "6 wrong passwords" in
 *    memory really means "6 per instance"; the table makes it 6.
 *
 *    Until the migration has run, the shared verbs fall back to the in-memory layer: the site keeps
 *    working with the old, weaker limits, and the server log says so once.
 */

type Bucket = { hits: number[]; windowMs: number };
const buckets = new Map<string, Bucket>();

/** Hard ceiling on remembered keys, so a flood of distinct addresses cannot grow memory without bound. */
const MAX_KEYS = 5000;

/**
 * The visitor's address.
 *
 * On Vercel the platform overwrites `x-real-ip` / `x-forwarded-for` with the address it saw, so either is
 * trustworthy there; `x-real-ip` is read first because it is a single value. Elsewhere (local development,
 * the test harness, a self-hosted server behind one proxy) the first `x-forwarded-for` entry is used, which
 * is what a single trusted proxy sets. A self-hosted deployment behind a proxy that *appends* to a
 * client-supplied header must strip it at the proxy, or set TRUST_PROXY=last to read the last hop instead.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  const chain = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let ip: string;
  if (process.env.VERCEL) ip = real || chain[0] || "";
  else if (process.env.TRUST_PROXY === "last") ip = chain[chain.length - 1] || real || "";
  else ip = chain[0] || real || "";
  return ip.slice(0, 64) || "local";
}

/** Long or attacker-chosen key parts (emails, handles) are hashed so a key never costs more than ~50 bytes. */
function keyOf(key: string): string {
  if (key.length <= 48) return key;
  const cut = key.indexOf(":");
  const prefix = cut > 0 && cut <= 16 ? key.slice(0, cut) : "k";
  return `${prefix}:${createHash("sha256").update(key).digest("base64url").slice(0, 32)}`;
}

function sweep(now: number) {
  for (const [k, v] of buckets) {
    const last = v.hits[v.hits.length - 1];
    if (last === undefined || now - last > v.windowMs) buckets.delete(k);
  }
  // Still full of live keys (a flood): drop the oldest-inserted ones. Map keeps insertion order.
  for (const k of buckets.keys()) {
    if (buckets.size < MAX_KEYS) break;
    buckets.delete(k);
  }
}

function live(key: string, windowMs: number): number[] {
  const now = Date.now();
  const entry = buckets.get(key);
  // A clock that stepped backwards would make (now - t) negative and keep hits alive forever; drop those.
  const hits = (entry?.hits ?? []).filter((t) => t <= now && now - t < windowMs);
  if (!entry && buckets.size >= MAX_KEYS) sweep(now);
  return hits;
}

function retryAfterFor(first: number, windowMs: number): number {
  return Math.max(1, Math.ceil((windowMs - (Date.now() - first)) / 1000));
}

/** Counts this attempt and says whether it is allowed. */
export function hit(rawKey: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const key = keyOf(rawKey);
  const hits = live(key, windowMs);
  if (hits.length >= limit) {
    buckets.set(key, { hits, windowMs });
    return { ok: false, retryAfter: retryAfterFor(hits[0], windowMs) };
  }
  hits.push(Date.now());
  buckets.set(key, { hits, windowMs });
  return { ok: true, retryAfter: 0 };
}

/** Says whether the limit is already used up, without counting a new attempt. */
export function exhausted(rawKey: string, limit: number, windowMs: number): { blocked: boolean; retryAfter: number } {
  const hits = live(keyOf(rawKey), windowMs);
  if (hits.length < limit) return { blocked: false, retryAfter: 0 };
  return { blocked: true, retryAfter: retryAfterFor(hits[0], windowMs) };
}

export function record(rawKey: string, windowMs: number) {
  const key = keyOf(rawKey);
  const hits = live(key, windowMs);
  hits.push(Date.now());
  buckets.set(key, { hits, windowMs });
}

export function forget(rawKey: string) {
  buckets.delete(keyOf(rawKey));
}

/** How many keys the in-memory layer holds. Exposed for tests. */
export function memoryKeyCount(): number {
  return buckets.size;
}

/* ------------------------------------------------------------------------------------------------ */
/* Shared layer (Postgres)                                                                          */
/* ------------------------------------------------------------------------------------------------ */

type Row = { hits: number; ttl: number };
type Query = (text: string, params: unknown[]) => Promise<{ rows: Row[] }>;

let warnedMissing = false;
let queryImpl: Query | null = null;

async function runQuery(text: string, params: unknown[]): Promise<Row[]> {
  if (!queryImpl) {
    const { pool } = await import("@/db");
    queryImpl = (t, p) => pool.query(t, p) as unknown as Promise<{ rows: Row[] }>;
  }
  const { rows } = await queryImpl(text, params);
  return rows;
}

/** Test seam: swap the database call. Pass null to restore the real pool. */
export function __setSharedQuery(q: Query | null) {
  queryImpl = q;
}

function noteFallback(e: unknown) {
  const code = (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  if (code === "42P01") {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn("[ratelimit] table rate_limits is missing — run src/db/add-security-fixes.sql. Using per-instance limits until then.");
    }
  } else {
    console.error("[ratelimit] shared store unavailable, using per-instance limits:", e instanceof Error ? e.message : e);
  }
}

const UPSERT = `
  insert into rate_limits (key, hits, expires_at) values ($1, 1, now() + ($2::int * interval '1 millisecond'))
  on conflict (key) do update set
    hits = case when rate_limits.expires_at <= now() then 1 else rate_limits.hits + 1 end,
    expires_at = case when rate_limits.expires_at <= now() then excluded.expires_at else rate_limits.expires_at end
  returning hits, greatest(1, ceil(extract(epoch from (expires_at - now()))))::int as ttl`;

function maybeCleanup() {
  if (Math.random() > 0.01) return;
  runQuery("delete from rate_limits where expires_at < now()", []).catch(() => undefined);
}

/** Like `hit`, counted once across every server instance. */
export async function sharedHit(rawKey: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> {
  try {
    const [row] = await runQuery(UPSERT, [keyOf(rawKey), Math.round(windowMs)]);
    maybeCleanup();
    return row.hits <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: row.ttl };
  } catch (e) {
    noteFallback(e);
    return hit(rawKey, limit, windowMs);
  }
}

/** Like `exhausted`, read from the shared count. */
export async function sharedExhausted(rawKey: string, limit: number, windowMs: number): Promise<{ blocked: boolean; retryAfter: number }> {
  try {
    const [row] = await runQuery(
      "select hits, greatest(1, ceil(extract(epoch from (expires_at - now()))))::int as ttl from rate_limits where key = $1 and expires_at > now()",
      [keyOf(rawKey)],
    );
    if (!row || row.hits < limit) return { blocked: false, retryAfter: 0 };
    return { blocked: true, retryAfter: row.ttl };
  } catch (e) {
    noteFallback(e);
    return exhausted(rawKey, limit, windowMs);
  }
}

/** Like `record`, counted once across every server instance. */
export async function sharedRecord(rawKey: string, windowMs: number): Promise<void> {
  try {
    await runQuery(UPSERT, [keyOf(rawKey), Math.round(windowMs)]);
  } catch (e) {
    noteFallback(e);
    record(rawKey, windowMs);
  }
}

/** Like `forget`, for the shared count (and the in-memory one, in case the fallback was used). */
export async function sharedForget(rawKey: string): Promise<void> {
  forget(rawKey);
  try {
    await runQuery("delete from rate_limits where key = $1", [keyOf(rawKey)]);
  } catch (e) {
    noteFallback(e);
  }
}
