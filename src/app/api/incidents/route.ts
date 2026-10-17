import { NextResponse, after } from "next/server";
import { and, desc, eq, gte, lte, ne, notInArray, or, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { badgesFor } from "@/lib/badges";
import { HIDDEN_STATUSES } from "@/lib/command";
import { getViewer } from "@/lib/viewer";
import { publicBase } from "@/lib/billing";
import { dispatchIncidentAlerts } from "@/lib/alerts";
import { autoFlagIncident } from "@/lib/moderation";
import { refreshOfficialIfStale } from "@/lib/official";
import { dispatchIncidentPush } from "@/lib/push";
import { publicIncident } from "@/lib/public";
import { CATEGORY_KEYS, inBahamas, knownParish, resolveParish } from "@/lib/geo";
import { isLikelyDuplicateIncident } from "@/lib/collect";
import { clientIp, sharedHit, tooMany } from "@/lib/ratelimit";
import { pinPrivacyMeters, storedPinFor } from "@/lib/location-privacy";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { clampInt, likeEscape, text, readJson, param } from "@/lib/validate";



const CATEGORIES = new Set<string>(CATEGORY_KEYS);

export async function GET(req: Request) {
  // Keep official (NHC etc.) pins fresh off the map's own traffic; guarded so it can never break the map.
  after(() => refreshOfficialIfStale());
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const parish = knownParish(searchParams.get("parish"));
  const rawStatus = searchParams.get("status") ?? "active";
  const status = ["active", "resolved", "all", "archived"].includes(rawStatus) ? rawStatus : "active";
  const q = param(searchParams.get("q"), 100);
  const hours = clampInt(searchParams.get("hours"), 0, 0, 24 * 365);
  const limit = clampInt(searchParams.get("limit"), 60, 1, 200);

  const filters = [];
  // Hidden ("archived") and unfounded reports are for staff only. "all" means every report that is still visible.
  if (status === "archived" && !(await getViewer()).isEditor) return NextResponse.json({ incidents: [], counts: [] });
  if (status === "all") filters.push(notInArray(incidents.status, HIDDEN_STATUSES));
  else filters.push(eq(incidents.status, status));
  if (category && CATEGORIES.has(category)) filters.push(eq(incidents.category, category));
  if (parish) filters.push(eq(incidents.parish, parish));
  if (q) {
    const needle = `%${likeEscape(q)}%`;
    filters.push(or(ilike(incidents.title, needle), ilike(incidents.details, needle), ilike(incidents.address, needle)));
  }
  if (hours > 0) {
    filters.push(gte(incidents.createdAt, new Date(Date.now() - hours * 3600 * 1000)));
  }

  const rows = await db
    .select()
    .from(incidents)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(incidents.createdAt))
    .limit(limit);

  const counts = await db
    .select({ category: incidents.category, n: sql<number>`count(*)::int` })
    .from(incidents)
    .where(eq(incidents.status, "active"))
    .groupBy(incidents.category);

  const badges = await badgesFor(rows.map((r) => (r.anonymous ? null : r.authorHandle)));
  return NextResponse.json({
    incidents: rows.map((r) => ({ ...publicIncident(r), authorBadge: badges.get(r.authorHandle ?? "") ?? null })),
    counts,
  });
}

export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  // Shared across serverless instances (the in-memory limiter gave each instance its own count).
  const gate = await sharedHit(`report:${clientIp(req)}`, 15, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "reports");

  const body = await readJson(req);

  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);
  const title = text(body.title, 140);
  const category = typeof body.category === "string" ? body.category : "notice";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "A pin with real coordinates is required." }, { status: 400 });
  }
  if (!inBahamas(lat, lng)) {
    return NextResponse.json(
      { error: "NowBey only covers The Bahamas — drag the pin back onto the islands." },
      { status: 400 },
    );
  }
  if (title.length < 5) {
    return NextResponse.json({ error: "Give it a headline of at least 5 characters." }, { status: 400 });
  }
  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Pick one of the NowBey categories." }, { status: 400 });
  }

  const sev = Math.round(Number(body.severity ?? 2));
  const severity = Number.isFinite(sev) ? Math.min(4, Math.max(1, sev)) : 2;
  const accuracy = Number(body.accuracyMeters);
  const anonymous = body.anonymous === true;

  // Keep one live incident per event instead of sending neighbours five alerts for the same flooded road.
  // The tight distance/time/category rules intentionally favour separate reports when there is any doubt.
  const recentCandidates = await db
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.status, "active"),
        eq(incidents.category, category),
        gte(incidents.createdAt, new Date(Date.now() - 90 * 60_000)),
        gte(incidents.lat, lat - 0.003),
        lte(incidents.lat, lat + 0.003),
        gte(incidents.lng, lng - 0.003),
        lte(incidents.lng, lng + 0.003),
      ),
    )
    .orderBy(desc(incidents.createdAt))
    .limit(12);
  const duplicate = recentCandidates.find((candidate) => isLikelyDuplicateIncident({ category, lat, lng }, candidate));
  // Duplicate matching uses the exact spot the reporter chose; what is stored and published is approximate.
  const reportedAccuracy = Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 10_000 ? accuracy : null;
  const stored = storedPinFor({ lat, lng, accuracyMeters: reportedAccuracy }, pinPrivacyMeters());
  if (duplicate) {
    return NextResponse.json({ incident: publicIncident(duplicate), duplicate: true, message: "A nearby report already covers this event. We opened it instead of sending neighbours another alert." });
  }

  // The handle always comes from the session, never from the request body, so nobody can
  // post as someone else and borrow their verified badge.
  const viewer = await getViewer();
  const handle = anonymous ? "someone" : (viewer.handle ?? "neighbour");

  const [row] = await db
    .insert(incidents)
    .values({
      title,
      details: text(body.details, 2000) || null,
      category,
      severity,
      lat: stored.lat,
      lng: stored.lng,
      accuracyMeters: stored.accuracyMeters,
      pinApproximated: stored.pinApproximated,
      address: text(body.address, 200) || null,
      street: text(body.street, 120) || null,
      // A missing or unrecognised island is worked out from the pin, so alerts reach the right people.
      parish: resolveParish(body.parish, lat, lng),
      // Anonymous reports are not tied to an account at all, even inside the database.
      userId: anonymous ? null : viewer.userId,
      authorHandle: handle,
      anonymous,
      sourceKind: "resident",
      photoNote: text(body.photoNote, 300) || null,
      confirmations: 1,
    })
    .returning();

  const base = publicBase(req);
  if (base) {
    after(async () => {
      try {
        await dispatchIncidentAlerts(row, base);
      } catch (e) {
        console.error("alert dispatch failed", e instanceof Error ? e.message : e);
      }
      try {
        await dispatchIncidentPush(row, base);
      } catch (e) {
        console.error("push dispatch failed", e instanceof Error ? e.message : e);
      }
    });
  } else {
    console.warn("[alerts] Skipped sending: APP_URL is not set, and email links need a fixed site address.");
  }

  // AI first-pass moderation (no-op without a key): can only add a staff flag under
  // "Reported by readers" on the admin reports page — it never hides a report itself.
  after(() => autoFlagIncident(row.id, row.title, row.details));

  return NextResponse.json({ incident: publicIncident(row) }, { status: 201 });
}
