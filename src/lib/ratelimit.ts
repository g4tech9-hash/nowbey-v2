import { NextResponse } from "next/server";

/**
 * Small in-memory sliding-window limiter. It protects one server process; if you run several
 * copies behind a load balancer each keeps its own count, which still blunts abuse.
 */
const buckets = new Map<string, { hits: number[]; windowMs: number }>();

/** The visitor's address. Behind a proxy this comes from X-Forwarded-For. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim();
  return ip.slice(0, 64) || "local";
}

function live(key: string, windowMs: number): number[] {
  const now = Date.now();
  const entry = buckets.get(key);
  const hits = (entry?.hits ?? []).filter((t) => now - t < windowMs);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.hits.length || now - v.hits[v.hits.length - 1] > v.windowMs) buckets.delete(k);
    }
  }
  return hits;
}

/** Counts this attempt and says whether it is allowed. */
export function hit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const hits = live(key, windowMs);
  if (hits.length >= limit) {
    buckets.set(key, { hits, windowMs });
    return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (Date.now() - hits[0])) / 1000)) };
  }
  hits.push(Date.now());
  buckets.set(key, { hits, windowMs });
  return { ok: true, retryAfter: 0 };
}

/** Says whether the limit is already used up, without counting a new attempt. */
export function exhausted(key: string, limit: number, windowMs: number): { blocked: boolean; retryAfter: number } {
  const hits = live(key, windowMs);
  if (hits.length < limit) return { blocked: false, retryAfter: 0 };
  return { blocked: true, retryAfter: Math.max(1, Math.ceil((windowMs - (Date.now() - hits[0])) / 1000)) };
}

export function record(key: string, windowMs: number) {
  const hits = live(key, windowMs);
  hits.push(Date.now());
  buckets.set(key, { hits, windowMs });
}

export function forget(key: string) {
  buckets.delete(key);
}

export function tooMany(retryAfter: number, what = "requests") {
  const wait = retryAfter >= 90 ? `${Math.ceil(retryAfter / 60)} minutes` : `${retryAfter} seconds`;
  return NextResponse.json(
    { error: `Too many ${what} just now. Please wait ${wait} and try again.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
