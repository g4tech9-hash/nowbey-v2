/*
 * Facebook page → strict RSS 2.0 conversion endpoint (restored from PRs #37 & #38).
 *
 *   GET /api/rss/facebook?url=https://www.facebook.com/rbpfpublicaffairs/
 *   GET /api/rss/facebook?page=mybpl242
 *   GET /api/rss/facebook              → first configured page (site_settings.fb_pages or mybpl242)
 *
 *   POST /api/rss/facebook             → save/update a Facebook page & RSS bridge URL in site_settings
 */

import {
  fbUsernameFromUrl,
  fetchFacebookRssXml,
} from '@/lib/facebook';
import {
  defaultFacebookUsername,
  getConfiguredFacebookSettings,
  saveFacebookBridgeConfig,
} from '@/lib/fb-settings';
import { invalidateAlertsCache } from '@/lib/alerts';
import { invalidateWireCache } from '@/lib/wire';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target =
    searchParams.get('url') ??
    searchParams.get('page') ??
    (await defaultFacebookUsername());

  const username = fbUsernameFromUrl(target);
  if (!username) {
    return Response.json(
      {
        ok: false,
        error:
          'Provide a public Facebook page link: /api/rss/facebook?url=https://www.facebook.com/rbpfpublicaffairs/ (or ?page=mybpl242). Only facebook.com page/profile links are accepted.',
      },
      { status: 400 },
    );
  }

  const { pages, bridges } = await getConfiguredFacebookSettings();
  const explicitPage = pages.find((p) => p.username.toLowerCase() === username.toLowerCase());
  const { xml } = await fetchFacebookRssXml({
    username,
    pageName: explicitPage?.pageName,
    env: process.env,
    adminBridges: bridges,
    selfUrl: new URL(request.url).toString(),
  });

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  });
}

export async function POST(request: Request) {
  const secret = process.env.ALERTS_INGEST_SECRET || process.env.CRON_SECRET || '';
  if (secret) {
    const auth = request.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ ok: false, error: 'Unauthorised' }, { status: 401 });
    }
  }

  let body: { page?: string; url?: string; pageName?: string; bridgeUrl?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const result = await saveFacebookBridgeConfig({
    page: String(body.page || body.url || ''),
    pageName: body.pageName,
    bridgeUrl: body.bridgeUrl,
  });

  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  invalidateAlertsCache();
  invalidateWireCache();
  return Response.json(result, { status: 200 });
}
