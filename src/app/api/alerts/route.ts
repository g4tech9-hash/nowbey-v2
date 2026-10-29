import { getAlerts, submitAlert } from '@/lib/alerts';
import { invalidateWireCache } from '@/lib/wire';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts?island=New%20Providence&urgency=high&limit=20
 *
 * Structured missing-person & Marco's Alert payload shared by /alerts, native
 * clients and the live AlertsMonitor poller.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const island = url.searchParams.get('island');
  const urgency = url.searchParams.get('urgency');
  const limit = Number(url.searchParams.get('limit') || 40);

  try {
    const payload = await getAlerts();
    let items = payload.items;
    if (island && island !== 'all') {
      items = items.filter((item) => item.island?.toLowerCase() === island.toLowerCase());
    }
    if (urgency && urgency !== 'all') {
      items = items.filter((item) => item.urgency === urgency);
    }

    return Response.json(
      {
        mode: payload.mode,
        generatedAt: payload.generatedAt,
        counts: payload.report.totals,
        items: items.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 40),
      },
      { headers: { 'cache-control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/alerts
 *
 * Relay a Cell Broadcast Marco's Alert or official missing-person notice so it
 * surfaces immediately even before newspapers publish an RSS story.
 *
 * Accepts:
 *   • application/json: { text, title?, url?, photo?, sourceName? }
 *   • text/plain:       raw Cell Broadcast alert body (e.g. iOS Shortcut / Tasker)
 */
export async function POST(request: Request) {
  const ingestSecret = process.env.ALERTS_INGEST_SECRET || process.env.CRON_SECRET || '';
  const authHeader = request.headers.get('authorization') || '';
  const trusted = Boolean(ingestSecret && authHeader === `Bearer ${ingestSecret}`);

  let body: Record<string, unknown> = {};
  const contentType = (request.headers.get('content-type') || '').toLowerCase();

  try {
    if (contentType.includes('application/json')) {
      body = (await request.json()) as Record<string, unknown>;
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    } else {
      const text = await request.text();
      body = { text };
    }
  } catch {
    return Response.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  try {
    const result = await submitAlert(body, { trusted });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    invalidateWireCache();
    return Response.json(
      {
        ok: true,
        item: result.item,
      },
      { status: 201, headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
