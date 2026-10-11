import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accountTokens, emailLog } from "@/db/schema";
import { makeToken, setSessionCookie } from "@/lib/auth";
import { emailButton, emailLayout, escapeHtml, sendMail, type MailResult } from "@/lib/mail";

export type TokenKind = "verify_email" | "reset_password";

export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Makes a one-time link token. Only its hash is stored, and any older unused one of the same kind is replaced. */
export async function issueToken(userId: string, kind: TokenKind, email: string | null, ttlMs: number): Promise<string> {
  await db.delete(accountTokens).where(and(eq(accountTokens.userId, userId), eq(accountTokens.kind, kind), isNull(accountTokens.usedAt)));
  const raw = randomBytes(24).toString("base64url");
  await db.insert(accountTokens).values({
    userId,
    kind,
    tokenHash: hashToken(raw),
    email,
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return raw;
}

const plausible = (raw: string) => typeof raw === "string" && raw.length >= 16 && raw.length <= 200;

/** Looks at a token without using it up. */
export async function peekToken(raw: string, kind: TokenKind) {
  if (!plausible(raw)) return null;
  const [row] = await db
    .select({ id: accountTokens.id, userId: accountTokens.userId, email: accountTokens.email })
    .from(accountTokens)
    .where(
      and(
        eq(accountTokens.tokenHash, hashToken(raw)),
        eq(accountTokens.kind, kind),
        isNull(accountTokens.usedAt),
        gt(accountTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Uses a token up. Only one caller can ever win, so a link cannot be used twice. */
export async function consumeToken(raw: string, kind: TokenKind) {
  if (!plausible(raw)) return null;
  const [row] = await db
    .update(accountTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(accountTokens.tokenHash, hashToken(raw)),
        eq(accountTokens.kind, kind),
        isNull(accountTokens.usedAt),
        gt(accountTokens.expiresAt, new Date()),
      ),
    )
    .returning({ id: accountTokens.id, userId: accountTokens.userId, email: accountTokens.email });
  return row ?? null;
}

async function skipped(to: string, subject: string, kind: string, reason: string): Promise<MailResult["status"]> {
  await db.insert(emailLog).values({ toAddr: to, subject, kind, status: "skipped", error: reason }).catch(() => {});
  return "skipped";
}

const NO_BASE = "Not sent: APP_URL is not set, and links in emails need a fixed site address.";

type Recipient = { id: string; handle: string; email: string };

export async function sendVerificationEmail(user: Recipient, base: string | null): Promise<MailResult["status"]> {
  const subject = "Confirm your NowBey email";
  if (!base) return skipped(user.email, subject, "account-verify", NO_BASE);
  const raw = await issueToken(user.id, "verify_email", user.email, 48 * 3600_000);
  const link = `${base}/api/account/verify?token=${raw}`;
  const res = await sendMail({
    to: user.email,
    subject,
    kind: "account-verify",
    html: emailLayout(
      "Confirm your email",
      `<p style="margin:0;font-size:14px;line-height:1.55;color:#cfeee9">Hi ${escapeHtml(user.handle)}, tap the button to confirm this email address for your NowBey account. It lets us help you if you ever forget your password.</p>${emailButton(link, "Confirm my email")}`,
      "This link works for 48 hours. If you did not create a NowBey account, ignore this email.",
    ),
    text: `Hi ${user.handle}, confirm your email for NowBey: ${link}\n\nThis link works for 48 hours. If you did not create an account, ignore this email.`,
  });
  return res.status;
}

export async function sendResetEmail(user: Recipient, base: string | null): Promise<MailResult["status"]> {
  const subject = "Reset your NowBey password";
  if (!base) return skipped(user.email, subject, "account-reset", NO_BASE);
  const raw = await issueToken(user.id, "reset_password", null, 3600_000);
  const link = `${base}/reset-password?token=${raw}`;
  const res = await sendMail({
    to: user.email,
    subject,
    kind: "account-reset",
    html: emailLayout(
      "Choose a new password",
      `<p style="margin:0;font-size:14px;line-height:1.55;color:#cfeee9">Hi ${escapeHtml(user.handle)}, someone asked to reset the password for your NowBey account. Tap the button to choose a new one.</p>${emailButton(link, "Choose a new password")}`,
      "This link works for one hour and can be used once. If you did not ask for this, ignore this email. Your password has not changed.",
    ),
    text: `Hi ${user.handle}, reset your NowBey password: ${link}\n\nThis link works for one hour and can be used once. If you did not ask for this, ignore this email.`,
  });
  return res.status;
}

/** True for the mobile app, which keeps its token itself instead of in a cookie. */
export function isNativeClient(req: Request): boolean {
  return req.headers.get("x-nowbey-client") === "native" || (req.headers.get("authorization") ?? "").toLowerCase().startsWith("bearer ");
}

/** Gives the current device a fresh sign-in after the session version changed, so only the other devices are signed out. */
export async function reissueSession(req: Request, userId: string, handle: string, version: number): Promise<{ token?: string }> {
  const token = makeToken(userId, handle, version);
  await setSessionCookie(token);
  return isNativeClient(req) ? { token } : {};
}
