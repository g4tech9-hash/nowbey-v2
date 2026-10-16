import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { digestPartners } from "@/db/schema";
import { PageHead } from "@/components/app-shell";
import { getViewer } from "@/lib/viewer";
import { PartnersAdmin } from "@/components/partners-admin";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect("/");

  const partners = await db.select().from(digestPartners).orderBy(desc(digestPartners.createdAt));

  return (
    <div className="mx-auto max-w-[1000px] py-6">
      <PageHead
        eyebrow="Revenue"
        title="Digest Partners"
        blurb="Community Digest subscribers. A partner's address receives the weekly draft you approve on the Digest page."
      />
      <PartnersAdmin
        initialPartners={partners.map((p) => ({
          id: p.id,
          organisation: p.organisation,
          contactName: p.contactName,
          email: p.email,
          parish: p.parish,
          categories: p.categories,
          paymentStatus: p.paymentStatus,
          planInterval: p.planInterval,
          lastPaymentAt: p.lastPaymentAt ? p.lastPaymentAt.toISOString() : null,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
