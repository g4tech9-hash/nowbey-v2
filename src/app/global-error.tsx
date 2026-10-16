"use client";

import { useEffect } from "react";

/** The last line of defence: used when even the page frame cannot be drawn, for example if the database is down. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const message = `${error?.message || "Global error boundary"}${error?.digest ? ` (digest ${error.digest})` : ""}`;
    // A full-tree crash may also break sendBeacon's host page after this; best effort only.
    import("@/components/error-reporter")
      .then(({ reportClientError }) => reportClientError({ kind: "boundary", message, stack: error?.stack }))
      .catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--color-panel)",
          color: "var(--color-cyan)",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: "var(--color-cyan)", fontWeight: 700 }}>NowBey</p>
          <h1 style={{ margin: "10px 0 8px", fontSize: 28, color: "var(--color-ink)" }}>We hit a problem</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--color-ink-200)" }}>
            NowBey could not load this page. Please try again in a moment. Reports and alerts are not affected.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 18, padding: "10px 20px", border: 0, borderRadius: 999, background: "var(--color-brand)", color: "var(--color-panel)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
