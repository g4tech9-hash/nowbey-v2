/*
 * Turns the week's reports and wire stories into the Community Digest an HOA pays for.
 * With GEMINI_API_KEY the model writes the subject, intro and one-liners; without it a plain
 * template fills in, so the feature works either way. Nothing is emailed until an admin
 * reads the draft and presses Send — the AI drafts, the human decides.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { digestDrafts, type DigestDraft } from "@/db/schema";
import { compilePartnerDigest, type DigestItem } from "@/lib/digest/compile";
import { aiConfigured, geminiJson, oneLine } from "@/lib/ai";
import { CATEGORIES, type CategoryKey } from "@/lib/geo";
import { EMAIL_RE } from "@/lib/validate";
import { emailButton, emailLayout, escapeHtml, mailConfigured, sendMail } from "@/lib/mail";

/** Something an admin did wrong (bad parish, no items, bad addresses) — safe to show them. */
export class DigestError extends Error {}

const LOOKBACK_DAYS = 7;

function rangeLabel(): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Nassau" });
  const to = new Date();
  const from = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
  return `${fmt(from)} – ${fmt(to)}`;
}

function absUrl(url: string, base: string): string {
  return url.startsWith("/") ? `${base}${url}` : url;
}

type AiDigest = { subject?: unknown; intro?: unknown; lines?: unknown; closing?: unknown };

export async function draftPartnerDigest(opts: {
  parish: string;
  categories: string[];
  createdBy: string | null;
  base: string;
}): Promise<DigestDraft> {
  const parish = opts.parish.trim() || "New Providence";
  const categories = opts.categories.filter((c) => c in CATEGORIES);
  const items = await compilePartnerDigest(parish, categories);
  if (!items.length) {
    throw new DigestError(`Nothing happened in ${parish} over the last ${LOOKBACK_DAYS} days worth digesting yet. Try a wider island or fewer categories.`);
  }

  const range = rangeLabel();
  let subject = `Your ${parish} week on NowBey · ${range}`;
  let intro = `Here is what neighbours reported and what the wire covered in ${parish} over the last ${LOOKBACK_DAYS} days.`;
  let lines = items.map((it) => oneLine(it.details || it.title, 180));
  let closing = "See something? Drop a pin on NowBey — it takes thirty seconds.";
  let generatedBy: "ai" | "plain" = "plain";

  if (aiConfigured()) {
    const payload = items.slice(0, 18).map((it, i) => ({
      i,
      type: it.type,
      category: CATEGORIES[it.category as CategoryKey]?.label ?? it.category,
      title: it.title,
      details: it.details.slice(0, 220),
      area: it.area,
    }));
    const answer = await geminiJson<AiDigest>(
      `You write the weekly community digest email that a neighbourhood association in The Bahamas pays NowBey for. Below are the real reports and news items from ${parish} covering ${range}. Answer in JSON with exactly these keys:

- "subject": an email subject line (60 characters max) naming the neighbourhood/island and the week. No emojis, no ALL CAPS, no clickbait.
- "intro": two sentences (45 words max) of warm, plain overview of the week for residents. Do not invent facts or numbers; do not mention items one by one.
- "lines": an array with exactly ${payload.length} strings, one per item in the same order, each a single sentence (28 words max) a resident can scan — what happened and where. Do not change facts.
- "closing": one friendly sentence pointing people to NowBey and reminding them this app is not an emergency service (for emergencies call 919 or 911).

Items:
${JSON.stringify(payload)}`,
      { maxTokens: 1200 },
    );
    if (answer) {
      const aiLines = Array.isArray(answer.lines) ? answer.lines.map((l) => oneLine(l, 220)) : [];
      if (typeof answer.subject === "string" && oneLine(answer.subject, 80).length >= 8) subject = oneLine(answer.subject, 80);
      if (typeof answer.intro === "string" && oneLine(answer.intro, 300).length >= 20) intro = oneLine(answer.intro, 300);
      if (aiLines.length === payload.length && aiLines.every((l) => l.length >= 5)) lines = [...aiLines, ...lines.slice(aiLines.length)];
      if (typeof answer.closing === "string" && oneLine(answer.closing, 220).length >= 10) closing = oneLine(answer.closing, 220);
      generatedBy = "ai";
    }
  }

  // Everything from the model is escaped before it touches HTML; links only ever come from our own rows.
  const itemHtml = items
    .map((it, i) => {
      const meta = CATEGORIES[it.category as CategoryKey] ?? CATEGORIES.notice;
      const link = absUrl(it.url, opts.base);
      const line = lines[i] || it.title;
      return `<tr><td style="padding:10px 0;border-bottom:1px solid #10394c">
        <p style="margin:0 0 2px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${meta.color}">${escapeHtml(meta.label)} · ${escapeHtml(it.area)} · ${escapeHtml(it.time)}</p>
        <p style="margin:0 0 2px;font-size:14px;font-weight:700"><a href="${escapeHtml(link)}" style="color:#f6ead8;text-decoration:none">${escapeHtml(it.title)}</a></p>
        ${line && line !== it.title ? `<p style="margin:0;font-size:13px;line-height:1.5;color:#a9cdc9">${escapeHtml(line)}</p>` : ""}
      </td></tr>`;
    })
    .join("");

  const body = `
    <p style="margin:0 0 10px;font-size:13px;color:#8fb9b6">${escapeHtml(parish)} · ${escapeHtml(range)}</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cfeee9">${escapeHtml(intro)}</p>
    <table role="presentation" style="width:100%;border-collapse:collapse"><tbody>${itemHtml}</tbody></table>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#a9cdc9">${escapeHtml(closing)}</p>
    ${emailButton(`${opts.base}/map?parish=${encodeURIComponent(parish)}`, "Open the live map")}`;

  const html = emailLayout(subject, body, "You receive this digest as part of a NowBey Community Digest partnership. For emergencies call 919 / 911 — NowBey is not an emergency service.");

  const text = [
    subject,
    "",
    intro,
    "",
    ...items.map((it, i) => `* ${it.title}\n  ${lines[i] || ""}\n  ${absUrl(it.url, opts.base)}`),
    "",
    closing,
    "For emergencies call 919 / 911 — NowBey is not an emergency service.",
  ].join("\n");

  const [row] = await db
    .insert(digestDrafts)
    .values({
      parish,
      categories: categories.join(","),
      subject,
      bodyHtml: html,
      bodyText: text,
      itemCount: items.length,
      generatedBy,
      createdBy: opts.createdBy,
    })
    .returning();
  return row;
}

export async function sendDigestDraft(id: string, recipients: string[]): Promise<{ sent: number; failed: number }> {
  const [draft] = await db.select().from(digestDrafts).where(eq(digestDrafts.id, id)).limit(1);
  if (!draft) throw new DigestError("That digest draft is already gone.");
  if (draft.status === "sent") throw new DigestError("This digest has already been sent. Draft a fresh one to send again.");
  if (!mailConfigured()) throw new DigestError("Email is not set up yet — add RESEND_API_KEY or the SMTP settings first.");

  const to = [...new Set(recipients.map((r) => r.trim().toLowerCase()).filter(Boolean))];
  if (!to.length) throw new DigestError("Add at least one email address.");
  if (to.length > 50) throw new DigestError("Send to at most 50 addresses at a time.");
  for (const addr of to) if (!EMAIL_RE.test(addr)) throw new DigestError(`"${addr}" is not an email address.`);

  const stats = { sent: 0, failed: 0 };
  for (const addr of to) {
    const r = await sendMail({ to: addr, subject: draft.subject, html: draft.bodyHtml, text: draft.bodyText, kind: "digest" });
    if (r.status === "sent") stats.sent += 1;
    else if (r.status === "failed") stats.failed += 1;
    else throw new DigestError("Email is not set up yet — add RESEND_API_KEY or the SMTP settings first.");
  }

  await db
    .update(digestDrafts)
    .set({ status: "sent", recipients: to.join(","), sentAt: new Date() })
    .where(eq(digestDrafts.id, id));
  return stats;
}

export type { DigestItem };
