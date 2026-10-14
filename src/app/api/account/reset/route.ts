import { NextResponse } from "next/server";
import { readJson } from "@/lib/validate";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountTokens, users } from "@/db/schema";
import { consumeToken, peekToken } from "@/lib/account";
import { hashPassword } from "@/lib/auth";
import { checkPassword } from "@/lib/password";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";


const BAD_LINK = "This reset link is not valid any more. Ask for a new one.";

export async function POST(req: Request) {
  const gate = hit(`reset:${clientIp(req)}`, 10, 15 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "attempts");

  const body = await readJson(req);
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  // Look first without using the link up, so a password that is too weak does not waste it.
  const found = await peekToken(token, "reset_password");
  if (!found) return NextResponse.json({ error: BAD_LINK }, { status: 400 });
  const [u] = await db.select().from(users).where(eq(users.id, found.userId)).limit(1);
  if (!u) return NextResponse.json({ error: BAD_LINK }, { status: 400 });

  const problem = checkPassword(password, { handle: u.handle, email: u.email ?? undefined });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const used = await consumeToken(token, "reset_password");
  if (!used) return NextResponse.json({ error: BAD_LINK }, { status: 400 });

  await db
    .update(users)
    .set({
      passwordHash: hashPassword(password),
      passwordChangedAt: new Date(),
      // Changing the password signs the member out everywhere, which is what you want after a reset.
      sessionVersion: sql`${users.sessionVersion} + 1`,
      // They just received a link at this address, so it is proven to work.
      emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
    })
    .where(eq(users.id, u.id));
  await db.delete(accountTokens).where(and(eq(accountTokens.userId, u.id), eq(accountTokens.kind, "reset_password")));

  return NextResponse.json({ ok: true });
}
