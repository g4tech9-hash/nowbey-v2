/**
 * Seed data for the landing page's demonstration panel.
 *
 * The page has to look alive before anyone signs in, and it must look the same every time
 * it is opened - a hero panel that reshuffles on every render reads as a glitch, and a
 * server that has to answer for it turns a static page into a page that can 500.
 *
 * So: a fixed seed, a fixed clock and a fixed set of lines. The numbers below are
 * *representative*, not live; the panel says so on the page. The real feed lives behind
 * `/map` and `/wire`.
 */

import type { FeedItem, LandingMetrics, SignalLevel } from "./landing-model";
import { levelFromSeverity } from "./landing-model";

/** The seed the page ships with. Change it and every derived number changes with it. */
export const DEFAULT_SEED = 20261017;

/**
 * mulberry32: a tiny, fast, fully deterministic pseudo-random generator.
 * Same seed in, same numbers out - in the browser, in Node and in a test.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The raw lines the panel draws from. Text is fixed; only the numbers are seeded. */
const SEED_LINES: Array<Omit<FeedItem, "id" | "confirmations" | "level"> & { severity: number }> = [
  {
    kind: "hazard",
    title: "Standing water at the Rawson Square underpass",
    area: "Nassau, New Providence",
    category: "flood",
    severity: 3,
    minutesAgo: 6,
    source: "A neighbour",
  },
  {
    kind: "official",
    title: "National Hurricane Center: tropical storm advisory in effect",
    area: "New Providence and Eleuthera",
    category: "storm",
    severity: 4,
    minutesAgo: 14,
    source: "US National Hurricane Center",
  },
  {
    kind: "hazard",
    title: "Power outage reported across the Cable Beach blocks",
    area: "Nassau, New Providence",
    category: "power",
    severity: 2,
    minutesAgo: 23,
    source: "3 neighbours",
  },
  {
    kind: "wire",
    title: "Shelter hours extended to 10pm as the system tracks north",
    area: "Nassau, New Providence",
    category: "storm",
    severity: 3,
    minutesAgo: 31,
    source: "The Nassau Guardian",
  },
  {
    kind: "hazard",
    title: "Water main break - low pressure across Shirley Street",
    area: "Nassau, New Providence",
    category: "water",
    severity: 2,
    minutesAgo: 47,
    source: "A neighbour",
  },
  {
    kind: "hazard",
    title: "Deep pothole in the westbound lane of West Bay Street",
    area: "Nassau, New Providence",
    category: "road",
    severity: 2,
    minutesAgo: 58,
    source: "2 neighbours",
  },
  {
    kind: "wire",
    title: "Ferry timetable changes for the Exuma route from Friday",
    area: "George Town, Exuma",
    category: "notice",
    severity: 1,
    minutesAgo: 96,
    source: "The Tribune",
  },
  {
    kind: "hazard",
    title: "Smoke from a brush fire visible north of the airport road",
    area: "Nassau, New Providence",
    category: "fire",
    severity: 3,
    minutesAgo: 132,
    source: "A neighbour",
  },
  {
    kind: "hazard",
    title: "Rocky surf and a strong current advisory for the west coast beaches",
    area: "Alice Town, Bimini",
    category: "marine",
    severity: 2,
    minutesAgo: 188,
    source: "The Royal Bahamian",
  },
  {
    kind: "wire",
    title: "New Providence schools closed Friday, ministry confirms",
    area: "Nassau, New Providence",
    category: "notice",
    severity: 1,
    minutesAgo: 244,
    source: "The Nassau Guardian",
  },
];

/**
 * The demonstration feed. Deterministic: the same seed always produces the same lines in
 * the same order, so the panel never jumps around under the reader.
 */
export function seedFeed(seed: number = DEFAULT_SEED): FeedItem[] {
  const random = mulberry32(seed);
  return SEED_LINES.map((line, index) => ({
    id: `seed-${String(index + 1).padStart(2, "0")}`,
    kind: line.kind,
    title: line.title,
    area: line.area,
    category: line.category,
    level: levelFromSeverity(line.severity) as SignalLevel,
    minutesAgo: line.minutesAgo,
    confirmations: 1 + Math.floor(random() * 24),
    source: line.source,
  }));
}

/**
 * The headline numbers. They are derived from the same seed as the feed, so the panel can
 * never claim "12 active hazards" next to a list of three lines.
 */
export function seedMetrics(seed: number = DEFAULT_SEED): LandingMetrics {
  const random = mulberry32(seed + 7);
  const feed = seedFeed(seed);
  const active = feed.filter((item) => item.kind !== "wire" && item.level !== "calm").length;
  return {
    reportsToday: 18 + Math.floor(random() * 40),
    activeHazards: active + 6 + Math.floor(random() * 18),
    parishesCovered: 3 + Math.floor(random() * 4),
    wireStories: 40 + Math.floor(random() * 60),
    alertRecipients: 1200 + Math.floor(random() * 3400),
    medianConfirmMinutes: 4 + Math.floor(random() * 5),
  };
}
