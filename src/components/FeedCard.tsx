import { AlertCard } from './AlertCard';
import { CategoryBadge, categoryVars } from './WireCard';

/**
 * One card in the community feed.
 *
 * Three shapes share the frame: a high-urgency Marco's / public-safety alert,
 * a neighbour report (confirm / saw it / cleared) and a wire story (source chip,
 * "Read at …", no confirmation bar).
 */
export function FeedCard({ item }: { item: any }) {
  if (item.kind === 'alert') return <AlertCard item={item} />;
  if (item.kind === 'wire') return <WireInFeed item={item} />;
  return <ReportCard item={item} />;
}

function WireInFeed({ item }: { item: any }) {
  return (
    <article className="card" style={categoryVars(item.category)}>
      <div className="card-top">
        <CategoryBadge category={item.category} label={item.categoryLabel} />
        <span className="badge badge-quiet">Newsroom</span>
        {item.island ? <span className="badge badge-quiet">{item.island}</span> : null}
        <span>{item.source.name}</span>
        <span aria-hidden="true">·</span>
        <span>{item.ageLabel}</span>
      </div>
      <h3 className="card-title">
        <a href={item.source.url} target="_blank" rel="noopener noreferrer">
          {item.title} ↗
        </a>
      </h3>
      {item.summary ? <p className="card-summary">{item.summary}</p> : null}
      <div className="card-foot">
        <span>{item.ageLabel}</span>
        <a href={item.source.url} target="_blank" rel="noopener noreferrer">
          {item.cta.label} ↗
        </a>
      </div>
      <p className="disclosure">{item.disclosure}</p>
    </article>
  );
}

function ReportCard({ item }: { item: any }) {
  const statusLabel =
    item.status === 'confirmed' ? 'Confirmed by neighbours' : item.status === 'cleared' ? 'Cleared' : 'Open';
  return (
    <article className="card" style={categoryVars(item.category)}>
      <div className="card-top">
        <CategoryBadge category={item.category} label={item.categoryLabel} />
        <span className="badge badge-quiet">{statusLabel}</span>
        {item.island ? <span className="badge badge-quiet">{item.island}</span> : null}
        <span>{item.author}</span>
        <span aria-hidden="true">·</span>
        <span>{item.ageLabel}</span>
      </div>
      <h3 className="card-title">{item.title}</h3>
      <p className="card-summary">{item.summary}</p>
      <div className="card-foot">
        <span>
          {item.location} · {item.confirmations} confirmation{item.confirmations === 1 ? '' : 's'}
        </span>
        <span>Confirm · Saw it too · Cleared</span>
      </div>
      <p className="disclosure">Sample report — demo data, not a real neighbour filing.</p>
    </article>
  );
}
