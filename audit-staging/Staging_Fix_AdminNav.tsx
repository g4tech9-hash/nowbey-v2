/**
 * ============================================================================
 *  STAGING FILE — DO NOT APPLY WITHOUT APPROVAL
 * ============================================================================
 *  Replaces:  src/app/admin/layout.tsx  (the `tabs` array only)
 *  Audit ref: BUG-01 (Digest Partners page is unreachable)
 *
 *  WHAT WAS BROKEN
 *  ---------------
 *  /admin/partners exists and renders, but nothing links to it. The admin
 *  layout builds its tab list by hand and Partners was never added, so the
 *  only way to reach the page is to type the URL. Combined with the two dead
 *  links inside the page, the whole B2B revenue surface was invisible.
 *
 *  WHAT THIS DOES
 *  --------------
 *  Adds a "Partners" tab next to "Digest", admin-only, in the same group as
 *  the other revenue surfaces. Nothing else in the layout changes.
 * ============================================================================
 */

// BEFORE — src/app/admin/layout.tsx, inside AdminLayout():
//
//   const tabs: AdminTab[] = [
//     { href: "/admin", label: "Overview" },
//     ...(viewer.isAdmin ? [{ href: "/admin/users", label: "Members" }] : []),
//     { href: "/admin/reports", label: "Reports" },
//     { href: "/admin/wire", label: "Wire", badge: pending.n },
//     { href: "/admin/community", label: "Community", badge: flagged.n },
//     { href: "/admin/comments", label: "Comments", badge: flaggedComments.n },
//     ...(viewer.isAdmin ? [
//       { href: "/admin/statuses", label: "Open now" },
//       { href: "/admin/digest", label: "Digest" },
//       { href: "/admin/logs", label: "Logs", badge: logReview.n },
//       { href: "/admin/inbox", label: "Inbox", badge: fresh.n },
//       { href: "/admin/activity", label: "Activity" },
//       { href: "/admin/appearance", label: "Appearance" },
//     ] : []),
//   ];

// AFTER — the only change is the added Partners line, placed beside Digest so
// the two halves of the revenue story sit together:

const tabs: AdminTab[] = [
  { href: "/admin", label: "Overview" },
  ...(viewer.isAdmin ? [{ href: "/admin/users", label: "Members" }] : []),
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/wire", label: "Wire", badge: pending.n },
  { href: "/admin/community", label: "Community", badge: flagged.n },
  { href: "/admin/comments", label: "Comments", badge: flaggedComments.n },
  ...(viewer.isAdmin
    ? [
        { href: "/admin/statuses", label: "Open now" },
        { href: "/admin/digest", label: "Digest" },
        { href: "/admin/partners", label: "Partners" },
        { href: "/admin/logs", label: "Logs", badge: logReview.n },
        { href: "/admin/inbox", label: "Inbox", badge: fresh.n },
        { href: "/admin/activity", label: "Activity" },
        { href: "/admin/appearance", label: "Appearance" },
      ]
    : []),
];

/*
 * NOTE ON TYPING
 * --------------
 * `tabs` is inferred as AdminTab[], so the object literals above type-check as
 * they do today. No signature change, no change to AdminNav, no change to the
 * badge plumbing. Apply by pasting the AFTER block over the BEFORE block in
 * src/app/admin/layout.tsx.
 */
