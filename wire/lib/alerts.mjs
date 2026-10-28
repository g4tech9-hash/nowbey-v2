/**
 * ALERTS ENGINE
 * ---------------------------------------------------------------------------
 * Parses missing-person / public-safety alerts (like "Marco's Alert") into
 * structured, actionable records the app can render on /alerts and surface in
 * the feed.
 *
 * One pass: build the source list → fetch → parse → extract structured fields
 * → detect island → classify → rank → return items plus a per-source report.
 *
 * Design notes that mirror wire/lib/ingest.mjs:
 *   • Every fetch fails soft. A dead source costs that source's items, not
 *     the run: the report records the error and the alerts keep publishing.
 *   • `fetchImpl` is injectable so tests never touch the network.
 *   • Output is deterministic given (items, now).
 */

import { createHash } from 'node:crypto';
import { detectIsland } from './islands.mjs';
import { googleNewsUrl, parseFeed } from './rss.mjs';
import { ageLabel, freshness } from './ingest.mjs';

const UA =
  'NowBeyAlerts/1.0 (+https://nowbey.com; Bahamian community alerts; contact: alerts@nowbey.com)';

export const DEFAULTS = {
  timeoutMs: 9000,
  retries: 1,
  concurrency: 4,
  limit: 60,
  recencyDays: 14, // missing-person alerts stay relevant longer than closures
};

export const URGENCY = { high: 'high', standard: 'standard', low: 'low' };

/** A missing person is always civic / actionable: "if seen, contact police". */
const ALERT_CATEGORY = 'safety';

function hashId(input) {
  return createHash('sha1').update(String(input)).digest('hex').slice(0, 32);
}

/** Build the flat list of sources to poll for alerts. */
function sourceList(config, { recencyDays = DEFAULTS.recencyDays } = {}) {
  const list = [];
  for (const source of config.sources || []) {
    if (!source.url) continue;
    list.push({
      id: source.id,
      kind: source.kind || 'rss',
      name: source.name,
      initials: source.initials || null,
      weight: source.weight ?? 0.8,
      civic: true,
      category: source.category || ALERT_CATEGORY,
      url: source.url,
      query: source.query || null,
    });
  }

  const gn = config.googleNews || {};
  for (const query of config.alertQueries || []) {
    const q = `${query.query} when:${recencyDays}d`;
    list.push({
      id: `gn-alert-${query.id}`,
      kind: 'google-news',
      name: query.label || query.id,
      initials: null,
      weight: query.weight ?? 0.85,
      civic: true,
      category: query.category || ALERT_CATEGORY,
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

/** Urgency: a missing child or vulnerable person is high; the rest standard. */
function urgencyOf(item) {
  const text = `${item.title || ''} ${item.summary || ''} ${item.person.name || ''}`.toLowerCase();
  const young = /\b(?:child|children|boy|girl|teen|teenager|yrs|yr\b|\b\d{1,2}yrs?\b)/.test(text);
  const vulnerable = /\b(vulnerable|elderly|senior|dementia|autism|disability|medical condition)\b/.test(text);
  if (young || vulnerable) return URGENCY.high;
  return URGENCY.standard;
}

/**
 * Extract structured fields from an alert's free-text body.
 *
 * Handles the "Marco's Alert" shape:
 *
 *   Clore Simon (Female) 17yrs of Roland Street, Ridgeland Park, New Providence.
 *   Last seen Monday, 26th October, 2026: @ Roland Street.
 *   Complexion: Dark Brown, Slim Build, Height 4' 11":
 *   If seen contact police @ 919 or CID 502-9991 502-9992: See Photo: <url>
 *
 * The person header ("Name (Gender) Ageyrs") is matched against the summary
 * (body) first, because the headline/title is free-form and concatenating it
 * with the body can make the lazy name matcher stretch across the boundary and
 * grab words that aren't part of the name.
 */
function extractPersonFields(text, { title = '' } = {}) {
  const person = { name: null, gender: null, age: null, complexion: null, build: null, height: null };
  const lastSeen = { when: null, where: null };
  let contact = null;
  let photo = null;

  const clean = String(text || '');
  const titleClean = String(title || '');

  // Name (Gender) Ageyrs — e.g. "Clore Simon (Female) 17yrs". Try the body
  // first (where the structured fields live), fall back to the headline.
  const header =
    extractHeader(titleClean) || extractHeader(clean);
  if (header) {
    // Strip leading alert-framing words so "Marco's Alert Clore Simon" →
    // "Clore Simon", "Public advisory Dwayne Carter" → "Dwayne Carter".
    let name = header.name.replace(/\s+/g, ' ').trim();
    name = name.replace(/^(Marco's?\s+Alert|Public\s+advisory|Advisory|Alert)\s+/i, '').trim();
    person.name = name;
    person.gender = header.gender;
    person.age = header.age;
  } else {
    // Fallback: first capitalised phrase as the name.
    const nameOnly = clean.match(/^([A-Z][A-Za-z' .]{2,40}?)[.\n]/);
    if (nameOnly) person.name = nameOnly[1].trim();
  }

  // "of <place>" — home area / last seen where (set first, then refined by "@")
  const ofMatch = clean.match(/\bof\s+([^.]{3,80}?)(?:\.|Last seen|,|$)/i);
  if (ofMatch) lastSeen.where = ofMatch[1].trim();

  // Last seen <when> — capture up to the colon before "@"
  const lsWhen = clean.match(/Last seen\s+([^:@]{2,90}?)\s*:/i);
  if (lsWhen) lastSeen.when = lsWhen[1].trim();

  // Last seen <where> — capture after "@" up to the next sentence boundary
  const lsWhere = clean.match(/@\s*([^.]{2,80}?)\s*(?:\.|Complexion|$)/i);
  if (lsWhere) lastSeen.where = lsWhere[1].trim();

  // Complexion: X, Build Y, Height Z
  const cx = clean.match(/Complexion:\s*([^,]{2,40}?)(?:,|Build|Height|$)/i);
  if (cx) person.complexion = cx[1].trim();
  const b = clean.match(/,([^,]{2,40}?\bBuild\b)/i);
  if (b) person.build = b[1].trim();
  const h = clean.match(/Height\s*:?\s*([^":]{2,20}?)(?:[":]|If seen|Contact|See|$)/i);
  if (h) person.height = h[1].trim();

  // Contact phones — "contact police @ 919 or CID 502-9991 502-9992"
  const phones = clean.match(
    /(?:contact|call|reach)\s+(?:police\s*@?\s*)?([\d\s\-]+(?:\s*or\s+CID\s+[\d\s\-]+)?)/i,
  );
  if (phones) contact = phones[1].replace(/\s+/g, ' ').trim();
  else {
    const cid = clean.match(/CID\s*([\d\s\-]{6,})/i);
    if (cid) contact = cid[1].replace(/\s+/g, ' ').trim();
  }

  // Photo URL — "See Photo: <url>"
  const photoMatch = clean.match(/See Photo:\s*(https?:\/\/[^\s)]+)/i);
  if (photoMatch) photo = photoMatch[1].trim();

  return { person, lastSeen, contact, photo };
}

/**
 * Match "Name (Gender) Ageyrs" bounded to a short name (1-4 words) so the
 * matcher cannot stretch across the headline→body boundary and swallow
 * non-name words like "Marco's Alert".
 */
function extractHeader(input) {
  const m = String(input || '').match(
    /([A-Z][A-Za-z']+(?:\s+[A-Za-z']+){0,3})\s*\((Male|Female|M|F)\)\s*(\d{1,3})\s*yrs?\b/i,
  );
  if (!m) return null;
  return {
    name: m[1].trim(),
    gender: m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase(),
    age: Number(m[3]),
  };
}

/** Turn a raw feed item into a structured alert record. */
function enrich(raw, source, { now = new Date() } = {}) {
  const text = `${raw.title || ''} ${raw.summary || ''}`;
  const fields = extractPersonFields(text);
  const islandHit = detectIsland(text);

  const personName = fields.person.name || raw.title || 'Missing person';
  const publishedAt = raw.publishedAt || null;

  const item = {
    id: hashId(raw.url || `${source.name}:${personName}:${publishedAt || ''}`),
    kind: 'alert',
    title: fields.person.name
      ? `${personName}, ${fields.person.age || ''}yrs — missing`
      : raw.title || 'Public safety alert',
    summary: raw.summary || '',
    url: raw.url || null,
    publisher: raw.publisher || (source && source.name) || 'Unknown',
    publisherInitials: (source && source.initials) || null,
    publishedAt,
    ageLabel: ageLabel(publishedAt, now),
    category: ALERT_CATEGORY,
    categoryLabel: 'Safety',
    island: islandHit.island,
    islandMatches: islandHit.matches,
    location: fields.lastSeen.where || null,
    lastSeen: fields.lastSeen,
    person: fields.person,
    contact: fields.contact,
    photo: fields.photo,
    urgency: urgencyOf({ title: raw.title, summary: raw.summary, person: fields.person }),
    source: {
      id: source ? source.id : null,
      kind: source ? source.kind : null,
      name: source ? source.name : null,
      weight: source ? source.weight : null,
      query: source && source.kind === 'google-news' ? source.name : null,
    },
    sourceWeight: (source && source.weight) || 0.8,
    civic: true,
    civicScore: 0.9, // alerts are high-value actionable information
    priority: 'alert',
  };

  // Freshness-weighted score so the newest missing-person alerts lead.
  const f = freshness(publishedAt, now);
  const weight = item.sourceWeight;
  const urgencyLift = item.urgency === 'high' ? 1 : 0.4;
  item.score = Number((0.4 * item.civicScore + 0.25 * f + 0.2 * weight + 0.15 * urgencyLift).toFixed(4));
  item.feedWeight = Number((item.score * 100).toFixed(1));

  return item;
}

/**
 * Run the alerts engine.
 *
 * @param {object} options
 * @param {object} options.config       parsed alerts.json
 * @param {Function} [options.fetchImpl]
 * @param {string|Date} [options.now]
 * @param {number} [options.limit]
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
            initials: null,
            weight: 0.8,
            civic: true,
            category: ALERT_CATEGORY,
            url: null,
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
        // Alerts carry their photo and contact at the end of the body, so keep
        // the full summary instead of the wire's 280-char truncation.
        const parsed = parseFeed(xml, { source: job.source, maxSummary: 4000 });
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
    });
    for (const entry of result.items) raw.push(enrich(entry, result.source, { now: when }));
  }

  // De-duplicate by person name + island so the same alert re-published across
  // outlets collapses into one record (keeps the first / most detailed copy).
  const byKey = new Map();
  let duplicates = 0;
  for (const item of raw) {
    const key = `${(item.person.name || item.title).toLowerCase()}::${item.island || 'unknown'}`;
    if (byKey.has(key)) {
      duplicates += 1;
      const existing = byKey.get(key);
      const richer =
        (item.photo || item.contact) && !(existing.photo || existing.contact)
          ? item
          : existing;
      const fresher =
        item.publishedAt && existing.publishedAt
          ? new Date(item.publishedAt) > new Date(existing.publishedAt)
            ? item
            : existing
          : richer;
      byKey.set(key, fresher);
    } else {
      byKey.set(key, item);
    }
  }

  const ranked = [...byKey.values()]
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
        duplicatesRemoved: duplicates,
        returned: ranked.length,
        highUrgency: ranked.filter((i) => i.urgency === 'high').length,
      },
    },
  };
}

export { sourceList, fetchText, extractPersonFields, urgencyOf };
