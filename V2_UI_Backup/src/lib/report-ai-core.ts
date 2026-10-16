/*
 * Pure helpers for the report intake copilot (report-ai.ts does the Gemini/DB calls):
 * validating the model's suggestions, phrasing the prompt, and spotting near-duplicate
 * reports by wording. No imports beyond geo constants, so tests can run this directly.
 * The copilot only ever suggests — the reporter keeps every final say, and nothing
 * here can publish, hide or merge a report on its own.
 */
import type { CategoryKey } from "./geo";

export type ReportDraft = {
  title: string;
  details?: string;
  photoNote?: string;
  category: string;
  severity: number;
  parish?: string | null;
};

export type DraftSuggestion = {
  category: CategoryKey | null;
  severity: number | null;
  headline: string;
  missingInfo: string[];
  confidence: "low" | "medium" | "high";
};

const clip = (v: unknown, max: number): string =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** A model answer becomes a suggestion only with a real category and bounded fields. Severity is NowBey's 1–4. */
export function validateSuggestion(raw: unknown, allowedCategories: readonly string[]): DraftSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const cat = typeof a.category === "string" ? a.category.trim().toLowerCase() : "";
  const sevRaw = typeof a.severity === "number" ? a.severity : Number(a.severity);
  const headline = clip(a.headline, 140);
  const missing = Array.isArray(a.missingInfo)
    ? a.missingInfo.filter((m): m is string => typeof m === "string").map((m) => clip(m, 120)).filter(Boolean).slice(0, 3)
    : [];
  const conf = String(a.confidence ?? "").toLowerCase();
  const category = allowedCategories.includes(cat) ? (cat as CategoryKey) : null;
  // Nothing a reporter could act on (unknown category, no headline, no questions) is not a suggestion.
  if (!category && !headline && !missing.length) return null;
  return {
    category,
    severity: Number.isFinite(sevRaw) ? Math.min(4, Math.max(1, Math.round(sevRaw))) : null,
    headline,
    missingInfo: missing,
    confidence: conf === "high" || conf === "medium" ? conf : "low",
  };
}

export function buildReportPrompt(d: ReportDraft, categoryKeys: readonly string[]): string {
  return `You help a resident of The Bahamas file a clear community report on NowBey (a safety/neighbourhood map). Read their draft and suggest improvements. Never invent facts they did not state; Bahamian place names and dialect in the draft are real local knowledge, keep them.

Answer in JSON with exactly these keys:
- "category": one of ${categoryKeys.join(", ")} — what this report most is ("notice" only when nothing else fits)
- "severity": 1–4 (1 annoying, 2 blocking a lane/sidewalk, 3 blocking a road or service, 4 dangerous to people)
- "headline": a clearer headline of at most 12 words using only facts from the draft (street/area names included when given). When the draft headline is already clear, return it unchanged.
- "missingInfo": up to 3 short questions whose answers would most help neighbours (for example how deep the water is, which direction is blocked, since when). Empty list when the draft already says enough.
- "confidence": "low" | "medium" | "high" — how sure you are about the category.

Draft:
chosen category: ${d.category} · chosen severity: ${d.severity}${d.parish ? ` · island/parish: ${d.parish}` : ""}
headline: ${d.title.slice(0, 140)}
details: ${(d.details ?? "").slice(0, 1200)}
photo description: ${(d.photoNote ?? "").slice(0, 300)}`;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "on", "in", "at", "to", "is", "are", "was", "were", "it", "its",
  "near", "by", "from", "with", "there", "this", "that", "now", "just", "road", "street",
]);

/** Same event, different words: flooding/water, outage/power and friends count as one token. */
const SYNONYMS: Record<string, string> = {
  flood: "water", flooding: "water", flooded: "water",
  outage: "power", outages: "power", electricity: "power", blackout: "power",
  blaze: "fire", smoke: "fire", burning: "fire",
  accident: "crash", collision: "crash", crashed: "crash",
  pothole: "roadwork", potholes: "roadwork", closure: "roadwork", blocked: "roadwork", blocking: "roadwork",
};

function normalizeToken(w: string): string {
  const stemmed = w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w;
  return SYNONYMS[w] ?? SYNONYMS[stemmed] ?? stemmed;
}

export function tokensOf(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .map(normalizeToken),
  );
}

/**
 * Overlap coefficient (shared ÷ smaller set, 0–1): right for short headlines, where one
 * report is often a terser version of the other. Street names dominate, as they should.
 */
export function textSimilarity(a: string, b: string): number {
  const ta = tokensOf(a);
  const tb = tokensOf(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  if (shared < 2) return 0; // one shared word ("Bay") is geography, not a duplicate
  return shared / Math.min(ta.size, tb.size);
}

export type SimilarCandidate = {
  id: string;
  title: string;
  category: string;
  distanceM: number | null;
};

/**
 * Wording-based near-duplicates near the pin: reports the strict geo rule (same category,
 * 180 m, 90 min) would miss because the reporter picked a different category or the event
 * is older/broader. Returns the best 3 at or above `threshold` overlap, strongest first.
 */
export function findSimilarReports<T extends SimilarCandidate & { details?: string | null }>(
  draft: { title: string; details?: string },
  candidates: T[],
  threshold = 0.34,
): (T & { similarity: number })[] {
  const draftText = `${draft.title} ${draft.details ?? ""}`;
  return candidates
    .map((c) => ({ ...c, similarity: textSimilarity(draftText, `${c.title} ${c.details ?? ""}`) }))
    .filter((c) => c.similarity >= threshold)
    .sort((x, y) => y.similarity - x.similarity)
    .slice(0, 3);
}
