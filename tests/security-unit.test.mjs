/**
 * Hermetic tests for the security primitives: password hashing and the rate limiter.
 * No database and no server — these run in CI on every push (npm test).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { hashPassword, passwordNeedsRehash, verifyPassword } from "../src/lib/secret.ts";
import {
  __setSharedQuery,
  clientIp,
  exhausted,
  hit,
  memoryKeyCount,
  record,
  sharedExhausted,
  sharedHit,
  sharedRecord,
} from "../src/lib/ratelimit-core.ts";

/** A hash exactly as the old code wrote it: Node's default scrypt, 12-byte salt, 40-byte key. */
function legacyHash(password) {
  const salt = randomBytes(12).toString("hex");
  return `${salt}:${scryptSync(password, salt, 40).toString("hex")}`;
}

test("new hashes use the versioned scrypt format with OWASP parameters", async () => {
  const h = await hashPassword("Rum-Cake_42-Conch");
  assert.match(h, /^scrypt\$15\$8\$3\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.equal(await verifyPassword("Rum-Cake_42-Conch", h), true);
  assert.equal(await verifyPassword("Rum-Cake_42-conch", h), false);
  assert.equal(passwordNeedsRehash(h), false);
});

test("two hashes of the same password differ (fresh salt each time)", async () => {
  const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
  assert.notEqual(a, b);
});

test("every password saved by the old code still verifies, and is flagged for upgrade", async () => {
  const old = legacyHash("Tide-Pool_7-Sapodilla");
  assert.equal(await verifyPassword("Tide-Pool_7-Sapodilla", old), true);
  assert.equal(await verifyPassword("wrong", old), false);
  assert.equal(passwordNeedsRehash(old), true);
});

test("the seeded development hash (old format) verifies against nothing it should not", async () => {
  const seeded = "d222b8b0f3d2232f549618b0:9f379636076ae5974af4bd39affc3325f1ae3253c04424ae019030c9c754238c1f2bc95aac757666";
  assert.equal(await verifyPassword("", seeded), false);
  assert.equal(passwordNeedsRehash(seeded), true);
});

test("corrupt, empty and hostile stored values never verify and never throw", async () => {
  const hostile = [
    null,
    undefined,
    "",
    ":",
    "abc",
    "salt:",
    "salt:zz-not-hex",
    "scrypt$15$8$3$salt",
    "scrypt$30$8$1$00$" + "a".repeat(128), // N = 2^30 would ask for terabytes: refused before scrypt runs
    "scrypt$15$999$1$00$" + "a".repeat(128),
    "scrypt$x$8$1$00$" + "a".repeat(128),
  ];
  for (const stored of hostile) {
    assert.equal(await verifyPassword("anything", stored), false, String(stored));
  }
  assert.equal(passwordNeedsRehash(null), false);
  assert.equal(passwordNeedsRehash("garbage"), false);
});

test("hashing does not block the event loop", async () => {
  let ticks = 0;
  const timer = setInterval(() => (ticks += 1), 5);
  await Promise.all([hashPassword("a"), hashPassword("b"), hashPassword("c")]);
  clearInterval(timer);
  assert.ok(ticks > 0, "timers must keep firing while passwords are hashed");
});

test("clientIp: first X-Forwarded-For hop off Vercel, x-real-ip on Vercel", () => {
  const req = (h) => new Request("http://x/", { headers: h });
  const prev = process.env.VERCEL;
  delete process.env.VERCEL;
  assert.equal(clientIp(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "1.1.1.1");
  assert.equal(clientIp(req({})), "local");
  process.env.VERCEL = "1";
  assert.equal(clientIp(req({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "3.3.3.3" })), "3.3.3.3");
  if (prev === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = prev;
  assert.equal(clientIp(req({ "x-forwarded-for": "9".repeat(500) })).length, 64);
});

test("the in-memory limiter counts, blocks and reports a sane Retry-After", () => {
  const key = `unit:${Math.random()}`;
  for (let i = 0; i < 3; i += 1) assert.equal(hit(key, 3, 60_000).ok, true);
  const blocked = hit(key, 3, 60_000);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter >= 1 && blocked.retryAfter <= 60);
  const k2 = `unit2:${Math.random()}`;
  record(k2, 60_000);
  record(k2, 60_000);
  assert.equal(exhausted(k2, 2, 60_000).blocked, true);
});

test("a flood of distinct keys cannot grow memory past the cap", () => {
  for (let i = 0; i < 12_000; i += 1) hit(`flood:${i}:${"x".repeat(200)}`, 5, 3_600_000);
  assert.ok(memoryKeyCount() <= 5000, `kept ${memoryKeyCount()} keys`);
});

test("the shared limiter uses the database answer when there is one", async () => {
  let hits = 0;
  __setSharedQuery(async (text) => {
    if (/^\s*insert/i.test(text)) return { rows: [{ hits: ++hits, ttl: 900 }] };
    return { rows: [{ hits, ttl: 900 }] };
  });
  try {
    assert.equal((await sharedHit("s:a", 2, 900_000)).ok, true);
    assert.equal((await sharedHit("s:a", 2, 900_000)).ok, true);
    const third = await sharedHit("s:a", 2, 900_000);
    assert.equal(third.ok, false);
    assert.equal(third.retryAfter, 900);
    assert.equal((await sharedExhausted("s:a", 2, 900_000)).blocked, true);
  } finally {
    __setSharedQuery(null);
  }
});

test("without the rate_limits table the shared limiter falls back to per-instance limits", async () => {
  const missing = Object.assign(new Error('relation "rate_limits" does not exist'), { code: "42P01" });
  __setSharedQuery(async () => {
    throw missing;
  });
  const warn = console.warn;
  console.warn = () => {};
  try {
    const key = `fallback:${Math.random()}`;
    assert.equal((await sharedHit(key, 1, 60_000)).ok, true);
    assert.equal((await sharedHit(key, 1, 60_000)).ok, false, "the old in-memory limit must still apply");
    const k2 = `fallback2:${Math.random()}`;
    await sharedRecord(k2, 60_000);
    assert.equal((await sharedExhausted(k2, 1, 60_000)).blocked, true);
  } finally {
    console.warn = warn;
    __setSharedQuery(null);
  }
});
