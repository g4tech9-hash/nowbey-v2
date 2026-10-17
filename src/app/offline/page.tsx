"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";

type Row = { id: string; title: string; category: string; parish: string | null; severity: number; createdAt: string };
type State = { status: "loading" | "ready" | "empty" | "error"; rows: Row[]; savedAt: string | null; fromCache: boolean };

/**
 * Shown when the browser cannot reach NowBey. It asks for the same public feed the map uses; the offline worker
 * answers from the last copy it kept. Titles are plain text here: report pages are not saved for offline use.
 */
export default function OfflinePage() {
  const [state, setState] = useState<State>({ status: "loading", rows: [], savedAt: null, fromCache: false });

  useEffect(() => {
    let alive = true;
    fetch("/api/incidents?status=active&limit=60", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("feed");
        const data = await res.json();
        const rows = (data.incidents ?? []) as Row[];
        if (!alive) return;
        setState({
          status: rows.length ? "ready" : "empty",
          rows,
          savedAt: res.headers.get("X-Saved-At"),
          fromCache: res.headers.get("X-Served-From") === "cache",
        });
      })
      .catch(() => {
        if (alive) setState((s) => ({ ...s, status: "error" }));
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      <div className="glass rounded-2xl p-4">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-tide-400">Offline</p>
        <h1 className="display mt-1 text-[22px] font-extrabold text-sand-100">NowBey cannot be reached right now</h1>
        {state.fromCache && state.savedAt ? (
          <p className="mt-2 text-[13px] text-sun-600">
            Showing the feed saved {timeAgo(state.savedAt)}. It will not include anything reported since then.
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-ink-300">
            Reports are not sent while you are offline. Your draft is kept on this device, so you can finish it when you are back.
          </p>
        )}
      </div>

      <section aria-labelledby="saved-feed" className="nb-surface rounded-xl2 p-3.5">
        <h2 id="saved-feed" className="display text-[15px] font-bold text-sand-100">
          Last saved reports
        </h2>
        {state.status === "loading" ? <p className="mt-2 text-[13px] text-ink-400">Checking for a saved copy…</p> : null}
        {state.status === "error" || state.status === "empty" ? (
          <p className="mt-2 text-[13px] text-ink-400">
            No saved reports on this device yet. Open NowBey once while you are online and they will be kept here.
          </p>
        ) : null}
        {state.rows.length ? (
          <ul className="mt-2 space-y-2">
            {state.rows.slice(0, 40).map((r) => {
              const meta = CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.notice;
              return (
                <li key={r.id} className="rounded-xl border hairline px-3 py-2.5">
                  <p className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>
                    {meta.label}
                    {r.parish ? <span className="text-ink-400"> · {r.parish}</span> : null}
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-sand-100">{r.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-400">Reported {timeAgo(r.createdAt)}</p>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
