import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { baseUrl, stripe, stripeConfigured } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Opens the Stripe billing portal, or ends a demo plan. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (viewer.status === "sandbox") {
    await db
      .update(users)
      .set({ adFreeTier: null, planInterval: null, planStatus: null, planRenewsAt: null })
      .where(eq(users.id, viewer.userId));
    return NextResponse.json({ done: true });
  }

  const [u] = await db.select({ customer: users.stripeCustomerId }).from(users).where(eq(users.id, viewer.userId)).limit(1);
  if (!u?.customer || !stripeConfigured()) {
    return NextResponse.json({ error: "There is no paid plan on this account." }, { status: 400 });
  }
  try {
    const portal = await stripe().billingPortal.sessions.create({
      customer: u.customer,
      return_url: `${baseUrl(req)}/you`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error("stripe portal failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "We could not open billing just now. Please try again in a moment." }, { status: 502 });
  }
}
