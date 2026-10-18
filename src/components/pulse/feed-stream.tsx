"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
import type { Badge } from "@/lib/badges";
import type { Engagement } from "@/lib/engage-kinds";
import { useListNav, useAnnouncer } from "@/lib/pulse/motion";
import { AriaAnnouncer, EndOfStream, ErrorBoundary, LiveDot, SkeletonSpotlight, SkeletonStream, useLiveMode } from "@/ui/pulse";
import { PulseIncidentCard, type PulseCardRow } from "./incident-card";
import { IncidentDetailDrawer } from "./detail-drawer";

/**
 * The feed stream: the middle pane, and the only place on the page that owns
 * interaction.
 *
 * Four things it has to get right, in order of how much they cost:
 *
 *  1. Keyboard wayfinding. ↑/↓ walk the cards, Enter opens the drawer, Esc
 *     closes it, and while the drawer is open the same arrows move through the
 *     stream — you can read the island without touching the mouse. The list is a
 *     real `<ul>` with focusable cards rather than a grid of links, so a screen
 *     reader announces position ("3 of 24") and the focus ring is the same one
 *     the pointer gets.
 *  2. Ambient updates. With live mode on, the stream polls the same endpoint
 *     every 25s. New signals merge at the top when you are already there, and
 *     wait behind a "N new" pill when you are not — never yanking a card out
 *     from under a thumb mid-scroll.
 *  3. Every state is a first-class render: skeleton while a filter is applied,
 *     empty with a way out, error with a retry, end-of-stream when the island
 *     genuinely has nothing more.
 *  4. One card crashing costs one card (ErrorBoundary per item).
 */

export type FeedRow = PulseCardRow;

type Engs = Record<string, Engagement>;
type Badges = Record<string, Badge | null>;
type Latest = Record<string, { kind: string; note: string | null; createdAt: string } | null>;

export function FeedStream({
  rows,
  total,
  handle,
  badges = {},
  engs = {},
  latest = {},
  stub = false,
  spotlight = false,
  emptyTitle = "Nothing filed under that yet",
  emptyBlurb = "Clear the filters, or be the first to report it — the pin takes about twenty seconds and neighbours see it immediately.",
  emptyActions,
}: {
  rows: FeedRow[];
  total: number;
  handle: string | null;
  badges?: Badges;
  engs?: Engs;
  latest?: Latest;
  stub?: boolean;
  spotlight?: boolean;
  emptyTitle?: string;
  emptyBlurb?: string;
  emptyActions?: React.ReactNode;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const { message, announce } = useAnnouncer();
  const live = useLiveMode();
  const [openId, setOpenId] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<FeedRow[]>([]);
  const [merged, setMerged] = useState<FeedRow[]>(rows);
  const [refreshing, setRefreshing] = useState(false);
  const seenIds = useRef<Set<string>>(new Set(rows.map((r) => r.id)));
  const atTop = useRef(true);

  // The server rows are the truth; anything this device pulled in during the
  // current visit is stacked above them until the next server render folds it in.
  useEffect(() => {
    seenIds.current = new Set(rows.map((r) => r.id));
    setMerged((prev) => {
      const arrivals = prev.filter((r) => !rows.some((n) => n.id === r.id));
      return [...arrivals, ...rows];
    });
    setIncoming([]);
  }, [rows]);

  const items = useMemo(() => merged.filter((r) => r && typeof r.id === "string"), [merged]);
  const openIndex = openId ? items.findIndex((r) => r.id === openId) : -1;
  const openRow = openIndex >= 0 ? items[openIndex] : null;

  const close = useCallback(() => {
    setOpenId(null);
    // The permalink is the shared artefact: closing the drawer gives the URL back.
    if (typeof window !== "undefined" && window.location.search.includes("open=")) {
      const next = new URLSearchParams(window.location.search);
      next.delete("open");
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${next.toString() ? `?${next}` : ""}`);
    }
  }, []);

  const open = useCallback(
    (row: FeedRow, index: number) => {
      setOpenId(row.id);
      const next = new URLSearchParams(sp.toString());
      next.set("open", row.id);
      window.history.replaceState(window.history.state, "", `${window.location.pathname}?${next.toString()}`);
      announce(`Opened ${row.title}. ${row.confirmations} neighbours confirm it. Arrow keys move through the feed, Escape closes.`);
      void index;
    },
    [announce, sp],
  );

  const nav = useListNav<HTMLUListElement>({
    count: items.length,
    idPrefix: "feed-item",
    onActivate: (i) => items[i] && open(items[i], i),
    onClose: () => setOpenId(null),
  });

  // Deep link support: /feed?open=<id> opens that report's drawer on load.
  useEffect(() => {
    const want = sp.get("open");
    if (want && items.some((r) => r.id === want)) setOpenId(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // While the drawer is open, keep ↑/↓ in the stream in sync with it.
  useEffect(() => {
    if (openIndex < 0) return;
    nav.setIndex(openIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex]);

  // Scroll position decides whether arrivals merge silently or queue up.
  useEffect(() => {
    const onScroll = () => {
      atTop.current = window.scrollY < 90;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filters = useMemo(
    () => ({
      status: sp.get("status") ?? "active",
      category: sp.get("category") ?? "",
      parish: sp.get("island") ?? sp.get("parish") ?? "",
      q: sp.get("q") ?? "",
    }),
    [sp],
  );

  useEffect(() => {
    if (!live || stub) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const qs = new URLSearchParams({ limit: "8", status: filters.status || "active" });
        if (filters.category) qs.set("category", filters.category);
        if (filters.parish) qs.set("parish", filters.parish);
        if (filters.q) qs.set("q", filters.q);
        const res = await fetch(`/api/incidents?${qs.toString()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const fresh: FeedRow[] = Array.isArray(data?.incidents) ? data.incidents : [];
        const news = fresh.filter((r) => r && r.id && !seenIds.current.has(r.id));
        if (!news.length) return;
        if (atTop.current) {
          setMerged((prev) => [...news, ...prev]);
          news.forEach((r) => seenIds.current.add(r.id));
          announce(`${news.length} new signal${news.length === 1 ? "" : "s"} on this filter.`);
        } else {
          setIncoming((prev) => [...news.filter((n) => !prev.some((p) => p.id === n.id)), ...prev]);
        }
      } catch {
        /* a dropped poll is not a user-facing error; the next tick retries */
      }
    };
    timer = setInterval(poll, 25_000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [live, stub, filters.status, filters.category, filters.parish, filters.q, announce]);

  // A filter change re-runs the server query; show skeletons, never a blank page.
  useEffect(() => {
    const key = sp.toString();
    setRefreshing(true);
    const t = setTimeout(() => setRefreshing(false), 260);
    return () => {
      clearTimeout(t);
      void key;
    };
  }, [sp]);

  const firstCritical = spotlight && items[0] ? (Number(items[0].severity) >= 4 || items[0].status === "active") && items[0].severity >= 3 : false;
  const jumpToTop = () => {
    setMerged((prev) => [...incoming, ...prev]);
    incoming.forEach((r) => seenIds.current.add(r.id));
    setIncoming([]);
    window.scrollTo({ top: 0, behavior: document.documentElement.dataset.motion === "off" ? "auto" : "smooth" });
  };

  return (
    <>
      <AriaAnnouncer message={message} />

      {incoming.length ? (
        <div className="pulse-new-signals">
          <button type="button" onClick={jumpToTop} className="nb-btn nb-btn-primary nb-btn-sm pulse-press">
            <ArrowDownToLine size={14} strokeWidth={2.4} aria-hidden />
            {incoming.length} new signal{incoming.length === 1 ? "" : "s"}
          </button>
        </div>
      ) : null}

      {live && !stub ? (
        <p className="mb-2.5 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-tertiary">
          <LiveDot />
          watching this filter · updates on its own
        </p>
      ) : null}

      {items.length === 0 && refreshing ? (
        <div aria-busy="true">
          <SkeletonSpotlight />
          <SkeletonStream count={4} />
        </div>
      ) : items.length === 0 ? (
        <div className="pulse-state">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-default bg-hover text-tertiary" aria-hidden>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M3 14h4l2 3h6l2-3h4M4.5 14 6 6h12l1.5 8" />
            </svg>
          </span>
          <h3 className="text-primary">{emptyTitle}</h3>
          <p>{emptyBlurb}</p>
          {emptyActions ? <div className="mt-1 flex flex-wrap justify-center gap-2">{emptyActions}</div> : null}
        </div>
      ) : (
        <>
        <p className="pulse-sr-only" id="feed-keys">
          Use the up and down arrow keys to move between reports, Enter to open one, Escape to close it. On a phone you
          can swipe a card right to confirm it is still there, or left for “saw it too”.
        </p>
        <ul
          ref={nav.containerRef}
          aria-describedby="feed-keys"
          className="pulse-stream-list"
          role="list"
          aria-label="Community reports"
          onKeyDown={(e) => {
            if (openId) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault();
              return;
            }
            nav.onKeyDown(e);
          }}
          data-refreshing={refreshing ? "true" : undefined}
        >
          {items.map((row, i) => (
            <ErrorBoundary key={row.id} label={`Report ${row.id.slice(0, 8)}`}>
              <PulseIncidentCard
                row={row}
                index={i}
                id={`feed-item-${i}`}
                active={nav.index === i}
                spotlight={spotlight && i === 0 && firstCritical}
                handle={handle}
                badge={badges[row.authorHandle ?? ""] ?? null}
                eng={engs[row.id]}
                latest={latest[row.id] ?? null}
                stub={stub}
                onOpen={(r) => open(r, i)}
                onFocusIndex={nav.setIndex}
              />
            </ErrorBoundary>
          ))}
        </ul>
        </>
      )}

      {items.length > 0 && total <= items.length ? (
        <EndOfStream count={items.length}>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="nb-btn nb-btn-secondary nb-btn-sm pulse-press"
              onClick={() => {
                router.refresh();
                announce("Re-checked the wire.");
              }}
            >
              Re-check the wire
            </button>
          </div>
        </EndOfStream>
      ) : null}

      {openRow ? (
        <IncidentDetailDrawer
          row={openRow}
          handle={handle}
          stub={stub}
          onClose={close}
          onNext={() => {
            const next = Math.min(items.length - 1, openIndex + 1);
            if (items[next]) open(items[next], next);
          }}
          onPrev={() => {
            const prev = Math.max(0, openIndex - 1);
            if (items[prev]) open(items[prev], prev);
          }}
        />
      ) : null}
    </>
  );
}
