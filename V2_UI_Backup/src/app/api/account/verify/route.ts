import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { consumeToken, sendVerificationEmail } from "@/lib/account";
import { baseUrl, publicBase } from "@/lib/billing";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { getViewer } from "@/lib/viewer";


/** The link in the confirmation email lands here. */
export async function GET(req: Request) {
  const gate = hit(`verify:${clientIp(req)}`, 20, 15 * 60_000);
  const base = baseUrl(req);
  if (!gate.ok) return NextResponse.redirect(`${base}/login?mode=signin&verified=0`);

  const token = new URL(req.url).searchParams.get("token") ?? "";
  const used = await consumeToken(token, "verify_email");
  let ok = false;
  if (used?.email) {
    // The link only works while the account still has the address it was sent to.
    const done = await db
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(and(eq(users.id, used.userId), eq(users.email, used.email)))
      .returning({ id: users.id });
    ok = done.length > 0;
  }
  const viewer = await getViewer();
  const flag = ok ? "1" : "0";
  return NextResponse.redirect(viewer.signedIn ? `${base}/you/settings?verified=${flag}` : `${base}/login?mode=signin&verified=${flag}`);
}

/** "Send it again". */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!viewer.email) return NextResponse.json({ error: "Add an email address first." }, { status: 400 });
  if (viewer.emailVerified) return NextResponse.json({ ok: true, already: true });

  const gate = hit(`verifysend:${viewer.userId}`, 3, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "confirmation emails");

  const mail = await sendVerificationEmail({ id: viewer.userId, handle: viewer.handle, email: viewer.email }, publicBase(req));
  return NextResponse.json({ ok: true, mail });
}
