'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

function previewFields(raw: string) {
  const healed = raw.replace(
    /(https?:\/\/[^\s]+?)\s*\r?\n\s*([./?&#=A-Za-z0-9_-][^\s]*)/g,
    '$1$2',
  );
  const header = healed.match(
    /([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s*\((Male|Female|M|F)\)\s*(\d{1,3})\s*(?:yrs?|years?)/i,
  );
  const residence = healed.match(
    /\b\d{1,3}\s*(?:yrs?|years?)\s+of\s+([^.\n]{3,90}?)(?:\.\s*|\s+Last\s+seen\b|$)/i,
  );
  const lastSeen = healed.match(/Last\s+seen\s+([^.\n]{3,110})/i);
  const photo = healed.match(/See\s+Photo\s*:\s*(https?:\/\/[^\s)<>"']+)/i);

  return {
    name: header ? header[1].trim() : null,
    gender: header ? header[2] : null,
    age: header ? header[3] : null,
    area: residence ? residence[1].trim() : null,
    lastSeen: lastSeen ? lastSeen[1].trim() : null,
    photo: photo ? photo[1].trim() : null,
  };
}

/**
 * Lets a neighbour or operator paste a Cell Broadcast Marco's Alert popup (or
 * OCR text copied from a screenshot) so it appears on /alerts and /feed right
 * away — closing the gap when mobile emergency broadcasts precede news RSS.
 */
export function AlertRelayForm() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const preview = useMemo(() => (text.trim().length > 15 ? previewFields(text) : null), [text]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    setStatus('submitting');
    setMessage('');

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(json.error || 'Could not publish alert.');
        return;
      }
      setStatus('saved');
      setMessage(
        `Published: ${json.item?.person?.name || json.item?.title || "Marco's Alert"} is now live on /alerts and /feed.`,
      );
      setText('');
      router.refresh();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Network error submitting alert.');
    }
  }

  return (
    <section className="panel relay-panel">
      <h2>Relay a Marco&apos;s Alert</h2>
      <p className="hint">
        Marco&apos;s Alerts arrive via BTC / ALIV mobile Cell Broadcast often hours before newspapers
        write an article. Paste the popup text (or screenshot OCR text) to publish it immediately.
      </p>
      <form onSubmit={handleSubmit} className="relay-form">
        <label htmlFor="marco-alert-text" className="sr-only">
          Marco&apos;s Alert text
        </label>
        <textarea
          id="marco-alert-text"
          rows={5}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status !== 'idle') setStatus('idle');
          }}
          placeholder="Example: Jane Doe (Female) 16yrs of Pinewood Gardens, New Providence. Last seen ... If seen contact police @ 919 or CID 502-9991: See Photo: https://..."
          className="relay-textarea"
        />

        {preview && (preview.name || preview.lastSeen || preview.photo) ? (
          <div className="relay-preview">
            <span className="relay-preview-label">Parsed preview</span>
            {preview.name ? (
              <div>
                <b>{preview.name}</b>
                {preview.age ? `, ${preview.age}yrs` : ''}
                {preview.gender ? ` (${preview.gender})` : ''}
              </div>
            ) : null}
            {preview.area ? <div>Area: {preview.area}</div> : null}
            {preview.lastSeen ? <div>Last seen: {preview.lastSeen}</div> : null}
            {preview.photo ? <div>Photo link detected ✓</div> : null}
          </div>
        ) : null}

        <button
          type="submit"
          className="relay-submit"
          disabled={status === 'submitting' || text.trim().length < 24}
        >
          {status === 'submitting' ? 'Publishing…' : "Publish Marco's Alert"}
        </button>

        {message ? (
          <p className="relay-feedback" data-error={status === 'error' ? 'true' : undefined}>
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
