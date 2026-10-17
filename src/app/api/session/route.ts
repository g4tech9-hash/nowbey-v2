import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { users } from "@/db/schema";
import { clearSessionCookie, hashPassword, makeToken, passwordNeedsRehash, setSessionCookie, verifyPassword } from "@/lib/auth";
import { getViewer, type Viewer } from "@/lib/viewer";
import { PARISHES } from "@/lib/geo";
import { clientIp, sharedExhausted, sharedForget, sharedHit, sharedRecord, tooMany } from "@/lib/ratelimit";
import { EMAIL_RE, text, readJson } from "@/lib/validate";
import { badOrigin, dbNotConfigured, hasBadOrigin } from "@/lib/http";
import { HANDLE_RE, envAdminHandles, handleProblem, isEnvAdmin, mayClaimAdminHandle, normalizeHandle } from "@/lib/handles";
import { MAX_PASSWORD, checkPassword } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/account";
import { publicBase } from "@/lib/billing";
import { mailConfigured } from "@/lib/mail";



const FAIL_WINDOW = 15 * 60_000;
const EMAIL_TAKEN = "An account with that email already exists. Try signing in, or reset your password.";

// A fixed hash to check against when the account does not exist, so "no such account" and "wrong password" take the same time.
let decoyHash: string | null = null;

function publicUser(v: Viewer) {
  return {
    handle: v.handle,
    displayName: v.displayName,
    email: v.email,
    emailVerified: v.emailVerified,
    parish: v.parish,
    isAdmin: v.isAdmin,
    isStaff: v.isEditor,
    verified: v.verified,
    plan: { tier: v.tier, interval: v.interval, status: v.status, renewsAt: v.renewsAt },
  };
}

/** The name of the unique rule that was broken, or null if this was some other error. */
function violatedConstraint(e: unknown): string | null {
  const err = e as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  if ((err?.code ?? err?.cause?.code) !== "23505") return null;
  return err?.constraint ?? err?.cause?.constraint ?? "unknown";
}

export async function GET() {
  const viewer = await getViewer();
  return NextResponse.json({ user: viewer.signedIn ? publicUser(viewer) : null });
}

export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  // Without a database nobody can sign in or register — say so in words the form can show,
  // instead of letting the first user query blow up into an unreadable 500.
  if (!hasDatabase()) return dbNotConfigured();
  const body = await readJson(req);
  // The mobile app has no cookie jar, so it asks for the token and sends it back as a bearer token.
  const native = req.headers.get("x-nowbey-client") === "native";
  const ip = clientIp(req);
  const rawPassword = typeof body.password === "string" ? body.password : "";
  // Sign-up keeps the password exactly as typed except for accidental spaces at either end.
  const password = body.intent === "signup" ? rawPassword.trim() : rawPassword;
  const intent = body.intent === "signup" ? "signup" : "signin";

  let userId: string;
  let userHandle: string;
  let displayName: string;
  let version: number;
  let created = false;

  if (intent === "signup") {
    const handle = normalizeHandle(body.handle);
    const handleIssue = handleProblem(handle);
    if (handleIssue) return NextResponse.json({ error: handleIssue }, { status: 400 });

    // The email is how we help someone who forgets their password, so it is required.
    const email = text(body.email, 160).toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address. It is how we help you if you forget your password." }, { status: 400 });
    }
    // A handle in ADMIN_HANDLES carries admin rights, so only an address in ADMIN_EMAILS may register it.
    // Everyone else gets the same answer as any other reserved word.
    if (isEnvAdmin(handle) && !mayClaimAdminHandle(email)) {
      return NextResponse.json({ error: "That handle is reserved. Please choose another." }, { status: 400 });
    }
    const passwordIssue = checkPassword(password, { handle, email });
    if (passwordIssue) return NextResponse.json({ error: passwordIssue }, { status: 400 });

    const gate = await sharedHit(`signup:${ip}`, 10, 60 * 60_000);
    if (!gate.ok) return tooMany(gate.retryAfter, "sign-ups");

    const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (emailTaken) return NextResponse.json({ error: EMAIL_TAKEN }, { status: 409 });

    const parishIn = text(body.parish, 40);
    let row: typeof users.$inferSelect;
    try {
      [row] = await db
        .insert(users)
        .values({
          handle,
          displayName: text(body.displayName, 60) || handle,
          email,
          parish: (PARISHES as readonly string[]).includes(parishIn) ? parishIn : null,
          passwordHash: await hashPassword(password),
          lastLoginAt: new Date(),
        })
        .returning();
    } catch (e) {
      // Two people picking the same handle (or email) at the same moment: the database lets only one through.
      const rule = violatedConstraint(e);
      if (rule) {
        return NextResponse.json({ error: rule.includes("email") ? EMAIL_TAKEN : "That handle is taken on NowBey." }, { status: 409 });
      }
      throw e;
    }
    userId = row.id;
    userHandle = row.handle;
    displayName = row.displayName;
    version = row.sessionVersion;
    created = true;

    // A handle listed in ADMIN_HANDLES is an admin the moment it exists, so a handle on that list must
    // never sit unclaimed: whoever registers it first would take the keys. Shout in the server log
    // (visible in the Vercel dashboard) when that happens, and claim owner handles yourself.
    if (envAdminHandles().includes(row.handle.toLowerCase())) {
      console.warn(`[admin] handle "${row.handle}" is listed in ADMIN_HANDLES and was just claimed by a new sign-up`);
    }

    const base = publicBase(req);
    after(async () => {
      try {
        await sendVerificationEmail({ id: row.id, handle: row.handle, email }, base);
      } catch (e) {
        console.error("verification email failed", e instanceof Error ? e.message : e);
      }
    });
  } else {
    // Members can sign in with their handle or their email.
    const ident = typeof body.handle === "string" ? body.handle.trim().toLowerCase().replace(/^@/, "").slice(0, 160) : "";
    const byEmail = ident.includes("@");
    if (!ident || (byEmail ? !EMAIL_RE.test(ident) : !HANDLE_RE.test(ident))) {
      return NextResponse.json({ error: "Enter your handle, or the email you signed up with." }, { status: 400 });
    }
    if (!password) return NextResponse.json({ error: "Enter your password." }, { status: 400 });
    if (password.length > MAX_PASSWORD) return NextResponse.json({ error: "Handle and password do not match." }, { status: 401 });

    // Only wrong passwords count against you, and the per-account count is tied to your address, so a stranger
    // cannot lock you out of your own account.
    const ipKey = `loginfail:ip:${ip}`;
    const pairKey = `loginfail:${ip}:${ident}`;
    const [blocked, pairBlocked] = await Promise.all([sharedExhausted(ipKey, 30, FAIL_WINDOW), sharedExhausted(pairKey, 6, FAIL_WINDOW)]);
    if (blocked.blocked || pairBlocked.blocked) {
      return tooMany(Math.max(blocked.retryAfter, pairBlocked.retryAfter), "sign-in attempts");
    }

    const [existing] = await db.select().from(users).where(byEmail ? eq(users.email, ident) : eq(users.handle, ident)).limit(1);
    let ok = false;
    let matched = password;
    if (existing) {
      ok = await verifyPassword(password, existing.passwordHash);
    } else {
      decoyHash ??= await hashPassword("decoy-password");
      await verifyPassword(password, decoyHash); // result ignored: only here to spend the same time
    }
    // Phone keyboards sometimes add a space after a word they "complete". Passwords are saved without outer spaces
    // on sign-up, so also accept the typed password with outer spaces removed.
    if (existing && !ok && password !== password.trim()) {
      ok = await verifyPassword(password.trim(), existing.passwordHash);
      matched = password.trim();
    }
    if (!existing || !ok) {
      await Promise.all([sharedRecord(ipKey, FAIL_WINDOW), sharedRecord(pairKey, FAIL_WINDOW)]);
      // Handles are public (they appear on reports), so it is fine to say which part was wrong. Email logins stay vague.
      const message = byEmail
        ? "Email and password do not match. If you forgot your password, use the reset link."
        : !existing
          ? `No account has the handle @${ident}. Check the spelling, or tap Create account.`
          : "That password is not right. If you forgot it, use the reset link.";
      return NextResponse.json({ error: message }, { status: 401 });
    }
    await sharedForget(pairKey);
    // Only tell someone their account is suspended once they have proved it is theirs.
    if (existing.status === "suspended") {
      return NextResponse.json(
        { error: "This account has been suspended. If you think that is a mistake, please contact NowBey." },
        { status: 403 },
      );
    }
    // The member just proved the password, so an older hash format is upgraded in place, from the exact value
    // that matched. Nobody is ever asked to reset because the hashing got stronger.
    const upgrade = passwordNeedsRehash(existing.passwordHash) ? { passwordHash: await hashPassword(matched) } : {};
    await db.update(users).set({ lastLoginAt: new Date(), ...upgrade }).where(eq(users.id, existing.id));
    userId = existing.id;
    userHandle = existing.handle;
    displayName = existing.displayName;
    version = existing.sessionVersion;
  }

  const token = makeToken(userId, userHandle, version);
  await setSessionCookie(token);
  return NextResponse.json({
    user: { handle: userHandle, displayName },
    created,
    ...(created ? { emailEnabled: mailConfigured() } : {}),
    ...(native ? { token } : {}),
  });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
