import type { Metadata } from 'next';
import Link from 'next/link';

import { FeedCard } from '@/components/FeedCard';
import { HowItWorksPanel, ModeBanner, SourcesPanel } from '@/components/SideRail';
import { SiteHeader } from '@/components/SiteHeader';
import { getFeed } from '@/lib/wire';

export const metadata: Metadata = {
  title: 'Community feed',
  description:
    'Neighbour reports and civic news from across The Bahamas, in one feed: closures, interruptions and warnings alongside what neighbours see.',
};

export const dynamic = 'force-dynamic';

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const feed = await getFeed();

  const counts = new Map<string, number>();
  for (const item of feed.items) counts.set(item.category, (counts.get(item.category) || 0) + 1);
  const categories = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const items = cat && cat !== 'all' ? feed.items.filter((i) => i.category === cat) : feed.items;
  const label = (value: string) => (value === 'accident' ? 'Car Accident' : value[0].toUpperCase() + value.slice(1));

  return (
    <>
      <SiteHeader active="feed" />
      <main className="page">
        <div className="page-head">
          <p className="eyebrow">Community</p>
          <h1 className="page-title">Everything happening on your island</h1>
          <p className="page-sub">
            Neighbour reports and civic news together. {feed.placedWire} newsroom{' '}
            {feed.placedWire === 1 ? 'story' : 'stories'} in this view, the rest filed by neighbours.
          </p>
        </div>

        <ModeBanner mode={feed.mode} capturedAt={feed.fixtureCapturedAt} />

        <div className="stat-row">
          <div className="stat">
            <b>{feed.items.length}</b>
            <span>In the feed</span>
          </div>
          <div className="stat" data-civic="true">
            <b>{feed.totals.civic}</b>
            <span>Civic on wire</span>
          </div>
          <div className="stat">
            <b>{feed.totals.duplicatesRemoved}</b>
            <span>Dupes merged</span>
          </div>
          <div className="stat">
            <b>
              {feed.totals.ok}/{feed.totals.sources}
            </b>
            <span>Sources up</span>
          </div>
        </div>

        <nav className="chips" aria-label="Filter by category">
          <Link className="chip" href="/feed" data-active={!cat || cat === 'all'}>
            Everything <span className="count">{feed.items.length}</span>
          </Link>
          {categories.map(([value, count]) => (
            <Link key={value} className="chip" href={`/feed?cat=${value}`} data-active={cat === value}>
              <span className="dot" style={{ background: `var(--cat-${value})` }} aria-hidden="true" />
              {label(value)} <span className="count">{count}</span>
            </Link>
          ))}
        </nav>

        <div className="cols">
          <div>
            {items.length ? (
              items.map((item) => <FeedCard key={item.id} item={item} />)
            ) : (
              <p className="empty">Nothing in this filter.</p>
            )}
            <p className="emergency">
              Emergency: call <a href="tel:919">919</a> / <a href="tel:911">911</a> — this app is not an
              emergency service.
            </p>
          </div>
          <aside>
            <SourcesPanel sources={feed.sources} />
            <HowItWorksPanel />
          </aside>
        </div>
      </main>
    </>
  );
}
