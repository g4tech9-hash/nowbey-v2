/**
 * ============================================================================
 *  STAGING FILE — DO NOT APPLY WITHOUT APPROVAL
 * ============================================================================
 *  Replaces:  src/components/incident-actions.tsx
 *  Audit ref: BUG-04 (async results are never announced to screen readers)
 *
 *  WHAT WAS BROKEN
 *  ---------------
 *  `incident-actions.tsx` is the single most-used interactive component in the
 *  product — "Still there", "Saw it too", "Cleared up", "Getting worse" — and
 *  it already handles busy state and errors correctly. But the line that shows
 *  the outcome is a plain <p>:
 *
 *      {note ? <p className="text-[11.5px] text-sun-600">{note}</p> : null}
 *
 *  A sighted user sees "Still there" or "Could not reach the wire". A
 *  screen-reader user hears nothing: the text is injected after the fact with
 *  no live region, so there is no announcement and no way to tell a success
 *  from a failure. This affects 26 of the 33 client components that fetch —
 *  the pattern is copy-pasted across the app.
 *
 *  WHAT THIS DOES
 *  --------------
 *  Three changes, nothing else:
 *    1. The status line becomes a polite live region, so a screen reader
 *       announces it when it appears.
 *    2. Errors additionally get role="alert" (assertive) so a failure is
 *       never missed, and switch colour by outcome rather than always amber.
 *    3. The busy state is exposed with aria-busy on the wrapper, and the
 *       buttons carry an aria-label that names the pending action, so the
 *       count change is not the only signal.
 *
 *  No behaviour, state, API call or route changes.
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  confirmations: number;
  status: string;
  handle?: string | null;
  compact?: boolean;
};

export function IncidentActions({ id, confirmations, status, handle, compact = false }: Props) {
  const router = useRouter();
  const [n, setN] = useState(confirmations);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);

  async function send(kind: string, extra: Record<string, unknown> = {}) {
    setBusy(kind);
    setNote(null);
    try {
      const res = await fetch(`/api/incidents/${id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, authorHandle: handle ?? "neighbour", ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reach the wire");
      setN(data.incident?.confirmations ?? n);
      setNote({ text: data.message ?? "Saved.", ok: true });
      router.refresh();
    } catch (err) {
      setNote({ text: err instanceof Error ? err.message : "Something went wrong.", ok: false });
    } finally {
      setBusy(null);
    }
  }

  // Names for the pending state, so the disabled buttons say what is happening.
  const PENDING: Record<string, string> = {
    confirm: "Confirming this is still there",
    photo: "Sending your note",
    clear: "Marking this cleared up",
    escalate: "Reporting that it is getting worse",
  };

  return (
    // aria-busy tells assistive tech that the group is mid-request, and the
    // live region below is inside it so the announcement is not orphaned.
    <div className="space-y-1.5" aria-busy={busy !== null}>
      <div className={`flex flex-wrap gap-1.5 ${compact ? "text-[11.5px]" : "text-[12px]"}`}>
        <button
          type="button"
          onClick={() => send("confirm")}
          disabled={busy !== null}
          aria-label={busy === "confirm" ? PENDING.confirm : undefined}
          className="rounded-full bg-tide-500/15 px-2.5 py-1 font-bold text-tide-300 ring-1 ring-tide-400/35 hover:bg-tide-500 hover:text-on-accent disabled:opacity-50"
        >
          {busy === "confirm" ? "Saving…" : `Still there · ${n}`}
        </button>
        <button
          type="button"
          onClick={() => send("photo", { note: "I saw it too." })}
          disabled={busy !== null}
          aria-label={busy === "photo" ? PENDING.photo : undefined}
          className="rounded-full bg-white/8 px-2.5 py-1 font-bold text-ink-200 hover:bg-white/16 disabled:opacity-50"
        >
          {busy === "photo" ? "Saving…" : "Saw it too"}
        </button>
        {status === "active" ? (
          <button
            type="button"
            onClick={() => send("clear")}
            disabled={busy !== null}
            aria-label={busy === "clear" ? PENDING.clear : undefined}
            className="rounded-full bg-white/8 px-2.5 py-1 font-bold text-ink-200 hover:bg-white/16 disabled:opacity-50"
          >
            {busy === "clear" ? "Saving…" : "Cleared up"}
          </button>
        ) : null}
        {status === "active" ? (
          <button
            type="button"
            onClick={() => send("escalate")}
            disabled={busy !== null}
            aria-label={busy === "escalate" ? PENDING.escalate : undefined}
            className="rounded-full bg-danger-500/15 px-2.5 py-1 font-bold text-danger-500 hover:bg-conch-500/28 disabled:opacity-50"
          >
            {busy === "escalate" ? "Saving…" : "Getting worse"}
          </button>
        ) : null}
      </div>

      {/*
        The fix: a polite live region for every outcome, plus role="alert" on
        failures so an error interrupts. Colour now follows the outcome instead
        of always reading as a warning.
      */}
      {note ? (
        <p
          role={note.ok ? "status" : "alert"}
          aria-live={note.ok ? "polite" : "assertive"}
          className={`text-[11.5px] ${note.ok ? "text-tide-300" : "text-danger-500"}`}
        >
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
