import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isNativeClient, issueToken, sendGoogleLinkedEmail, type TokenKind } from "@/lib/account";
import { makeToken, readPayload, setSessionCookie } from "@/lib/auth";
import { publicBase } from "@/lib/billing";
import { envAdminHandles } from "@/lib/handles";
import {
  OAUTH_COOKIE,
  exchangeCode,
  googleConfigured,
  googleRedirectUri,
  handleFromEmail,
  isMissingColumn,
  readIdToken,
  type GoogleProfile,
} from "@/lib/google";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

type Handshake = { state: string; verifier: string; next: string; native: boolean };

/** Every handle that is spoken for: existing members plus the ones that carry admin rights from env. */
async function takenHandles(): Promise<string[]> {
  const rows = await db.select({ handle: users.handle }).from(users);
  return [...rows.map((r) => r.handle), ...envAdminHandles()];
}

/**
 * Google sends the browser back here. Finishes the handshake, then either signs an existing member in
 * or creates the account — and, for the app, hands back a one-time code instead of a cookie.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = publicBase(req) ?? url.origin;
  const jar = await cookies();
  const handshake = readPayload<Handshake>(jar.get(OAUTH_COOKIE)?.value);
  // One trip, one handshake: the cookie is spent whatever happens next.
  jar.delete(OAUTH_COOKIE);

  const native = handshake?.native ?? isNativeClient(req);
  const fail = (code: string, status = 307) =>
    native
      ? NextResponse.redirect(`nowbey://auth?error=${code}`, { status })
      : NextResponse.redirect(`${base}/login?mode=signin&google=${code}`, { status });

  // "Cancel" on the Google screen, or a refusal of the permission screen.
  if (url.searchParams.get("error")) return fail("cancelled");
  if (!googleConfigured()) return fail("off");

  const gate = hit(`google:cb:${clientIp(req)}`, 60, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "sign-in attempts");

  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  // The state in the URL must match the state this browser started with: that is the CSRF guard.
  if (!handshake || !state || state !== handshake.state || !code) return fail("state");

  const exchanged = await exchangeCode({ code, verifier: handshake.verifier, redirectUri: googleRedirectUri(base) });
  if ("error" in exchanged) {
    console.error("[google] token exchange failed:", exchanged.error);
    return fail("exchange");
  }
  const profile = readIdToken(exchanged.idToken);
  if (!profile) return fail("token");
  if (!profile.emailVerified) return fail("unverified");

  // Everything below touches users.google_sub. If that column has not been created yet, say so in plain
  // words rather than returning a 500 to someone who just tapped a button on a live site.
  try {
    return await completeSignIn({ profile, handshake, native, base, fail });
  } catch (e) {
    if (isMissingColumn(e)) {
      console.error("[google] users.google_sub is missing — run src/db/add-google-auth.sql on this database");
      return fail("setup");
    }
    throw e;
  }
}

/** The database half of the callback: link an existing account, or create one. */
async function completeSignIn(opts: {
  profile: GoogleProfile;
  handshake: Handshake;
  native: boolean;
  base: string;
  fail: (code: string, status?: number) => NextResponse;
}): Promise<NextResponse> {
  const { profile, handshake, native, base, fail } = opts;
  // 1. Already linked by Google subject id: this is a plain sign-in.
  let [user] = await db.select().from(users).where(eq(users.googleSub, profile.sub)).limit(1);
  let created = false;
  let linked = false;

  // 2. Or the address already has an account: link it (Google has verified the address for us).
  if (!user) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
    if (byEmail) {
      if (byEmail.googleSub && byEmail.googleSub !== profile.sub) {
        // The same address now belongs to a different Google account. Refuse rather than guess.
        console.error(`[google] account ${byEmail.handle} is linked to another Google account`);
        return fail("linked");
      }
      const wasUnverified = !byEmail.emailVerifiedAt;
      const [updated] = await db
        .update(users)
        .set({
          googleSub: profile.sub,
          emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
          // Linking an address that was never confirmed drops any session the account's old password
          // may have opened. This is the one case where somebody else could have been holding a
          // session for an address they do not own, so it is worth the small annoyance.
          ...(wasUnverified ? { sessionVersion: sql`${users.sessionVersion} + 1` } : {}),
        })
        .where(eq(users.id, byEmail.id))
        .returning();
      user = updated;
      linked = true;
      const mail = user.email ? await sendGoogleLinkedEmail({ id: user.id, handle: user.handle, email: user.email }, base) : "skipped";
      if (mail === "failed") console.error("[google] linked-notice email failed");
    }
  }

  // 3. Otherwise this is a new member. The handle comes from the address, never from a form field, and
  //    never from the ADMIN_HANDLES list — a handle there carries admin rights.
  if (!user) {
    const handle = handleFromEmail(profile.email, await takenHandles());
    try {
      const [row] = await db
        .insert(users)
        .values({
          handle,
          displayName: (profile.name ?? "").trim().slice(0, 80) || handle,
          email: profile.email,
          // No password at all: this account is opened with Google, and can get a password later
          // through the ordinary reset flow if the member wants one.
          passwordHash: null,
          googleSub: profile.sub,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        })
        .returning();
      user = row;
      created = true;
    } catch (e) {
      // Two sign-ins with the same address at once: the unique index decides, and this one retries.
      const rule = (e as { code?: string; constraint?: string }).code === "23505";
      if (!rule) throw e;
      const [again] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
      if (!again) return fail("exchange");
      user = again;
    }
  }

  if (!user) return fail("exchange");
  if (user.status === "suspended") return fail("suspended");

  if (!created) await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  // The app has no cookie jar: it gets a one-time code it redeems at /api/auth/google/native.
  if (native) {
    const handoff: TokenKind = "native_handoff";
    const ticket = await issueToken(user.id, handoff, null, 5 * 60_000);
    return NextResponse.redirect(`nowbey://auth?code=${encodeURIComponent(ticket)}`);
  }

  await setSessionCookie(makeToken(user.id, user.handle, user.sessionVersion));
  // A brand-new account has no island yet; the settings page is where that is asked for.
  const dest = created ? "/you/settings?welcome=1" : handshake.next;
  return NextResponse.redirect(`${base}${dest}`);
}

/** Kept so a stray POST cannot 500 on this route. */
export async function POST() {
  return NextResponse.json({ error: "Use the Google button." }, { status: 405 });
}
