"use client";

import { useState, useTransition } from "react";

/** Dismiss one crash group on the admin overview. */
export function CrashDismissButton({ id }: { id: number }) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <span className="text-[11px] text-[#6e97a0]">dismissed</span>;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/admin/errors", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          setDone(true);
        })
      }
      className="rounded-full border hairline px-2.5 py-1 text-[11px] font-bold text-[#8fb9b6] hover:bg-white/8 disabled:opacity-50"
    >
      {pending ? "…" : "Dismiss"}
    </button>
  );
}
