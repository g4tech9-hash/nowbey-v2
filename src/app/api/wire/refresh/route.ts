import { getWire } from '@/lib/wire';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wire/refresh — for a Vercel cron.
 *
 * Set CRON_SECRET in the project environment; Vercel sends it as
 * `authorization: Bearer $CRON_SECRET`. Without the secret configured the route
 * refuses to run rather than leaving an open endpoint that can hammer the
 * outlets.
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
    const payload = await getWire({ force: true });
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
