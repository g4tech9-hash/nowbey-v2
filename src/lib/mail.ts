import { db } from "@/db";
import { smtpSend } from "@/lib/smtp";
import { emailLog } from "@/db/schema";

export type MailResult = { status: "sent" | "skipped" | "failed"; error?: string };

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY) || smtpConfigured();
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function emailLayout(heading: string, body: string, footer = ""): string {
  return `<!doctype html><html><body style="margin:0;background:#03121b;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e8f6f4"><div style="max-width:520px;margin:0 auto;background:#061c28;border:1px solid #10394c;border-radius:16px;padding:24px"><p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#2ee6d0;font-weight:700">NowBey · The Bahamas</p><h1 style="margin:0 0 12px;font-size:20px;line-height:1.25;color:#f6ead8">${escapeHtml(heading)}</h1>${body}<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#6e97a0">${footer}</p></div></body></html>`;
}

export function emailButton(href: string, label: string): string {
  return `<p style="margin:16px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#00c9b7;color:#03121b;font-weight:800;text-decoration:none;padding:11px 18px;border-radius:999px">${escapeHtml(label)}</a></p>`;
}

type Mail = { to: string; subject: string; html: string; text: string; kind: string; replyTo?: string };

/**
 * Sends through Resend. Every attempt is written to email_log, including when email
 * is not set up, so the admin page can show exactly what happened.
 */
export async function sendMail(mail: Mail): Promise<MailResult> {
  let result: MailResult;
  const key = process.env.RESEND_API_KEY;
  if (smtpConfigured()) {
    // SMTP (Gmail, Brevo, your own host) can email anyone, with no domain needed.
    try {
      const from = process.env.MAIL_FROM ?? `NowBey <${process.env.SMTP_USER}>`;
      await smtpSend({
        host: process.env.SMTP_HOST!,
        port: Number(process.env.SMTP_PORT) || 465,
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
        from,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo: mail.replyTo,
      });
      result = { status: "sent" };
    } catch (e) {
      result = { status: "failed", error: `SMTP: ${e instanceof Error ? e.message : "could not send"}`.slice(0, 300) };
    }
  } else if (!key) {
    result = { status: "skipped", error: "Email is not set up on this server (add SMTP_HOST, SMTP_USER and SMTP_PASS, or RESEND_API_KEY)." };
  } else {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.MAIL_FROM ?? "NowBey <onboarding@resend.dev>",
          to: [mail.to],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) result = { status: "sent" };
      else result = { status: "failed", error: `Email provider answered ${res.status}: ${(await res.text()).slice(0, 200)}` };
    } catch (e) {
      result = { status: "failed", error: e instanceof Error ? e.message : "Could not reach the email provider." };
    }
  }
  await db
    .insert(emailLog)
    .values({ toAddr: mail.to, subject: mail.subject.slice(0, 200), kind: mail.kind, status: result.status, error: result.error ?? null })
    .catch(() => {});
  return result;
}
