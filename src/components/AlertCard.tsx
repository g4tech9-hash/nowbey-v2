import type { Alert } from '@/lib/alerts';
import { categoryVars } from './WireCard';

function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits === '919' || digits === '911') return `tel:${digits}`;
  if (digits.length === 7) return `tel:+1242${digits}`;
  if (digits.length === 10 && digits.startsWith('242')) return `tel:+1${digits}`;
  return `tel:${digits}`;
}

/**
 * One public-safety / Marco's Alert card.
 *
 * Renders the structured fields the alerts engine extracts (name, age, gender,
 * residence, complexion, build, height, last-seen, dialable police numbers, and
 * official photo link or image) with high-urgency visual prominence.
 */
export function AlertCard({ item }: { item: Alert | any }) {
  const high = item.urgency === 'high';
  const isMarco = item.alertType === 'marco';
  const person = item.person || {};
  const lastSeen = item.lastSeen || {};
  const phones: string[] = Array.isArray(item.phones) && item.phones.length ? item.phones : ['919'];
  const photoUrl: string | null = item.photo || null;
  const isDirectImage = item.photoKind === 'image';

  const cardStyle = high
    ? ({ '--spine': 'var(--danger)' } as React.CSSProperties)
    : categoryVars(item.category || 'safety');

  return (
    <article className="card alert-card" data-marco={isMarco ? 'true' : undefined} style={cardStyle}>
      <div className="card-top">
        {isMarco ? (
          <span className="badge badge-marco">
            <span className="dot" style={{ background: 'currentColor' }} aria-hidden="true" />
            Marco&apos;s Alert
          </span>
        ) : (
          <span
            className="badge"
            style={{ '--spine': `var(--cat-${item.category || 'safety'})` } as React.CSSProperties}
          >
            <span className="dot" style={{ background: 'currentColor' }} aria-hidden="true" />
            {item.categoryLabel || 'Safety'}
          </span>
        )}
        <span
          className="badge"
          style={{ '--spine': high ? 'var(--danger)' : 'var(--warning)' } as React.CSSProperties}
        >
          {high ? 'High urgency' : 'Active advisory'}
        </span>
        {item.island ? <span className="badge badge-quiet">{item.island}</span> : null}
        <span>{item.source?.name || item.publisher}</span>
        <span aria-hidden="true">·</span>
        <span>{item.ageLabel}</span>
      </div>

      <h3 className="card-title">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title} ↗
          </a>
        ) : (
          item.title
        )}
      </h3>

      {item.summary ? <p className="card-summary">{item.summary}</p> : null}

      {person.name || person.age || person.gender || person.residence ? (
        <div className="person-strip">
          {person.name ? (
            <span className="person-field">
              <b>{person.name}</b>
              {person.age ? `, ${person.age}yrs` : null}
            </span>
          ) : null}
          {person.gender ? <span className="person-field">{person.gender}</span> : null}
          {person.residence ? (
            <span className="person-field">
              Area: <b>{person.residence}</b>
            </span>
          ) : null}
          {person.complexion ? (
            <span className="person-field">Complexion: {person.complexion}</span>
          ) : null}
          {person.build ? <span className="person-field">{person.build}</span> : null}
          {person.height ? <span className="person-field">Height: {person.height}</span> : null}
        </div>
      ) : null}

      {lastSeen.when || lastSeen.where ? (
        <div className="last-seen">
          <b>Last seen</b>{' '}
          <span>
            {lastSeen.when}
            {lastSeen.where ? `${lastSeen.when ? ' · ' : ''}@ ${lastSeen.where}` : null}
          </span>
        </div>
      ) : null}

      {photoUrl ? (
        isDirectImage ? (
          <div className="alert-photo">
            <a href={photoUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={photoUrl}
                alt={`Official flyer for ${person.name || 'missing person'}`}
                loading="lazy"
              />
            </a>
            <p className="photo-caption">Tap image to open full official flyer ↗</p>
          </div>
        ) : (
          <a
            className="alert-photo-link"
            href={photoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>
              <b>Official RBPF Missing Person Photo</b>
              <small>
                {/facebook\.com/i.test(photoUrl)
                  ? 'Opens official Royal Bahamas Police Force flyer on Facebook'
                  : photoUrl}
              </small>
            </span>
            <span className="alert-photo-cta">See Photo ↗</span>
          </a>
        )
      ) : null}

      <div className="card-foot">
        <span>{item.location || item.island || 'The Bahamas'}</span>
        <div className="phone-actions">
          {phones.map((p) => (
            <a key={p} className="phone-chip" href={telHref(p)}>
              Call {p === '919' || p === '911' ? `Police ${p}` : `CID ${p}`}
            </a>
          ))}
        </div>
      </div>

      <p className="disclosure">
        If seen, contact police immediately @ {item.contact || '919 or CID 502-9991 502-9992'}. NowBey is
        not an emergency service — in immediate danger dial 919 / 911.
      </p>
    </article>
  );
}
