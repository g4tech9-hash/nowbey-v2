export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/** Reads a whole number from a query string, falling back to a default instead of producing NaN. */
export function clampInt(raw: string | null | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Characters that have no place in text a person typed: the NUL byte (which Postgres refuses outright, turning a
 * stray character into a server error), the other control characters except tab and line breaks, DEL, and the
 * "bidi override" characters that can make text read backwards to disguise a name or a link.
 */
const UNWANTED = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

export const clean = (s: string): string => s.replace(UNWANTED, "");

/** A trimmed, cleaned string of at most `max` characters; anything that is not a string becomes "". */
export function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  let s = clean(value).trim();
  if (s.length > max) s = s.slice(0, max).replace(/[\ud800-\udbff]$/, "").trimEnd(); // never cut an emoji in half
  return s;
}

/** A value from a URL query string, cleaned and cut to length, safe to hand to the database. */
export function param(value: string | null | undefined, max = 100): string {
  return text(value ?? "", max);
}

/** An id that fits the database's 32-bit integer column, or null. Bigger numbers would otherwise crash the query. */
export function dbInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d{1,10}$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 2147483647 ? n : null;
}

/** Escapes % and _ so a search term is matched literally in a LIKE query. */
export function likeEscape(s: string): string {
  return clean(s).replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Reads a JSON request body. Anything that is not a plain object (bad JSON, null, a list, a number) counts as an
 * empty object, so a route's normal "missing field" checks answer with a clear 4xx instead of crashing.
 */
export async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    const v = await req.json();
    return v !== null && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** The Postgres error code behind a database error, if there is one. */
export function pgCode(e: unknown): string | null {
  const err = e as { code?: unknown; cause?: { code?: unknown } } | null;
  const c = err?.code ?? err?.cause?.code;
  return typeof c === "string" ? c : null;
}

/** True when a write failed because the row it pointed at (a post, a comment, a report) was deleted a moment ago. */
export const isGone = (e: unknown): boolean => pgCode(e) === "23503";
