import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AlertCard } from '@/components/AlertCard';
import { AlertsMonitor } from '@/components/AlertsMonitor';
import { HowItWorksPanel, ModeBanner, SourcesPanel } from '@/components/SideRail';
import { SiteHeader } from '@/components/SiteHeader';
import { getAlerts } from '@/lib/alerts';

export const metadata = {
  title: 'Alerts — missing persons and public safety',
  description:
    'Missing-person and public-safety alerts across The Bahamas. If you see someone listed here, call the number on the card or 919.',
};

export const dynamic = 'force-dynamic';

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ island?: string; urgency?: string }>;
}) {
  const { island, urgency } = await searchParams;
  const alerts = await getAlerts();

  const highCount = alerts.items.filter((item) => item.urgency === 'high').length;

  const items =
    island && island !== 'all'
      ? alerts.items.filter((i) => i.island?.toLowerCase() === island.toLowerCase())
      : alerts.items;
  const urgencyItems =
    urgency && urgency !== 'all'
      ? items.filter((i) => i.urgency === urgency)
      : items;

  // Distinct islands for the filter chips.
  const islands = [...new Set(alerts.items.map((i) => i.island).filter((x): x is string => Boolean(x)))].sort();

  return (
    <>
      <SiteHeader active="alerts" />
      <main className="page">
        <div className="page-head">
          <p className="eyebrow">Alerts</p>
          <h1 className="page-title">Missing persons &amp; public safety</h1>
          <p className="page-sub">
            {alerts.items.length} alert{alerts.items.length === 1 ? '' : 's'} tracked —{' '}
            {highCount} {highCount === 1 ? 'high urgency' : 'high urgency'}. If you see someone listed,
            call the number on the card or 919.
          </p>
        </div>

        <ModeBanner mode={alerts.mode} capturedAt={alerts.fixtureCapturedAt} />

        <div className="stat-row">
          <div className="stat">
            <b>{alerts.items.length}</b>
            <span>Alerts tracked</span>
          </div>
          <div className="stat" data-civic="true">
            <b>{highCount}</b>
            <span>High urgency</span>
          </div>
          <div className="stat">
            <b>{alerts.report.totals.ok}</b>
            <span>{alerts.report.totals.ok === 1 ? 'source up' : 'sources up'}</span>
          </div>
          <div className="stat">
            <b>{alerts.report.totals.duplicatesRemoved}</b>
            <span>Dupes merged</span>
          </div>
        </div>

        <nav className="chips" aria-label="Filter alerts">
          <Link className="chip" href="/alerts" data-active={!island && !urgency}>
            All <span className="count">{alerts.items.length}</span>
          </Link>
          {islands.map((value) => (
            <Link
              key={value}
              className="chip"
              href={`/alerts?island=${encodeURIComponent(value)}`}
              data-active={island === value}
            >
              {value} <span className="count">{alerts.items.filter((i) => i.island === value).length}</span>
            </Link>
          ))}
          <Link
            className="chip"
            href="/alerts?urgency=high"
            data-active={urgency === 'high'}
          >
            High urgency <span className="count">{highCount}</span>
          </Link>
        </nav>

        <div className="cols">
          <div>
            {urgencyItems.length ? (
              urgencyItems.map((item) => <AlertCard key={item.id} item={item} />)
            ) : (
              <p className="empty">No alerts in this filter.</p>
            )}
          <p className="emergency">
            Emergency: call <a href="tel:919">919</a> / <a href="tel:911">911</a> — this app is not an
            emergency service.
          </p>
          </div>
          <aside>
            <SourcesPanel sources={alerts.report.sources} />
            <HowItWorksPanel />
          </aside>
        </div>
      </main>

      {/* Headless client monitor: polls /api/alerts and refreshes when a new alert is issued. */}
      <AlertsMonitor intervalMs={60_000} />
    </>
  );
}
