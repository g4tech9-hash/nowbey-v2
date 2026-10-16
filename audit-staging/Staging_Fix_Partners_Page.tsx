/**
 * ============================================================================
 *  STAGING FILE — DO NOT APPLY WITHOUT APPROVAL
 * ============================================================================
 *  Replaces:  src/app/admin/partners/page.tsx
 *  Audit ref: BUG-01 (orphaned page, two dead links, no create/edit path)
 *
 *  WHAT WAS BROKEN
 *  ---------------
 *  The page was a read-only table with two controls that led nowhere:
 *    - "+ Add Partner"  -> /admin/partners/new       (no such route)
 *    - "Manage"         -> /admin/partners/${p.id}   (no such route)
 *  Nothing links to /admin/partners at all (the admin layout builds its tab
 *  list by hand and Partners was never added), and there is no API anywhere
 *  that writes to digest_partners — the only references in the codebase are
 *  three SELECTs. The table can therefore never gain a row through the
 *  product, which makes the whole B2B revenue surface decorative.
 *
 *  WHAT THIS DOES
 *  --------------
 *  Follows the pattern every other admin mutation in this codebase already
 *  uses — an API route with an `action` discriminator, gated by
 *  requireStaff("admin") — rather than introducing React Server Actions,
 *  which this repo does not use anywhere:
 *
 *    Staging_Fix_DigestRoute_Partners.ts   adds 4 partner actions to the
 *                                          existing /api/admin/digest POST
 *    Staging_Fix_PartnersAdmin.tsx         the client component (modelled on
 *                                          digest-admin.tsx)
 *    this file                             the server page that wires them
 *    Staging_Fix_AuditTarget.ts            one line, so the activity log can
 *                                          name "partner" as a target
 *
 *  Net result: add, edit, flip payment status, and delete a partner, with
 *  loading and error states, and no navigation that leads nowhere.
 * ============================================================================
 */

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
