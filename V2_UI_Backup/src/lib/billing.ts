import Stripe from "stripe";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isInterval, isTierKey } from "@/lib/tiers";
import { mailConfigured } from "@/lib/mail";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Demo plans ("try a plan, nothing is charged") are a preview tool, not a product: a demo plan unlocks
 * everything a paid one does (no ads, several alert islands, unlimited alert profiles, the Admiral export).
 * They used to switch on automatically whenever Stripe was absent — which is production today, because
 * Stripe is not available to Bahamian businesses — so any member could grant themselves any plan.
 * Now they need an explicit ALLOW_DEMO_PLANS=true (set it on development or preview deployments only),
 * and they never apply once real payments are connected. Plans for real customers are given by staff
 * as complimentary plans (Members page) until a payment provider is live.
 */
export function demoPlansAllowed(): boolean {
  return !stripeConfigured() && process.env.ALLOW_DEMO_PLANS?.trim() === "true";
}

export function webhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  return client;
}

/** Public address of the site, used in checkout return links and emails. */
export function baseUrl(req: Request): string {
  const fixed = process.env.APP_URL?.trim();
  if (fixed) return fixed.replace(/\/+$/, "");
  const h = req.headers;
  const rawHost = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  // Anything that is not a plain host name is ignored, so a forged Host header cannot inject a path or a second address.
  const host = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i.test(rawHost) ? rawHost : "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * The address to put in links inside emails. A forged Host header could otherwise make us send a
 * victim a genuine-looking email that points at someone else's site, so when email is switched on
 * the site address must be set explicitly (APP_URL). Returns null when it is not safe to send.
 */
export function publicBase(req: Request): string | null {
  const fixed = process.env.APP_URL?.trim();
  if (fixed) return fixed.replace(/\/+$/, "");
  // Vercel tells every deployment its own public address, so email links work even if APP_URL was never set.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  if (mailConfigured()) return null;
  return baseUrl(req);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CLEARED = {
  adFreeTier: null,
  planInterval: null,
  planStatus: null,
  planRenewsAt: null,
  stripeSubscriptionId: null,
};

type Loose = Record<string, any>;

async function findUserId(sub: Loose): Promise<string | null> {
  const fromMeta = sub.metadata?.userId;
  if (typeof fromMeta === "string" && UUID_RE.test(fromMeta)) return fromMeta;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const conds = [eq(users.stripeSubscriptionId, String(sub.id))];
  if (customer) conds.push(eq(users.stripeCustomerId, String(customer)));
  const [u] = await db.select({ id: users.id }).from(users).where(or(...conds)).limit(1);
  return u?.id ?? null;
}

/** Applies one verified Stripe event to the matching account. Safe to run twice. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const obj = event.data.object as unknown as Loose;

  if (event.type === "checkout.session.completed") {
    if (obj.mode !== "subscription") return;
    // Wait for the money: a checkout that is still unpaid must not switch a plan on.
    if (obj.payment_status && obj.payment_status !== "paid" && obj.payment_status !== "no_payment_required") return;
    const userId = obj.metadata?.userId;
    const tier = obj.metadata?.tier;
    const interval = obj.metadata?.interval;
    if (typeof userId !== "string" || !UUID_RE.test(userId) || !isTierKey(tier)) return;
    await db
      .update(users)
      .set({
        adFreeTier: tier,
        planInterval: isInterval(interval) ? interval : "month",
        planStatus: "active",
        stripeCustomerId: typeof obj.customer === "string" ? obj.customer : null,
        stripeSubscriptionId: typeof obj.subscription === "string" ? obj.subscription : null,
      })
      .where(eq(users.id, userId));
    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const userId = await findUserId(obj);
    if (!userId) return;

    const status = String(obj.status);
    if (event.type === "customer.subscription.deleted" || status === "canceled" || status === "incomplete_expired") {
      await db.update(users).set(CLEARED).where(eq(users.id, userId));
      return;
    }

    let planStatus: string | null = null;
    if (status === "active" || status === "trialing") planStatus = obj.cancel_at_period_end ? "canceling" : "active";
    else if (status === "past_due" || status === "unpaid") planStatus = "past_due";
    if (!planStatus) return; // incomplete: wait for the next event

    const item = obj.items?.data?.[0];
    const endSeconds = obj.current_period_end ?? item?.current_period_end;
    const tier = obj.metadata?.tier;
    const interval = item?.price?.recurring?.interval ?? obj.metadata?.interval;

    await db
      .update(users)
      .set({
        ...(isTierKey(tier) ? { adFreeTier: tier } : {}),
        ...(isInterval(interval) ? { planInterval: interval } : {}),
        planStatus,
        planRenewsAt: typeof endSeconds === "number" ? new Date(endSeconds * 1000) : null,
        stripeSubscriptionId: String(obj.id),
      })
      .where(eq(users.id, userId));
  }
}
