/**
 * Session plumbing for route handlers and server components: the cookie, the bearer header, and the
 * re-exports of everything in `src/lib/secret.ts` so callers keep importing from one place.
 */
import { cookies, headers } from "next/headers";
import { SESSION_MAX_AGE, readToken, serverSecret } from "@/lib/secret";

export {
  SESSION_MAX_AGE,
  hashPassword,
  passwordNeedsRehash,
  makeToken,
  readPayload,
  readToken,
  serverSecret,
  signPayload,
  verifyPassword,
} from "@/lib/secret";

const COOKIE = "nowbey_session";

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
  const secure = process.env.NODE_ENV === "production";
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0,
  });
}
