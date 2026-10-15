import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendVerificationEmail } from "@/lib/account";
import { verifyPassword } from "@/lib/auth";
import { publicBase } from "@/lib/billing";
import { sharedExhausted, sharedForget, hit, sharedRecord, tooMany } from "@/lib/ratelimit";
import { EMAIL_RE, text, readJson } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";


/** Change your email. Needs your password, and the new address has to be confirmed again. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const gate = hit(`emailchange:${viewer.userId}`, 5, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "email changes");
  const failKey = `pwfail:${viewer.userId}`;
  const lock = await sharedExhausted(failKey, 6, 15 * 60_000);
  if (lock.blocked) return tooMany(lock.retryAfter, "password attempts");

  const body = await readJson(req);
  const email = text(body.email, 160).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });

  const [u] = await db.select().from(users).where(eq(users.id, viewer.userId)).limit(1);
  if (!u || !(await verifyPassword(password, u.passwordHash))) {
    await sharedRecord(failKey, 15 * 60_000);
    return NextResponse.json({ error: "Your password is not right." }, { status: 401 });
  }
  await sharedForget(failKey);
  if (u.email === email) return NextResponse.json({ error: "That is already your email address." }, { status: 400 });

  try {
    await db.update(users).set({ email, emailVerifiedAt: null }).where(eq(users.id, u.id));
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    if ((err?.code ?? err?.cause?.code) === "23505") {
      return NextResponse.json({ error: "Another account already uses that email address." }, { status: 409 });
    }
    throw e;
  }
  const mail = await sendVerificationEmail({ id: u.id, handle: u.handle, email }, publicBase(req));
  return NextResponse.json({ ok: true, mail });
}
