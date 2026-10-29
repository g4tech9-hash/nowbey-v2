import type { Metadata } from 'next';
import Link from 'next/link';

import { AlertCard } from '@/components/AlertCard';
import { AlertRelayForm } from '@/components/AlertRelayForm';
import { AlertsMonitor } from '@/components/AlertsMonitor';
import { AlertsHowItWorksPanel, ModeBanner, SourcesPanel } from '@/components/SideRail';
import { SiteHeader } from '@/components/SiteHeader';
import { getAlerts } from '@/lib/alerts';

export const metadata: Metadata = {
  title: "Alerts — Marco's Alert & missing persons",
  description:
    "Active Marco's Alerts and missing-person advisories across The Bahamas. If you see someone listed here, call 919 or CID 502-9991 / 502-9992.",
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
  const marcoCount = alerts.items.filter((item) => item.alertType === 'marco').length;

  const byIsland =
    island && island !== 'all'
      ? alerts.items.filter((i) => i.island?.toLowerCase() === island.toLowerCase())
      : alerts.items;
  const visibleItems =
    urgency && urgency !== 'all' ? byIsland.filter((i) => i.urgency === urgency) : byIsland;

  const islands = [
    ...new Set(alerts.items.map((i) => i.island).filter((x): x is string => Boolean(x))),
  ].sort();

  return (
    <>
      <SiteHeader active="alerts" />
      <main className="page">
        <div className="page-head">
          <p className="eyebrow">Public safety · Marco&apos;s Alert</p>
          <h1 className="page-title">Missing persons &amp; emergency alerts</h1>
          <p className="page-sub">
            {alerts.items.length} active alert{alerts.items.length === 1 ? '' : 's'} tracked (
            {marcoCount} Marco&apos;s Alert{marcoCount === 1 ? '' : 's'}). If you see someone
            listed here, call 919 or CID 502-9991 / 502-9992 immediately.
          </p>
        </div>

        <ModeBanner
          mode={alerts.mode}
          capturedAt={alerts.fixtureCapturedAt}
          envVar="ALERTS_MODE"
        />

        <div className="stat-row">
          <div className="stat" data-danger={highCount > 0 ? 'true' : undefined}>
            <b>{alerts.items.length}</b>
            <span>Active alerts</span>
          </div>
          <div className="stat" data-danger={highCount > 0 ? 'true' : undefined}>
            <b>{highCount}</b>
            <span>High urgency</span>
          </div>
          <div className="stat" data-civic="true">
            <b>
              {alerts.report.totals.ok}/{alerts.report.totals.sources}
            </b>
            <span>Sources up</span>
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
          <Link
            className="chip"
            href="/alerts?urgency=high"
            data-active={urgency === 'high'}
          >
            <span className="dot" style={{ background: 'var(--danger)' }} aria-hidden="true" />
            High urgency <span className="count">{highCount}</span>
          </Link>
          {islands.map((value) => (
            <Link
              key={value}
              className="chip"
              href={`/alerts?island=${encodeURIComponent(value)}`}
              data-active={island === value}
            >
              {value}{' '}
              <span className="count">
                {alerts.items.filter((i) => i.island === value).length}
              </span>
            </Link>
          ))}
        </nav>

        <div className="cols">
          <div>
            {visibleItems.length ? (
              visibleItems.map((item) => <AlertCard key={item.id} item={item} />)
            ) : (
              <p className="empty">No active alerts match this filter.</p>
            )}
            <p className="emergency">
              Emergency: call <a href="tel:919">919</a> / <a href="tel:911">911</a> — NowBey is not
              an emergency service.
            </p>
          </div>
          <aside>
            <AlertRelayForm />
            <SourcesPanel sources={alerts.report.sources} />
            <AlertsHowItWorksPanel />
          </aside>
        </div>
      </main>

      <AlertsMonitor intervalMs={60_000} />
    </>
  );
}
