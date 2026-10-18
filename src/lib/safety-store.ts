/**
 * NOWBEY MASTER BUILD — safety data store (Section 15).
 *
 * Postgres via Drizzle when a database is attached (Neon in production, the
 * embedded PGlite in `npm run dev`); a seeded in-memory store when it is not,
 * so every screen and endpoint keeps working in a bare preview.
 *
 * Tables: `reports`, `news_wire` (created below, exactly as specced) and the
 * existing `alert_subscriptions`, which already stores email + island + types
 * as CSV and gains a `frequency` column here.
 *
 * Empty tables auto-seed 6 realistic reports and 5 outlet stories (Section 14).
 */
import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { alertSubscriptions, newsWire, reports } from "@/db/schema";
import {
  HAZARD_TYPES,
  ISLANDS,
  defaultCoords,
  coordsForSettlement,
  islandFor,
  isHazardType,
  isSeverity,
  type HazardType,
  type Severity,
} from "@/lib/bahamas";

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface SafetyReport {
  id: string;
  title: string;
  description: string;
  hazardType: HazardType;
  severity: Severity;
  island: string;
  settlement: string;
  address: string;
  lat: number;
  lng: number;
  isAnonymous: boolean;
  reporterName: string | null;
  confirmedCount: number;
  status: "active" | "verified" | "resolved";
  createdAt: string;
  updatedAt: string;
}

export interface WireStory {
  id: string;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  island: string;
  category: string;
  isVerified: boolean;
  publishedAt: string;
}

export interface AlertSubscription {
  id: number | string;
  email: string;
  island: string;
  types: string[];
  frequency: "instant" | "daily_digest";
  active: boolean;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Seed content — real Bahamian places and outlets only                */
/* ------------------------------------------------------------------ */

const MIN = 60_000;
const seedClock = () => Date.now();

function seedReports(now: number): SafetyReport[] {
  const at = (min: number) => new Date(now - min * MIN).toISOString();
  return [
    {
      id: "3f6a1c02-1111-4111-8111-000000000001",
      title: "Water across the lane after heavy squall — Bay Street & Navy Lion Rd",
      description:
        "About a foot of water running across the lane after the squall line passed. Cars are crawling through; a small car should turn around. Neighbours are watching the drains on the Bay Street side.",
      hazardType: "flooding",
      severity: "high",
      island: "New Providence",
      settlement: "Downtown Nassau",
      address: "Bay Street & Navy Lion Rd",
      lat: 25.0771,
      lng: -77.3402,
      isAnonymous: true,
      reporterName: null,
      confirmedCount: 6,
      status: "active",
      createdAt: at(12),
      updatedAt: at(12),
    },
    {
      id: "3f6a1c02-1111-4111-8111-000000000002",
      title: "BPL transformer sparking — Shirley Street",
      description:
        "Transformer on the pole is sparking and the line is humming loudly. Stay back and keep children away. BPL has been called. Safe bypass: use East Bay St to get around the block.",
      hazardType: "power_outage",
      severity: "critical",
      island: "New Providence",
      settlement: "Downtown Nassau",
      address: "Shirley Street",
      lat: 25.0733,
      lng: -77.3261,
      isAnonymous: false,
      reporterName: "Marcus B.",
      confirmedCount: 9,
      status: "active",
      createdAt: at(34),
      updatedAt: at(20),
    },
    {
      id: "3f6a1c02-1111-4111-8111-000000000003",
      title: "Gale surge at Glass Window Bridge",
      description:
        "Surge is washing over the bridge deck with each set. Wet and slippery on both approaches. Best to stay off the bridge until the gale eases — photo lookouts from the car park instead.",
      hazardType: "weather",
      severity: "high",
      island: "Eleuthera",
      settlement: "Glass Window",
      address: "Glass Window Bridge",
      lat: 25.4333,
      lng: -76.65,
      isAnonymous: true,
      reporterName: null,
      confirmedCount: 4,
      status: "active",
      createdAt: at(55),
      updatedAt: at(55),
    },
    {
      id: "3f6a1c02-1111-4111-8111-000000000004",
      title: "Downed tree — Queen's Highway, Eight Mile Rock",
      description:
        "Large tree down across the westbound lane after the morning squall. One lane is getting by slowly. Ministry of Works has been notified. Help needed: nothing right now — just give crews room.",
      hazardType: "road_hazard",
      severity: "medium",
      island: "Grand Bahama",
      settlement: "Eight Mile Rock",
      address: "Queen's Highway",
      lat: 26.226,
      lng: -78.922,
      isAnonymous: false,
      reporterName: "Renaldo F.",
      confirmedCount: 3,
      status: "verified",
      createdAt: at(96),
      updatedAt: at(40),
    },
    {
      id: "3f6a1c02-1111-4111-8111-000000000005",
      title: "Seawash across the harbour road — Marsh Harbour",
      description:
        "Water over the road near the harbour after the high tide and wind. Knee deep at the worst. Trucks are getting through slowly; small cars should wait for the tide to drop.",
      hazardType: "flooding",
      severity: "medium",
      island: "Abaco",
      settlement: "Marsh Harbour",
      address: "Harbour road near the government dock",
      lat: 26.545,
      lng: -77.066,
      isAnonymous: true,
      reporterName: null,
      confirmedCount: 2,
      status: "active",
      createdAt: at(130),
      updatedAt: at(130),
    },
    {
      id: "3f6a1c02-1111-4111-8111-000000000006",
      title: "Potable water truck — George Town Government Dock",
      description:
        "Water truck at the dock until 4pm today. Bring your own containers. The truck returns Thursday morning if the weather holds.",
      hazardType: "safety",
      severity: "low",
      island: "Exuma",
      settlement: "George Town",
      address: "George Town Government Dock",
      lat: 23.5167,
      lng: -75.8333,
      isAnonymous: false,
      reporterName: "Deidre P.",
      confirmedCount: 5,
      status: "resolved",
      createdAt: at(240),
      updatedAt: at(120),
    },
  ];
}

function seedWire(now: number): WireStory[] {
  const at = (min: number) => new Date(now - min * MIN).toISOString();
  return [
    {
      id: "7c2b9d04-2222-4222-8222-000000000001",
      headline: "Squall line brings heavy rain and roadway flooding to New Providence",
      summary:
        "A fast-moving squall dropped heavy rain across New Providence on Saturday, flooding lanes in the Bay Street area and slowing traffic on both ends of the island.",
      sourceName: "The Tribune 242",
      sourceUrl: "https://www.tribune242.com/",
      island: "New Providence",
      category: "weather",
      isVerified: true,
      publishedAt: at(22),
    },
    {
      id: "7c2b9d04-2222-4222-8222-000000000002",
      headline: "BPL crews working to restore power across western New Providence",
      summary:
        "Bahamas Power and Light says crews are out across western New Providence after outages linked to the squall line, with restoration work continuing into the evening.",
      sourceName: "Nassau Guardian",
      sourceUrl: "https://nassauguardian.net/",
      island: "New Providence",
      category: "power_outage",
      isVerified: true,
      publishedAt: at(64),
    },
    {
      id: "7c2b9d04-2222-4222-8222-000000000003",
      headline: "Glass Window Bridge closed to through traffic as surge builds",
      summary:
        "Authorities closed Glass Window Bridge to through traffic as gale-driven surge washed over the deck. Motorists are asked to use the inland routes until conditions ease.",
      sourceName: "Bahamas Press",
      sourceUrl: "https://bahamaspress.com/",
      island: "Eleuthera",
      category: "weather",
      isVerified: true,
      publishedAt: at(145),
    },
    {
      id: "7c2b9d04-2222-4222-8222-000000000004",
      headline: "Police urge caution on flooded roads in Fox Hill",
      summary:
        "The Royal Bahamas Police Force is asking drivers to slow down on flooded roads in the Fox Hill area and to avoid driving through standing water of unknown depth.",
      sourceName: "ZNS Network",
      sourceUrl: "https://www.znsbahamas.com/",
      island: "New Providence",
      category: "road_hazard",
      isVerified: true,
      publishedAt: at(220),
    },
    {
      id: "7c2b9d04-2222-4222-8222-000000000005",
      headline: "Gale warning in effect for the northern Bahamas — mariners advised to remain in port",
      summary:
        "The Bahamas Department of Meteorology has a gale warning in effect for the northern Bahamas. Mariners should remain in port, and coastal residents should watch for surge on exposed shores.",
      sourceName: "Bahamas Met Department",
      sourceUrl: "https://met.gov.bs/",
      island: "Abaco",
      category: "weather",
      isVerified: true,
      publishedAt: at(310),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* In-memory fallback (no DATABASE_URL / DB not up yet)                */
/* ------------------------------------------------------------------ */

interface MemoryStore {
  reports: SafetyReport[];
  wire: WireStory[];
  alerts: AlertSubscription[];
  nextAlertId: number;
}

const globalForStore = globalThis as typeof globalThis & { __nowbeySafetyMemory?: MemoryStore };

function memory(): MemoryStore {
  if (!globalForStore.__nowbeySafetyMemory) {
    const now = seedClock();
    globalForStore.__nowbeySafetyMemory = {
      reports: seedReports(now),
      wire: seedWire(now),
      alerts: [],
      nextAlertId: 1,
    };
  }
  return globalForStore.__nowbeySafetyMemory;
}

/* ------------------------------------------------------------------ */
/* Postgres bootstrap + seeds                                          */
/* ------------------------------------------------------------------ */

const DDL = `
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  hazard_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  island text NOT NULL,
  settlement text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT true,
  reporter_name text,
  confirmed_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_island_idx ON reports (island);
CREATE INDEX IF NOT EXISTS reports_created_idx ON reports (created_at DESC);
CREATE TABLE IF NOT EXISTS news_wire (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline text NOT NULL,
  summary text NOT NULL DEFAULT '',
  source_name text NOT NULL,
  source_url text NOT NULL,
  island text NOT NULL DEFAULT 'New Providence',
  category text NOT NULL DEFAULT 'weather',
  is_verified boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_wire_published_idx ON news_wire (published_at DESC);
ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'instant';
`;

let bootstrapped = false;

async function ensureTables(): Promise<void> {
  if (bootstrapped || !hasDatabase()) return;
  try {
    for (const stmt of DDL.split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.execute(sql.raw(stmt));
    }
    bootstrapped = true;
  } catch (err) {
    // A first-boot race (PGlite still migrating) falls back to memory for this request.
    console.warn("[safety-store] ensureTables:", err instanceof Error ? err.message : err);
  }
}

async function seedIfEmpty(): Promise<void> {
  if (!bootstrapped) return;
  try {
    const [{ n: reportCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(reports);
    if (reportCount === 0) {
      const now = seedClock();
      for (const r of seedReports(now)) {
        await db.insert(reports).values({
          id: r.id,
          title: r.title,
          description: r.description,
          hazardType: r.hazardType,
          severity: r.severity,
          island: r.island,
          settlement: r.settlement,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          isAnonymous: r.isAnonymous,
          reporterName: r.reporterName,
          confirmedCount: r.confirmedCount,
          status: r.status,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        });
      }
    }
    const [{ n: wireCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(newsWire);
    if (wireCount === 0) {
      const now = seedClock();
      for (const w of seedWire(now)) {
        await db.insert(newsWire).values({
          id: w.id,
          headline: w.headline,
          summary: w.summary,
          sourceName: w.sourceName,
          sourceUrl: w.sourceUrl,
          island: w.island,
          category: w.category,
          isVerified: w.isVerified,
          publishedAt: new Date(w.publishedAt),
        });
      }
    }
  } catch (err) {
    console.warn("[safety-store] seedIfEmpty:", err instanceof Error ? err.message : err);
  }
}

async function ready(): Promise<boolean> {
  await ensureTables();
  if (!bootstrapped) return false;
  await seedIfEmpty();
  return true;
}

/* ------------------------------------------------------------------ */
/* Row mapping                                                         */
/* ------------------------------------------------------------------ */

type ReportRow = typeof reports.$inferSelect;
type WireRow = typeof newsWire.$inferSelect;

function toReport(row: ReportRow): SafetyReport {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    hazardType: (isHazardType(row.hazardType) ? row.hazardType : "safety") as HazardType,
    severity: (isSeverity(row.severity) ? row.severity : "medium") as Severity,
    island: row.island,
    settlement: row.settlement ?? "",
    address: row.address ?? "",
    lat: row.lat,
    lng: row.lng,
    isAnonymous: row.isAnonymous,
    reporterName: row.reporterName ?? null,
    confirmedCount: row.confirmedCount ?? 1,
    status: (row.status as SafetyReport["status"]) ?? "active",
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function toWire(row: WireRow): WireStory {
  return {
    id: row.id,
    headline: row.headline,
    summary: row.summary ?? "",
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    island: row.island,
    category: row.category,
    isVerified: row.isVerified,
    publishedAt: new Date(row.publishedAt).toISOString(),
  };
}

function toAlert(row: typeof alertSubscriptions.$inferSelect): AlertSubscription {
  return {
    id: row.id,
    email: row.target,
    island: row.parishes.split(",")[0] ?? "New Providence",
    types: row.categories ? row.categories.split(",").filter(Boolean) : [],
    frequency: row.frequency === "daily_digest" ? "daily_digest" : "instant",
    active: row.active,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Public operations                                                   */
/* ------------------------------------------------------------------ */

export async function listReports(filter: { island?: string; type?: string } = {}): Promise<SafetyReport[]> {
  const wantIsland = filter.island?.trim();
  const wantType = filter.type?.trim();
  const match = (r: SafetyReport) =>
    (!wantIsland || r.island.toLowerCase() === wantIsland.toLowerCase() || islandCodeMatches(r.island, wantIsland)) &&
    (!wantType || r.hazardType === wantType);

  if (await ready()) {
    try {
      const rows = await db.select().from(reports).orderBy(desc(reports.createdAt)).limit(200);
      return rows.map(toReport).filter(match);
    } catch (err) {
      console.warn("[safety-store] listReports:", err instanceof Error ? err.message : err);
    }
  }
  return memory()
    .reports.filter(match)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

function islandCodeMatches(islandName: string, want: string): boolean {
  const codeWant = want.toUpperCase();
  return ISLANDS.some((i) => i.code === codeWant && i.name === islandName);
}

export async function getReport(id: string): Promise<SafetyReport | null> {
  if (await ready()) {
    try {
      const [row] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
      return row ? toReport(row) : null;
    } catch {
      /* fall through to memory */
    }
  }
  return memory().reports.find((r) => r.id === id) ?? null;
}

export interface ReportInput {
  title: string;
  description?: string;
  hazardType: string;
  severity?: string;
  island: string;
  settlement?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  isAnonymous?: boolean;
  reporterName?: string | null;
}

export async function createReport(input: ReportInput): Promise<SafetyReport> {
  const island = islandFor(input.island)?.name ?? input.island.trim();
  const settlement = (input.settlement ?? "").trim();
  const fromSettlement = coordsForSettlement(island, settlement);
  const fallback = defaultCoords(island);
  const lat = typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : (settlement ? fromSettlement : fallback).lat;
  const lng = typeof input.lng === "number" && Number.isFinite(input.lng) ? input.lng : (settlement ? fromSettlement : fallback).lng;
  const anonymous = input.isAnonymous !== false;
  const reporterName = anonymous ? null : (input.reporterName?.trim() || null);
  const now = new Date();

  const values = {
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    hazardType: input.hazardType,
    severity: isSeverity(input.severity) ? input.severity : "medium",
    island,
    settlement,
    address: (input.address ?? "").trim(),
    lat,
    lng,
    isAnonymous: anonymous,
    reporterName,
    confirmedCount: 1,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };

  if (await ready()) {
    try {
      const [row] = await db.insert(reports).values(values).returning();
      return toReport(row);
    } catch (err) {
      console.warn("[safety-store] createReport:", err instanceof Error ? err.message : err);
    }
  }
  const report: SafetyReport = {
    id: `mem-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ...values,
    hazardType: values.hazardType as HazardType,
    severity: values.severity as Severity,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  memory().reports.unshift(report);
  return report;
}

/** Atomic confirmedCount + 1. */
export async function confirmReport(id: string): Promise<SafetyReport | null> {
  if (await ready()) {
    try {
      const [row] = await db
        .update(reports)
        .set({ confirmedCount: sql`${reports.confirmedCount} + 1`, updatedAt: new Date() })
        .where(eq(reports.id, id))
        .returning();
      return row ? toReport(row) : null;
    } catch (err) {
      console.warn("[safety-store] confirmReport:", err instanceof Error ? err.message : err);
    }
  }
  const found = memory().reports.find((r) => r.id === id);
  if (!found) return null;
  found.confirmedCount += 1;
  found.updatedAt = new Date().toISOString();
  return found;
}

export async function listWire(): Promise<WireStory[]> {
  if (await ready()) {
    try {
      const rows = await db.select().from(newsWire).orderBy(desc(newsWire.publishedAt)).limit(50);
      return rows.map(toWire);
    } catch (err) {
      console.warn("[safety-store] listWire:", err instanceof Error ? err.message : err);
    }
  }
  return memory()
    .wire.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}

export interface AlertInput {
  email: string;
  island: string;
  types: string[];
  frequency: "instant" | "daily_digest";
}

export async function upsertAlert(input: AlertInput): Promise<AlertSubscription> {
  const email = input.email.trim().toLowerCase();
  const island = input.island.trim();
  const types = input.types.filter((t) => (HAZARD_TYPES as readonly string[]).includes(t));
  const frequency = input.frequency === "daily_digest" ? "daily_digest" : "instant";
  const now = new Date();

  if (await ready()) {
    try {
      const existing = await db
        .select()
        .from(alertSubscriptions)
        .where(and(eq(alertSubscriptions.target, email), eq(alertSubscriptions.parishes, island)))
        .limit(1);
      if (existing[0]) {
        const [row] = await db
          .update(alertSubscriptions)
          .set({ categories: types.join(","), frequency, active: true })
          .where(eq(alertSubscriptions.id, existing[0].id))
          .returning();
        return toAlert(row);
      }
      const [row] = await db
        .insert(alertSubscriptions)
        .values({
          channel: "email",
          target: email,
          parishes: island,
          categories: types.join(","),
          frequency,
          active: true,
          verified: true,
          verifiedAt: now,
          createdAt: now,
        })
        .returning();
      return toAlert(row);
    } catch (err) {
      console.warn("[safety-store] upsertAlert:", err instanceof Error ? err.message : err);
    }
  }
  const store = memory();
  const existing = store.alerts.find((a) => a.email === email && a.island === island);
  if (existing) {
    existing.types = types;
    existing.frequency = frequency;
    existing.active = true;
    return existing;
  }
  const sub: AlertSubscription = {
    id: store.nextAlertId++,
    email,
    island,
    types,
    frequency,
    active: true,
    createdAt: now.toISOString(),
  };
  store.alerts.push(sub);
  return sub;
}
