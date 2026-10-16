/*
 * Report intake copilot: before a report is published, one call that (a) asks Gemini to
 * suggest the category, severity and a clearer headline, (b) finds the place named in the
 * words with the offline gazetteer, and (c) warns about reports already on the map —
 * the strict same-spot rule from the publish path (180 m / same category / 90 min) plus
 * a wider wording-similarity scan. It is advisory only: the reporter accepts, edits or
 * ignores everything, and submitting works exactly as before if this is never called.
 * Without GEMINI_API_KEY the AI part is null and the duplicate/place checks still run,
 * so the endpoint is useful (and honest about itself) in every configuration.
 */
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { aiConfigured, geminiJson } from "@/lib/ai";
import { isLikelyDuplicateIncident } from "@/lib/collect";
import { CATEGORY_KEYS, haversineMeters } from "@/lib/geo";
import { placeFromText } from "@/lib/ingest";
import { buildReportPrompt, findSimilarReports, validateSuggestion, type DraftSuggestion, type ReportDraft } from "@/lib/report-ai-core";

export type AssistDuplicate = {
  id: string;
  title: string;
  category: string;
  confirmations: number;
  createdAt: string;
  distanceM: number | null;
  /** exact = the publish path would merge this; similar = same wording near the pin */
  strength: "exact" | "similar";
};

export type AssistResult = {
  /** True when Gemini actually read the draft. False means: rules-only check. */
  ai: boolean;
  suggestion: DraftSuggestion | null;
  /** Place the words name, from the offline gazetteer (never the model's guess). */
  place: { lat: number; lng: number; parish: string; street: string } | null;
  duplicates: AssistDuplicate[];
};

export async function assistReportDraft(
  draft: ReportDraft & { lat?: number | null; lng?: number | null },
): Promise<AssistResult> {
  const place = placeFromText(`${draft.title} ${draft.details ?? ""} ${draft.photoNote ?? ""}`);

  let suggestion: DraftSuggestion | null = null;
  if (aiConfigured() && draft.title.trim().length >= 5) {
    const raw = await geminiJson<Record<string, unknown>>(buildReportPrompt(draft, CATEGORY_KEYS), { maxTokens: 320, temperature: 0.1 });
    suggestion = validateSuggestion(raw, CATEGORY_KEYS);
  }

  const duplicates: AssistDuplicate[] = [];
  if (typeof draft.lat === "number" && typeof draft.lng === "number" && Number.isFinite(draft.lat) && Number.isFinite(draft.lng)) {
    // Wider net than the publish-time merge: anything active nearby in the last day.
    const rows = await db
      .select()
      .from(incidents)
      .where(
        and(
          eq(incidents.status, "active"),
          gte(incidents.createdAt, new Date(Date.now() - 24 * 3_600_000)),
          gte(incidents.lat, draft.lat - 0.02),
          // ~2.2 km box; exact distance is computed below.
          lte(incidents.lat, draft.lat + 0.02),
          gte(incidents.lng, draft.lng - 0.02),
          lte(incidents.lng, draft.lng + 0.02),
        ),
      )
      .orderBy(desc(incidents.createdAt))
      .limit(60)
      .catch(() => []);
    const within = rows
      .map((r) => ({ row: r, distanceM: Math.round(haversineMeters([draft.lat!, draft.lng!], [r.lat, r.lng])) }))
      .filter((x) => x.distanceM <= 2000);

    const exactCategory = suggestion?.category ?? draft.category;
    for (const { row, distanceM } of within) {
      if (isLikelyDuplicateIncident({ category: exactCategory, lat: draft.lat, lng: draft.lng }, row)) {
        duplicates.push({
          id: row.id,
          title: row.title,
          category: row.category,
          confirmations: row.confirmations,
          createdAt: row.createdAt.toISOString(),
          distanceM,
          strength: "exact",
        });
      }
    }
    const similar = findSimilarReports(
      draft,
      within
        .filter(({ row }) => !duplicates.some((d) => d.id === row.id))
        .map(({ row, distanceM }) => ({ id: row.id, title: row.title, details: row.details, category: row.category, distanceM, row })),
    );
    for (const s of similar) {
      duplicates.push({
        id: s.row.id,
        title: s.row.title,
        category: s.row.category,
        confirmations: s.row.confirmations,
        createdAt: s.row.createdAt.toISOString(),
        distanceM: s.distanceM,
        strength: "similar",
      });
    }
    duplicates.sort((a, b) => (a.strength === b.strength ? (a.distanceM ?? 0) - (b.distanceM ?? 0) : a.strength === "exact" ? -1 : 1));
  }

  return { ai: Boolean(suggestion), suggestion, place, duplicates: duplicates.slice(0, 3) };
}
