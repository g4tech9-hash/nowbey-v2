import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { readToken, sessionToken } from "@/lib/auth";
import { entitledTier, isInterval, type Interval, type TierKey } from "@/lib/tiers";
import { demoPlansAllowed } from "@/lib/billing";
import { envAdminActive } from "@/lib/handles";

export type Viewer = {
  signedIn: boolean;
  userId: string | null;
  handle: string | null;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  parish: string | null;
  role: string | null;
  memberSince: Date | null;
  tier: TierKey | null;
  interval: Interval | null;
  /** The plan's state: active, sandbox (demo), comp (complimentary), past_due or canceling. */
  status: string | null;
  renewsAt: Date | null;
  adFree: boolean;
  verified: boolean;
  /** Can manage members and settings. */
  isAdmin: boolean;
  /** Can moderate reports and the news wire. Every admin is also an editor. */
  isEditor: boolean;
  hasSubscription: boolean;
};

export const ANON: Viewer = {
  signedIn: false,
  userId: null,
  handle: null,
  displayName: null,
  email: null,
  emailVerified: false,
  parish: null,
  role: null,
  memberSince: null,
  tier: null,
  interval: null,
  status: null,
  renewsAt: null,
  adFree: false,
  verified: false,
  isAdmin: false,
  isEditor: false,
  hasSubscription: false,
};

/**
 * Who is making this request, and what plan are they on. Works for the website (cookie) and the mobile app
 * (bearer token). A deleted or suspended member, or a session that was signed out remotely, counts as signed out.
 */
export async function getViewer(): Promise<Viewer> {
  const session = readToken(await sessionToken());
  if (!session) return ANON;
  let u: typeof users.$inferSelect | undefined;
  try {
    [u] = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
  } catch {
    try {
      // Retry once: an idle pooled socket that Neon closed while the function was frozen fails on
      // first touch and is evicted, so the second attempt opens a fresh connection instead of
      // falsely treating a signed-in member as signed out.
      [u] = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
    } catch (err) {
      // The root layout of every page calls this, so a database that is briefly unreachable — or not configured at
      // all, as on a Preview deployment without DATABASE_URL — must not take the whole site down. The visitor is
      // treated as signed out for this request and signed in again on the next one.
      console.error("[viewer] session lookup failed, treating as signed out:", (err as Error).message);
      return ANON;
    }
  }
  if (!u || u.status === "suspended" || u.sessionVersion !== session.v) return ANON;
  const tier = entitledTier(u, demoPlansAllowed());
  // ADMIN_HANDLES grants admin only with a confirmed email: a handle on that list that someone else managed
  // to register is worth nothing until they can also read the inbox it was registered with.
  const isAdmin = u.role === "admin" || envAdminActive(u);
  return {
    signedIn: true,
    userId: u.id,
    handle: u.handle,
    displayName: u.displayName,
    email: u.email,
    emailVerified: Boolean(u.emailVerifiedAt),
    parish: u.parish,
    role: u.role,
    memberSince: u.createdAt,
    tier,
    interval: isInterval(u.planInterval) ? u.planInterval : null,
    status: tier ? (u.planStatus ?? "active") : null,
    renewsAt: u.planRenewsAt,
    adFree: tier !== null,
    verified: tier === "admiral",
    isAdmin,
    isEditor: isAdmin || u.role === "editor",
    hasSubscription: Boolean(u.stripeSubscriptionId),
  };
}
