import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendResetEmail } from "@/lib/account";
import { publicBase } from "@/lib/billing";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { EMAIL_RE, text, readJson } from "@/lib/validate";


/**
 * Always answers the same way, whether or not the address belongs to an account, so this cannot be used to
 * find out who is registered. The work happens after the reply so the timing does not give it away either.
 */
export async function POST(req: Request) {
  const gate = hit(`forgot:${clientIp(req)}`, 6, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "reset requests");

  const body = await readJson(req);
  const email = text(body.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter the email you signed up with." }, { status: 400 });
  }

  // At most three reset emails per address per hour, so nobody can be flooded with them.
  const perAddress = hit(`forgotmail:${email}`, 3, 60 * 60_000);
  if (perAddress.ok) {
    const base = publicBase(req);
    after(async () => {
      try {
        const [u] = await db
          .select({ id: users.id, handle: users.handle, email: users.email, status: users.status })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (u && u.email && u.status === "active") await sendResetEmail({ id: u.id, handle: u.handle, email: u.email }, base);
      } catch (e) {
        console.error("reset email failed", e instanceof Error ? e.message : e);
      }
    });
  }
  return NextResponse.json({ ok: true });
}
