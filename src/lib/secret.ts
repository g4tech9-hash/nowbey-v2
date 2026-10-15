/**
 * Every secret that does not need a request: the signing key, password hashing, session tokens and
 * the short-lived signed payloads the OAuth handshake hands to the browser.
 *
 * Nothing here imports Next.js, on purpose: the test suite can import this file directly and prove the
 * crypto and the token rules without a browser in the way. The request plumbing — reading the cookie
 * or the bearer header, setting the cookie — lives next door in `src/lib/auth.ts`.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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

export function hashPassword(password: string): string {
  const salt = randomBytes(12).toString("hex");
  const hash = scryptSync(password, salt, 40).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(password, salt, 40);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
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
