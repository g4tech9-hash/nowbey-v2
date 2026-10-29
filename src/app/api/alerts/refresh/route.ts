import { getAlerts } from '@/lib/alerts';
import { invalidateWireCache } from '@/lib/wire';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts/refresh — for a scheduled cron or operator webhook.
 *
 * Set CRON_SECRET in the project environment; send `authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');

  if (!secret) {
    return Response.json(
      { error: 'CRON_SECRET is not configured; refresh disabled' },
      { status: 503 },
    );
  }
  if (header !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorised' }, { status: 401 });
  }

  try {
    const payload = await getAlerts({ force: true });
    invalidateWireCache();
    return Response.json({
      ok: true,
      mode: payload.mode,
      generatedAt: payload.generatedAt,
      counts: payload.report.totals,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
