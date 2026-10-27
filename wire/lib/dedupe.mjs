/**
 * DE-DUPLICATION
 * ---------------------------------------------------------------------------
 * The same road closure reaches the wire three times: once from the outlet's
 * own feed, once from a Google News query, and once more when a second outlet
 * rewrites it. Five copies of one closure is what makes a civic wire look like
 * a repeat channel, so items collapse on three signals:
 *
 *   1. identical canonical URL
 *   2. near-identical title (token Jaccard)
 *   3. same civic event — same category, same island, same closing phrase
 */

import { normalise, similarity, tokens } from './text.mjs';

export function canonicalUrl(rawUrl = '') {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    // Strip the tracking parameters newsrooms append.
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ocid|ref|referrer|cmpid|itm_)/i.test(key)) u.searchParams.delete(key);
    }
    u.hostname = u.hostname.replace(/^www\./i, '').toLowerCase();
    let path = u.pathname.replace(/\/+$/, '');
    return `${u.protocol}//${u.hostname}${path}${u.search}`.toLowerCase();
  } catch {
    return String(rawUrl).trim().toLowerCase();
  }
}

/** Title key with outlet names and boilerplate removed. */
export function titleKey(title = '') {
  return normalise(title)
    .replace(/\b(tribune242|tribune 242|the nassau guardian|nassau guardian|our news|eyewitness news|bahamas press|zns bahamas|bahamas local|bis)\b/g, ' ')
    .replace(/\b(update|updated|breaking|watch|video|photos|exclusive|report)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CIVIC_VERBS = new Set([
  'closure',
  'closures',
  'closed',
  'interruption',
  'interruptions',
  'outage',
  'outages',
  'diverted',
  'suspended',
  'cancelled',
  'canceled',
  'postponed',
  'warning',
  'advisory',
  'resumes',
  'reopens',
  'restoration',
  'collection',
  'repairs',
  'works',
]);

function civicEventKey(item) {
  const t = tokens(titleKey(item.title));
  const event = t.filter((w) => CIVIC_VERBS.has(w)).sort().join('|');
  if (!event) return null;
  const subject = t.filter((w) => !CIVIC_VERBS.has(w)).slice(0, 4).sort().join('|');
  return `${item.category}:${item.island || 'all'}:${event}:${subject}`;
}

/**
 * Collapse duplicates, keeping the best copy of each event.
 *
 * "Best" = the version with a real publisher URL (not a Google News redirect)
 * with the earliest publication time, so the wire credits the outlet that
 * broke it rather than the aggregator that repeated it.
 */
export function dedupe(items = [], options = {}) {
  const titleThreshold = options.titleThreshold ?? 0.62;
  const eventKeying = options.eventKeying !== false;

  const byUrl = new Map();
  const kept = [];
  const merged = [];

  const better = (a, b) => {
    const score = (item) =>
      (item.publisher && !/news\.google\.com/i.test(item.url) ? 2 : 0) +
      (item.summary ? 1 : 0) +
      (item.publishedAt ? 1 : 0);
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sa > sb ? a : b;
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : Infinity;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : Infinity;
    return ta <= tb ? a : b;
  };

  for (const item of items) {
    const urlKey = canonicalUrl(item.url);
    const duplicateOfUrl = byUrl.get(urlKey);

    let existing = duplicateOfUrl;
    if (!existing) {
      const candidate = kept.find(
        (k) =>
          similarity(titleKey(k.title), titleKey(item.title)) >= titleThreshold ||
          (eventKeying &&
            civicEventKey(k) &&
            civicEventKey(k) === civicEventKey(item)),
      );
      existing = candidate;
    }

    if (existing) {
      const winner = better(existing, item);
      const loser = winner === existing ? item : existing;
      winner.alsoReportedBy = unique([
        ...(winner.alsoReportedBy || []),
        ...(loser.publisher ? [loser.publisher] : []),
        ...(loser.alsoReportedBy || []),
      ]).filter((p) => p !== winner.publisher);
      winner.corroboration = winner.alsoReportedBy.length;
      if (winner !== existing) {
        const idx = kept.indexOf(existing);
        if (idx >= 0) kept[idx] = winner;
      }
      byUrl.set(urlKey, winner);
      merged.push({ kept: winner.id, dropped: loser.id, reason: 'duplicate' });
      continue;
    }

    byUrl.set(urlKey, item);
    kept.push(item);
  }

  return { items: kept, merged };
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}
