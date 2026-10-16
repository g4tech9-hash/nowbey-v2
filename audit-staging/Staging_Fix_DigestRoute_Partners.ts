/**
 * ============================================================================
 *  STAGING FILE — DO NOT APPLY WITHOUT APPROVAL
 * ============================================================================
 *  Edits:  src/app/api/admin/digest/route.ts
 *  Audit ref: BUG-01
 *
 *  Adds four partner actions to the existing POST handler. No new route, no
 *  new contract on the GET, and the existing generate/send/delete actions are
 *  untouched — this is purely additive inside the same try block, above the
 *  final `return NextResponse.json({ error: "Unknown action." })`.
 *
 *  Every action is behind the same requireStaff("admin") gate the rest of the
 *  handler already applies, validates its input with the same text()/UUID_RE
 *  helpers, and writes to the activity log with audit().
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// 1. IMPORTS — add `desc` is already imported; add nothing new except the
//    schema is already imported. Only `PARISHES`/`knownParish` are already
//    imported too. So: no import changes are needed at all.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. PASTE THESE FOUR BLOCKS into the POST handler's try, immediately before
//    the closing `return NextResponse.json({ error: "Unknown action." }...)`.
// ---------------------------------------------------------------------------

    if (body.action === "partnerCreate") {
      const organisation = text(body.organisation, 120);
      const contactName = text(body.contactName, 120);
      const email = text(body.email, 160).toLowerCase();
      const parish = knownParish(text(body.parish, 60));
      const categories = text(body.categories, 200);

      if (organisation.length < 2) return NextResponse.json({ error: "Give the organisation a name." }, { status: 400 });
      if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "That email address is not valid." }, { status: 400 });
      if (!parish) return NextResponse.json({ error: "Pick an island." }, { status: 400 });

      const [row] = await db
        .insert(digestPartners)
        .values({ organisation, contactName, email, parish, categories })
        .returning();
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
      // last_payment_at is what "paid" means to a human reading the row later,
      // so marking paid stamps the date and clearing the status clears it.
      const [row] = await db
        .update(digestPartners)
        .set({
          paymentStatus,
          lastPaymentAt: paymentStatus === "paid" ? new Date() : null,
          updatedAt: new Date(),
        })
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

// ---------------------------------------------------------------------------
// 3. IMPORTS — two additions are required for the blocks above:
//
//    import { UUID_RE, readJson, text, EMAIL_RE } from "@/lib/validate";
//    //                                 ^^^^^^^^ add
//
//    and `knownParish` is already imported from "@/lib/geo" on the line
//    `import { CATEGORY_KEYS, PARISHES, knownParish } from "@/lib/geo";`
//    — verify, and add it if your branch differs.
//
//    `eq` is already imported from "drizzle-orm".
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 4. NOTE ON THE ACTIVITY LOG
//
//    audit()'s third argument is typed `AuditTarget`, a closed union that does
//    not include "partner". See Staging_Fix_AuditTarget.ts for the one-line
//    addition. Until that lands, substitute "digest" — the log entry will be
//    slightly less precise but nothing breaks.
// ---------------------------------------------------------------------------
