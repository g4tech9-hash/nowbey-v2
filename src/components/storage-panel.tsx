"use client";

import { useState } from "react";

/**
 * The "clear it" half of a cookie page.
 *
 * A table telling people what is stored, with no way to act on it, is documentation pretending to be a
 * control. This clears every preference and draft on the device and leaves the sign-in alone, because that is
 * what someone is actually trying to do when they arrive here — not sign themselves out by accident.
 */
const KEEP = new Set(["nowbey_session", "__Host-nowbey_csrf", "nb_csrf"]);

export function StoragePanel() {
  const [note, setNote] = useState<string | null>(null);

  function clear() {
    let removed = 0;
    try {
      for (const key of Object.keys(localStorage)) {
        if (KEEP.has(key)) continue;
        localStorage.removeItem(key);
        removed += 1;
      }
      // Preferences live in localStorage, but a cookie written by an older build may still be around.
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.split("=")[0]?.trim();
        if (!name || KEEP.has(name)) continue;
        document.cookie = `${name}=; Max-Age=0; path=/`;
        removed += 1;
      }
      setNote(
        removed === 0
          ? "Nothing was stored beyond your sign-in, so there was nothing to clear."
          : `Cleared ${removed} item${removed === 1 ? "" : "s"}. Your sign-in is untouched. Reload to see the defaults.`,
      );
    } catch {
      setNote("This browser would not let the page clear its storage. You can clear it in your browser settings.");
    }
  }

  return (
    <div className="rounded-xl border hairline bg-white/[.03] p-3.5">
      <p className="text-[13px] font-bold text-sand-100">Clear everything except my sign-in</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">
        Removes your display choices, the device key and any half-written report from this browser. Read receipts and
        appearance go back to the defaults the next time the page loads.
      </p>
      <button type="button" onClick={clear} className="nb-btn nb-btn-secondary mt-3">
        Clear stored data
      </button>
      {note ? (
        <p role="status" className="mt-2 text-[12.5px] text-tide-300">
          {note}
        </p>
      ) : null}
    </div>
  );
}
