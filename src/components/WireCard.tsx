import type { WireItem } from '@/lib/wire';

export function categoryVars(category: string) {
  return { '--spine': `var(--cat-${category || 'notice'})` } as React.CSSProperties;
}

export function CategoryBadge({ category, label }: { category: string; label: string }) {
  return (
    <span className="badge" style={categoryVars(category)}>
      <span className="dot" style={{ background: 'currentColor' }} aria-hidden="true" />
      {label}
    </span>
  );
}

/** A wire story, rendered the way the news wire shows it. */
export function WireCard({ item }: { item: WireItem }) {
  return (
    <article className="card" style={categoryVars(item.category)}>
      <div className="card-top">
        <CategoryBadge category={item.category} label={item.categoryLabel} />
        {item.civic ? <span className="badge badge-civic">Civic</span> : null}
        <span>{item.publisher}</span>
        <span aria-hidden="true">·</span>
        <span>{item.ageLabel}</span>
        {item.island ? <span className="badge badge-quiet">{item.island}</span> : null}
        {item.corroboration > 0 ? (
          <span className="badge badge-quiet">+{item.corroboration} also reported</span>
        ) : null}
      </div>
      <h3 className="card-title">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {item.title} ↗
        </a>
      </h3>
      {item.summary ? <p className="card-summary">{item.summary}</p> : null}
      <div className="card-foot">
        <span>Published {item.ageLabel}</span>
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          Read at {item.publisher} ↗
        </a>
      </div>
      {item.signals?.length ? (
        <div className="signals">
          {item.signals.slice(0, 4).join(' · ')} · civic {item.civicScore.toFixed(2)}
        </div>
      ) : null}
    </article>
  );
}
