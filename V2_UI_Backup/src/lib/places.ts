import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { places } from "@/db/schema";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABELS: Record<Day, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

export type Hours = Partial<Record<Day, string>>;

/** Reads the stored hours. Anything unreadable is treated as no hours rather than breaking the page. */
export function parseHours(raw: string | null | undefined): Hours {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Hours = {};
    for (const d of DAYS) if (typeof parsed[d] === "string" && parsed[d].trim()) out[d] = parsed[d].trim().slice(0, 60);
    return out;
  } catch {
    return {};
  }
}

/** Extra status line from the directory importer (e.g. "Opens 8 am Mon").
 * Shown when no per-day hours exist. Anything unreadable yields null. */
export function hoursNote(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const note = parsed.note ?? parsed.detail;
    if (typeof note === "string" && note.trim()) return note.trim().slice(0, 120);
    const status = parsed.status;
    if (typeof status === "string" && status.trim()) return status.trim().slice(0, 60);
    return null;
  } catch {
    const s = raw.trim();
    return s ? s.slice(0, 120) : null;
  }
}

/** Keeps only the days the form sent, each one short, so hours stay readable. */
export function cleanHours(input: unknown): Hours {
  const out: Hours = {};
  if (!input || typeof input !== "object") return out;
  for (const d of DAYS) {
    const v = (input as Record<string, unknown>)[d];
    if (typeof v === "string" && v.trim()) out[d] = v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 60);
  }
  return out;
}

/**
 * The place a review is about. One place per name, type and island: the first person to name it creates it,
 * later reviews join it. A location is filled in if the place does not have one yet.
 */
export async function findOrCreatePlace(
  tx: Tx,
  input: { name: string; kind: string; parish: string; lat: number | null; lng: number | null; street: string | null },
): Promise<string> {
  const name = input.name.trim();
  const [hit] = await tx
    .select({ id: places.id, lat: places.lat })
    .from(places)
    .where(and(sql`lower(btrim(${places.name})) = ${name.toLowerCase()}`, eq(places.kind, input.kind), eq(places.parish, input.parish)))
    .limit(1);
  if (hit) {
    if (hit.lat === null && input.lat !== null && input.lng !== null) {
      await tx
        .update(places)
        .set({ lat: input.lat, lng: input.lng, address: input.street ?? undefined, updatedAt: new Date() })
        .where(eq(places.id, hit.id));
    }
    return hit.id;
  }
  const [row] = await tx
    .insert(places)
    .values({ name, kind: input.kind, parish: input.parish, lat: input.lat, lng: input.lng, address: input.street })
    .returning({ id: places.id });
  return row.id;
}
