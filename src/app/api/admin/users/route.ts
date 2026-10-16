import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { badgeGrants, bannedDevices, deviceTokens, memberNotes, pushTokens, users } from "@/db/schema";
import { issueToken } from "@/lib/account";
import { audit } from "@/lib/audit";
import { baseUrl } from "@/lib/billing";
import { tokenFingerprint } from "@/lib/command";
import { isEnvAdmin, normalizeHandle } from "@/lib/handles";
import { requireStaff } from "@/lib/staff";
import { isTierKey } from "@/lib/tiers";
import { UUID_RE, dbInt, text, readJson } from "@/lib/validate";


const ROLES = ["resident", "editor", "admin"];

/**
 * Badges a person can hand out. "desk" comes from the role and is never granted here.
 * "broadcaster" marks a trusted member whose phone can go live on the map (see /api/streams).
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

    /**
     * Ban one of this member's devices. The token row is deleted and its one-way fingerprint goes
     * on the ban list, so the device cannot re-register and every send path skips it. Banned by row
     * id (never by token) so the raw token never leaves the server. Use for stolen phones and
     * push abuse — for people, suspend the account instead.
     */
    case "banDevice": {
      const kind = String(body.kind ?? "");
      const rawId = kind === "app" ? String(body.id ?? "") : null;
      const webId = kind === "web" ? dbInt(body.id) : null;
      const reason = text(body.reason, 200) || "banned by staff";
      let token: string | null = null;
      let platform: string | null = null;
      if (kind !== "app" && kind !== "web") return fail("Unknown device kind.", 400);
      if (kind === "app" && rawId) {
        if (!UUID_RE.test(rawId)) return fail("Unknown device.", 400);
        const [row] = await db
          .select({ token: deviceTokens.token })
          .from(deviceTokens)
          .where(and(eq(deviceTokens.userId, t.id), eq(deviceTokens.id, rawId)))
          .limit(1);
        if (row) {
          token = row.token;
          platform = "expo";
          await db.delete(deviceTokens).where(and(eq(deviceTokens.userId, t.id), eq(deviceTokens.id, rawId)));
        }
      } else if (kind === "web" && webId) {
        const [row] = await db
          .select({ token: pushTokens.token, platform: pushTokens.platform })
          .from(pushTokens)
          .where(and(eq(pushTokens.userId, t.id), eq(pushTokens.id, webId)))
          .limit(1);
        if (row) {
          token = row.token;
          platform = row.platform;
          await db.delete(pushTokens).where(and(eq(pushTokens.userId, t.id), eq(pushTokens.id, webId)));
        }
      }
      if (!token) return fail("That device is not on this member's account (it may already be gone).", 404);
      try {
        await db
          .insert(bannedDevices)
          .values({ tokenHash: tokenFingerprint(token), platform, userId: t.id, reason, bannedBy: actorName })
          .onConflictDoNothing({ target: bannedDevices.tokenHash });
      } catch {
        return fail("Device bans are not switched on yet. Run add-banned-devices.sql on the database first.", 503);
      }
      await audit(actorName, "device.ban", "user", t.id, t.handle, `${platform ?? "device"}: ${reason}`);
      return NextResponse.json({ ok: true });
    }

    /** Lift a device ban. The device can register again; nothing else changes. */
    case "unbanDevice": {
      const id = dbInt(body.id);
      if (!id) return fail("Which ban?", 400);
      let ban;
      try {
        [ban] = await db.select().from(bannedDevices).where(and(eq(bannedDevices.id, id), eq(bannedDevices.userId, t.id))).limit(1);
      } catch {
        return fail("Device bans are not switched on yet. Run add-banned-devices.sql on the database first.", 503);
      }
      if (!ban) return fail("No such ban on this member.", 404);
      await db.delete(bannedDevices).where(eq(bannedDevices.id, id));
      await audit(actorName, "device.unban", "user", t.id, t.handle, ban.reason);
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

    default:
      return fail("Unknown action.", 400);
  }
}
