import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { signPayload } from "@/lib/auth";
import { publicBase } from "@/lib/billing";
import { OAUTH_COOKIE, googleAuthUrl, googleConfigured, googleRedirectUri, makePkce } from "@/lib/google";
import { clientIp, hit } from "@/lib/ratelimit";
import { safeNext } from "@/lib/redirect";

export const dynamic = "force-dynamic";

const HANDSHAKE_TTL_MS = 10 * 60_000;

/**
 * Starts "Sign in with Google". One flow for both signing in and signing up — Google tells us the
 * address, and whether that address already has an account decides which one it was.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = publicBase(req) ?? url.origin;
  const native = url.searchParams.get("client") === "native";
  const next = safeNext(url.searchParams.get("next"));

  const fail = (code: string) =>
    native
      ? NextResponse.redirect(`nowbey://auth?error=${code}`)
      : NextResponse.redirect(`${base}/login?mode=signin&google=${code}`);

  if (!googleConfigured()) return fail("off");

  const gate = hit(`google:start:${clientIp(req)}`, 30, 60 * 60_000);
  if (!gate.ok) return fail("slow");

  const { verifier, challenge } = makePkce();
  const state = randomBytes(16).toString("base64url");

  const jar = await cookies();
  jar.set(OAUTH_COOKIE, signPayload({ state, verifier, next, native }, HANDSHAKE_TTL_MS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax", not "strict": the return trip from google.com is a cross-site navigation, and a strict
    // cookie would simply not be sent, breaking every sign-in.
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(HANDSHAKE_TTL_MS / 1000),
  });

  return NextResponse.redirect(googleAuthUrl({ redirectUri: googleRedirectUri(base), state, challenge }));
}
