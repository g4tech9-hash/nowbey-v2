import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteHeader } from '@/components/SiteHeader';
import { getWire } from '@/lib/wire';

export const metadata: Metadata = {
  title: 'NowBey · Stay Safe, Bahamas',
  description:
    'Know what is happening, island by island. Neighbour reports and civic news for The Bahamas.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const wire = await getWire();
  const civic = wire.items.filter((item) => item.civic);
  const lead = civic[0] ?? wire.items[0];

  return (
    <>
      <SiteHeader active="home" />
      <main className="page">
        <div className="page-head">
          <p className="eyebrow">Community safety for The Bahamas</p>
          <h1 className="page-title">
            Know what’s happening <em>on your island.</em>
          </h1>
          <p className="page-sub">
            Neighbour reports and local news, brought together in one clear map and one feed.
          </p>
        </div>

        <div className="chips" style={{ marginTop: 8 }}>
          <Link className="chip" href="/feed" data-active>
            Open the feed →
          </Link>
          <Link className="chip" href="/wire">
            Read the news wire
          </Link>
        </div>

        {lead ? (
          <section className="panel" style={{ marginTop: 18 }}>
            <h2>Leading the wire right now</h2>
            <div className="card" style={{ '--spine': `var(--cat-${lead.category})` } as React.CSSProperties}>
              <div className="card-top">
                <span className="badge" style={{ '--spine': `var(--cat-${lead.category})` } as React.CSSProperties}>
                  {lead.categoryLabel}
                </span>
                <span>{lead.publisher}</span>
                <span aria-hidden="true">·</span>
                <span>{lead.ageLabel}</span>
                {lead.island ? <span className="badge badge-quiet">{lead.island}</span> : null}
              </div>
              <h3 className="card-title">
                <a href={lead.url} target="_blank" rel="noopener noreferrer">
                  {lead.title} ↗
                </a>
              </h3>
              {lead.summary ? <p className="card-summary">{lead.summary}</p> : null}
            </div>
          </section>
        ) : null}

        <section className="panel">
          <h2>This build</h2>
          <p className="hint">
            <b>Stand-in app shell.</b> `/feed`, `/wire` and `/api/wire` are wired to the civic wire
            engine in <code>wire/</code>, running on the fixture corpus. The map and report flow are
            not part of this shell.
          </p>
          <p className="hint">
            {wire.items.length} stories on the wire, {civic.length} civic, {wire.report.totals.duplicatesRemoved}{" "}
            duplicates merged, {wire.report.totals.ok}/{wire.report.totals.sources} sources up.
          </p>
        </section>
      </main>
    </>
  );
}
