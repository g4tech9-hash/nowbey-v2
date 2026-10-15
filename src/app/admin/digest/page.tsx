import { desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { digestDrafts, digestPartners } from "@/db/schema";
import { DigestAdmin } from "@/components/digest-admin";
import { aiConfigured } from "@/lib/ai";
import { CATEGORIES, PARISHES } from "@/lib/geo";
import { mailConfigured } from "@/lib/mail";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Community Digest" };

export default async function DigestPage() {
  const viewer = await getViewer();
  // The digest is the paid product — only admins run it.
  if (!viewer.isAdmin) notFound();

  const [drafts, partners] = await Promise.all([
    db
      .select({
        id: digestDrafts.id,
        parish: digestDrafts.parish,
        subject: digestDrafts.subject,
        bodyHtml: digestDrafts.bodyHtml,
        itemCount: digestDrafts.itemCount,
        generatedBy: digestDrafts.generatedBy,
        status: digestDrafts.status,
        recipients: digestDrafts.recipients,
        sentAt: digestDrafts.sentAt,
        createdAt: digestDrafts.createdAt,
      })
      .from(digestDrafts)
      .orderBy(desc(digestDrafts.createdAt))
      .limit(12),
    db.select().from(digestPartners).orderBy(digestPartners.organisation).limit(50),
  ]);

  return (
    <DigestAdmin
      initialDrafts={drafts.map((d) => ({ ...d, sentAt: d.sentAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString() }))}
      partners={partners.map((p) => ({ id: p.id, organisation: p.organisation, email: p.email, parish: p.parish, paymentStatus: p.paymentStatus }))}
      aiOn={aiConfigured()}
      mailOn={mailConfigured()}
      parishes={[...PARISHES]}
      categories={Object.entries(CATEGORIES).map(([key, c]) => ({ key, label: c.label }))}
    />
  );
}
