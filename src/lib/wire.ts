import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The wire engine is plain ESM with no build step, so the app imports it
// directly — the same code the CLI runs.
import { ageLabel, ingest } from '@wire/lib/ingest.mjs';
import { bridgeToFeed } from '@wire/lib/feed.mjs';
import { mergeFeedItems } from '@wire/lib/merge.mjs';

import { getAlerts } from './alerts';
import { sampleReports } from './sample-reports';

export type WireMode = 'fixtures' | 'live';

export interface WireSource {
  name: string;
  initials: string | null;
  url: string;
  corroboration: number;
  alsoReportedBy: string[];
}

export interface WireCard {
  kind: 'wire';
  id: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  island: string | null;
  publishedAt: string | null;
  ageLabel: string;
  source: WireSource;
  civic: boolean;
  civicScore: number;
  priority: string;
  sortWeight: number;
  cta: { label: string; href: string };
  actions: { confirm: boolean; sawIt: boolean; cleared: boolean; comment: boolean };
  disclosure: string;
}

export interface WireItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  island: string | null;
  publishedAt: string | null;
  ageLabel: string;
  civic: boolean;
  civicScore: number;
  priority: string;
  url: string;
  publisher: string;
  publisherInitials: string;
  confidence: number;
  official: number;
  signals: string[];
  islandMatches: string[];
  corroboration: number;
  alsoReportedBy: string[];
  score: number;
  feedWeight: number;
  sourceWeight: number;
  noise: boolean;
  source: { id: string | null; kind: string | null; name: string | null; weight: number | null; query: string | null };
}

export interface SourceReport {
  id: string;
  name: string;
  kind: string;
  ok: boolean;
  items: number;
  error: string | null;
}

export interface WirePayload {
  mode: WireMode;
  generatedAt: string;
  items: WireItem[];
  cards: WireCard[];
  report: {
    fetchedAt: string;
    sources: SourceReport[];
    totals: {
      sources: number;
      ok: number;
      failed: number;
      raw: number;
      duplicatesRemoved: number;
      returned: number;
      civic: number;
    };
  };
  fixtureCapturedAt?: string;
}

const ROOT = process.cwd();
const SOURCES_PATH = join(ROOT, 'wire', 'sources.json');
const FIXTURES_PATH = join(ROOT, 'wire', 'fixtures');

export function wireMode(): WireMode {
  return process.env.WIRE_MODE === 'live' ? 'live' : 'fixtures';
}

let cache: { at: number; payload: WirePayload } | null = null;

function revalidateMs(): number {
  const seconds = Number(process.env.WIRE_REVALIDATE_SECONDS || 600);
  return (Number.isFinite(seconds) ? seconds : 600) * 1000;
}

async function readConfig() {
  return JSON.parse(await readFile(SOURCES_PATH, 'utf8'));
}

async function readFixtures() {
  const manifest = JSON.parse(await readFile(join(FIXTURES_PATH, 'manifest.json'), 'utf8'));
  const fixtures = [];
  for (const entry of manifest.fixtures) {
    fixtures.push({
      source: entry.source,
      publisher: entry.publisher,
      xml: await readFile(join(FIXTURES_PATH, entry.file), 'utf8'),
    });
  }
  return { fixtures, capturedAt: manifest.capturedAt as string };
}

/**
 * The fixture corpus was captured at a fixed moment. Replay it against the
 * current clock so the demo reads "12m ago" instead of "16h ago yesterday".
 */
function rebase(items: any[], deltaMs: number) {
  if (!deltaMs) return items;
  const now = new Date();
  return items.map((item) => {
    if (!item.publishedAt) return item;
    const shifted = new Date(Date.parse(item.publishedAt) + deltaMs).toISOString();
    return { ...item, publishedAt: shifted, ageLabel: ageLabel(shifted, now) };
  });
}

/**
 * One wire run, shared by /wire, /feed and /api/wire.
 * Cached in module scope for WIRE_REVALIDATE_SECONDS — swap for KV/Postgres when
 * this runs on more than one instance.
 */
export async function getWire(options: { force?: boolean } = {}): Promise<WirePayload> {
  if (!options.force && cache && Date.now() - cache.at < revalidateMs()) return cache.payload;

  const config = await readConfig();
  const mode = wireMode();
  const now = new Date();

  let fixtures;
  let deltaMs = 0;
  let fixtureCapturedAt: string | undefined;
  if (mode === 'fixtures') {
    const loaded = await readFixtures();
    fixtures = loaded.fixtures;
    fixtureCapturedAt = loaded.capturedAt;
    deltaMs = now.getTime() - Date.parse(loaded.capturedAt);
  }

  const { items, report } = await ingest({ config, fixtures, now });
  const rebased = rebase(items as any[], deltaMs);
  const { cards } = bridgeToFeed(rebased, { now });

  const payload: WirePayload = {
    mode,
    generatedAt: now.toISOString(),
    fixtureCapturedAt,
    items: rebased as WireItem[],
    cards: cards as unknown as WireCard[],
    report: report as WirePayload['report'],
  };

  cache = { at: Date.now(), payload };
  return payload;
}

/** The Feed tab: neighbour reports merged with the civic wire + live alerts. */
export async function getFeed() {
  const wire = await getWire();
  const now = new Date();
  // Sample neighbour reports are generated relative to the current clock so the
  // merge ratio is testable in the browser.
  const reports = sampleReports(now);
  const wireCards = wire.cards as any[];

  // Fold live alerts into the newsroom wire so a missing-person alert can
  // appear in the community feed alongside closures and outages.
  const alertPayload = await getAlerts();
  const alertCards = alertPayload.items.map((item) => ({
    ...item,
    kind: 'alert' as const,
    sortWeight: item.feedWeight,
  }));

  const merged = mergeFeedItems(
    reports as any[],
    [...wireCards, ...alertCards] as any[],
    { window: 6, maxWireShare: 0.4, maxPerCategory: 1 },
  );

  return {
    mode: wire.mode,
    generatedAt: wire.generatedAt,
    fixtureCapturedAt: wire.fixtureCapturedAt,
    items: merged.items as any[],
    placedWire: merged.placed,
    heldWire: merged.held.length,
    alerts: alertPayload.items.length,
    totals: wire.report.totals,
    sources: wire.report.sources,
  };
}
