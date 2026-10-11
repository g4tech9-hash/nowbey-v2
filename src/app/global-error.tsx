"use client";

/** The last line of defence: used when even the page frame cannot be drawn, for example if the database is down. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#03121b",
          color: "#e8f6f4",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: "#2ee6d0", fontWeight: 700 }}>NowBey</p>
          <h1 style={{ margin: "10px 0 8px", fontSize: 28, color: "#f6ead8" }}>We hit a problem</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#a9cdc9" }}>
            NowBey could not load this page. Please try again in a moment. Reports and alerts are not affected.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 18, padding: "10px 20px", border: 0, borderRadius: 999, background: "#00c9b7", color: "#03121b", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
