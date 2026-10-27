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
        act on? Closures, interruptions, outages, marine warnings and official notices clear the
        bar.
      </p>
      <p className="hint">
        Court, politics, sport and lifestyle stories stay on the wire. At most two in five feed
        cards are newsroom stories, and only one per category, so neighbours still lead.
      </p>
    </section>
  );
}

export function ModeBanner({ mode, capturedAt }: { mode: string; capturedAt?: string }) {
  if (mode === 'live') {
    return (
      <div className="banner">
        <b>Live sources.</b> Fetching the Bahamian outlets on each revalidation.
      </div>
    );
  }
  return (
    <div className="banner">
      <b>Fixture corpus.</b> Replaying the wire captured {capturedAt ? new Date(capturedAt).toUTCString() : 'earlier'} —
      timestamps are rebased to now so the ranking reads true. Set <code>WIRE_MODE=live</code> in{' '}
      <code>.env.local</code> to fetch the real feeds.
    </div>
  );
}
