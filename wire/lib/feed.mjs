/**
 * FEED BRIDGE
 * ---------------------------------------------------------------------------
 * The wire page shows every headline. The Feed tab shows signals a neighbour
 * can act on. This module turns classified wire items into feed-shaped cards,
 * so a "road closed on East Street" story appears next to the neighbour
 * reports instead of living on a tab nobody opens during a closure.
 *
 * Nothing here talks to the database: it returns plain objects the caller can
 * map onto whatever shape `src/app/feed` already uses.
 */

const CIVIC_MIN = 0.5;

/**
 * @param {object} item   classified wire item
 * @param {{minCivicScore?: number, maxAgeHours?: number, now?: number}} options
 * @returns {boolean}
 */
export function isFeedEligible(item, options = {}) {
  const minCivicScore = options.minCivicScore ?? CIVIC_MIN;
  const maxAgeHours = options.maxAgeHours ?? 72;
  const now = options.now ? Date.parse(options.now) : Date.now();

  if (item.noise) return false;
  if (item.civicScore < minCivicScore) return false;
  if (!item.civic && !options.allowNonCivic) return false;
  if (item.publishedAt) {
    const age = (now - Date.parse(item.publishedAt)) / 36e5;
    if (Number.isFinite(age) && age > maxAgeHours) return false;
  }
  return true;
}

/**
 * Map one wire item onto a feed card.
 * `kind: 'wire'` is the discriminator the feed needs so it can render a source
 * chip and a "Read at <publisher>" link instead of a confirm/saw-it bar.
 */
export function toFeedCard(item) {
  return {
    kind: 'wire',
    id: item.id,
    title: item.title,
    summary: item.summary,
    category: item.category,
    categoryLabel: item.categoryLabel,
    island: item.island,
    publishedAt: item.publishedAt,
    ageLabel: item.ageLabel,
    source: {
      name: item.publisher,
      initials: item.publisherInitials,
      url: item.url,
      corroboration: item.corroboration || 0,
      alsoReportedBy: item.alsoReportedBy || [],
    },
    civic: item.civic,
    civicScore: item.civicScore,
    priority: item.priority,
    // The feed sorts on this; wire items sit just below a confirmed neighbour
    // report of the same category so community observations still lead.
    sortWeight: item.feedWeight,
    cta: { label: item.publisher ? `Read at ${item.publisher}` : 'Read the story', href: item.url },
    actions: { confirm: false, sawIt: false, cleared: false, comment: true },
    disclosure: 'Reported by a newsroom. Not confirmed by neighbours.',
  };
}

/**
 * @param {object[]} items classified wire items
 * @returns {{ cards: object[], dropped: number }}
 */
export function bridgeToFeed(items = [], options = {}) {
  const eligible = items.filter((item) => isFeedEligible(item, options));
  const cards = eligible
    .slice()
    .sort((a, b) => b.feedWeight - a.feedWeight)
    .map(toFeedCard);
  return { cards, dropped: items.length - cards.length };
}
