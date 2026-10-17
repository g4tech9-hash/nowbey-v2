"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/components/error-reporter";

/** Shown when a page hits an unexpected problem, so people see something kind instead of a bare error. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? "", error.message);
    reportClientError({
      kind: "boundary",
      // Next's digest ties this row to the matching line in the server logs.
      message: `${error.message || "Page error boundary"}${error.digest ? ` (digest ${error.digest})` : ""}`,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-[520px] py-14 text-center">
      <h1 className="display text-[28px] font-extrabold text-sand-100">Something went wrong on our side</h1>
      <p className="mx-auto mt-2 max-w-[44ch] text-[13.5px] leading-relaxed text-ink-300">
        That page hit a problem. It is not you. Try again, and if it keeps happening please come back in a few minutes.
      </p>
      {error.digest ? <p className="mt-2 text-[11.5px] text-ink-400">Reference: {error.digest}</p> : null}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950">
          Try again
        </button>
        <Link href="/" className="rounded-full border hairline px-4 py-2 text-[13px] font-bold hover:bg-white/5">
          Back to the feed
        </Link>
      </div>
    </div>
  );
}
