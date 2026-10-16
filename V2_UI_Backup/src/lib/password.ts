/** Runs in the browser and on the server, so the sign-up form and the API always agree. */

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 200;

const COMMON = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "passw0rd",
  "p@ssw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "qwertyuiop",
  "iloveyou",
  "11111111",
  "00000000",
  "abc12345",
  "abcd1234",
  "admin123",
  "letmein1",
  "welcome1",
  "welcome123",
  "monkey123",
  "dragon123",
  "football1",
  "baseball1",
  "changeme",
  "changeme1",
  "nassau242",
  "bahamas123",
  "bahamas242",
  "nowbey123",
]);

type Ctx = { handle?: string; email?: string };

/** The reason a new password is not acceptable, or null if it is fine. */
export function checkPassword(pw: string, ctx: Ctx = {}): string | null {
  if (pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (pw.length > MAX_PASSWORD) return `That password is too long. Use ${MAX_PASSWORD} characters or fewer.`;
  const lower = pw.toLowerCase();
  if (COMMON.has(lower)) return "That password is too easy to guess. Try a few unrelated words together.";
  if (/^(.)\1+$/.test(pw)) return "Use more than one repeated character.";
  const handle = (ctx.handle ?? "").toLowerCase();
  if (handle.length >= 4 && lower.includes(handle)) return "Your password should not contain your handle.";
  const local = (ctx.email ?? "").split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && lower.includes(local)) return "Your password should not contain the first part of your email.";
  return null;
}

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; problem: string | null };

/** A rough guide for the strength meter. The real gate is checkPassword. */
export function passwordStrength(pw: string, ctx: Ctx = {}): Strength {
  if (!pw) return { score: 0, label: "", problem: null };
  const problem = checkPassword(pw, ctx);
  if (problem) return { score: 0, label: pw.length < MIN_PASSWORD ? "Too short" : "Too easy to guess", problem };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  let score = 1;
  if (pw.length >= 12) score += 1;
  if (classes >= 3) score += 1;
  if (pw.length >= 16 && classes >= 2) score += 1;
  const s = Math.min(4, score) as 1 | 2 | 3 | 4;
  return { score: s, label: ["", "Weak", "Okay", "Good", "Strong"][s], problem: null };
}
