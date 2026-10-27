import { getWire } from '@/lib/wire';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wire?civic=1&island=Exuma&limit=20
 *
 * Same payload the pages render. Kept as a route as well so a native client or
 * an email digest can read the wire without going through the HTML.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const civicOnly = url.searchParams.get('civic') === '1';
  const island = url.searchParams.get('island');
  const limit = Number(url.searchParams.get('limit') || 40);

  try {
    const payload = await getWire();
    let items = payload.items;
    if (civicOnly) items = items.filter((item) => item.civic);
    if (island) items = items.filter((item) => item.island?.toLowerCase() === island.toLowerCase());

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
