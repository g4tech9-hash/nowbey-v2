import type { Metadata } from 'next';
import Link from 'next/link';

import { HowItWorksPanel, ModeBanner, SourcesPanel } from '@/components/SideRail';
import { SiteHeader } from '@/components/SiteHeader';
import { WireCard } from '@/components/WireCard';
import { getWire } from '@/lib/wire';

export const metadata: Metadata = {
  title: 'News wire — Bahamian headlines on the map',
  description:
    'Bahamian headlines collected in one place: road closures, water and power interruptions, marine warnings and official notices, pinned to the island they affect.',
};

export const dynamic = 'force-dynamic';

export default async function WirePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const wire = await getWire();

  const items =
    filter === 'civic' ? wire.items.filter((item) => item.civic) : wire.items;
  const civicCount = wire.items.filter((item) => item.civic).length;

  return (
    <>
      <SiteHeader active="wire" />
      <main className="page">
        <div className="page-head">
          <p className="eyebrow">News wire</p>
          <h1 className="page-title">Bahamian headlines, collected in one place</h1>
          <p className="page-sub">
            {wire.items.length} stories from {wire.report.totals.ok} outlets and civic searches.{" "}
            {civicCount} are actionable — closures, interruptions, warnings — and appear in the feed.
          </p>
        </div>

        <ModeBanner mode={wire.mode} capturedAt={wire.fixtureCapturedAt} />

        <nav className="chips" aria-label="Filter the wire">
          <Link className="chip" href="/wire" data-active={filter !== 'civic'}>
            Everything <span className="count">{wire.items.length}</span>
          </Link>
          <Link className="chip" href="/wire?filter=civic" data-active={filter === 'civic'}>
            <span className="dot" style={{ background: 'var(--accent)' }} aria-hidden="true" />
            Civic only <span className="count">{civicCount}</span>
          </Link>
          <Link className="chip" href="/feed">
            See them in the feed →
          </Link>
        </nav>

        <div className="cols">
          <div>
            {items.length ? (
              items.map((item) => <WireCard key={item.id} item={item} />)
            ) : (
              <p className="empty">No stories in this filter.</p>
            )}
            <p className="emergency">
              Emergency: call <a href="tel:919">919</a> / <a href="tel:911">911</a> — this app is not an
              emergency service.
            </p>
          </div>
          <aside>
            <SourcesPanel sources={wire.report.sources} />
            <HowItWorksPanel />
          </aside>
        </div>
      </main>
    </>
  );
}
