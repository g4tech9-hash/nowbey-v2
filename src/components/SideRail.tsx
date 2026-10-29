export function SourcesPanel({
  sources,
}: {
  sources: Array<{
    id: string;
    name: string;
    kind?: string;
    ok: boolean;
    items: number;
    error: string | null;
  }>;
}) {
  return (
    <section className="panel">
      <h2>Where stories come from</h2>
      {sources
        .filter((source) => source.kind !== 'google-news' || source.items > 0 || !source.ok)
        .map((source) => (
          <div className="source-row" key={source.id} data-down={!source.ok}>
            <span className="name" title={source.name}>
              {source.name}
            </span>
            <span className="value">{source.ok ? `${source.items} items` : 'down'}</span>
          </div>
        ))}
      {!sources.length ? <p className="hint">No sources configured.</p> : null}
    </section>
  );
}

export function HowItWorksPanel() {
  return (
    <section className="panel">
      <h2>How a story reaches the feed</h2>
      <p className="hint">
        Every headline is scored for <b>civic value</b> — is it service information a neighbour can
        act on? Closures, interruptions, outages, marine warnings, official notices and active{' '}
        <b>Marco&apos;s Alerts</b> clear the bar.
      </p>
      <p className="hint">
        Active Marco&apos;s Alerts pin at the top of the feed. Court, politics, sport and lifestyle
        stories stay on the wire.
      </p>
    </section>
  );
}

export function AlertsHowItWorksPanel() {
  return (
    <section className="panel">
      <h2>How Marco&apos;s Alerts are caught</h2>
      <p className="hint">
        <b>1. Cell Broadcast &amp; RBPF bulletins:</b> Marco&apos;s Alerts broadcast on BTC / ALIV
        mobile networks and RBPF Facebook flyers are ingested directly via{' '}
        <code>wire/bulletins.json</code> and <code>POST /api/alerts</code> (paste above or connect a
        phone shortcut).
      </p>
      <p className="hint">
        <b>2. Live Bahamian newsrooms:</b> Tribune242, The Nassau Guardian, Our News, ZNS Bahamas,
        Bahamas Press and scoped Google News queries are polled and filtered for missing-person
        notices, then merged by name + island so duplicates collapse.
      </p>
    </section>
  );
}

export function ModeBanner({
  mode,
  capturedAt,
  envVar = 'WIRE_MODE',
}: {
  mode: string;
  capturedAt?: string;
  envVar?: string;
}) {
  if (mode === 'live') {
    return (
      <div className="banner" data-live="true">
        <b>Live sources.</b> Polling official Marco&apos;s Alert bulletins and Bahamian newsrooms on
        each revalidation.
      </div>
    );
  }
  return (
    <div className="banner">
      <b>Active bulletins + offline feed corpus.</b> Live Marco&apos;s Alert bulletins are active;
      RSS outlets are replaying the snapshot captured{' '}
      {capturedAt ? new Date(capturedAt).toUTCString() : 'earlier'}. Set{' '}
      <code>{envVar}=live</code> in <code>.env.local</code> (enabled automatically on Vercel) to
      poll live RSS feeds.
    </div>
  );
}
