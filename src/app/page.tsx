import type { Metadata } from 'next';
import Link from 'next/link';

import { AlertCard } from '@/components/AlertCard';
import { AlertsMonitor } from '@/components/AlertsMonitor';
import { SiteHeader } from '@/components/SiteHeader';
import { getAlerts } from '@/lib/alerts';
import { getWire } from '@/lib/wire';

export const metadata: Metadata = {
  title: 'NowBey · Stay Safe, Bahamas',
  description:
    "Know what is happening, island by island. Marco's Alerts, neighbour reports and civic news for The Bahamas.",
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [wire, alerts] = await Promise.all([getWire(), getAlerts()]);
  const civic = wire.items.filter((item) => item.civic);
  const lead = civic[0] ?? wire.items[0];
  const topAlert = alerts.items.find((item) => item.urgency === 'high') ?? alerts.items[0];

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
            Marco&apos;s Alerts, neighbour reports and local civic news, brought together in one
            clear feed.
          </p>
        </div>

        <div className="chips" style={{ marginTop: 8 }}>
          <Link className="chip" href="/feed" data-active>
            Open the feed →
          </Link>
          <Link className="chip" href="/alerts">
            <span className="dot" style={{ background: 'var(--danger)' }} aria-hidden="true" />
            Active alerts <span className="count">{alerts.items.length}</span>
          </Link>
          <Link className="chip" href="/wire">
            Read the news wire
          </Link>
        </div>

        {topAlert ? (
          <section className="panel alert-spotlight" style={{ marginTop: 18 }}>
            <div className="spotlight-head">
              <h2>Active Marco&apos;s Alert</h2>
              <Link href="/alerts" className="spotlight-link">
                All alerts ({alerts.items.length}) →
              </Link>
            </div>
            <AlertCard item={topAlert} />
          </section>
        ) : null}

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
          <h2>System status</h2>
          <p className="hint">
            <b>Live coverage.</b> <code>/alerts</code>, <code>/feed</code>, <code>/wire</code>,{' '}
            <code>/api/alerts</code> and <code>/api/wire</code> run on the civic wire and Marco&apos;s
            Alert engines in <code>wire/</code>.
          </p>
          <p className="hint">
            {alerts.items.length} active alert{alerts.items.length === 1 ? '' : 's'},{' '}
            {wire.items.length} stories on the wire ({civic.length} civic),{' '}
            {wire.report.totals.duplicatesRemoved} duplicates merged, {wire.report.totals.ok}/
            {wire.report.totals.sources} wire sources up.
          </p>
        </section>
      </main>

      <AlertsMonitor intervalMs={60_000} />
    </>
  );
}
