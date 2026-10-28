import { getAlerts } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts?island=Exuma&urgency=high&limit=20
 *
 * Same payload the /alerts page renders. Kept as a route so a native client or
 * an email digest can read the alerts without going through the HTML.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const island = url.searchParams.get('island');
  const urgency = url.searchParams.get('urgency');
  const limit = Number(url.searchParams.get('limit') || 40);

  try {
    const payload = await getAlerts();
    let items = payload.items;
    if (island) items = items.filter((item) => item.island?.toLowerCase() === island.toLowerCase());
    if (urgency) items = items.filter((item) => item.urgency === urgency);

    return Response.json(
      {
        mode: payload.mode,
        generatedAt: payload.generatedAt,
        counts: payload.report.totals,
        items: items.slice(0, Number.isFinite(limit) ? limit : 40),
      },
      { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
