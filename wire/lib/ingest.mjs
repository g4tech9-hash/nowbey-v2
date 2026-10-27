/**
 * INGEST
 * ---------------------------------------------------------------------------
 * One pass: build the source list → fetch → parse → classify → de-duplicate →
 * rank → return items plus a per-source report.
 *
 * Design notes that matter in production:
 *   • Every fetch fails soft. A dead outlet feed costs that outlet's items, not
 *     the run: the report records the error and the wire keeps publishing.
 *   • `fetchImpl` is injectable so tests never touch the network.
 *   • Output is deterministic given (items, now) so the tests can assert order.
 */

import { createHash } from 'node:crypto';

import { classify, CIVIC_CATEGORIES } from './classify.mjs';
import { dedupe } from './dedupe.mjs';
import { detectIsland } from './islands.mjs';
import { googleNewsUrl, parseFeed } from './rss.mjs';

const UA =
  'NowBeyWire/1.0 (+https://nowbey.com; Bahamian community safety wire; contact: wire@nowbey.com)';

export const DEFAULTS = {
  timeoutMs: 9000,
  retries: 1,
  concurrency: 4,
  limit: 60,
  recencyDays: 7,
};

function hashId(input) {
  return createHash('sha1').update(String(input)).digest('hex').slice(0, 32);
}

function sourceList(config, { recencyDays = DEFAULTS.recencyDays } = {}) {
  const list = [];

  for (const outlet of config.outlets || []) {
    if (!outlet.rss) continue;
    list.push({
      id: outlet.id,
      kind: 'rss',
      name: outlet.name,
      initials: outlet.initials,
      weight: outlet.weight ?? 0.8,
      civic: Boolean(outlet.civic),
      url: outlet.rss,
      category: null,
    });
  }

  const gn = config.googleNews || {};
  for (const query of config.civicQueries || []) {
    // Google News supports a recency operator; ask only for the window we keep.
    const q = `${query.query} when:${recencyDays}d`;
    list.push({
      id: `gn-${query.id}`,
      kind: 'google-news',
      name: query.label || query.id,
      initials: null,
      weight: query.weight ?? 0.85,
      civic: true,
      category: query.category || null,
      url: googleNewsUrl(q, { base: gn.base, params: gn.params }),
    });
  }

  return list;
}

async function fetchText(url, { fetchImpl, timeoutMs, retries }) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'user-agent': UA,
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function pool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

/** Gentle exponential freshness: 1.0 today, ~0.5 at 36h, ~0.15 at 72h. */
export function freshness(publishedAt, now = new Date()) {
  if (!publishedAt) return 0.3;
  const ageHours = (now.getTime() - Date.parse(publishedAt)) / 36e5;
  if (!Number.isFinite(ageHours)) return 0.3;
  if (ageHours < 0) return 1;
  return Math.max(0, Math.exp(-ageHours / 52));
}

export function ageLabel(publishedAt, now = new Date()) {
  if (!publishedAt) return 'Time unknown';
  const ms = now.getTime() - Date.parse(publishedAt);
  if (!Number.isFinite(ms)) return 'Time unknown';
  const minutes = Math.round(ms / 6e4);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

/** 0..1 — how much this story should be at the top of the feed. */
export function score(item, { now = new Date() } = {}) {
  const f = freshness(item.publishedAt, now);
  const civic = item.civicScore ?? 0;
  const weight = item.sourceWeight ?? 0.8;
  const categoryLift = CIVIC_CATEGORIES.includes(item.category) ? 1 : 0;
  const corroboration = Math.min(1, (item.corroboration || 0) / 2);
  const value =
    0.38 * civic +
    0.24 * f +
    0.16 * weight +
    0.12 * categoryLift +
    0.10 * corroboration;
  return Number(value.toFixed(4));
}

export function enrich(raw, source, { now = new Date() } = {}) {
  const found = classify(raw);
  const islandHit = detectIsland(
    `${raw.title || ''} ${raw.summary || ''}`,
  );
  const item = {
    id: hashId(raw.url || `${raw.publisher}:${raw.title}`),
    title: raw.title,
    url: raw.url,
    publisher: raw.publisher || (source && source.name) || 'Unknown',
    publisherInitials: (source && source.initials) || initialsOf(raw.publisher),
    summary: raw.summary || '',
    publishedAt: raw.publishedAt,
    ageLabel: ageLabel(raw.publishedAt, now),
    category: found.category,
    categoryLabel: found.categoryLabel,
    confidence: found.confidence,
    civic: found.civic,
    civicScore: found.civicScore,
    official: found.official,
    noise: found.noise,
    signals: found.signals,
    island: islandHit.island,
    islandMatches: islandHit.matches,
    source: {
      id: source ? source.id : null,
      kind: source ? source.kind : null,
      name: source ? source.name : null,
      weight: source ? source.weight : null,
      // The query that surfaced it — useful for tuning the source list.
      query: source && source.kind === 'google-news' ? source.name : null,
    },
    sourceWeight: (source && source.weight) || 0.8,
    corroboration: 0,
    alsoReportedBy: [],
  };
  item.priority = item.civic ? 'civic' : item.noise ? 'noise' : 'news';
  item.score = score(item, { now });
  item.feedWeight = Number((item.score * 100).toFixed(1));
  return item;
}

function initialsOf(name = '') {
  const clean = String(name).trim();
  if (!clean) return '?';
  if (/^[A-Z]{2,5}$/.test(clean)) return clean.slice(0, 2);
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

/**
 * Run the wire.
 *
 * @param {object} options
 * @param {object} options.config       parsed sources.json
 * @param {Function} [options.fetchImpl]
 * @param {string|Date} [options.now]
 * @param {number} [options.limit]      max ranked items returned
 * @param {object[]} [options.fixtures] [{ source, xml }] to skip the network
 * @param {(msg: string) => void} [options.log]
 */
export async function ingest(options = {}) {
  const {
    config,
    fetchImpl = globalThis.fetch,
    now = new Date(),
    limit = DEFAULTS.limit,
    timeoutMs = DEFAULTS.timeoutMs,
    retries = DEFAULTS.retries,
    concurrency = DEFAULTS.concurrency,
    recencyDays = DEFAULTS.recencyDays,
    fixtures,
    log = () => {},
  } = options;

  const when = now instanceof Date ? now : new Date(now);
  const sources = sourceList(config, { recencyDays });

  const jobs = fixtures
    ? fixtures.map((fixture) => {
        const source =
          sources.find((s) => s.id === fixture.source) || {
            id: fixture.source,
            kind: 'rss',
            name: fixture.publisher || fixture.source,
            initials: surnameInitials(fixture.publisher),
            weight: 0.8,
          };
        return { source, load: async () => fixture.xml };
      })
    : sources.map((source) => ({
        source,
        load: () => fetchText(source.url, { fetchImpl, timeoutMs, retries }),
      }));

  const results = await pool(
    jobs.map((job) => async () => {
      try {
        const xml = await job.load();
        const parsed = parseFeed(xml, { source: job.source });
        log(`${job.source.id}: ${parsed.items.length} items`);
        return { source: job.source, items: parsed.items, ok: true };
      } catch (error) {
        log(`${job.source.id}: FAILED ${error.message}`);
        return { source: job.source, items: [], ok: false, error: error.message };
      }
    }),
    fixtures ? 1 : concurrency,
  );

  const raw = [];
  const reportSources = [];
  for (const result of results) {
    reportSources.push({
      id: result.source.id,
      name: result.source.name,
      kind: result.source.kind,
      ok: result.ok,
      items: result.items.length,
      error: result.error || null,
      civicQuery: result.source.civic ? result.source.name : null,
    });
    for (const entry of result.items) raw.push(enrich(entry, result.source, { now: when }));
  }

  const { items: deduped, merged } = dedupe(raw);

  const ranked = deduped
    .filter((item) => !item.noise)
    .sort((a, b) => b.score - a.score || (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0))
    .slice(0, limit);

  return {
    items: ranked,
    report: {
      fetchedAt: when.toISOString(),
      sources: reportSources,
      totals: {
        sources: reportSources.length,
        ok: reportSources.filter((s) => s.ok).length,
        failed: reportSources.filter((s) => !s.ok).length,
        raw: raw.length,
        duplicatesRemoved: merged.length,
        returned: ranked.length,
        civic: ranked.filter((i) => i.civic).length,
      },
      merged,
    },
  };
}

function surnameInitials(name) {
  return initialsOf(name || '');
}

export { sourceList, fetchText };
