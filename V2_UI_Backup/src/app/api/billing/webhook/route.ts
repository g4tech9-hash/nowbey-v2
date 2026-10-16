import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { stripeEvents } from "@/db/schema";
import { handleStripeEvent, stripe, stripeConfigured, webhookConfigured } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!stripeConfigured() || !webhookConfigured()) {
    return NextResponse.json({ error: "Payments are not set up on this server." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const raw = await req.text(); // must be the untouched body or the signature will not match
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature ?? "", process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  const [fresh] = await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning();
  if (!fresh) return NextResponse.json({ received: true, duplicate: true });

  try {
    await handleStripeEvent(event);
  } catch (e) {
    // Forget the event so Stripe's retry is processed instead of being skipped as a duplicate.
    await db.delete(stripeEvents).where(eq(stripeEvents.id, event.id));
    console.error("stripe webhook failed", event.type, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not apply that event." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
