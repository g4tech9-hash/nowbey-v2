/**
 * ============================================================================
 *  STAGING FILE — DO NOT APPLY WITHOUT APPROVAL
 * ============================================================================
 *  Replaces:  src/components/admin-errors.tsx
 *  Audit ref: BUG-05 (the only fetching component with no error handling)
 *
 *  WHAT WAS BROKEN
 *  ---------------
 *  CrashDismissButton awaits the DELETE and then unconditionally reports
 *  success:
 *
 *      await fetch("/api/admin/errors", { method: "DELETE", ... });
 *      setDone(true);
 *
 *  If the request fails — 403, 500, a dropped connection, a rate limit — the
 *  button still flips to "dismissed" and the crash group is still on the list.
 *  The admin is told it worked when it did not, on a screen whose whole job is
 *  telling the truth about errors. `fetch` only rejects on a network failure,
 *  so even a clean 500 sails straight past this code.
 *
 *  It is also the one component in the audit with no `catch` at all.
 *
 *  WHAT THIS DOES
 *  --------------
 *  Checks res.ok, surfaces the server's own message, keeps the button live on
 *  failure so it can be retried, and announces the outcome with role="alert".
 *  No API change, no route change.
 * ============================================================================
 */

"use client";

import { useState, useTransition } from "react";

/** Dismiss one crash group on the admin overview. */
export function CrashDismissButton({ id }: { id: number }) {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) return <span className="text-[11.5px] text-tertiary">dismissed</span>;

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setFailed(null);
            try {
              const res = await fetch("/api/admin/errors", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
              });
              // fetch() resolves on a 4xx/5xx too, so the status has to be read.
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                  typeof data.error === "string" ? data.error : `Could not dismiss (${res.status}).`,
                );
              }
              setDone(true);
            } catch (err) {
              // Stay on screen and stay clickable: the group is still there.
              setFailed(err instanceof Error ? err.message : "Could not dismiss that.");
            }
          })
        }
        className="rounded-full border hairline px-2.5 py-1 text-[11.5px] font-bold text-tertiary hover:bg-white/8 disabled:opacity-50"
      >
        {pending ? "…" : "Dismiss"}
      </button>
      {failed ? (
        <span role="alert" className="text-[11.5px] font-semibold text-danger-500">
          {failed}
        </span>
      ) : null}
    </span>
  );
}
