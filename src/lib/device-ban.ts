/**
 * Device bans: is this hardware barred from the product?
 *
 * An account ban (`users.status = 'suspended'`) stops that person signing in.
 * A device ban stops the hardware, which is the only lever that still works
 * when someone re-registers with a fresh email address. `token` is the Expo
 * push token the app already registers -- stable per install, not per account,
 * which is exactly what makes it a usable device identity.
 *
 * The ban itself is written by the admin User Management module
 * (/api/admin/users, action banDevice). This module only answers one question,
 * and it is written to be cheap enough to call on every request that carries a
 * token: one indexed lookup, no joins.
 */

import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deviceBans, deviceTokens } from "@/db/schema";

/** Why a device is barred, and until when. `until` is null for a permanent ban. */
export type DeviceBanStatus = {
  banned: true;
  reason: string;
  /** Null when the ban is permanent. */
  until: Date | null;
} | { banned: false };

/**
 * Looks up an in-force ban for one device token.
 *
 * "In force" means not revoked and not expired. Revoked bans are kept forever
 * so the record of who banned what survives, but they must not block anyone --
 * hence both checks rather than a simple `revokedAt IS NULL`.
 *
 * A missing or blank token is never banned: guests who never granted
 * notification permission have no device identity, and refusing them would lock
 * out everyone who declines the permission prompt.
 */
export async function deviceBanFor(token: string | null | undefined): Promise<DeviceBanStatus> {
  const clean = (token ?? "").trim();
  if (!clean) return { banned: false };

  const now = new Date();
  const [row] = await db
    .select({ reason: deviceBans.reason, expiresAt: deviceBans.expiresAt })
    .from(deviceBans)
    .where(
      and(
        eq(deviceBans.token, clean),
        isNull(deviceBans.revokedAt),
        or(isNull(deviceBans.expiresAt), gt(deviceBans.expiresAt, now)),
      ),
    )
    .limit(1);

  if (!row) return { banned: false };
  return { banned: true, reason: row.reason, until: row.expiresAt };
}

/**
 * Every device token belonging to a member, for the admin "Ban Device" action.
 * Banning the account bars the person; banning each token they have ever
 * registered bars the phones too, so a new email on the same handset does not
 * walk straight back in.
 */
export async function deviceTokensForUser(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ token: deviceTokens.token })
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));
  return rows.map((r) => r.token).filter(Boolean);
}

/**
 * How many live bans exist, for the admin badge. Counted in SQL so the number
 * stays honest without pulling every row.
 */
export async function countActiveDeviceBans(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(deviceBans)
    .where(
      and(
        isNull(deviceBans.revokedAt),
        or(isNull(deviceBans.expiresAt), gt(deviceBans.expiresAt, new Date())),
      ),
    );
  return row?.n ?? 0;
}
