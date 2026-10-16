/**
 * ============================================================================
 *  STAGING FILE — DO NOT APPLY WITHOUT APPROVAL
 * ============================================================================
 *  Edits:  src/lib/audit.ts  (one line)
 *  Audit ref: BUG-01 (part of the Partners fix)
 *
 *  `AuditTarget` is a closed union, so "partner" is a type error until it is
 *  added here. Purely additive: every existing value keeps working, and the
 *  database column is plain text so no migration is needed.
 * ============================================================================
 */

// BEFORE — src/lib/audit.ts, line 4:
export type AuditTarget = "user" | "report" | "story" | "enquiry" | "post" | "comment" | "setting" | "place" | "digest" | "error";

// AFTER:
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

/*
 * WHY NOT JUST USE "digest"?
 * --------------------------
 * You could, and the log would still work. But the activity log's whole value
 * is answering "who changed what" six months from now, and a partner deletion
 * filed under "digest" reads as a deleted digest draft. One line, no
 * migration (admin_audit.target_type is text), no behaviour change.
 */
