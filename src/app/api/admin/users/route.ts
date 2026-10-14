import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { issueToken } from "@/lib/account";
import { audit } from "@/lib/audit";
import { baseUrl } from "@/lib/billing";
import { isEnvAdmin, normalizeHandle } from "@/lib/handles";
import { requireStaff } from "@/lib/staff";
import { isTierKey } from "@/lib/tiers";
import { text, readJson } from "@/lib/validate";


const ROLES = ["resident", "editor", "admin"];

const fail = (error: string, status = 409) => NextResponse.json({ error }, { status });

/** Manage a member. Admins only. Every change is written to the activity log. */
export async function PATCH(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actor = gate.viewer;
  const actorName = actor.handle ?? "admin";

  const body = await readJson(req);
  const [t] = await db.select().from(users).where(eq(users.handle, normalizeHandle(body.handle))).limit(1);
  if (!t) return fail("No member with that handle.", 404);

  const isSelf = t.id === actor.userId;
  const targetIsAdmin = t.role === "admin" || isEnvAdmin(t.handle);
  const bump = sql`${users.sessionVersion} + 1`;

  switch (body.action) {
    case "setRole": {
      const role = String(body.role ?? "");
      if (!ROLES.includes(role)) return fail("Choose resident, editor or admin.", 400);
      if (isSelf) return fail("You cannot change your own role. Ask another admin.");
      if (isEnvAdmin(t.handle)) {
        return fail("This member is an admin through ADMIN_HANDLES in the server settings. Change it there.");
      }
      if (t.role === role) return NextResponse.json({ ok: true });
      await db.update(users).set({ role }).where(eq(users.id, t.id));
      await audit(actorName, "role.set", "user", t.id, t.handle, `${t.role} → ${role}`);
      return NextResponse.json({ ok: true });
    }

    case "suspend": {
      if (isSelf) return fail("You cannot suspend yourself.");
      if (targetIsAdmin) return fail("Admins cannot be suspended. Remove their admin role first.");
      const reason = text(body.reason, 200);
      await db
        .update(users)
        .set({ status: "suspended", suspendedReason: reason || null, suspendedAt: new Date(), sessionVersion: bump })
        .where(eq(users.id, t.id));
      await audit(actorName, "user.suspend", "user", t.id, t.handle, reason || null);
      return NextResponse.json({ ok: true });
    }

    case "unsuspend": {
      await db.update(users).set({ status: "active", suspendedReason: null, suspendedAt: null }).where(eq(users.id, t.id));
      await audit(actorName, "user.unsuspend", "user", t.id, t.handle);
      return NextResponse.json({ ok: true });
    }

    case "setPlan": {
      // Complimentary plans are for community partners and staff. A member who pays through Stripe is managed in Stripe.
      const real = Boolean(t.stripeSubscriptionId) && !["sandbox", "comp"].includes(t.planStatus ?? "");
      if (real) return fail("This member pays through Stripe. Change or cancel their plan in Stripe, not here.");
      const tier = body.tier === null || body.tier === "" || body.tier === undefined ? null : body.tier;
      if (tier !== null && !isTierKey(tier)) return fail("Unknown plan.", 400);
      await db
        .update(users)
        .set(
          tier === null
            ? { adFreeTier: null, planInterval: null, planStatus: null, planRenewsAt: null }
            : { adFreeTier: tier, planInterval: null, planStatus: "comp", planRenewsAt: null },
        )
        .where(eq(users.id, t.id));
      await audit(actorName, tier ? "plan.grant" : "plan.remove", "user", t.id, t.handle, tier ? `complimentary ${tier}` : `was ${t.adFreeTier ?? "none"}`);
      return NextResponse.json({ ok: true });
    }

    case "signOutEverywhere": {
      await db.update(users).set({ sessionVersion: bump }).where(eq(users.id, t.id));
      await audit(actorName, "user.signout", "user", t.id, t.handle);
      return NextResponse.json({ ok: true });
    }

    case "resetLink": {
      // For members who cannot get email, or when email is not set up. The link is shown once and never stored in the log.
      const raw = await issueToken(t.id, "reset_password", null, 3600_000);
      await audit(actorName, "user.resetlink", "user", t.id, t.handle, "one-hour password reset link created");
      return NextResponse.json({ ok: true, url: `${baseUrl(req)}/reset-password?token=${raw}` });
    }

    case "markVerified": {
      if (!t.email) return fail("This member has no email address to confirm.");
      await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, t.id));
      await audit(actorName, "user.verify", "user", t.id, t.handle, t.email);
      return NextResponse.json({ ok: true });
    }

    default:
      return fail("Unknown action.", 400);
  }
}
