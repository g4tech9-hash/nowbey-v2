import { NextResponse } from "next/server";
import { readJson } from "@/lib/validate";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { baseUrl, stripe, stripeConfigured } from "@/lib/billing";
import { TIERS, isInterval, isTierKey, priceCents } from "@/lib/tiers";


export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) {
    return NextResponse.json(
      { error: "Sign in first, so your plan is attached to your account.", needsLogin: true },
      { status: 401 },
    );
  }

  const body = await readJson(req);
  const tier = body.tier;
  const interval = isInterval(body.interval) ? body.interval : "month";
  if (!isTierKey(tier)) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  if (viewer.status === "comp") {
    return NextResponse.json({ error: "Your plan is complimentary from NowBey, so there is nothing to buy." }, { status: 409 });
  }

  // A real subscription is changed or cancelled in the billing portal, never by buying a second one.
  if (viewer.hasSubscription && viewer.tier && viewer.status !== "sandbox") {
    return NextResponse.json(
      { error: "You already have a plan. Use Manage billing on your account page to change or cancel it." },
      { status: 409 },
    );
  }

  // Demo mode: no payment provider is connected, so nothing is charged.
  if (!stripeConfigured()) {
    await db
      .update(users)
      .set({ adFreeTier: tier, planInterval: interval, planStatus: "sandbox", planRenewsAt: null })
      .where(eq(users.id, viewer.userId));
    return NextResponse.json({ mode: "demo", tier, interval });
  }

  const base = baseUrl(req);
  const meta = { userId: viewer.userId, tier, interval };
  const [existing] = await db
    .select({ customer: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, viewer.userId))
    .limit(1);

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      ...(existing?.customer ? { customer: existing.customer } : viewer.email ? { customer_email: viewer.email } : {}),
      client_reference_id: viewer.userId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: priceCents(tier, interval),
            recurring: { interval },
            product_data: {
              name: `NowBey ${TIERS[tier].name}`,
              description: interval === "year" ? "Billed once a year, two months free" : "Billed monthly",
            },
          },
        },
      ],
      metadata: meta,
      subscription_data: { metadata: meta },
      allow_promotion_codes: true,
      success_url: `${base}/support?checkout=success`,
      cancel_url: `${base}/support?checkout=cancelled`,
    });
    return NextResponse.json({ mode: "stripe", url: session.url });
  } catch (e) {
    console.error("stripe checkout failed", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "We could not reach the payment provider. You were not charged. Please try again in a moment." },
      { status: 502 },
    );
  }
}
