import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ingest, validateAlertSubmission } from '@wire/lib/alerts.mjs';

import { listSubmittedAlerts, saveSubmittedAlert, type StoredBulletin } from './alerts-store';

export type AlertMode = 'fixtures' | 'live';

export interface AlertPerson {
  name: string | null;
  gender: string | null;
  age: number | null;
  residence: string | null;
  complexion: string | null;
  build: string | null;
  height: string | null;
}

export interface AlertLastSeen {
  when: string | null;
  where: string | null;
}

export interface AlertSource {
  id: string | null;
  kind: string | null;
  name: string;
  initials: string | null;
  url: string | null;
  weight?: number | null;
  query?: string | null;
}

export interface Alert {
  kind: 'alert';
  alertType: 'marco' | 'missing';
  verified: boolean;
  id: string;
  title: string;
  summary: string;
  url: string | null;
  publisher: string;
  publisherInitials: string | null;
  category: string;
  categoryLabel: string;
  island: string | null;
  islandMatches: string[];
  location: string | null;
  lastSeen: AlertLastSeen;
  person: AlertPerson;
  contact: string | null;
  phones: string[];
  photo: string | null;
  photoKind: 'image' | 'page' | null;
  urgency: 'high' | 'standard' | 'low';
  publishedAt: string | null;
  ageLabel: string;
  source: AlertSource;
  corroboration: number;
  alsoReportedBy: string[];
  civic: boolean;
  civicScore: number;
  priority: 'alert';
  score: number;
  feedWeight: number;
}

export interface AlertSourceReport {
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
    sources: AlertSourceReport[];
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
const BULLETINS_PATH = join(ROOT, 'wire', 'bulletins.json');
const FIXTURES_PATH = join(ROOT, 'wire', 'fixtures', 'alerts');

/**
 * Default to live feeds automatically when deployed on Vercel unless
 * ALERTS_MODE=fixtures is explicitly set. In offline local sandboxes, default
 * to fixtures + official bulletins unless ALERTS_MODE=live is set.
 */
export function alertMode(): AlertMode {
  const configured = process.env.ALERTS_MODE?.trim().toLowerCase();
  if (configured === 'live') return 'live';
  if (configured === 'fixtures') return 'fixtures';
  return process.env.VERCEL === '1' ? 'live' : 'fixtures';
}

const cacheSlot = globalThis as typeof globalThis & {
  __nowbeyAlertsCache?: { at: number; payload: AlertPayload } | null;
};

function revalidateMs(): number {
  const seconds = Number(process.env.ALERTS_REVALIDATE_SECONDS || 120);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 120) * 1000;
}

export function invalidateAlertsCache(): void {
  cacheSlot.__nowbeyAlertsCache = null;
}

async function readConfig() {
  return JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
}

async function readBulletins(): Promise<StoredBulletin[]> {
  let fileBulletins: StoredBulletin[] = [];
  try {
    const parsed = JSON.parse(await readFile(BULLETINS_PATH, 'utf8'));
    if (Array.isArray(parsed?.bulletins)) fileBulletins = parsed.bulletins;
  } catch {
    fileBulletins = [];
  }
  const submitted = await listSubmittedAlerts();
  return [...submitted, ...fileBulletins];
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
 * One alerts run, shared by /alerts, /feed, / and /api/alerts.
 * Official Cell Broadcast bulletins (wire/bulletins.json + POST /api/alerts)
 * always merge into both live and fixture runs so Cell Broadcast Marco's Alerts
 * that newspapers haven't covered are never missed.
 */
export async function getAlerts(options: { force?: boolean } = {}): Promise<AlertPayload> {
  const cached = cacheSlot.__nowbeyAlertsCache;
  if (!options.force && cached && Date.now() - cached.at < revalidateMs()) {
    return cached.payload;
  }

  const [config, bulletins] = await Promise.all([readConfig(), readBulletins()]);
  const mode = alertMode();
  const now = new Date();

  let fixtures;
  let fixtureCapturedAt: string | undefined;
  if (mode === 'fixtures') {
    const loaded = await readFixtures();
    fixtures = loaded.fixtures;
    fixtureCapturedAt = loaded.capturedAt;
  }

  const { items, report } = await ingest({ config, bulletins, fixtures, now });

  const payload: AlertPayload = {
    mode,
    generatedAt: now.toISOString(),
    fixtureCapturedAt,
    items: items as Alert[],
    report: report as AlertPayload['report'],
  };

  cacheSlot.__nowbeyAlertsCache = { at: Date.now(), payload };
  return payload;
}

/** Validate, persist and immediately surface a relayed Marco's Alert. */
export async function submitAlert(
  input: Record<string, unknown>,
  options: { trusted?: boolean } = {},
): Promise<{ ok: true; item: Alert } | { ok: false; error: string }> {
  const result = validateAlertSubmission(input, { trusted: options.trusted, now: new Date() });
  if (!result.ok) return result;

  await saveSubmittedAlert(result.bulletin as StoredBulletin);
  invalidateAlertsCache();

  return { ok: true, item: result.item as Alert };
}
