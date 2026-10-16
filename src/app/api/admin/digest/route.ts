import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { digestDrafts, digestPartners } from "@/db/schema";
import { aiConfigured } from "@/lib/ai";
import { audit } from "@/lib/audit";
import { publicBase } from "@/lib/billing";
import { DigestError, draftPartnerDigest, sendDigestDraft } from "@/lib/digest/generate";
import { CATEGORY_KEYS, PARISHES, knownParish } from "@/lib/geo";
import { mailConfigured } from "@/lib/mail";
import { requireStaff } from "@/lib/staff";
import { EMAIL_RE, UUID_RE, readJson, text } from "@/lib/validate";

/** The Community Digest: draft it (AI when set up), review it, email it to partners. Admins only. */
export async function GET() {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;

  const [drafts, partners] = await Promise.all([
    db
      .select({
        id: digestDrafts.id,
        parish: digestDrafts.parish,
        subject: digestDrafts.subject,
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
    db.select().from(digestPartners).orderBy(desc(digestPartners.createdAt)).limit(50),
  ]);

  return NextResponse.json({
    drafts,
    partners,
    aiConfigured: aiConfigured(),
    mailConfigured: mailConfigured(),
    parishes: [...PARISHES],
    categories: CATEGORY_KEYS,
  });
}

export async function POST(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actorName = gate.viewer.handle ?? "admin";
  const body = await readJson(req);

  try {
    if (body.action === "generate") {
      const parish = knownParish(text(body.parish, 60)) ?? "New Providence";
      const categories = Array.isArray(body.categories)
        ? body.categories.map((c: unknown) => String(c)).filter((c: string) => (CATEGORY_KEYS as string[]).includes(c))
        : [];
      const base = publicBase(req);
      if (!base) return NextResponse.json({ error: "Set APP_URL in Vercel so the links inside the digest work." }, { status: 400 });

      const draft = await draftPartnerDigest({ parish, categories, createdBy: actorName, base });
      await audit(actorName, "digest.generate", "digest", draft.id, `${draft.parish} · ${draft.itemCount} items · ${draft.generatedBy}`);
      return NextResponse.json({ ok: true, draft });
    }

    if (body.action === "send") {
      const id = String(body.id ?? "");
      if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown digest." }, { status: 400 });

      // Recipients can be pasted, or come from a registered digest partner.
      const raw = Array.isArray(body.recipients) ? body.recipients : String(body.recipients ?? "");
      const recipients = (Array.isArray(raw) ? raw : raw.split(/[\n,;]+/)).map((r) => String(r).trim()).filter(Boolean);
      if (UUID_RE.test(String(body.partnerId ?? ""))) {
        const [partner] = await db.select().from(digestPartners).where(eq(digestPartners.id, String(body.partnerId))).limit(1);
        if (partner) recipients.push(partner.email);
      }
      const stats = await sendDigestDraft(id, recipients);
      await audit(actorName, "digest.send", "digest", id, `sent ${stats.sent}, failed ${stats.failed}`);
      return NextResponse.json({ ok: true, stats });
    }

    if (body.action === "delete") {
      const id = String(body.id ?? "");
      if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown digest." }, { status: 400 });
      const done = await db.delete(digestDrafts).where(eq(digestDrafts.id, id)).returning({ id: digestDrafts.id });
      if (done.length) await audit(actorName, "digest.delete", "digest", id, "");
      return NextResponse.json({ ok: done.length > 0 });
    }

    if (body.action === "partnerCreate") {
      const organisation = text(body.organisation, 120);
      const contactName = text(body.contactName, 120);
      const email = text(body.email, 160).toLowerCase();
      const parish = knownParish(text(body.parish, 60));
      const categories = text(body.categories, 200);

      if (organisation.length < 2) return NextResponse.json({ error: "Give the organisation a name." }, { status: 400 });
      if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "That email address is not valid." }, { status: 400 });
      if (!parish) return NextResponse.json({ error: "Pick an island." }, { status: 400 });

      const [row] = await db.insert(digestPartners).values({ organisation, contactName, email, parish, categories }).returning();
      await audit(actorName, "partner.create", "partner", row.id, organisation, email);
      return NextResponse.json({ ok: true, partner: row });
    }

    if (body.action === "partnerUpdate") {
      const id = String(body.id ?? "");
      if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown partner." }, { status: 400 });

      const organisation = text(body.organisation, 120);
      const contactName = text(body.contactName, 120);
      const email = text(body.email, 160).toLowerCase();
      const parish = knownParish(text(body.parish, 60));
      const categories = text(body.categories, 200);

      if (organisation.length < 2) return NextResponse.json({ error: "Give the organisation a name." }, { status: 400 });
      if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "That email address is not valid." }, { status: 400 });
      if (!parish) return NextResponse.json({ error: "Pick an island." }, { status: 400 });

      const [row] = await db
        .update(digestPartners)
        .set({ organisation, contactName, email, parish, categories, updatedAt: new Date() })
        .where(eq(digestPartners.id, id))
        .returning();
      if (!row) return NextResponse.json({ error: "Unknown partner." }, { status: 404 });
      await audit(actorName, "partner.update", "partner", id, organisation, email);
      return NextResponse.json({ ok: true, partner: row });
    }

    if (body.action === "partnerPayment") {
      const id = String(body.id ?? "");
      const paymentStatus = text(body.paymentStatus, 20);
      if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown partner." }, { status: 400 });
      if (!["unpaid", "paid", "comp"].includes(paymentStatus)) {
        return NextResponse.json({ error: "Pick unpaid, paid or comp." }, { status: 400 });
      }
      const [row] = await db
        .update(digestPartners)
        .set({ paymentStatus, lastPaymentAt: paymentStatus === "paid" ? new Date() : null, updatedAt: new Date() })
        .where(eq(digestPartners.id, id))
        .returning();
      if (!row) return NextResponse.json({ error: "Unknown partner." }, { status: 404 });
      await audit(actorName, "partner.payment", "partner", id, row.organisation, paymentStatus);
      return NextResponse.json({ ok: true, partner: row });
    }

    if (body.action === "partnerDelete") {
      const id = String(body.id ?? "");
      if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown partner." }, { status: 400 });
      const gone = await db.delete(digestPartners).where(eq(digestPartners.id, id)).returning({ organisation: digestPartners.organisation });
      if (gone.length) await audit(actorName, "partner.delete", "partner", id, gone[0].organisation, null);
      return NextResponse.json({ ok: gone.length > 0 });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    if (err instanceof DigestError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(`[digest] ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: "Something went wrong preparing the digest." }, { status: 500 });
  }
}
