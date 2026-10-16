import { db } from "@/db";
import { adminAudit } from "@/db/schema";

export type AuditTarget =
  | "user"
  | "report"
  | "story"
  | "enquiry"
  | "post"
  | "comment"
  | "setting"
  | "place"
  | "digest"
  | "partner"
  | "error";

/** Writes one line to the activity log. A logging problem never blocks the action itself. */
export async function audit(
  actor: string,
  action: string,
  targetType: AuditTarget,
  targetId: string | null,
  targetLabel: string | null,
  detail?: string | null,
) {
  try {
    await db.insert(adminAudit).values({
      actorHandle: actor,
      action,
      targetType,
      targetId,
      targetLabel: targetLabel?.slice(0, 160) ?? null,
      detail: detail?.slice(0, 300) ?? null,
    });
  } catch (e) {
    console.error("[audit] could not record", action, e instanceof Error ? e.message : e);
  }
}
