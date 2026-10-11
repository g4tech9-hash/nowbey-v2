import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cookies, headers } from "next/headers";

const COOKIE = "nowbey_session";

let cachedSecret: string | null = null;

/**
 * The key that signs sign-in sessions. Use AUTH_SECRET when it is set. Otherwise a random key is
 * generated once and kept in .data/auth-secret, so sessions survive restarts and nobody can forge
 * one from the source code. (Running several servers? Set the same AUTH_SECRET on all of them.)
 */
export function serverSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv) return (cachedSecret = fromEnv);
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

export function makeToken(userId: string, handle: string, version = 0): string {
  const body = Buffer.from(JSON.stringify({ uid: userId, h: handle, v: version, exp: Date.now() + 1000 * 60 * 60 * 24 * 120 })).toString(
    "base64url",
  );
  return `${body}.${sign(body)}`;
}

export function readToken(token: string | undefined | null): { uid: string; handle: string; v: number } | null {
  if (!token || !token.includes(".")) return null;
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

/** The session token from an `Authorization: Bearer` header (mobile app) or the session cookie (website). */
export async function sessionToken(): Promise<string | undefined> {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const jar = await cookies();
  return jar.get(COOKIE)?.value;
}

export async function currentHandle(): Promise<string | null> {
  return readToken(await sessionToken())?.handle ?? null;
}

export async function currentUserId(): Promise<string | null> {
  return readToken(await sessionToken())?.uid ?? null;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  const h = await headers();
  // Mark the cookie Secure whenever the visitor reached us over https (including through a proxy).
  const secure = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 120,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
