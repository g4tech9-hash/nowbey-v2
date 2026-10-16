import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { badgeGrants, deviceBans, deviceTokens, memberNotes, users } from "@/db/schema";
import { issueToken } from "@/lib/account";
import { audit } from "@/lib/audit";
import { baseUrl } from "@/lib/billing";
import { isEnvAdmin, normalizeHandle } from "@/lib/handles";
import { requireStaff } from "@/lib/staff";
import { isTierKey } from "@/lib/tiers";
import { dbInt, text, readJson } from "@/lib/validate";


const ROLES = ["resident", "editor", "admin"];

/**
 * The badges a person can hand out. "desk" comes from the role and is never
 * granted here.
 *
 *  - verified      a human checked this account is who it says it is
 *  - broadcaster   cleared to go live on the island feed. Deliberately separate
 *                  from "verified": being a real person does not make someone
 *                  fit to broadcast to the whole island, and a broadcaster ban
 *                  should be revocable without unpicking their identity.
 */
const GRANTABLE = ["verified", "broadcaster"];

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

    /**
     * A sentence a staff member wrote about this member. Append-only and never shown to the member —
     * that is the whole point of keeping it out of the account row. Kept separate from the activity log
     * because the log records what the system did, and this records what a person noticed.
     */
    case "note": {
      const note = text(body.body, 600);
      if (note.length < 2) return fail("Write the note first.", 400);
      await db.insert(memberNotes).values({ userId: t.id, authorHandle: actorName, body: note });
      await audit(actorName, "member.note", "user", t.id, t.handle, note.slice(0, 120));
      return NextResponse.json({ ok: true });
    }

    /**
     * Granting the verified badge. It means a person checked the account, so a reason is required —
     * a badge granted without one is not a verification, it is a decoration.
     */
    case "grantBadge": {
      const badge = String(body.badge ?? "verified");
      if (!GRANTABLE.includes(badge)) return fail("That badge cannot be granted by hand.", 400);
      const reason = text(body.reason, 200);
      if (reason.length < 4) return fail("Say what was checked. The reason is shown with the badge.", 400);

      let expiresAt: Date | null = null;
      if (typeof body.expiresAt === "string" && body.expiresAt.trim()) {
        const when = new Date(body.expiresAt);
        if (Number.isNaN(when.getTime())) return fail("That expiry date is not a date.", 400);
        if (when.getTime() <= Date.now()) return fail("An expiry in the past would delete the badge straight away. Leave it empty for no expiry.", 400);
        expiresAt = when;
      }

      // Granting it twice replaces the live grant rather than stacking two of the same badge.
      await db
        .update(badgeGrants)
        .set({ revokedAt: new Date(), revokedBy: actorName })
        .where(and(eq(badgeGrants.userId, t.id), eq(badgeGrants.badge, badge), isNull(badgeGrants.revokedAt)));
      await db.insert(badgeGrants).values({ userId: t.id, badge, reason, grantedBy: actorName, expiresAt });
      await audit(actorName, "badge.grant", "user", t.id, t.handle, `${badge}: ${reason}${expiresAt ? ` (until ${expiresAt.toISOString().slice(0, 10)})` : ""}`);
      return NextResponse.json({ ok: true });
    }

    /** Taking it back. Revoked, never deleted, so the record of who granted what survives. */
    case "revokeBadge": {
      const id = dbInt(body.id);
      if (!id) return fail("Which grant?", 400);
      const [grant] = await db
        .select()
        .from(badgeGrants)
        .where(and(eq(badgeGrants.id, id), eq(badgeGrants.userId, t.id)))
        .limit(1);
      if (!grant) return fail("No such badge grant.", 404);
      if (grant.revokedAt) return NextResponse.json({ ok: true });
      await db.update(badgeGrants).set({ revokedAt: new Date(), revokedBy: actorName }).where(eq(badgeGrants.id, id));
      await audit(actorName, "badge.revoke", "user", t.id, t.handle, `${grant.badge}: ${grant.reason}`);
      return NextResponse.json({ ok: true });
    }

    /**
     * Ban the device, not just the account.
     *
     * Suspending stops this person signing in; banning the device stops the
     * hardware, which is the only lever that still works when someone
     * re-registers with a fresh email. Every push token they have ever
     * registered is banned, so a new account on the same handset walks into a
     * closed door.
     *
     * The reason is required and stored: a device ban with no explanation is
     * indistinguishable from a mistake, and the member has no way to appeal
     * what they were never told.
     */
    case "banDevice": {
      const reason = text(body.reason, 300);
      if (reason.length < 4) return fail("Say why the device is being banned.", 400);

      // A ban can be temporary. Without a date it is permanent, which is the
      // safer default and must be a deliberate choice.
      let expiresAt: Date | null = null;
      if (typeof body.expiresAt === "string" && body.expiresAt.trim()) {
        const when = new Date(body.expiresAt);
        if (Number.isNaN(when.getTime())) return fail("That expiry date is not a date.", 400);
        if (when.getTime() <= Date.now()) return fail("An expiry in the past would expire the ban immediately. Leave it empty for permanent.", 400);
        expiresAt = when;
      }

      const tokens = await db
        .selectDistinct({ token: deviceTokens.token })
        .from(deviceTokens)
        .where(eq(deviceTokens.userId, t.id));
      if (!tokens.length) return fail("This member has no registered device to ban. Suspend the account instead.", 409);

      // Revoke any live ban first: the unique index is on (token, revoked_at),
      // so a second live ban for the same token would be rejected outright.
      await db
        .update(deviceBans)
        .set({ revokedAt: new Date(), revokedBy: actorName })
        .where(and(eq(deviceBans.userId, t.id), isNull(deviceBans.revokedAt)));

      await db.insert(deviceBans).values(
        tokens.map((r) => ({
          token: r.token,
          userId: t.id,
          authorHandle: t.handle,
          reason,
          bannedBy: actorName,
          expiresAt,
        })),
      );

      // Sign them out too. A device ban the app only checks on API calls would
      // leave an open session running until it next calls in.
      await db.update(users).set({ sessionVersion: bump }).where(eq(users.id, t.id));

      await audit(
        actorName,
        "device.ban",
        "user",
        t.id,
        t.handle,
        `${tokens.length} device(s): ${reason}${expiresAt ? ` until ${expiresAt.toISOString().slice(0, 10)}` : " (permanent)"}`,
      );
      return NextResponse.json({ ok: true, devices: tokens.length, expiresAt });
    }

    /** Lift a device ban. Revoked, never deleted, so the record survives. */
    case "unbanDevice": {
      const now = new Date();
      const lifted = await db
        .update(deviceBans)
        .set({ revokedAt: now, revokedBy: actorName })
        .where(and(eq(deviceBans.userId, t.id), isNull(deviceBans.revokedAt)))
        .returning({ id: deviceBans.id });
      await audit(actorName, "device.unban", "user", t.id, t.handle, `${lifted.length} ban(s) lifted`);
      return NextResponse.json({ ok: true, lifted: lifted.length });
    }

    /**
     * Grant or revoke the broadcaster badge. Same rules as the verified badge:
     * a reason is required, a repeat grant replaces the live one rather than
     * stacking, and revocation keeps the row for the record.
     */
    case "setBroadcaster": {
      const on = body.on === true;
      const reason = text(body.reason, 200);
      if (on && reason.length < 4) return fail("Say what was checked before clearing them to broadcast.", 400);

      if (on) {
        let expiresAt: Date | null = null;
        if (typeof body.expiresAt === "string" && body.expiresAt.trim()) {
          const when = new Date(body.expiresAt);
          if (Number.isNaN(when.getTime())) return fail("That expiry date is not a date.", 400);
          if (when.getTime() <= Date.now()) return fail("An expiry in the past would delete the badge straight away.", 400);
          expiresAt = when;
        }
        await db
          .update(badgeGrants)
          .set({ revokedAt: new Date(), revokedBy: actorName })
          .where(and(eq(badgeGrants.userId, t.id), eq(badgeGrants.badge, "broadcaster"), isNull(badgeGrants.revokedAt)));
        await db.insert(badgeGrants).values({ userId: t.id, badge: "broadcaster", reason, grantedBy: actorName, expiresAt });
        await audit(actorName, "badge.grant", "user", t.id, t.handle, `broadcaster: ${reason}`);
      } else {
        const [live] = await db
          .select()
          .from(badgeGrants)
          .where(and(eq(badgeGrants.userId, t.id), eq(badgeGrants.badge, "broadcaster"), isNull(badgeGrants.revokedAt)))
          .limit(1);
        if (!live) return NextResponse.json({ ok: true });
        await db.update(badgeGrants).set({ revokedAt: new Date(), revokedBy: actorName }).where(eq(badgeGrants.id, live.id));
        await audit(actorName, "badge.revoke", "user", t.id, t.handle, `broadcaster: ${live.reason}`);
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return fail("Unknown action.", 400);
  }
}
