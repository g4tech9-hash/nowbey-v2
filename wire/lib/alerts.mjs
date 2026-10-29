/**
 * ALERTS ENGINE
 * ---------------------------------------------------------------------------
 * Ingests, filters and parses Bahamian missing-person and public-safety alerts
 * (including Cell Broadcast "Marco's Alert" notices and RBPF advisories) into
 * structured, actionable records for /alerts, /feed and /api/alerts.
 *
 * Why two ingestion paths work together here:
 *   1. Official / relayed Cell Broadcast bulletins (`bulletins` input — backed
 *      by wire/bulletins.json + POST /api/alerts). In The Bahamas, Marco's
 *      Alerts are broadcast directly to mobile phones on BTC/ALIV + posted as
 *      flyers on the RBPF Facebook page; newspapers often never write an
 *      article for routine alerts, and Facebook blocks anonymous scraping.
 *   2. Live RSS outlets + scoped Google News RSS + optional RBPF Facebook
 *      RSS-Bridge feeds (`config.sources`, `config.alertQueries`, env bridges),
 *      passed through `isAlertCandidate()` so general news noise (court
 *      convictions, "missing funds", foreign stories) never pollutes /alerts.
 *
 * Every network fetch fails soft: a dead feed costs only its own items and is
 * recorded in `report.sources`.
 */

import { createHash } from 'node:crypto';
import { detectIsland } from './islands.mjs';
import { googleNewsUrl, parseFeed } from './rss.mjs';
import { stripHtml } from './text.mjs';
import { ageLabel, freshness } from './ingest.mjs';

const UA =
  'NowBeyAlerts/1.0 (+https://nowbey.com; Bahamian community alerts; contact: alerts@nowbey.com)';

export const DEFAULTS = {
  timeoutMs: 9000,
  retries: 1,
  concurrency: 4,
  limit: 60,
  recencyDays: 14, // missing-person alerts stay relevant longer than road closures
};

export const URGENCY = { high: 'high', standard: 'standard', low: 'low' };

/** A missing person is always civic / actionable: "if seen, contact police". */
const ALERT_CATEGORY = 'safety';

const GENERIC_PLACES = new Set([
  'her residence',
  'his residence',
  'their residence',
  'residence',
  'home',
  'her home',
  'his home',
  'their home',
]);

const NON_PERSON_MISSING_RE =
  /\b(?:missing\s+(?:funds?|cash|money|millions?|thousands?|voters?|names?|ballots?|deadlines?|disclosures?|documents?|records?|files?|luggage|baggage|parts?|pieces?|links?|data)|near\s+miss(?:es)?|misses\s+(?:wall\s+street|expectations|estimates|cut|playoffs?)|missing\s+out)\b/i;

const COURT_DISPOSITION_RE =
  /\b(?:convicted|conviction|sentenced|court\s+of\s+appeal|retrial|pleaded\s+guilty|arraigned|charged\s+with\s+(?:the\s+)?murder)\b/i;

const ALERT_SIGNAL_RE =
  /\b(?:marco'?s?\s+alert|amber\s+alert|reported\s+missing|missing\s+(?:person|persons|child|children|teen|teenager|girl|boy|woman|man|mother|father|son|daughter|student|resident|tourist|boater|divers?|men|women)|(?:went|goes|gone|still|remains)\s+missing|search(?:ing)?\s+for\s+(?:a\s+)?missing|appeals?\s+for\s+(?:help|information|tips)\s+to\s+(?:find|locate)|if\s+seen\s+contact\s+police|502-9991|502-9992|wanted\s+(?:by\s+police|bulletin|person|suspect))\b/i;

const BAHAMAS_SIGNAL_RE =
  /\b(?:bahamas|bahamian|nassau|freeport|rbpf|royal\s+bahamas|502-9991|502-9992|328-tips|marco'?s?\s+alert)\b/i;

function hashId(input) {
  return createHash('sha1').update(String(input)).digest('hex').slice(0, 32);
}

/**
 * Heal URLs split across a line wrap when a user copies text out of a mobile
 * screenshot via OCR (e.g. "https://www.facebook\n.com/share/p/1Fnp3UugWB/").
 */
export function healWrappedUrls(input = '') {
  return String(input).replace(
    /(https?:\/\/[^\s]+?)\s*\r?\n\s*([./?&#=A-Za-z0-9_-][^\s]*)/g,
    '$1$2',
  );
}

/** True when `url` points directly at an image asset rather than a web page. */
export function isDirectImageUrl(url = '') {
  const clean = String(url || '').trim();
  if (!/^https?:\/\//i.test(clean)) return false;
  if (/\.(?:jpe?g|png|webp|gif|avif|svg)(?:[?#]|$)/i.test(clean)) return true;
  if (/(?:fbcdn\.net|scontent[^\s/]*\.xx\.fbcdn\.net|pbs\.twimg\.com|i\d?\.wp\.com)/i.test(clean)) {
    return true;
  }
  return false;
}

/** Build the flat list of network sources to poll for alerts. */
function sourceList(config = {}, { recencyDays = DEFAULTS.recencyDays, env = process.env } = {}) {
  const list = [];

  // Optional RBPF Facebook RSS bridge (e.g. rss.app / fetchrss / RSS-Bridge).
  const rbpfBridge = String(env?.RBPF_FB_RSS_URL || '').trim();
  if (/^https?:\/\//i.test(rbpfBridge)) {
    list.push({
      id: 'rbpf-fb-bridge',
      kind: 'rss',
      name: 'Royal Bahamas Police Force (FB Bridge)',
      initials: 'RBPF',
      weight: 1,
      civic: true,
      bahamian: true,
      category: ALERT_CATEGORY,
      url: rbpfBridge,
      query: null,
    });
  }

  // Optional operator-supplied extra alert feeds: "Name|https://.../rss.xml,..."
  const extraRaw = String(env?.ALERTS_EXTRA_FEEDS || '').trim();
  if (extraRaw) {
    for (const [idx, entry] of extraRaw.split(',').entries()) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const pipe = trimmed.indexOf('|');
      const name = pipe > 0 ? trimmed.slice(0, pipe).trim() : `Extra Alert Feed ${idx + 1}`;
      const url = (pipe > 0 ? trimmed.slice(pipe + 1) : trimmed).trim();
      if (!/^https?:\/\//i.test(url)) continue;
      list.push({
        id: `extra-alert-${idx + 1}`,
        kind: 'rss',
        name,
        initials: null,
        weight: 0.95,
        civic: true,
        bahamian: true,
        category: ALERT_CATEGORY,
        url,
        query: null,
      });
    }
  }

  for (const source of config.sources || []) {
    if (!source.url) continue;
    list.push({
      id: source.id,
      kind: source.kind || 'rss',
      name: source.name,
      initials: source.initials || null,
      weight: source.weight ?? 0.85,
      civic: true,
      bahamian: source.bahamian ?? true,
      trustedAlerts: Boolean(source.trustedAlerts),
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
      bahamian: false,
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
  if (!tasks.length) return [];
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

/** Urgency: a Marco's Alert, missing child/teen or vulnerable person is high. */
function urgencyOf(item) {
  const age = item.person?.age;
  if (typeof age === 'number' && age > 0 && age <= 18) return URGENCY.high;

  const text = `${item.title || ''} ${item.summary || ''} ${item.person?.name || ''}`.toLowerCase();
  const marco = /\bmarco'?s?\s+alert\b|\bamber\s+alert\b/.test(text);
  const young = /\b(?:child|children|boy|girl|teen|teenager|infant|toddler|minor|student|\b1[0-8]\s*(?:yrs?|years?))\b/.test(
    text,
  );
  const vulnerable = /\b(?:vulnerable|elderly|senior|dementia|alzheimer|autism|disability|medical\s+condition)\b/.test(
    text,
  );
  if (marco || young || vulnerable) return URGENCY.high;
  return URGENCY.standard;
}

/**
 * Match "Name (Gender) Ageyrs" bounded to a short name (1-4 words) so the
 * matcher cannot stretch across the headline→body boundary and swallow
 * non-name words like "Marco's Alert".
 */
function extractHeader(input) {
  const cleaned = String(input || '')
    .replace(/\b(?:Marco'?s?\s+Alert|MARCO\s+Alert|Public\s+advisory|Police\s+advisory|Missing\s+person(?:\s+alert)?)\b[:\s—–-]*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const m = cleaned.match(
    /([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s*\((Male|Female|M|F)\)\s*(\d{1,3})\s*(?:yrs?|years?(?:\s+old)?)\b/i,
  );
  if (!m) return null;
  const g = m[2].toUpperCase();
  const gender = g === 'M' ? 'Male' : g === 'F' ? 'Female' : m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
  return {
    name: m[1].trim(),
    gender,
    age: Number(m[3]),
  };
}

/** Extract dialable phone strings from a contact clause ("919 or CID 502-9991 502-9992"). */
export function extractPhones(contactText = '') {
  const raw = String(contactText || '');
  const matches = raw.match(/\b(?:919|911|328-8477|\d{3}-\d{4}(?:\/\d)?|\(\d{3}\)\s*\d{3}-\d{4})\b/g) || [];
  const out = [];
  for (const m of matches) {
    if (m.includes('/')) {
      const [base, tail] = m.split('/');
      out.push(base);
      if (tail && base.length >= tail.length) {
        out.push(base.slice(0, base.length - tail.length) + tail);
      }
    } else if (!out.includes(m)) {
      out.push(m);
    }
  }
  return out;
}

/**
 * Extract structured fields from an alert's free-text body.
 *
 * Handles both variations of the Bahamas Marco's Alert Cell Broadcast shape:
 *
 *   Nikita Smith (Female) 17yrs of Pride Estate, New Providence.
 *   Last seen Wednesday, 28th October, 2026: @ her residence.
 *   Complexion: Light Brown, Medium Build:
 *   If seen contact police @ 919 or CID 502-9991 502-9992: See Photo: <url>
 *
 * and with Height / explicit street:
 *
 *   Clore Simon (Female) 17yrs of Roland Street, Ridgeland Park, New Providence.
 *   Last seen Monday, 26th October, 2026: @ Roland Street.
 *   Complexion: Dark Brown, Slim Build, Height 4' 11":
 *   If seen contact police @ 919 or CID 502-9991 502-9992: See Photo: <url>
 */
function extractPersonFields(text, { title = '' } = {}) {
  const person = {
    name: null,
    gender: null,
    age: null,
    residence: null,
    complexion: null,
    build: null,
    height: null,
  };
  const lastSeen = { when: null, where: null };
  let contact = null;
  let photo = null;

  const clean = healWrappedUrls(String(text || ''));
  const titleClean = healWrappedUrls(String(title || ''));
  const combined = `${titleClean}\n${clean}`.trim();

  // Prefer the structured body first, then fall back to the headline.
  const header = extractHeader(clean) || extractHeader(titleClean);
  if (header) {
    let name = header.name.replace(/\s+/g, ' ').trim();
    name = name.replace(/^(?:Marco'?s?\s+Alert|Public\s+advisory|Advisory|Alert)\s+/i, '').trim();
    person.name = name;
    person.gender = header.gender;
    person.age = header.age;
  } else {
    // News-headline fallback: e.g. "Marco's Alert — Nikita Smith, 17, missing"
    const headlinePerson = combined.match(
      /(?:Marco'?s?\s+Alert|Missing\s+person)\s*[—–:-]\s*([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})(?:\s*,\s*(\d{1,3}))?/i,
    );
    if (headlinePerson) {
      person.name = headlinePerson[1].trim();
      if (headlinePerson[2]) person.age = Number(headlinePerson[2]);
    }
  }

  // Residence / home community after age ("17yrs of Pride Estate, New Providence.")
  const resAfterAge = clean.match(
    /\b\d{1,3}\s*(?:yrs?|years?(?:\s+old)?)\s+of\s+([^.\n]{3,100}?)(?:\.\s*|\s+Last\s+seen\b|$)/i,
  );
  if (resAfterAge) {
    person.residence = resAfterAge[1].replace(/\s+/g, ' ').trim();
  } else {
    const ofMatch = clean.match(/\bof\s+([A-Z][^.\n]{2,80}?)(?:\.\s*|\s+Last\s+seen\b|$)/);
    if (ofMatch) person.residence = ofMatch[1].replace(/\s+/g, ' ').trim();
  }

  // Last seen <when> — capture up to colon or "@"
  const lsWhen = clean.match(/Last\s+seen\s+(?:on\s+)?([^:@\n]{2,90}?)\s*(?::|@|\.\s)/i);
  if (lsWhen) lastSeen.when = lsWhen[1].replace(/\s+/g, ' ').trim();

  // Last seen <where> — capture after "@" up to period or "Complexion"
  const lsWhere = clean.match(/Last\s+seen[^.\n]*?@\s*([^.\n]{2,80}?)\s*(?:\.|Complexion|If\s+seen|$)/i);
  if (lsWhere) {
    const rawWhere = lsWhere[1].replace(/\s+/g, ' ').trim();
    if (GENERIC_PLACES.has(rawWhere.toLowerCase()) && person.residence) {
      lastSeen.where = `${rawWhere} (${person.residence})`;
    } else {
      lastSeen.where = rawWhere;
    }
  } else if (person.residence) {
    lastSeen.where = person.residence;
  }

  // Complexion: Light Brown, Medium Build, Height 4' 11":
  const cx = clean.match(/Complexion\s*:\s*([^,.:;\n]{2,40}?)(?=\s*(?:,|:\s|Build|Height|If\s+seen|\.|$))/i);
  if (cx) person.complexion = cx[1].trim();

  const buildBefore = clean.match(/(?:,|;|\.)\s*([A-Za-z][A-Za-z\s-]{1,28}?\bBuild)\b/i);
  const buildAfter = clean.match(/\bBuild\s*:\s*([^,.:;\n]{2,30})/i);
  if (buildBefore) person.build = buildBefore[1].replace(/\s+/g, ' ').trim();
  else if (buildAfter) person.build = `${buildAfter[1].trim()} Build`;

  const h = clean.match(/Height\s*:?\s*([^":;\n]{2,20}?)(?:\s*(?:[":]|If\s+seen|Contact|See\s+Photo|$))/i);
  if (h) person.height = h[1].trim();

  // Contact phones — "If seen contact police @ 919 or CID 502-9991 502-9992:"
  const phonesMatch = clean.match(
    /(?:contact|call|reach)\s+(?:the\s+)?(?:police\s*(?:@|at)?\s*)?([\d\s\-/()]+(?:\s*(?:or|,)\s*(?:CID|Crime\s*Stoppers)?\s*(?:@|at)?\s*[\d\s\-/()A-Z]+)*)/i,
  );
  if (phonesMatch) {
    contact = phonesMatch[1]
      .replace(/[:;.\s]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    const cid = clean.match(/CID\s*(?:@|at)?\s*([\d\s\-/]{6,})/i);
    if (cid) contact = `CID ${cid[1].replace(/\s+/g, ' ').trim()}`;
  }

  // Photo URL — "See Photo: <url>"
  const photoMatch = combined.match(/See\s+Photo\s*:\s*(https?:\/\/[^\s)<>"']+)/i);
  if (photoMatch) photo = photoMatch[1].replace(/[.,;]+$/, '').trim();

  const isMarco =
    /\bmarco'?s?\s+alert\b/i.test(combined) ||
    Boolean(header && typeof header.age === 'number' && header.age <= 17 && /502-9991|919/.test(combined));

  return {
    alertType: isMarco ? 'marco' : 'missing',
    person,
    lastSeen,
    contact,
    phones: extractPhones(contact || clean),
    photo,
    photoKind: photo ? (isDirectImageUrl(photo) ? 'image' : 'page') : null,
  };
}

/**
 * Decide whether a raw feed item from a general RSS outlet or Google News
 * search is an actual Bahamian missing-person / public-safety alert.
 *
 * Without this gate, broad news queries like `"missing" Bahamas` admit golf
 * fields, election registers, missing-funds appeals and foreign headlines.
 */
export function isAlertCandidate(raw, source = null) {
  if (!raw) return false;
  if (source && (source.kind === 'bulletin' || source.trustedAlerts)) return true;

  const title = String(raw.title || '');
  const summary = String(raw.summary || '');
  const text = `${title}\n${summary}`;

  if (NON_PERSON_MISSING_RE.test(text)) return false;
  if (COURT_DISPOSITION_RE.test(title)) return false;

  const hasStructuredHeader = Boolean(extractHeader(summary) || extractHeader(title));
  const hasAlertPhrase = ALERT_SIGNAL_RE.test(text);
  if (!hasStructuredHeader && !hasAlertPhrase) return false;

  // Must relate to The Bahamas: either a Bahamian source, explicit Bahamas/RBPF
  // marker, or a recognised Bahamian island/settlement.
  const fromBahamianOutlet = Boolean(source && source.bahamian);
  const mentionsBahamas = BAHAMAS_SIGNAL_RE.test(text);
  const islandHit = detectIsland(text);

  return Boolean(fromBahamianOutlet || mentionsBahamas || islandHit.island);
}

/** Turn a raw feed or bulletin item into a structured alert record. */
function enrich(raw, source, { now = new Date() } = {}) {
  const summaryText = healWrappedUrls(raw.summary || '');
  const titleText = healWrappedUrls(raw.title || '');
  const fullText = `${titleText}\n${summaryText}`;

  const fields = extractPersonFields(summaryText, { title: titleText });
  const islandHit = detectIsland(`${fields.person.residence || ''} ${fullText}`);

  const personName = fields.person.name || null;
  const publishedAt = raw.publishedAt || null;
  const alertType = raw.alertType || fields.alertType || 'missing';
  const photo = raw.photo || fields.photo || raw.imageUrl || null;
  const photoKind = photo ? (isDirectImageUrl(photo) ? 'image' : 'page') : null;
  const primaryUrl = raw.url || photo || null;

  const areaLabel = fields.person.residence || fields.lastSeen.where || islandHit.island || null;
  const generatedTitle = personName
    ? `${alertType === 'marco' ? "Marco's Alert — " : ''}${personName}${
        fields.person.age ? `, ${fields.person.age}yrs` : ''
      } — missing${fields.person.residence ? ` (${fields.person.residence})` : ''}`
    : titleText || 'Public safety alert';

  const item = {
    id:
      raw.id ||
      hashId(
        personName
          ? `alert:${personName.toLowerCase()}:${islandHit.island || ''}`
          : primaryUrl || `${source?.name || 'alert'}:${generatedTitle}:${publishedAt || ''}`,
      ),
    kind: 'alert',
    alertType,
    verified: Boolean(raw.verified ?? (source && (source.kind === 'bulletin' || source.bahamian))),
    title: generatedTitle,
    summary: summaryText,
    url: primaryUrl,
    publisher: raw.publisher || (source && source.name) || "Marco's Alert",
    publisherInitials: (source && source.initials) || 'RBPF',
    publishedAt,
    ageLabel: ageLabel(publishedAt, now),
    category: ALERT_CATEGORY,
    categoryLabel: 'Safety',
    island: islandHit.island,
    islandMatches: islandHit.matches,
    location: areaLabel,
    lastSeen: fields.lastSeen,
    person: fields.person,
    contact: fields.contact,
    phones: fields.phones,
    photo,
    photoKind,
    urgency: urgencyOf({ title: titleText, summary: summaryText, person: fields.person }),
    source: {
      id: source ? source.id : null,
      kind: source ? source.kind : null,
      name: raw.publisher || (source ? source.name : null) || "Marco's Alert",
      initials: (source && source.initials) || null,
      url: primaryUrl,
      weight: source ? source.weight : null,
      query: source && source.kind === 'google-news' ? source.name : null,
    },
    sourceWeight: (source && source.weight) || 0.95,
    corroboration: 0,
    alsoReportedBy: [],
    civic: true,
    civicScore: alertType === 'marco' ? 1 : 0.92,
    priority: 'alert',
  };

  // Freshness-weighted score so active Marco's Alerts and the newest notices lead.
  const f = freshness(publishedAt, now);
  const weight = item.sourceWeight;
  const urgencyLift = item.urgency === 'high' ? 1 : 0.4;
  const marcoLift = alertType === 'marco' ? 0.08 : 0;
  item.score = Number(
    Math.min(1, 0.4 * item.civicScore + 0.25 * f + 0.2 * weight + 0.15 * urgencyLift + marcoLift).toFixed(4),
  );
  item.feedWeight = Number((item.score * 100).toFixed(1));

  return item;
}

/**
 * Validate and normalise a Marco's Alert / missing-person submission posted via
 * POST /api/alerts (Cell Broadcast copy-paste, mobile shortcut, or webhook).
 */
export function validateAlertSubmission(input = {}, { trusted = false, now = new Date() } = {}) {
  const rawBody = stripHtml(healWrappedUrls(String(input.text || input.body || input.summary || ''))).trim();
  const rawTitle = stripHtml(healWrappedUrls(String(input.title || ''))).trim();

  if (rawBody.length < 24) {
    return {
      ok: false,
      error: 'Paste the full Marco\'s Alert or missing-person notice (name, last seen and police contact).',
    };
  }
  if (rawBody.length > 4000) {
    return { ok: false, error: 'Alert text is too long (maximum 4,000 characters).' };
  }

  const fields = extractPersonFields(rawBody, { title: rawTitle });
  const hasPoliceContact = Boolean(fields.contact || /\b(?:919|911|502-9991|502-9992|328-8477|police)\b/i.test(rawBody));
  const hasMissingSignal = Boolean(
    fields.person.name || ALERT_SIGNAL_RE.test(`${rawTitle}\n${rawBody}`) || /\blast\s+seen\b/i.test(rawBody),
  );

  if (!trusted && (!hasMissingSignal || !hasPoliceContact)) {
    return {
      ok: false,
      error:
        'Alert must include missing-person details (e.g. Name (Gender) Age, Last seen) and a police contact number (919 or CID 502-9991).',
    };
  }

  const explicitPhoto = input.photo ? String(input.photo).trim() : null;
  const explicitUrl = input.url ? String(input.url).trim() : null;
  const validHttp = (u) => (u && /^https?:\/\/[^\s]+$/i.test(u) ? u : null);

  const publishedAt =
    input.publishedAt && Number.isFinite(Date.parse(String(input.publishedAt)))
      ? new Date(String(input.publishedAt)).toISOString()
      : (now instanceof Date ? now : new Date(now)).toISOString();

  const bulletin = {
    id:
      input.id ||
      `marco-${hashId(`${fields.person.name || rawTitle || rawBody.slice(0, 80)}:${publishedAt.slice(0, 10)}`).slice(0, 16)}`,
    alertType: fields.alertType,
    status: 'active',
    verified: Boolean(trusted),
    title:
      rawTitle ||
      (fields.person.name
        ? `${fields.alertType === 'marco' ? "Marco's Alert — " : ''}${fields.person.name}${
            fields.person.age ? `, ${fields.person.age}` : ''
          }, missing`
        : "Marco's Alert"),
    body: rawBody,
    publishedAt,
    publisher:
      stripHtml(String(input.sourceName || input.publisher || '')).trim() ||
      (trusted ? "Marco's Alert · RBPF" : "Marco's Alert (Community Relay)"),
    url: validHttp(explicitUrl) || fields.photo || null,
    photo: validHttp(explicitPhoto) || fields.photo || null,
  };

  const preview = enrich(
    {
      id: bulletin.id,
      alertType: bulletin.alertType,
      verified: bulletin.verified,
      title: bulletin.title,
      summary: bulletin.body,
      url: bulletin.url,
      photo: bulletin.photo,
      publisher: bulletin.publisher,
      publishedAt: bulletin.publishedAt,
    },
    {
      id: 'cell-broadcast-relay',
      kind: 'bulletin',
      name: bulletin.publisher,
      initials: 'MA',
      weight: trusted ? 1 : 0.95,
      bahamian: true,
      trustedAlerts: true,
    },
    { now: now instanceof Date ? now : new Date(now) },
  );

  return { ok: true, bulletin, item: preview };
}

/** Merge two alert records for the same person + island, keeping the richest fields. */
function mergeAlertPair(a, b) {
  const richness = (x) =>
    (x.alertType === 'marco' ? 4 : 0) +
    (x.person?.name ? 3 : 0) +
    (x.person?.residence ? 2 : 0) +
    (x.person?.complexion ? 1 : 0) +
    (x.contact ? 2 : 0) +
    (x.photo ? 2 : 0) +
    (x.verified ? 1 : 0);

  const primary = richness(b) > richness(a) ? { ...b } : { ...a };
  const secondary = primary === a ? b : a;

  primary.person = {
    name: primary.person?.name || secondary.person?.name || null,
    gender: primary.person?.gender || secondary.person?.gender || null,
    age: primary.person?.age ?? secondary.person?.age ?? null,
    residence: primary.person?.residence || secondary.person?.residence || null,
    complexion: primary.person?.complexion || secondary.person?.complexion || null,
    build: primary.person?.build || secondary.person?.build || null,
    height: primary.person?.height || secondary.person?.height || null,
  };
  primary.lastSeen = {
    when: primary.lastSeen?.when || secondary.lastSeen?.when || null,
    where: primary.lastSeen?.where || secondary.lastSeen?.where || null,
  };
  primary.contact = primary.contact || secondary.contact || null;
  primary.phones = primary.phones?.length ? primary.phones : secondary.phones || [];
  primary.photo = primary.photo || secondary.photo || null;
  primary.photoKind = primary.photoKind || secondary.photoKind || null;
  primary.url = primary.url || secondary.url || null;
  primary.location = primary.location || secondary.location || null;

  const otherPub = secondary.publisher;
  if (otherPub && otherPub !== primary.publisher && !primary.alsoReportedBy.includes(otherPub)) {
    primary.alsoReportedBy = [...primary.alsoReportedBy, otherPub];
    primary.corroboration = primary.alsoReportedBy.length;
  }
  return primary;
}

/**
 * Run the alerts engine.
 *
 * @param {object} options
 * @param {object} options.config        parsed alerts.json
 * @param {object[]} [options.bulletins] official / relayed Cell Broadcast bulletins
 * @param {Function} [options.fetchImpl]
 * @param {string|Date} [options.now]
 * @param {number} [options.limit]
 * @param {object[]} [options.fixtures]  [{ source, xml }] to skip the network
 * @param {(msg: string) => void} [options.log]
 */
export async function ingest(options = {}) {
  const {
    config = {},
    bulletins = [],
    fetchImpl = globalThis.fetch,
    now = new Date(),
    limit = DEFAULTS.limit,
    timeoutMs = DEFAULTS.timeoutMs,
    retries = DEFAULTS.retries,
    concurrency = DEFAULTS.concurrency,
    recencyDays = DEFAULTS.recencyDays,
    fixtures,
    env = process.env,
    log = () => {},
  } = options;

  const when = now instanceof Date ? now : new Date(now);
  const sources = sourceList(config, { recencyDays, env });

  const jobs = fixtures
    ? fixtures.map((fixture) => {
        const source =
          sources.find((s) => s.id === fixture.source) || {
            id: fixture.source,
            kind: 'rss',
            name: fixture.publisher || fixture.source,
            initials: null,
            weight: 0.9,
            civic: true,
            bahamian: true,
            trustedAlerts: Boolean(fixture.trustedAlerts),
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
        const matched = parsed.items.filter((entry) => isAlertCandidate(entry, job.source));
        log(`${job.source.id}: ${matched.length}/${parsed.items.length} alert items`);
        return { source: job.source, items: matched, scanned: parsed.items.length, ok: true };
      } catch (error) {
        log(`${job.source.id}: FAILED ${error.message}`);
        return { source: job.source, items: [], scanned: 0, ok: false, error: error.message };
      }
    }),
    fixtures ? 1 : concurrency,
  );

  const raw = [];
  const reportSources = [];

  // 1. Direct Cell Broadcast / official Marco's Alert bulletins.
  const activeBulletins = (bulletins || []).filter(
    (b) => b && b.status !== 'resolved' && b.status !== 'cancelled',
  );
  if (activeBulletins.length > 0 || (bulletins && bulletins.length > 0)) {
    const bulletinSource = {
      id: 'marcos-alert-bulletins',
      kind: 'bulletin',
      name: "Marco's Alert · Cell Broadcast & RBPF",
      initials: 'MA',
      weight: 1,
      civic: true,
      bahamian: true,
      trustedAlerts: true,
      category: ALERT_CATEGORY,
    };
    for (const b of activeBulletins) {
      raw.push(
        enrich(
          {
            id: b.id,
            alertType: b.alertType || 'marco',
            verified: b.verified ?? true,
            title: b.title || "Marco's Alert",
            summary: b.body || b.summary || '',
            url: b.url || b.photo || null,
            photo: b.photo || null,
            publisher: b.publisher || "Marco's Alert · RBPF",
            publishedAt: b.publishedAt || null,
          },
          bulletinSource,
          { now: when },
        ),
      );
    }
    reportSources.push({
      id: bulletinSource.id,
      name: bulletinSource.name,
      kind: bulletinSource.kind,
      ok: true,
      items: activeBulletins.length,
      error: null,
    });
  }

  // 2. Network / fixture RSS outlets & Google News queries.
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
  // Cell Broadcast and news outlets collapses into one rich record.
  const byKey = new Map();
  let duplicates = 0;
  for (const item of raw) {
    const key = `${(item.person.name || item.title).toLowerCase()}::${(item.island || 'unknown').toLowerCase()}`;
    if (byKey.has(key)) {
      duplicates += 1;
      byKey.set(key, mergeAlertPair(byKey.get(key), item));
    } else {
      byKey.set(key, item);
    }
  }

  const ranked = [...byKey.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0),
    )
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
