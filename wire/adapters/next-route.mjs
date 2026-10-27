/**
 * NEXT.JS APP ROUTER ADAPTERS (drop-in)
 * ---------------------------------------------------------------------------
 * The app code is not in this repository, so these are the exact server pieces
 * to paste into `src/app/api/`. They use Web-standard Request/Response only —
 * no imports beyond this package — so they work in the App Router, in Vercel
 * functions, and under `node --test`.
 *
 *   src/app/api/wire/route.ts        → wireGet()
 *   src/app/api/wire/refresh/route.ts → wireRefresh()   (called by vercel.json cron)
 *   src/app/feed/page.tsx            → mergeFeedItems() before rendering
 *
 * Caching: the ingest run is the expensive part, so the payload is memoised in
 * module scope for `ttlMs` and the cron route forces a fresh pass. Swap `store`
 * for your KV/Postgres table to share it across instances (see README).
 */

import { ingest } from '../lib/ingest.mjs';
import { bridgeToFeed } from '../lib/feed.mjs';

const DEFAULT_TTL_MS = 10 * 60 * 1000;

/** Minimal memo store. Replace with KV/Redis/Postgres in production. */
export function createStore() {
  let value = null;
  let storedAt = 0;
  return {
    get() {
      return { value, storedAt };
    },
    set(next) {
      value = next;
      storedAt = Date.now();
    },
    clear() {
      value = null;
      storedAt = 0;
    },
  };
}

export function createWireHandlers(config, options = {}) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const store = options.store ?? createStore();
  const log = options.log ?? (() => {});

  async function refresh() {
    const { items, report } = await ingest({ config, log });
    const { cards } = bridgeToFeed(items);
    const payload = {
      generatedAt: report.fetchedAt,
      items,
      feedCards: cards,
      report,
    };
    store.set(payload);
    return payload;
  }

  async function payload({ force = false } = {}) {
    const { value, storedAt } = store.get();
    if (!force && value && Date.now() - storedAt < ttlMs) return value;
    return refresh();
  }

  /** GET /api/wire?civic=1&island=Exuma&limit=20 */
  async function wireGet(request = {}) {
    const url = new URL(request.url ?? 'https://nowbey.com/api/wire');
    const data = await payload();
    const civicOnly = url.searchParams.get('civic') === '1';
    const island = url.searchParams.get('island');
    const limit = Number(url.searchParams.get('limit') || 40);

    let items = data.items;
    if (civicOnly) items = items.filter((item) => item.civic);
    if (island) items = items.filter((item) => item.island === island);

    return json({
      generatedAt: data.generatedAt,
      counts: data.report.totals,
      items: items.slice(0, Number.isFinite(limit) ? limit : 40),
    });
  }

  /**
   * GET /api/wire/refresh — for a Vercel cron.
   * Protect it with CRON_SECRET so the endpoint cannot be used to hammer the
   * outlets: Vercel sends `authorization: Bearer $CRON_SECRET`.
   */
  async function wireRefresh(request = {}) {
    const secret = options.cronSecret ?? process.env.CRON_SECRET;
    if (secret) {
      const header = headerOf(request, 'authorization');
      if (header !== `Bearer ${secret}`) return json({ error: 'unauthorised' }, 401);
    }
    const data = await refresh();
    return json({ ok: true, generatedAt: data.generatedAt, counts: data.report.totals });
  }

  return { wireGet, wireRefresh, refresh, payload, store };
}

function headerOf(request, name) {
  const headers = request.headers;
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  return headers[name] ?? null;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
