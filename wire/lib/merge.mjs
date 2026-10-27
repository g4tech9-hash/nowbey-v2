/**
 * FEED MERGE
 * ---------------------------------------------------------------------------
 * Puts civic wire stories inside the community feed without letting the news
 * wire drown the neighbours.
 *
 * The Feed tab is a community product: a neighbour's flooding report from
 * twenty minutes ago should still outrank a newsroom's road-closure story from
 * six hours ago. So the merge is ratio-capped — at most `maxWireShare` of any
 * window of cards may be wire items, and never more than one wire item per
 * category in the same window, so five road-closure rewrites cannot stack up.
 *
 * `reports` are the app's existing feed objects; the only fields read are
 * `id`, `createdAt` (or `publishedAt`), `category` and `severity` (optional).
 */

const DEFAULT_WINDOW = 6;

function timeOf(item) {
  const raw = item.createdAt || item.publishedAt || item.at;
  const ms = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

function scoreOf(item) {
  if (typeof item.sortWeight === 'number') return item.sortWeight;
  // Neighbour reports rank on recency; wire cards already carry a 0-100 weight.
  return timeOf(item) / 1e9;
}

/**
 * @param {object[]} reports existing community feed items (already ranked)
 * @param {object[]} wire    cards from bridgeToFeed()
 * @param {object}   options
 * @returns {{ items: object[], placed: number, held: object[] }}
 */
export function mergeFeedItems(reports = [], wire = [], options = {}) {
  const window = options.window ?? DEFAULT_WINDOW;
  const maxWireShare = options.maxWireShare ?? 0.4;
  const maxPerCategory = options.maxPerCategory ?? 1;

  // Community items first, in their own order; wire items slot in after them.
  const queue = wire
    .slice()
    .sort((a, b) => (b.sortWeight ?? 0) - (a.sortWeight ?? 0));

  const out = [];
  const usedCategories = new Map();
  const held = [];

  const tryPlaceWire = (index) => {
    if (!queue.length) return false;
    const windowStart = Math.max(0, index - window + 1);
    const windowItems = out.slice(windowStart);
    const wireInWindow = windowItems.filter((i) => i.kind === 'wire').length;
    const allowed = Math.max(1, Math.floor(window * maxWireShare) - wireInWindow);
    if (allowed <= 0) return false;

    const next = queue.find((candidate) => (usedCategories.get(candidate.category) || 0) < maxPerCategory);
    if (!next) return false;

    queue.splice(queue.indexOf(next), 1);
    usedCategories.set(next.category, (usedCategories.get(next.category) || 0) + 1);
    out.push(next);
    return true;
  };

  for (const report of reports) {
    out.push(report);
    // After every two community items, offer a slot to a civic wire story.
    if (out.length % 2 === 0) tryPlaceWire(out.length);
  }

  // Anything still queued after the feed runs out, if there is room.
  while (queue.length && tryPlaceWire(out.length)) {
    /* keep placing */
  }
  held.push(...queue);

  // Stable sort: reports keep relative order, wire cards are weighted.
  const ordered = out
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.kind === 'wire' && b.item.kind === 'wire') {
        return (b.item.sortWeight ?? 0) - (a.item.sortWeight ?? 0) || a.index - b.index;
      }
      // When a wire story is fresher and more civic than the report next to it,
      // let it move up by one position only — never across the whole feed.
      if (Math.abs(a.index - b.index) === 1 && a.item.kind !== b.item.kind) {
        const wireItem = a.item.kind === 'wire' ? a.item : b.item;
        const report = a.item.kind === 'wire' ? b.item : a.item;
        const wireAhead =
          (wireItem.sortWeight ?? 0) > 55 &&
          timeOf(wireItem) > timeOf(report) &&
          wireItem.category === report.category;
        if (wireAhead) return a.item.kind === 'wire' ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.item);

  return {
    items: ordered,
    placed: ordered.filter((i) => i.kind === 'wire').length,
    held,
  };
}
