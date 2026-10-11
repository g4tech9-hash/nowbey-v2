import { NextResponse, after } from "next/server";
import { readJson, text } from "@/lib/validate";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { enterpriseInquiries } from "@/db/schema";
import { emailLayout, escapeHtml, sendMail } from "@/lib/mail";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const TEAM_SIZES = new Set(["1-10", "11-50", "51-200", "200+"]);

export async function POST(req: Request) {
  const gate = hit(`enterprise:${clientIp(req)}`, 4, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "enquiries");
  const body = await readJson(req);

  // Hidden field real visitors never fill in; bots usually do.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const organisation = text(body.organisation, 120);
  const contactName = text(body.contactName, 120);
  const email = text(body.email, 160);
  const phone = text(body.phone, 40);
  const teamSize = typeof body.teamSize === "string" && TEAM_SIZES.has(body.teamSize) ? body.teamSize : null;
  const message = text(body.message, 1200);

  if (organisation.length < 2) {
    return NextResponse.json({ error: "Tell us the name of your organisation." }, { status: 400 });
  }
  if (contactName.length < 2) {
    return NextResponse.json({ error: "Tell us who to ask for." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }

  const [row] = await db
    .insert(enterpriseInquiries)
    .values({ organisation, contactName, email, phone: phone || null, teamSize, message: message || null })
    .returning({ id: enterpriseInquiries.id });

  // Tell the NowBey team. The enquiry is already saved, so a mail problem never loses it.
  after(async () => {
    const to = process.env.ENTERPRISE_NOTIFY_TO?.trim();
    if (!to) {
      await db.update(enterpriseInquiries).set({ notifyError: "ENTERPRISE_NOTIFY_TO is not set, so no email was sent." }).where(eq(enterpriseInquiries.id, row.id));
      return;
    }
    const line = (k: string, v: string | null) =>
      v ? `<p style="margin:0 0 6px;font-size:14px;color:#cfeee9"><strong style="color:#f6ead8">${k}:</strong> ${escapeHtml(v)}</p>` : "";
    const result = await sendMail({
      to,
      replyTo: email,
      kind: "enterprise",
      subject: `Enterprise enquiry: ${organisation}`,
      html: emailLayout(
        "New Enterprise enquiry",
        line("Organisation", organisation) + line("Contact", contactName) + line("Email", email) + line("Phone", phone || null) + line("Team size", teamSize) + line("Message", message || null),
        "Reply to this email to reach them directly.",
      ),
      text: `Enterprise enquiry\n\nOrganisation: ${organisation}\nContact: ${contactName}\nEmail: ${email}\nPhone: ${phone}\nTeam size: ${teamSize ?? ""}\n\n${message}`,
    });
    await db
      .update(enterpriseInquiries)
      .set(result.status === "sent" ? { notifiedAt: new Date(), notifyError: null } : { notifyError: result.error ?? "Email was not sent." })
      .where(eq(enterpriseInquiries.id, row.id));
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
