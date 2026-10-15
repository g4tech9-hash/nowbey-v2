/**
 * Every secret that does not need a request: the signing key, password hashing, session tokens and
 * the short-lived signed payloads the OAuth handshake hands to the browser.
 *
 * Nothing here imports Next.js, on purpose: the test suite can import this file directly and prove the
 * crypto and the token rules without a browser in the way. The request plumbing — reading the cookie
 * or the bearer header, setting the cookie — lives next door in `src/lib/auth.ts`.
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let cachedSecret: string | null = null;

/**
 * The key that signs sign-in sessions. Use AUTH_SECRET when it is set. Otherwise a random key is
 * generated once and kept in .data/auth-secret, so sessions survive restarts and nobody can forge
 * one from the source code. (Running several servers? Set the same AUTH_SECRET on all of them.)
 */
export function serverSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return (cachedSecret = fromEnv);
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set to at least 32 characters in production");
  }
  try {
    const dir = join(process.cwd(), ".data");
    const file = join(dir, "auth-secret");
    if (existsSync(file)) {
      const saved = readFileSync(file, "utf8").trim();
      if (saved.length >= 32) return (cachedSecret = saved);
    }
    mkdirSync(dir, { recursive: true });
    const fresh = randomBytes(32).toString("hex");
    writeFileSync(file, fresh, { mode: 0o600 });
    return (cachedSecret = fresh);
  } catch {
    // Read-only disk: a per-process key is still safe, it just signs everyone out on restart.
    return (cachedSecret = randomBytes(32).toString("hex"));
  }
}

/**
 * Password hashing.
 *
 * Current format: `scrypt$<log2 N>$<r>$<p>$<salt hex>$<hash hex>` — OWASP's scrypt profile N=2^15, r=8,
 * p=3 (32 MiB, same work as N=2^17/p=1 at a quarter of the memory, which matters when one serverless
 * instance answers several sign-ins at once). Hashing runs on libuv's thread pool, so a burst of sign-ins
 * no longer freezes every other request the way the old synchronous call did.
 *
 * Legacy format: `<salt hex>:<hash hex>` — Node's default scrypt (N=2^14, r=8, p=1), 40-byte key. Still
 * verified, and `passwordNeedsRehash` tells the sign-in route to upgrade it the next time the member
 * proves they know the password. No member is ever locked out by the change.
 */
const CURRENT = { logN: 15, r: 8, p: 3, keylen: 64 };
const MAXMEM = 128 * 1024 * 1024;

function scryptAsync(password: string, salt: string, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(Buffer.from(password, "utf8"), salt, keylen, { ...opts, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const { logN, r, p, keylen } = CURRENT;
  const hash = await scryptAsync(password, salt, keylen, { N: 2 ** logN, r, p });
  return `scrypt$${logN}$${r}$${p}$${salt}$${hash.toString("hex")}`;
}

type Parsed = { salt: string; expected: Buffer; opts: ScryptOptions; current: boolean };

function parseStored(stored: string): Parsed | null {
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 6) return null;
    const [, logN, r, p, salt, hash] = parts;
    const n = Number(logN), rr = Number(r), pp = Number(p);
    // Bounds keep a corrupt or hostile row from asking for gigabytes of memory.
    if (![n, rr, pp].every(Number.isInteger) || n < 10 || n > 20 || rr < 1 || rr > 32 || pp < 1 || pp > 16) return null;
    if (!/^[0-9a-f]+$/i.test(hash) || hash.length < 32 || !salt) return null;
    return {
      salt,
      expected: Buffer.from(hash, "hex"),
      opts: { N: 2 ** n, r: rr, p: pp },
      current: n === CURRENT.logN && rr === CURRENT.r && pp === CURRENT.p && hash.length === CURRENT.keylen * 2,
    };
  }
  const cut = stored.indexOf(":");
  if (cut < 1) return null;
  const salt = stored.slice(0, cut);
  const hash = stored.slice(cut + 1);
  if (!/^[0-9a-f]+$/i.test(hash) || hash.length < 32) return null;
  return { salt, expected: Buffer.from(hash, "hex"), opts: { N: 2 ** 14, r: 8, p: 1 }, current: false };
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parsed = parseStored(stored);
  if (!parsed) return false;
  const candidate = await scryptAsync(password, parsed.salt, parsed.expected.length, parsed.opts);
  return candidate.length === parsed.expected.length && timingSafeEqual(candidate, parsed.expected);
}

/** True when a stored hash uses older parameters and should be replaced after a successful sign-in. */
export function passwordNeedsRehash(stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parsed = parseStored(stored);
  return parsed !== null && !parsed.current;
}

function sign(payload: string): string {
  return createHmac("sha256", serverSecret()).update(payload).digest("base64url");
}

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Signs a small JSON payload (with its own expiry) for a short-lived cookie. Used for the OAuth
 * handshake, where the browser has to carry the state and the PKCE verifier across a trip to Google
 * and back without anyone being able to tamper with them. Same key as the session, nothing new to configure.
 */
export function signPayload(data: Record<string, unknown>, ttlMs: number): string {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + ttlMs })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readPayload<T extends Record<string, unknown>>(raw: string | undefined | null): T | null {
  if (!raw || raw.length > 4096 || !raw.includes(".")) return null;
  const [body, sig] = raw.split(".");
  const expected = sign(body);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp?: unknown };
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export function makeToken(userId: string, handle: string, version = 0): string {
  const body = Buffer.from(JSON.stringify({ uid: userId, h: handle, v: version, exp: Date.now() + SESSION_MAX_AGE * 1000 })).toString(
    "base64url",
  );
  return `${body}.${sign(body)}`;
}

export function readToken(token: string | undefined | null): { uid: string; handle: string; v: number } | null {
  if (!token || token.length > 2048 || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = sign(body);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed.exp === "number" && parsed.exp < Date.now()) return null;
    return { uid: String(parsed.uid), handle: String(parsed.h), v: typeof parsed.v === "number" ? parsed.v : 0 };
  } catch {
    return null;
  }
}
