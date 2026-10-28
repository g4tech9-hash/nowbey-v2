import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ingest } from '@wire/lib/alerts.mjs';

export type AlertMode = 'fixtures' | 'live';

export interface AlertPerson {
  name: string | null;
  gender: string | null;
  age: number | null;
  complexion: string | null;
  build: string | null;
  height: string | null;
}

export interface AlertLastSeen {
  when: string | null;
  where: string | null;
}

export interface AlertSource {
  name: string;
  initials: string | null;
  url: string;
}

export interface Alert {
  kind: 'alert';
  id: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  island: string | null;
  islandMatches: string[];
  location: string | null;
  lastSeen: AlertLastSeen;
  person: AlertPerson;
  contact: string | null;
  photo: string | null;
  urgency: 'high' | 'standard' | 'low';
  publishedAt: string | null;
  ageLabel: string;
  source: AlertSource;
  civic: boolean;
  civicScore: number;
  priority: 'alert';
  score: number;
  feedWeight: number;
}

export interface SourceReport {
  id: string;
  name: string;
  kind: string;
  ok: boolean;
  items: number;
  error: string | null;
}

export interface AlertPayload {
  mode: AlertMode;
  generatedAt: string;
  items: Alert[];
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
      highUrgency: number;
    };
  };
  fixtureCapturedAt?: string;
}

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, 'wire', 'alerts.json');
const FIXTURES_PATH = join(ROOT, 'wire', 'fixtures', 'alerts');

export function alertMode(): AlertMode {
  return process.env.ALERTS_MODE === 'live' ? 'live' : 'fixtures';
}

let cache: { at: number; payload: AlertPayload } | null = null;

function revalidateMs(): number {
  const seconds = Number(process.env.ALERTS_REVALIDATE_SECONDS || 600);
  return (Number.isFinite(seconds) ? seconds : 600) * 1000;
}

async function readConfig() {
  return JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
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
 * One alerts run, shared by /alerts and /api/alerts.
 * Cached in module scope for ALERTS_REVALIDATE_SECONDS — swap for KV/Postgres
 * when this runs on more than one instance.
 */
export async function getAlerts(options: { force?: boolean } = {}): Promise<AlertPayload> {
  if (!options.force && cache && Date.now() - cache.at < revalidateMs()) return cache.payload;

  const config = await readConfig();
  const mode = alertMode();
  const now = new Date();

  let fixtures;
  let fixtureCapturedAt: string | undefined;
  if (mode === 'fixtures') {
    const loaded = await readFixtures();
    fixtures = loaded.fixtures;
    fixtureCapturedAt = loaded.capturedAt;
  }

  const { items, report } = await ingest({ config, fixtures, now });

  const payload: AlertPayload = {
    mode,
    generatedAt: now.toISOString(),
    fixtureCapturedAt,
    items: items as Alert[],
    report: report as AlertPayload['report'],
  };

  cache = { at: Date.now(), payload };
  return payload;
}
