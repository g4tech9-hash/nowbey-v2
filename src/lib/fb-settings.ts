import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Pool } from 'pg';

import {
  DEFAULT_FB_PAGE,
  fbBridgesFromValue,
  fbBridgesToValue,
  fbBridgeUrl,
  fbPageName,
  fbPagesFromValue,
  fbUsernameFromUrl,
  isPrivateHostname,
  fetchFacebookRssXml,
  type FbPageRef,
} from '@/lib/facebook';

const LOCAL_FB_SETTINGS = resolve(process.cwd(), 'wire/data/fb-settings.json');
export const FB_RSS_INTERNAL_PREFIX = 'https://facebook-rss.nowbey.internal/';

type FbConfigSnapshot = {
  at: number;
  pagesRaw: string;
  bridgesRaw: string;
};

const holder = globalThis as typeof globalThis & {
  __nowbeyFbSettingsPool?: Pool;
  __nowbeyFbSettingsCache?: FbConfigSnapshot | null;
};

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!holder.__nowbeyFbSettingsPool) {
    holder.__nowbeyFbSettingsPool = new Pool({
      connectionString: url,
      max: 2,
      connectionTimeoutMillis: 4000,
      idleTimeoutMillis: 15000,
    });
  }
  return holder.__nowbeyFbSettingsPool;
}

async function readSettingsRaw(): Promise<{ pagesRaw: string; bridgesRaw: string }> {
  const cached = holder.__nowbeyFbSettingsCache;
  if (cached && Date.now() - cached.at < 10_000) {
    return { pagesRaw: cached.pagesRaw, bridgesRaw: cached.bridgesRaw };
  }

  const pool = getPool();
  if (pool) {
    try {
      const { rows } = await pool.query<{ key: string; value: string }>(
        `SELECT key, value FROM site_settings WHERE key IN ('fb_pages', 'fb_bridges')`,
      );
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
      const next = {
        at: Date.now(),
        pagesRaw: map.fb_pages ?? '',
        bridgesRaw: map.fb_bridges ?? '',
      };
      holder.__nowbeyFbSettingsCache = next;
      return next;
    } catch {
      // Fall through silently if site_settings has not been created yet or DB is unreachable.
    }
  }

  try {
    const raw = JSON.parse(await readFile(LOCAL_FB_SETTINGS, 'utf8'));
    return {
      pagesRaw: typeof raw.fb_pages === 'string' ? raw.fb_pages : '',
      bridgesRaw: typeof raw.fb_bridges === 'string' ? raw.fb_bridges : '',
    };
  } catch {
    return { pagesRaw: '', bridgesRaw: '' };
  }
}

export async function getConfiguredFacebookSettings(): Promise<{
  pages: FbPageRef[];
  bridges: Record<string, string>;
}> {
  const { pagesRaw, bridgesRaw } = await readSettingsRaw();
  const bridges = fbBridgesFromValue(bridgesRaw);

  const combinedPagesRaw = [pagesRaw, process.env.FB_PAGES ?? ''].filter(Boolean).join(',');
  const pageMap = new Map<string, FbPageRef>();
  for (const page of fbPagesFromValue(combinedPagesRaw, process.env)) {
    pageMap.set(page.username.toLowerCase(), page);
  }

  // Also ensure any page that has an admin or env bridge is automatically on the page list.
  for (const username of Object.keys(bridges)) {
    const lower = username.toLowerCase();
    if (!pageMap.has(lower)) {
      pageMap.set(lower, { username, pageName: fbPageName(username, process.env) });
    }
  }
  const envBridges = fbBridgesFromValue(process.env.FB_RSS_BRIDGES ?? '');
  for (const username of Object.keys(envBridges)) {
    const lower = username.toLowerCase();
    if (!pageMap.has(lower)) {
      pageMap.set(lower, { username, pageName: fbPageName(username, process.env) });
    }
  }
  if (process.env.RBPF_FB_RSS_URL?.trim() && !pageMap.has('rbpfpublicaffairs')) {
    pageMap.set('rbpfpublicaffairs', {
      username: 'rbpfpublicaffairs',
      pageName: 'Royal Bahamas Police Force',
    });
  }

  return { pages: [...pageMap.values()], bridges };
}

export async function defaultFacebookUsername(): Promise<string> {
  const { pages } = await getConfiguredFacebookSettings();
  return pages[0]?.username ?? DEFAULT_FB_PAGE;
}

/**
 * Save or update a Facebook page + optional RSS bridge URL into Neon `site_settings`
 * (`fb_pages` and `fb_bridges`), with local file fallback in development.
 */
export async function saveFacebookBridgeConfig(input: {
  page: string;
  pageName?: string;
  bridgeUrl?: string;
}): Promise<{ ok: true; username: string; pageName: string; bridgeUrl: string | null } | { ok: false; error: string }> {
  const username = fbUsernameFromUrl(input.page);
  if (!username) {
    return {
      ok: false,
      error: 'Provide a valid public Facebook page link or handle (e.g. rbpfpublicaffairs or mybpl242).',
    };
  }

  let cleanBridge: string | null = null;
  if (input.bridgeUrl && input.bridgeUrl.trim()) {
    const rawBridge = input.bridgeUrl.trim();
    if (rawBridge.includes(',') || rawBridge.includes('|')) {
      return { ok: false, error: 'Bridge URL must not contain commas or pipe characters.' };
    }
    let parsed: URL;
    try {
      parsed = new URL(rawBridge);
    } catch {
      return { ok: false, error: 'Bridge URL must be a valid http(s) address.' };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'Bridge URL must use http or https.' };
    }
    if (isPrivateHostname(parsed.hostname)) {
      return { ok: false, error: 'Private or loopback hosts are not allowed for bridge feeds.' };
    }
    if (/facebook\.com|fb\.com/i.test(parsed.hostname)) {
      return {
        ok: false,
        error: 'Paste an RSS bridge URL (rss.app / fetchrss / RSS-Bridge), not the Facebook page URL itself.',
      };
    }
    cleanBridge = parsed.toString();
  }

  const { pagesRaw, bridgesRaw } = await readSettingsRaw();
  const existingPages = fbPagesFromValue(pagesRaw, process.env);
  const resolvedName = (input.pageName ?? '').trim() || fbPageName(username, process.env);

  const pageMap = new Map<string, FbPageRef>();
  for (const p of existingPages) pageMap.set(p.username.toLowerCase(), p);
  pageMap.set(username.toLowerCase(), { username, pageName: resolvedName });

  const nextPagesRaw = [...pageMap.values()]
    .map((p) => `${p.username}|${p.pageName.replace(/[|,]/g, ' ').trim()}`)
    .join(',');

  const bridges = fbBridgesFromValue(bridgesRaw);
  if (cleanBridge) {
    bridges[username] = cleanBridge;
  }
  const nextBridgesRaw = fbBridgesToValue(bridges);

  const pool = getPool();
  if (pool) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_by TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(
        `INSERT INTO site_settings (key, value, updated_by, updated_at)
         VALUES ('fb_pages', $1, 'facebook-rss', NOW()), ('fb_bridges', $2, 'facebook-rss', NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [nextPagesRaw, nextBridgesRaw],
      );
      holder.__nowbeyFbSettingsCache = {
        at: Date.now(),
        pagesRaw: nextPagesRaw,
        bridgesRaw: nextBridgesRaw,
      };
      return { ok: true, username, pageName: resolvedName, bridgeUrl: cleanBridge };
    } catch {
      // Fall back to local file if DB write fails in local sandbox.
    }
  }

  try {
    await mkdir(dirname(LOCAL_FB_SETTINGS), { recursive: true });
    await writeFile(
      LOCAL_FB_SETTINGS,
      JSON.stringify({ fb_pages: nextPagesRaw, fb_bridges: nextBridgesRaw }, null, 2),
      'utf8',
    );
  } catch {
    // Ephemeral environment without DB.
  }

  holder.__nowbeyFbSettingsCache = {
    at: Date.now(),
    pagesRaw: nextPagesRaw,
    bridgesRaw: nextBridgesRaw,
  };
  return { ok: true, username, pageName: resolvedName, bridgeUrl: cleanBridge };
}

/**
 * Returns virtual RSS outlet entries (`https://facebook-rss.nowbey.internal/<username>`)
 * plus a `fetchImpl` wrapper that runs NowBey's Facebook → RSS 2.0 converter in-process.
 */
export async function buildFacebookRssIntegration(
  baseFetch: typeof fetch = globalThis.fetch,
): Promise<{
  outlets: Array<{
    id: string;
    name: string;
    initials: string;
    weight: number;
    civic: boolean;
    rss: string;
  }>;
  fetchImpl: typeof fetch;
}> {
  const { pages, bridges } = await getConfiguredFacebookSettings();

  const outlets = pages
    .filter((p) => {
      // Include every page configured by an admin/env or backed by an active bridge.
      return Boolean(fbBridgeUrl(p.username, process.env, bridges) || pages.length > 0);
    })
    .map((p) => ({
      id: `fb-${p.username.toLowerCase()}`,
      name: p.pageName,
      initials: p.pageName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0] || '')
        .join('')
        .toUpperCase() || 'FB',
      weight: /police|rbpf|power|bpl/i.test(p.pageName) ? 1.0 : 0.9,
      civic: true,
      rss: `${FB_RSS_INTERNAL_PREFIX}${encodeURIComponent(p.username)}`,
    }));

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith(FB_RSS_INTERNAL_PREFIX)) {
      const username = decodeURIComponent(url.slice(FB_RSS_INTERNAL_PREFIX.length));
      const matchedPage = pages.find((p) => p.username.toLowerCase() === username.toLowerCase());
      const { xml } = await fetchFacebookRssXml({
        username,
        pageName: matchedPage?.pageName,
        env: process.env,
        adminBridges: bridges,
        fetchImpl: baseFetch,
      });
      return new Response(xml, {
        status: 200,
        headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
      });
    }
    return baseFetch(input as RequestInfo, init);
  };

  return { outlets, fetchImpl };
}
