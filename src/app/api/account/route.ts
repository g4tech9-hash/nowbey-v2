import { NextResponse } from "next/server";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions, incidentUpdates, incidents, users } from "@/db/schema";
import { consumeToken, peekToken } from "@/lib/account";
import { clearSessionCookie, verifyPassword } from "@/lib/auth";
import { PARISHES } from "@/lib/geo";
import { isEnvAdmin } from "@/lib/handles";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { sharedExhausted, sharedForget, sharedRecord, tooMany } from "@/lib/ratelimit";
import { text, readJson } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";



/** Change the name shown on your reports, or your home island. */
export async function PATCH(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await readJson(req);
  const displayName = text(body.displayName, 60);
  if (displayName.length < 2) return NextResponse.json({ error: "Your name needs at least 2 characters." }, { status: 400 });
  const parishIn = text(body.parish, 40);
  // An unrecognised island is refused rather than silently written as null: a partial write that erases a
  // member's home island also changes which alerts reach them, and "saved" must mean saved.
  if (parishIn && !(PARISHES as readonly string[]).includes(parishIn)) {
    return NextResponse.json({ error: "Pick one of the islands in the list." }, { status: 400 });
  }
  const parish = parishIn || null;

  await db.update(users).set({ displayName, parish }).where(eq(users.id, viewer.userId));
  return NextResponse.json({ ok: true });
}

/**
 * Delete your own account. Your reports stay for the neighbours who confirmed them, but your name is taken off
 * them. A paid plan has to be cancelled first so nobody keeps being charged for an account that no longer exists.
 */
export async function DELETE(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await readJson(req);
  const [u] = await db.select().from(users).where(eq(users.id, viewer.userId)).limit(1);
  if (!u) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  // Two ways to prove it is really you. A password works for password accounts; a one-time emailed token
  // works for accounts opened with Google (which have no password) and for anyone on a borrowed device.
  const token = typeof body.token === "string" ? body.token : "";
  if (token) {
    // Peek first: if a paid plan still needs cancelling, the person should not have to request a new link
    // just to be told that. The token is spent only once every other check has passed.
    const row = await peekToken(token, "delete_account");
    if (!row || row.userId !== u.id) {
      return NextResponse.json(
        { error: "That confirmation link has expired or was already used. Ask for a new one and try again." },
        { status: 400 },
      );
    }
  } else {
    const failKey = `pwfail:${viewer.userId}`;
    const lock = await sharedExhausted(failKey, 6, 15 * 60_000);
    if (lock.blocked) return tooMany(lock.retryAfter, "password attempts");

    const password = typeof body.password === "string" ? body.password : "";
    if (!u.passwordHash) {
      return NextResponse.json(
        {
          error:
            "This account was opened with Google, so it has no password. Use “Email me a confirmation link” instead.",
        },
        { status: 400 },
      );
    }
    if (!(await verifyPassword(password, u.passwordHash))) {
      await sharedRecord(failKey, 15 * 60_000);
      return NextResponse.json({ error: "That password is not right." }, { status: 401 });
    }
    await sharedForget(failKey);
  }

  if (u.role === "admin" || isEnvAdmin(u.handle)) {
    return NextResponse.json({ error: "Admin accounts cannot be deleted here. Ask another admin to change your role first." }, { status: 409 });
  }
  if (u.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "You still have a paid plan. Cancel it from Manage billing first, and once it has ended you can delete your account." },
      { status: 409 },
    );
  }

  if (token) {
    // Single use, enforced by the conditional update: two requests racing here cannot both succeed.
    const spent = await consumeToken(token, "delete_account");
    if (!spent || spent.userId !== u.id) {
      return NextResponse.json({ error: "That confirmation link was just used. If the account still exists, ask for a new one." }, { status: 400 });
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(incidents)
      .set({ userId: null, authorHandle: "someone", anonymous: true })
      .where(or(eq(incidents.userId, u.id), eq(incidents.authorHandle, u.handle)));
    await tx.update(incidentUpdates).set({ authorHandle: "someone", actorKey: null }).where(eq(incidentUpdates.authorHandle, u.handle));
    await tx.delete(alertSubscriptions).where(eq(alertSubscriptions.userId, u.id));
    // A comment that other people replied to is blanked rather than deleted, so their replies keep their context.
    // Everything else they wrote goes with them, and so do their reactions, which updates every count by itself.
    await tx.execute(
      sql`update comments set status = 'removed', body = '', author_handle = 'someone', user_id = null where user_id = ${u.id} and exists (select 1 from comments r where r.parent_id = comments.id and r.user_id is distinct from ${u.id})`,
    );
    await tx.execute(sql`delete from comments where user_id = ${u.id}`);
    // Their Island Life posts and photos, with every comment and reaction under them, are removed by the database along with the account.
    await tx.delete(users).where(eq(users.id, u.id)); // one-time links go with it
  });

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
