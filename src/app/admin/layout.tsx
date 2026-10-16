import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, enterpriseInquiries, errorAnalyses, newsItems, posts } from "@/db/schema";
import { AdminNav, type AdminTab } from "@/components/admin-nav";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Admin · NowBey" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  // To everyone else this area simply does not exist.
  if (!viewer.isEditor) notFound();

  const [[pending], [fresh], [flagged], [flaggedComments], [logReview]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(newsItems).where(eq(newsItems.review, "pending")),
    viewer.isAdmin
      ? db.select({ n: sql<number>`count(*)::int` }).from(enterpriseInquiries).where(eq(enterpriseInquiries.status, "new"))
      : Promise.resolve([{ n: 0 }]),
    db.select({ n: sql<number>`count(*)::int` }).from(posts).where(gt(posts.flagCount, 0)),
    db.select({ n: sql<number>`count(*)::int` }).from(comments).where(gt(comments.flagCount, 0)),
    // The log tables may not be migrated yet — a missing table must never hide the admin area.
    viewer.isAdmin
      ? db
          .select({ n: sql<number>`count(*)::int` })
          .from(errorAnalyses)
          .where(eq(errorAnalyses.status, "pending_review"))
          .catch(() => [{ n: 0 }])
      : Promise.resolve([{ n: 0 }]),
  ]);

  const tabs: AdminTab[] = [
    { href: "/admin", label: "Overview" },
    ...(viewer.isAdmin ? [{ href: "/admin/users", label: "Members" }] : []),
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/wire", label: "Wire", badge: pending.n },
    { href: "/admin/community", label: "Community", badge: flagged.n },
    { href: "/admin/comments", label: "Comments", badge: flaggedComments.n },
    ...(viewer.isAdmin ? [{ href: "/admin/statuses", label: "Open now" }, { href: "/admin/digest", label: "Digest" }, { href: "/admin/partners", label: "Partners" }, { href: "/admin/logs", label: "Logs", badge: logReview.n }, { href: "/admin/inbox", label: "Inbox", badge: fresh.n }, { href: "/admin/activity", label: "Activity" }, { href: "/admin/appearance", label: "Appearance" }] : []),
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="display text-[clamp(1.5rem,4vw,2rem)] font-extrabold text-sand-100">{viewer.isAdmin ? "Admin" : "Moderation"}</h1>
        <p className="text-[12px] text-[#8fb9b6]">
          Signed in as @{viewer.handle} · {viewer.isAdmin ? "admin" : "editor"}
        </p>
      </div>
      <AdminNav tabs={tabs} />
      {children}
    </div>
  );
}
