/**
 * THE SEVERITY SCALE — one scale, four levels.
 *
 * Before this file the report form offered "Annoying / Blocking a lane /
 * Blocking a road / Dangerous" while the feed card showed "High" plus three of
 * four dots, and the CSS defined five severity tokens. A resident reading a card
 * could not tell what the number meant.
 *
 * The levels are the words the report form already used, because those are the
 * words a person can picture:
 *
 *   1  Minor       it is in the way but you can get past it
 *   2  Lane blocked  one lane is gone
 *   3  Road blocked  the road is gone
 *   4  Dangerous   you should not be here
 *
 * The stored column is still an integer 1–4, so nothing in the database has to
 * move. What changes is that every surface now shows the *word*, and a report
 * that never got a severity is labelled "Not rated" rather than being drawn as a
 * quiet one.
 */

/** The four levels, in order. The number is what the database stores. */
export const SEVERITY_LEVELS = [
  { level: 1, label: "Minor", short: "Minor", blurb: "In the way, but you can get past it" },
  { level: 2, label: "Lane blocked", short: "Lane blocked", blurb: "One lane is gone" },
  { level: 3, label: "Road blocked", short: "Road blocked", blurb: "The road is gone" },
  { level: 4, label: "Dangerous", short: "Dangerous", blurb: "You should not be here" },
] as const;

export type SeverityLevel = 1 | 2 | 3 | 4;

export const SEVERITY_MIN = 1;
export const SEVERITY_MAX = 4;

/** The label a resident reads. Unknown numbers are clamped, never invented. */
export function severityLabel(severity: number | null | undefined): string {
  const n = clampSeverity(severity);
  return SEVERITY_LEVELS[n - 1].label;
}

/** The one-line explanation, for a tooltip or the detail page. */
export function severityBlurb(severity: number | null | undefined): string {
  const n = clampSeverity(severity);
  return SEVERITY_LEVELS[n - 1].blurb;
}

/** Clamp anything (including a legacy 5) into 1–4. */
export function clampSeverity(severity: number | null | undefined): SeverityLevel {
  const n = Math.round(Number(severity));
  if (!Number.isFinite(n)) return 2;
  return Math.min(SEVERITY_MAX, Math.max(SEVERITY_MIN, n)) as SeverityLevel;
}

/**
 * A report whose severity was never set honestly says so. Returns null for a
 * missing value so the caller can render "Not rated" — a card that silently
 * drew no severity badge read as "nothing serious", which is the opposite of
 * what we know.
 */
export function severityOrUnrated(severity: number | null | undefined): { level: SeverityLevel; rated: boolean } {
  const n = Number(severity);
  if (!Number.isFinite(n) || n < SEVERITY_MIN) return { level: 2, rated: false };
  return { level: clampSeverity(n), rated: true };
}

/** The token that paints a level. Critical is danger; the rest step through the scale. */
export function severityToken(severity: number | null | undefined): string {
  const n = clampSeverity(severity);
  if (n >= 4) return "var(--danger)";
  if (n === 3) return "var(--sev-3)";
  if (n === 2) return "var(--sev-2)";
  return "var(--sev-1)";
}

/** Levels 3 and 4 are the ones worth pushing to the top of the feed. */
export function isUrgent(severity: number | null | undefined): boolean {
  return clampSeverity(severity) >= 3;
}
