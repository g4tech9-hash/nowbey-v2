import { categoryVars } from './WireCard';

/**
 * One public-safety / missing-person alert card.
 *
 * Renders the structured fields the alerts engine extracts (name, age, gender,
 * complexion, build, height, last-seen, contact, photo) plus an urgency badge
 * and a "if seen, call" action. Missing children and vulnerable people render
 * as high urgency.
 */
export function AlertCard({ item }: { item: any }) {
  const high = item.urgency === 'high';
  const hasPhoto = Boolean(item.photo);
  const person = item.person || {};
  const lastSeen = item.lastSeen || {};

  return (
    <article className="card" style={categoryVars(item.category || 'safety')}>
      <div className="card-top">
        <span
          className="badge"
          style={{ '--spine': `var(--cat-${item.category || 'safety'})` } as React.CSSProperties}
        >
          <span className="dot" style={{ background: 'currentColor' }} aria-hidden="true" />
          {item.categoryLabel || 'Safety'}
        </span>
        <span
          className="badge"
          style={{ '--spine': high ? 'var(--danger)' : 'var(--warning)' } as React.CSSProperties}
        >
          <span className="dot" style={{ background: 'currentColor' }} aria-hidden="true" />
          {high ? 'High urgency' : 'Standard'}
        </span>
        <span>{item.source.name}</span>
        <span aria-hidden="true">·</span>
        <span>{item.ageLabel}</span>
        {item.island ? <span className="badge badge-quiet">{item.island}</span> : null}
      </div>

      <h3 className="card-title">{item.title}</h3>

      {item.summary ? <p className="card-summary">{item.summary}</p> : null}

      {/* Person details strip */}
      {person.name || person.age || person.gender ? (
        <div className="person-strip">
          {person.name ? (
            <span className="person-field"><b>{person.name}</b>{person.age ? `, ${person.age}yrs` : null}</span>
          ) : null}
          {person.gender ? <span className="person-field">{person.gender}</span> : null}
          {person.complexion ? <span className="person-field">Complexion {person.complexion}</span> : null}
          {person.build ? <span className="person-field">Build {person.build}</span> : null}
          {person.height ? <span className="person-field">Height {person.height}</span> : null}
        </div>
      ) : null}

      {/* Last seen */}
      {lastSeen.when || lastSeen.where ? (
        <div className="last-seen">
          <b>Last seen:</b>{' '}
          {lastSeen.when}{lastSeen.where ? ` @ ${lastSeen.where}` : null}
        </div>
      ) : null}

      {/* Photo */}
      {hasPhoto ? (
        <div className="alert-photo">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <img src={item.photo} alt={`Photo of ${person.name || 'the missing person'}`} loading="lazy" />
            </a>
          ) : (
            <img src={item.photo} alt={`Photo of ${person.name || 'the missing person'}`} loading="lazy" />
          )}
          <p className="photo-caption">See photo — opens on Facebook</p>
        </div>
      ) : null}

      <div className="card-foot">
        <span>{item.location || item.island || 'Bahamas'}</span>
        <span>{item.contact ? `Contact: ${item.contact}` : 'Contact police @ 919'}</span>
      </div>

      <p className="disclosure">
        If seen, contact {item.contact ? item.contact : 'the police @ 919'}. This app is not an
        emergency service — in an emergency call 919 / 911.
      </p>
    </article>
  );
}
