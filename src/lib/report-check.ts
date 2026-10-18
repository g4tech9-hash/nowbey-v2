/**
 * REPORT CHECKS — the feed's own hygiene.
 *
 * Three things a safety feed must not do:
 *
 *   1. Show the same report five times because five neighbours filed it. That
 *      is one report, and the five of them are evidence, not five pins.
 *   2. Show an advert under "Flooding". "BIG SALE at O-Tech PC Solutions",
 *      filed as a flood and given a "saw it too" by a neighbour, is a false
 *      hazard on a map people drive from. It has to be held for a human.
 *   3. Repeat a template note on unrelated reports, so that a sentence reads
 *      as an observation when it is boilerplate.
 *
 * Everything here is pure and synchronous, so the server and the client reach
 * the same answer, and it is all unit-testable without a database.
 */
import { haversineMeters } from "./geo.ts";

export type ReportLike = {
  id: string;
  title: string;
  details?: string | null;
  category: string;
  lat: number;
  lng: number;
  createdAt: string | Date;
  updatedAt?: string | Date;
  confirmations?: number;
  sightings?: number;
  sourceKind?: string;
  status?: string;
  photoNote?: string | null;
  severity?: number;
};

/** Words that carry no meaning when comparing two headlines. */
const FILLER = new Set([
  "a", "an", "the", "on", "at", "in", "of", "to", "for", "is", "are", "was", "were", "it", "its",
  "there", "here", "now", "still", "very", "just", "has", "have", "had", "be", "been", "and",
  "my", "our", "some", "about", "near",
]);

/**
 * The street abbreviations a neighbour types one way and another types
 * another. "Shirley St" and "Shirley Street" are the same street, and two
 * reports about it are one report.
 */
const STREET_WORDS: Record<string, string> = {
  st: "street",
  str: "street",
  rd: "road",
  ave: "avenue",
  av: "avenue",
  blvd: "boulevard",
  bl: "boulevard",
  dr: "drive",
  ln: "lane",
  ct: "court",
  hwy: "highway",
  pl: "place",
  pkwy: "parkway",
  pk: "park",
  sq: "square",
  cir: "circle",
  ter: "terrace",
};

/**
 * The key two reports are compared by. Punctuation, capitalisation, the filler
 * words and the street abbreviations go, so "Flooding on Shirley St" and
 * "flooding on shirley street" are the same report.
 */
export function normaliseReportTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    // The abbreviation is expanded FIRST, so "St" becomes "street" and is then
    // not mistaken for a filler word.
    .map((w) => STREET_WORDS[w] ?? w)
    .filter((w) => w && !FILLER.has(w))
    .join(" ");
}

/**
 * "Sanitation issue" with a body that says "Sanitation issue" is one line,
 * not two. Returns the body when it says something the title does not.
 */
export function collapseBody(title: string, details?: string | null): string | null {
  const body = (details ?? "").trim();
  if (!body) return null;
  const a = normaliseReportTitle(title);
  const b = normaliseReportTitle(body);
  if (!b) return null;
  if (a === b || b.startsWith(`${a} `) || a.startsWith(`${b} `)) return null;
  return body;
}

/**
 * Words that mean this is somebody's advertisement.
 *
 * They are deliberately specific. "Shop" alone is innocent — a shop can flood
 * too — so the test is for a phrase that only appears in an advert.
 */
const ADVERT_PHRASES =
  /\b(?:big sale|flash sale|clearance sale|daily deals?|special (?:offer|price)|buy now|shop now|order (?:now|online)|% off|off our|limited time(?: offer)?|coupon|promo code|discount(?:ed)? price|grand opening|advertisement|sponsored (?:post|content|by)|call now to (?:buy|order)|best price in town|sale ends|shopper(?:s)? special|giveaway|free trial)\b/i;

/** Words that only make sense for a hazard report. */
const HAZARD_WORDS =
  /\b(?:flood(?:ed|ing)?|water|blocked|closure|closed|outage|power|downed|washed|storm|hurricane|damage|collapsed|hole|pothole|accident|crash|spill|leak|fire|smoke|gas|pipe|manhole|tree|debris|wreck)\b/i;

/**
 * Does this text belong under that category?
 *
 * Returns null when it is fine, or a sentence saying why it was held. The
 * rule is deliberately narrow: we would rather publish a mildly odd report
 * than hide a real hazard because a word was missing.
 */
export function sanityCheck(text: string, category: string): string | null {
  const hay = `${text}`.trim();
  if (!hay) return null;

  if (ADVERT_PHRASES.test(hay)) {
    return "Reads like an advertisement, not a hazard report";
  }

  // A hazard category with no hazard words in it, and no photo note, is worth
  // a second look. It is not held on this alone — see the caller, which adds
  // the confirmations before deciding.
  if (!HAZARD_WORDS.test(hay) && category !== "notice" && category !== "event") {
    return `Filed under ${category} but the text does not describe a hazard`;
  }
  return null;
}

/**
 * The decision the feed actually makes: hold, or show.
 *
 * A report is held when it reads like an advert, or when it was filed under a
 * hazard category, does not describe a hazard, AND somebody has confirmed it
 * (a "saw it too" on a sale notice is the clearest possible sign that the
 * wrong thing was filed).
 */
export function holdReason(row: ReportLike): string | null {
  const text = `${row.title} ${row.details ?? ""}`;
  if (ADVERT_PHRASES.test(text)) return "Reads like an advertisement, not a hazard report";
  const confirmed = (row.confirmations ?? 0) + (row.sightings ?? 0);
  if (confirmed > 0 && !HAZARD_WORDS.test(text) && row.category !== "notice" && row.category !== "event") {
    return `Filed under ${row.category} but nobody's description matches it`;
  }
  return null;
}

/** How close two pins have to be, in metres, to be the same place. */
export const CLUSTER_RADIUS_METERS = 150;
/** How long two reports stay one report, in milliseconds. */
export const CLUSTER_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ReportCluster<T extends ReportLike = ReportLike> = {
  /** The report the card is built from: the first one filed. */
  primary: T;
  /** Every report folded into this one, the primary first. */
  members: T[];
  /** How many neighbours filed this. */
  count: number;
  /** The newest confirmation across the members. */
  lastConfirmedAt: string;
};

/**
 * Fold duplicates into one card.
 *
 * Two reports are the same report when their titles normalise to the same
 * words, their pins are within 150 m of each other, and they were filed
 * within 24 hours of each other. Anything looser would start merging
 * genuinely different hazards on a busy street.
 */
export function clusterReports<T extends ReportLike>(
  rows: readonly T[],
  opts: { radiusMeters?: number; windowMs?: number } = {},
): ReportCluster<T>[] {
  const radius = opts.radiusMeters ?? CLUSTER_RADIUS_METERS;
  const window = opts.windowMs ?? CLUSTER_WINDOW_MS;

  // Oldest first, so the card is built from the report that was filed first —
  // that is the one neighbours replied to.
  const ordered = [...rows].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const clusters: ReportCluster<T>[] = [];

  for (const row of ordered) {
    const key = normaliseReportTitle(row.title);
    const time = +new Date(row.createdAt);
    let target: ReportCluster<T> | undefined;

    for (const cluster of clusters) {
      if (normaliseReportTitle(cluster.primary.title) !== key) continue;
      const newest = Math.max(...cluster.members.map((m) => +new Date(m.createdAt)));
      if (Math.abs(time - newest) > window) continue;
      const distance = haversineMeters([row.lat, row.lng], [cluster.primary.lat, cluster.primary.lng]);
      if (distance > radius) continue;
      target = cluster;
      break;
    }

    if (target) {
      target.members.push(row);
      target.count = target.members.length;
      target.lastConfirmedAt = clusterLastConfirmed(target.members);
    } else {
      clusters.push({
        primary: row,
        members: [row],
        count: 1,
        lastConfirmedAt: clusterLastConfirmed([row]),
      });
    }
  }

  return clusters;
}

function clusterLastConfirmed(members: ReportLike[]): string {
  const stamps = members.map((m) => +new Date(m.updatedAt ?? m.createdAt));
  return new Date(Math.max(...stamps)).toISOString();
}

/**
 * Canned notes: the same sentence attached to reports that have nothing in
 * common. A note that appears on a flood report and a power report is a
 * template, and the feed has to say so rather than presenting it as an
 * observation.
 */
export function findCannedNotes(rows: readonly ReportLike[]): Set<string> {
  const byNote = new Map<string, { categories: Set<string>; count: number }>();
  for (const row of rows) {
    const note = (row.photoNote ?? "").trim();
    if (!note) continue;
    const key = note.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key) continue;
    const entry = byNote.get(key) ?? { categories: new Set<string>(), count: 0 };
    entry.categories.add(row.category);
    entry.count += 1;
    byNote.set(key, entry);
  }
  const canned = new Set<string>();
  for (const [key, entry] of byNote) {
    // The same note on two different kinds of report is a template.
    if (entry.count >= 2 && entry.categories.size >= 2) canned.add(key);
  }
  return canned;
}

/** The sentence a card uses when several neighbours filed the same thing. */
export function clusterCountLabel(count: number): string | null {
  if (count < 2) return null;
  return `${count} neighbours reported this`;
}
