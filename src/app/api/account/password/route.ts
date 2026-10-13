import { NextResponse } from "next/server";
import { readJson } from "@/lib/validate";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { reissueSession } from "@/lib/account";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { checkPassword } from "@/lib/password";
import { exhausted, forget, record, tooMany } from "@/lib/ratelimit";
import { getViewer } from "@/lib/viewer";


export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const failKey = `pwfail:${viewer.userId}`;
  const lock = exhausted(failKey, 6, 15 * 60_000);
  if (lock.blocked) return tooMany(lock.retryAfter, "password attempts");

  const body = await readJson(req);
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";

  const [u] = await db.select().from(users).where(eq(users.id, viewer.userId)).limit(1);
  if (!u || !verifyPassword(current, u.passwordHash)) {
    record(failKey, 15 * 60_000);
    return NextResponse.json({ error: "Your current password is not right." }, { status: 401 });
  }
  forget(failKey);

  const problem = checkPassword(next, { handle: u.handle, email: u.email ?? undefined });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (verifyPassword(next, u.passwordHash)) {
    return NextResponse.json({ error: "Choose a password you are not already using." }, { status: 400 });
  }

  // Signs out every other device. This one gets a fresh sign-in so you are not kicked out of your own change.
  const [row] = await db
    .update(users)
    .set({ passwordHash: hashPassword(next), passwordChangedAt: new Date(), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, u.id))
    .returning({ v: users.sessionVersion });
  const reissued = await reissueSession(req, u.id, u.handle, row.v);
  return NextResponse.json({ ok: true, ...reissued });
}
