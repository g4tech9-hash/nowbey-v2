import { desc, gt } from "drizzle-orm";
import { db } from "@/db";
import { gasReports } from "@/db/schema";

export const FUELS = ["regular", "premium", "diesel"] as const;
export type Fuel = (typeof FUELS)[number];
export const isFuel = (v: unknown): v is Fuel => typeof v === "string" && (FUELS as readonly string[]).includes(v);

/** Pump prices below or above these (B$ per gallon) are typing mistakes. */
export const MIN_CENTS = 300;
export const MAX_CENTS = 1200;
const WINDOW_DAYS = 14;

export type StationPrice = { station: string; parish: string; fuel: Fuel; priceCents: number; reportedAt: string; reports: number };
export type FuelStats = { fuel: Fuel; averageCents: number | null; cheapest: StationPrice | null; stations: number };
export type GasBoard = { stations: StationPrice[]; stats: FuelStats[]; official: Partial<Record<Fuel, number>> | null; windowDays: number };

/** GAS_OFFICIAL="regular=5.12,premium=5.60,diesel=4.95" shows the government-set prices when you have them. */
export function officialPrices(): Partial<Record<Fuel, number>> | null {
  const raw = process.env.GAS_OFFICIAL?.trim();
  if (!raw) return null;
  const out: Partial<Record<Fuel, number>> = {};
  for (const part of raw.split(",")) {
    const [k, v] = part.split("=").map((x) => x.trim().toLowerCase());
    const n = Number(v);
    if (isFuel(k) && Number.isFinite(n) && n > 0) out[k] = Math.round(n * 100);
  }
  return Object.keys(out).length ? out : null;
}

const stationKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Newest report per station and fuel from the last two weeks, with averages and the cheapest pump. */
export async function gasBoard(parish?: string | null): Promise<GasBoard> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const rows = await db.select().from(gasReports).where(gt(gasReports.createdAt, since)).orderBy(desc(gasReports.createdAt)).limit(2000);
  const latest = new Map<string, StationPrice>();
  for (const r of rows) {
    if (parish && r.parish !== parish) continue;
    if (!isFuel(r.fuel)) continue;
    const key = `${stationKey(r.station)}|${r.parish}|${r.fuel}`;
    const have = latest.get(key);
    if (have) have.reports += 1;
    else latest.set(key, { station: r.station, parish: r.parish, fuel: r.fuel, priceCents: r.priceCents, reportedAt: r.createdAt.toISOString(), reports: 1 });
  }
  const stations = [...latest.values()].sort((a, b) => a.priceCents - b.priceCents);
  const stats: FuelStats[] = FUELS.map((fuel) => {
    const list = stations.filter((s) => s.fuel === fuel);
    return {
      fuel,
      averageCents: list.length ? Math.round(list.reduce((n, s) => n + s.priceCents, 0) / list.length) : null,
      cheapest: list[0] ?? null,
      stations: list.length,
    };
  });
  return { stations, stats, official: officialPrices(), windowDays: WINDOW_DAYS };
}

/** The middle price of recent reports for one island and fuel, used to catch typing mistakes. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
