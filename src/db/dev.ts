import fs from "node:fs";
import path from "node:path";
import { count } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { incidents, newsItems } from "@/db/schema";
import { devDbSlot } from "@/db";

/*
 * Embedded development database.
 *
 * Why this exists: a fresh clone used to show empty pages and "setup not finished" notices until
 * a Neon project existed and DATABASE_URL was pasted in. For local development that is friction
 * with no payoff — PGlite is real Postgres compiled to WebAssembly, it runs in-process, and it
 * keeps its files in .data/pglite (already gitignored). `npm run dev` with no DATABASE_URL now
 * boots straight into a working map, feed and wire, seeded with a handful of obviously-demo
 * Nassau pins; set DATABASE_URL and none of this runs.
 *
 * Production never touches this module: instrumentation.register only calls it outside
 * production, and the file is reached through a dynamic import, so the WASM payload is never in
 * a production server bundle. The schema comes from drizzle-kit's generated migrations
 * (drizzle/0000_init.sql — regenerate with `npm run db:gen` after changing src/db/schema.ts),
 * the same files `drizzle-kit migrate` applies to a real database, so dev and prod stay in
 * lock-step instead of drifting into two schemas.
 */

const DATA_DIR = path.join(process.cwd(), ".data", "pglite");
const MIGRATIONS = path.join(process.cwd(), "drizzle");

/**
 * A parcel of Nassau pins and wire stories, one per map/feed/wire surface, so every page has
 * something to show on first boot. Clearly demo content: authors are "demo", sources are
 * "Demo Wire". Only inserted into a brand-new database (the incidents table is empty), so
 * deleting .data/pglite is the documented way to get the demo set back.
 */
const HOUR = 3_600_000;
const now = Date.now();
const ago = (h: number) => new Date(now - h * HOUR);

async function seedDemoContent(db: PgliteDatabase): Promise<void> {
  const [{ n }] = await db.select({ n: count() }).from(incidents);
  if (n > 0) return;

  await db.insert(incidents).values([
    {
      title: "Standing water on Madeira St by Mackey St, cars crawling through",
      details: "Demo pin. About a foot of water in the southbound lane after the morning squall. Passable in a jeep, avoid in a small car.",
      category: "flood",
      severity: 3,
      lat: 25.0485,
      lng: -77.3217,
      street: "Madeira St",
      address: "Madeira St & Mackey St, Nassau",
      parish: "New Providence",
      confirmations: 3,
      authorHandle: "demo",
      createdAt: ago(2),
    },
    {
      title: "Power out on Fox Hill Rd since about 6 am",
      details: "Demo pin. Whole block dark from the park to the roundabout. BPL truck seen at the substation an hour ago.",
      category: "power",
      severity: 2,
      lat: 25.0341,
      lng: -77.2876,
      street: "Fox Hill Rd",
      address: "Fox Hill Rd, Nassau",
      parish: "New Providence",
      confirmations: 5,
      authorHandle: "demo",
      createdAt: ago(5),
    },
    {
      title: "Deep pothole eastbound on East Bay St near Potters Cay",
      details: "Demo pin. Right lane, hard to see after dark. Two cars pulled over with flats this evening.",
      category: "road",
      severity: 2,
      lat: 25.0813,
      lng: -77.3385,
      street: "E Bay St",
      address: "E Bay St, Nassau",
      parish: "New Providence",
      confirmations: 2,
      authorHandle: "demo",
      createdAt: ago(9),
    },
    {
      title: "Water pressure down to a trickle in Chippingham",
      details: "Demo pin. WSC says a crew is on the way. Fill buckets while there is still something.",
      category: "water",
      severity: 2,
      lat: 25.0747,
      lng: -77.3554,
      address: "Chippingham, Nassau",
      parish: "New Providence",
      confirmations: 1,
      authorHandle: "demo",
      createdAt: ago(14),
    },
    {
      title: "Fallen tree cleared from Wulff Rd, both lanes open again",
      details: "Demo pin. The tree from last night's wind is cut up and the road is fully open.",
      category: "road",
      severity: 1,
      lat: 25.0522,
      lng: -77.3421,
      street: "Wulff Rd",
      address: "Wulff Rd, Nassau",
      parish: "New Providence",
      status: "resolved",
      confirmations: 4,
      authorHandle: "demo",
      createdAt: ago(30),
      resolvedAt: ago(26),
    },
  ]);

  await db.insert(newsItems).values([
    {
      title: "Tropical wave east of the islands expected to bring rain through the weekend",
      summary: "Demo story. Forecasters are watching a tropical wave moving toward the southeast Bahamas, with showers likely over New Providence from Friday night.",
      url: "https://example.com/demo/tropical-wave-weekend-rain",
      sourceName: "Demo Wire",
      parish: "New Providence",
      lat: 25.0443,
      lng: -77.3504,
      geocoded: true,
      placement: "street",
      category: "storm",
      publishedAt: ago(1),
    },
    {
      title: "Road works on West Bay St to close one lane near Saunders Beach this week",
      summary: "Demo story. Ministry of Works crews will mill and repave a stretch of West Bay Street; expect delays between 9 am and 4 pm.",
      url: "https://example.com/demo/west-bay-st-road-works",
      sourceName: "Demo Wire",
      parish: "New Providence",
      lat: 25.0739,
      lng: -77.3764,
      geocoded: true,
      placement: "street",
      category: "road",
      publishedAt: ago(7),
    },
    {
      title: "Community clean-up at Montagu Beach this Saturday morning",
      summary: "Demo story. Volunteers meet at the ramp at 7 am; bags and gloves provided. Bring a water bottle.",
      url: "https://example.com/demo/montagu-beach-cleanup",
      sourceName: "Demo Wire",
      parish: "New Providence",
      lat: 25.0688,
      lng: -77.3095,
      geocoded: true,
      placement: "street",
      category: "event",
      publishedAt: ago(20),
    },
    {
      title: "BPL schedules maintenance outage for parts of eastern New Providence",
      summary: "Demo story. Bahamas Power and Light says a planned two-hour outage will affect Fox Hill and Sans Souci on Tuesday for line maintenance.",
      url: "https://example.com/demo/bpl-planned-outage-east",
      sourceName: "Demo Wire",
      parish: "New Providence",
      // No coordinates on purpose: the wire list must also show how unplaced stories look.
      category: "power",
      publishedAt: ago(28),
    },
  ]);
}

/**
 * Create the embedded database, apply the generated migrations, seed a fresh one, and park the
 * handle on the slot src/db/index.ts reads. Safe to call once per process; later calls are
 * no-ops (Next may invoke register() again after editing instrumentation.ts in dev).
 */
export async function initDevDatabase(): Promise<void> {
  if (devDbSlot.__nowbeyDevDatabase) return;

  // PGlite creates the data directory itself but not its parents (mkdir without recursive).
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const client = new PGlite(DATA_DIR);
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: MIGRATIONS });
  await seedDemoContent(db);

  // getPool() is typed for `pg`'s Pool, but the only member real code touches is .query()
  // (the shared rate limiter), and PGlite's .query(text, params) already returns { rows }.
  const pool = {
    query: (text: string, params: unknown[] = []) => client.query(text, params as never[]),
    on: () => undefined,
    end: () => client.close(),
  } as unknown as Pool;

  devDbSlot.__nowbeyDevDatabase = { db: db as unknown as NodePgDatabase, pool };
  console.info(`[db] No DATABASE_URL — using the embedded dev Postgres in ${path.relative(process.cwd(), DATA_DIR)} (schema applied, demo content seeded when new).`);
}
