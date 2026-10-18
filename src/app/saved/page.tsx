"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookmarkPlus, ExternalLink, Bell, Eraser } from "lucide-react";
import { CATEGORIES, timeAgo, type CategoryKey } from "@/lib/geo";
import { PageHead } from "@/components/app-shell";
import { useRecentlySeen, useWatchList, type SavedIncident } from "@/lib/pulse/saved";
import { trustFor } from "@/lib/pulse/trust";
import { AriaAnnouncer, CatBadge, CardLayered, FreshnessPill, SeverityTag, Skeleton, TrustMeter } from "@/ui/pulse";
import { useAnnouncer } from "@/lib/pulse/motion";

/**
 * WATCH LIST — the saved route.
 *
 * There is no `saved` table, and the brief forbids inventing a write path that
 * the server would then have to honour. So this is honest device-local state:
 * `localStorage`, synced across tabs, with a plain-words notice saying exactly
 * that. What it *is* worth having — a place to keep the three or four signals
 * you are personally waiting on through an outage — it does fully, including
 * live freshness, trust and a "you last looked at…" resume rail.
 *
 * If a real `saved` endpoint ever lands, this page is the only thing that has to
 * change: it reads one hook and writes through one function.
 */
export default function SavedPage() {
  const { rows, loaded, clear } = useWatchList();
  const seen = useRecentlySeen();
  const { announce, message } = useAnnouncer();
  const [now, setNow] = useState(() => Date.now());

  // Freshness is relative, so the page re-labels itself once a minute rather
  // than lying with a timestamp captured at load.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const byParish = group(rows);

  return (
    <>
      <AriaAnnouncer message={message} />
      <PageHead
        eyebrow="On this device"
        title="Your watch list"
        blurb="Reports you are waiting on. They live in this browser, not on a server — no account, nothing to leak, and it will not follow you to another phone."
        actions={
          <>
            <Link href="/alerts" className="nb-btn nb-btn-secondary nb-btn-sm">
              <Bell size={14} strokeWidth={2.4} aria-hidden />
              Get pinged instead
            </Link>
            {rows.length ? (
              <button
                type="button"
                className="nb-btn nb-btn-ghost nb-btn-sm"
                onClick={() => {
                  clear();
                  announce("Watch list cleared.");
                }}
              >
                <Eraser size={14} strokeWidth={2.4} aria-hidden />
                Clear list
              </button>
            ) : null}
          </>
        }
      />

      {!loaded ? (
        <div className="pulse-stream" aria-busy="true" aria-label="Loading your watch list">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} shape="block" width="100%" height={92} radius="var(--pulse-shape-md)" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="pulse-state">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-default bg-hover text-tertiary" aria-hidden>
            <BookmarkPlus size={18} strokeWidth={2.2} />
          </span>
          <h3 className="text-primary">Nothing on the list yet</h3>
          <p>
            Tap <span className="font-bold text-secondary">Watch</span> on any card in the feed and it appears here, with its
            freshness and its trust score. On a phone the same button lives in the swipe row.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Link href="/feed" className="nb-btn nb-btn-primary nb-btn-sm">
              Open the feed
            </Link>
            <Link href="/alerts" className="nb-btn nb-btn-secondary nb-btn-sm">
              Set up parish alerts
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="pulse-stream min-w-0">
            {Object.entries(byParish).map(([parish, list]) => (
              <section key={parish} aria-label={parish}>
                <h2 className="pulse-section-title">{parish}</h2>
                <ul className="pulse-stream-list">
                  {list.map((row) => (
                    <WatchRow key={row.id} row={row} now={now} onRemove={() => announce(`Removed “${row.title}” from your watch list.`)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside className="pulse-inspector">
            <CardLayered className="pulse-card-pad">
              <h2 className="text-[14px] font-extrabold tracking-[-0.03em] text-primary">Pick up where you stopped</h2>
              {seen.length ? (
                <ul className="mt-2 grid gap-1">
                  {seen.slice(0, 6).map((s) => (
                    <li key={s.id}>
                      <Link href={`/incident/${s.id}`} className="pulse-navtab pulse-navtab-static block min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-secondary">{s.title}</span>
                        <span className="block font-mono text-[11px] text-tertiary">{timeAgo(s.at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12.5px] text-tertiary">Nothing opened from this device yet.</p>
              )}
            </CardLayered>

            <p className="nb-hint">
              Clearing your browser data clears this list — that is the trade for it never touching a server.{" "}
              <Link href="/alerts" className="nb-link-arrow">
                Alerts are the durable version
              </Link>
              .
            </p>
          </aside>
        </div>
      )}
    </>
  );
}

function WatchRow({ row, now, onRemove }: { row: SavedIncident; now: number; onRemove: () => void }) {
  const { toggle } = useWatchList();
  const trust = trustFor({
    confirmations: row.confirmations,
    sourceKind: "resident",
    severity: row.severity,
    status: "active",
    updatedAt: row.savedAt,
    createdAt: row.createdAt,
    category: row.category,
  });
  void now;
  return (
    <li>
      <CardLayered category={row.category} spine interactive className="pulse-card-pad">
        <div className="flex flex-wrap items-center gap-2">
          <CatBadge category={row.category} size="sm" />
          <SeverityTag severity={row.severity} category={row.category} />
          <FreshnessPill freshness="watching" time={row.savedAt} />
          <Link href={`/incident/${row.id}`} className="pulse-mini-link ml-auto">
            <ExternalLink size={13} strokeWidth={2.4} aria-hidden />
            Open
          </Link>
        </div>
        <h3 className="pulse-card-title mt-1.5">
          <Link href={`/incident/${row.id}`}>{row.title}</Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-tertiary">
          <span>{row.street ?? CATEGORIES[row.category as CategoryKey]?.label ?? row.parish ?? "The Bahamas"}</span>
          <span className="font-mono">
            {row.confirmations} confirm{row.confirmations === 1 ? "" : "s"}
          </span>
          <TrustMeter value={trust.value} tier={trust.tier} compact label={`Trust ${trust.value} of 100`} />
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="nb-btn nb-btn-ghost nb-btn-sm"
            onClick={() => {
              toggle({ ...row });
              onRemove();
            }}
          >
            Stop watching
          </button>
          <span className="font-mono text-[11px] text-tertiary">saved {timeAgo(row.savedAt)}</span>
        </p>
      </CardLayered>
    </li>
  );
}

function group(rows: SavedIncident[]) {
  const out: Record<string, SavedIncident[]> = {};
  for (const r of rows) {
    const key = r.parish ?? "Elsewhere";
    (out[key] ??= []).push(r);
  }
  return out;
}
