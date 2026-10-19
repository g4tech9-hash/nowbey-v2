"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPanel, type MapPin, type PickResult } from "@/components/map/map-panel";
import { useIsMobile } from "@/lib/use-is-mobile";
import { pulseCategoryMeta } from "@/ui/pulse/glyph";
import { EmergencyNotice } from "@/components/emergency-notice";
import { trackFunnel } from "@/lib/funnel-client";
import { CATEGORIES, PARISHES, timeAgo, type CategoryKey } from "@/lib/geo";
import { getFreshness } from "@/lib/freshness";

type Row = {
  id: string;
  title: string;
  details: string | null;
  category: CategoryKey;
  severity: number;
  lat: number;
  lng: number;
  street: string | null;
  address: string | null;
  parish: string | null;
  status: string;
  confirmations: number;
  createdAt: string;
  updatedAt: string;
  accuracyMeters: number | null;
  sourceKind: string;
};

type WireRow = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  parish: string | null;
  lat: number | null;
  lng: number | null;
  publishedAt: string;
  category: CategoryKey;
};

export const dynamic = "force-dynamic";

/**
 * Phone view modes. Desktop ignores this and always shows the map beside the rail.
 *  - split: a short map plus the pin list under it (the phone default, so the list is above the fold)
 *  - map:   the map takes the room and the list is out of the way
 *  - list:  the list takes the room and the map is out of the way
 */
type PhoneMode = "split" | "map" | "list";

/** The three phone layouts, in the order they appear in the switch. */
const PHONE_MODES: { key: PhoneMode; label: string }[] = [
  { key: "map", label: "Map" },
  { key: "split", label: "Both" },
  { key: "list", label: "List" },
];

const EMPTY_FORM = {
  title: "",
  details: "",
  category: "flood" as CategoryKey,
  severity: 2,
  area: "",
  anonymous: false,
};

export default function MapWorkspace() {
  const params = useSearchParams();
  const focus = params.get("focus");

  const [rows, setRows] = useState<Row[]>([]);
  const [wire, setWire] = useState<WireRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The category filter lives in the URL (?category=) so a filtered view can be shared, reloaded or bookmarked.
  const [filter, setFilter] = useState<CategoryKey | "all">(() => {
    const c = params.get("category");
    return c && Object.prototype.hasOwnProperty.call(CATEGORIES, c) ? (c as CategoryKey) : "all";
  });
  const [island, setIsland] = useState<string>(() => {
    const p = params.get("parish");
    return p && (PARISHES as readonly string[]).includes(p) ? p : "all";
  });
  const [showWire, setShowWire] = useState(true);
  // Stale (>72h) pins are excluded from the default map so it shows what is true now.
  const [showStale, setShowStale] = useState(false);
  const [selected, setSelected] = useState<string | null>(focus);
  const [pickMode, setPickMode] = useState(false);
  const [pick, setPick] = useState<PickResult | null>(null);
  const [step, setStep] = useState<"spot" | "details">("spot");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ id: string; title: string } | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [mode, setMode] = useState<PhoneMode>("split");
  // The rail renders a page of rows at a time. With ~160 pins open, mounting
  // every row made the list (and the page, before the workspace was bounded)
  // run for screens; "Show more" grows it in place inside the rail's scroll box.
  const [listLimit, setListLimit] = useState(40);
  // The island/wire extras start folded on a phone (they are one tap away) so the list gets the room.
  const [moreFilters, setMoreFilters] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    void fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setHandle(d?.user?.handle ?? null))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch("/api/incidents?limit=160&status=all", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/news?limit=40", { cache: "no-store" }).then((r) => r.json()),
      ]);
      // A 500 with a JSON error body is a failure, not an empty island: say so
      // (with a retry) instead of "No pins match those filters."
      if (a?.error) throw new Error(a.error);
      setError(null);
      setRows((a.incidents ?? []) as Row[]);
      setWire(((b.items ?? []) as WireRow[]).filter((n) => n.lat != null && n.lng != null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the map feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The loader only sets state after its network calls finish, never synchronously, so this is safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // Poll only while the tab is visible; refresh once when it comes back into view.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Keep the URL in step with the filter without adding history entries.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (filter === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", filter);
    if (url.href !== window.location.href) window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [filter]);

  // Adoption count: one visit to the map per page load (no visitor identifier is sent).
  useEffect(() => {
    trackFunnel("visit_map");
  }, []);

  // The map calls this whenever the pin moves, and again when the street lookup comes back.
  function handlePick(p: PickResult) {
    setPick(p);
    if (p.street || p.parish) setForm((f) => ({ ...f, area: p.street ? `${p.street}${p.parish ? `, ${p.parish}` : ""}` : f.area }));
  }

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filter === "all" || r.category === filter) &&
          (island === "all" || r.parish === island) &&
          r.status !== "archived" &&
          r.status !== "unfounded" &&
          (showStale || r.status === "resolved" || !getFreshness(r.updatedAt ?? r.createdAt, "report").isStale),
      ),
    [rows, filter, island, showStale],
  );

  // The rail's first row is the single Tab stop (arrow keys move through the rest). The selected pin takes that role.
  const railStop = Math.max(0, visible.slice(0, listLimit).findIndex((r) => r.id === selected));
  // Changing a filter re-frames the map on what is now listed.
  const fitKey = `${filter}|${island}`;
  const fitPoints = useMemo(() => visible.map((r) => [r.lat, r.lng] as [number, number]), [visible]);

  function railKeys(e: ReactKeyboardEvent<HTMLUListElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-pin-row]"));
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? Math.min(items.length - 1, at + 1) : Math.max(0, at - 1);
    items[next]?.focus();
  }

  const pins: MapPin[] = useMemo(
    () =>
      visible.map((r) => ({
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        category: r.category,
        title: r.title,
        meta: `${r.confirmations} confirm${r.confirmations === 1 ? "" : "s"} · ${timeAgo(r.createdAt)} · ${r.street ?? "no street"}`,
        status: r.status,
        href: `/incident/${r.id}`,
        live: r.status === "active" && r.severity >= 3,
      })),
    [visible],
  );

  const wirePins: MapPin[] = useMemo(
    () =>
      showWire
        ? wire.map((n) => ({
            id: `wire-${n.id}`,
            lat: n.lat as number,
            lng: n.lng as number,
            category: n.category ?? "notice",
            title: n.title,
            meta: `${n.sourceName} · ${timeAgo(n.publishedAt)}`,
            href: `/wire/${n.id}`,
            hrefLabel: "Read and discuss",
          }))
        : [],
    [wire, showWire],
  );

  // The pin the user tapped last (in the list or on the map), shown as a one-line card above the list.
  const current = rows.find((r) => r.id === selected) ?? null;

  // Island pulse: which categories are loudest right now (top 4, plus the open total).
  const pulse = useMemo(() => {
    const counts = new Map<CategoryKey, number>();
    for (const r of rows) {
      if (r.status === "archived") continue;
      counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const max = top.length ? top[0][1] : 1;
    return { top, max, open: rows.filter((r) => r.status !== "archived").length };
  }, [rows]);

  const openDetails = () => setStep("details");

  async function submit() {
    if (!pick) return;
    setSaving(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          details: form.details,
          category: form.category,
          severity: form.severity,
          lat: pick.lat,
          lng: pick.lng,
          accuracyMeters: pick.precisionM,
          street: form.area || pick.street || null,
          address: pick.address ?? form.area ?? null,
          parish: pick.parish ?? (island !== "all" ? island : "New Providence"),
          anonymous: form.anonymous,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The wire rejected that report.");
      setDone({ id: data.incident.id, title: data.incident.title });
      setPickMode(false);
      setPick(null);
      setStep("spot");
      setForm(EMPTY_FORM);
      setMode("split");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that report.");
    } finally {
      setSaving(false);
    }
  }

  function startPinning() {
    setPickMode(true);
    setStep("spot");
    setDone(null);
    // Pinning needs the map and its full chrome, whatever the list was showing.
    setMode((m) => (m === "list" ? "split" : m));
  }

  function cancelPinning() {
    setPickMode(false);
    setPick(null);
    setStep("spot");
  }

  // Pinning needs the map in view: never leave the user in list-only while placing the pin.
  const view: PhoneMode = pickMode && mode === "list" ? "split" : mode;
  // A short map drops its search box, layer pills and pegman — at 130–260px tall they would
  // leave no map at all. The full-size map (and every desktop map) keeps all of them.
  const compactMap = isMobile && !pickMode && view !== "map";

  return (
    // Phones/tablets: .nb-fill-view is exactly viewport-minus-chrome tall (header, page padding
    // and the fixed bottom nav), so the map and the pin list stack in flow and neither ends up
    // behind the nav. The map is deliberately short in "split" mode, which is what puts the first
    // rows of the pin list above the fold. Desktop keeps the two-column layout and ignores the
    // phone modes entirely.
    <div className="nb-fill-view nb-map-workspace gap-2.5 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-stretch lg:gap-4">
      {/* The map */}
      <div className={`relative flex min-h-0 min-w-0 flex-col lg:h-full lg:order-2 ${view === "list" ? "hidden lg:flex" : ""}`}>
        <div className="mb-2.5 hidden flex-wrap items-end justify-between gap-2 lg:flex">
          <div>
            <p className="nb-eyebrow">Safety map</p>
            <h1 className="display mt-1.5 text-[clamp(1.45rem,3.4vw,2rem)] font-extrabold leading-[1.06] tracking-[-0.055em] text-primary">
              What is happening, street by street
            </h1>
          </div>
          <p className="max-w-[46ch] text-[12px] leading-[1.75] text-tertiary">
            Tap a pin to read the report, or <span className="font-bold text-text-accent">Report a hazard</span> to add your own.
            Drag the yellow figure onto a road for street level.
          </p>
        </div>
        <div
          className={`relative min-h-0 overflow-hidden lg:flex-1 ${
            pickMode || view === "map" ? "flex-1" : "nb-map-split flex-none lg:flex-1"
          }`}
        >
          <MapPanel
            mode={pickMode ? "pick" : "browse"}
            compact={compactMap}
            pins={[...pins, ...wirePins]}
            value={pick ? { lat: pick.lat, lng: pick.lng } : null}
            onChange={handlePick}
            center={[25.0629, -77.3417]}
            zoom={14}
            initialLayer="hybrid"
            focusId={selected}
            focusNonce={focusNonce}
            fitKey={fitKey}
            fitPoints={fitPoints}
            className="h-full w-full rounded-2xl"
          />
          {pickMode || view !== "map" ? null : (
            <button
              type="button"
              onClick={startPinning}
              className="nb-btn nb-btn-primary absolute bottom-3 left-1/2 z-[500] min-h-[44px] -translate-x-1/2 shadow-l3 lg:hidden"
            >
              + Report a hazard
            </button>
          )}
        </div>
      </div>

      {/* What the phone shows: the map, the list, or both. Never on desktop — there everything fits. */}
      <div className={`flex-none items-center gap-2 lg:hidden ${pickMode ? "hidden" : "flex"}`}>
        <div className="glass flex min-h-[52px] flex-1 rounded-full p-1" role="group" aria-label="What to show on this screen">
          {PHONE_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              aria-pressed={view === m.key}
              className={`min-h-[44px] lg:min-h-[40px] flex-1 rounded-full px-2 text-[12px] font-extrabold transition duration-200 ease-standard ${
                view === m.key ? "bg-accent text-on-accent shadow-glow-tide" : "text-secondary hover:bg-white/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phones: the pin list (or the pin form while pinning). Desktop: the left rail. */}
      <aside
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border hairline bg-raised shadow-l3 pulse-glass-blur lg:order-1 lg:h-full lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:lg:pulse-glass-blur-0 ${
          view === "map" ? "hidden lg:flex" : ""
        }`}
      >
        {/* Row A — the count and the one action that matters. */}
        <div className="flex flex-none items-center gap-2 px-3 pt-2.5 lg:px-0 lg:pt-0">
          <p className="display min-w-0 flex-1 truncate text-[13.5px] font-extrabold text-primary">
            {pickMode ? (step === "spot" ? "1 · Pick the exact spot" : "2 · Add details") : loading ? "Loading the map…" : `${visible.length} open pin${visible.length === 1 ? "" : "s"}`}
            {pickMode ? null : <span className="ml-1.5 text-[11.5px] font-semibold text-tertiary">{island === "all" ? "everywhere" : island}</span>}
          </p>
          {!pickMode ? (
            <p className="hidden font-mono text-[11px] text-tertiary tabular-nums lg:block">
              Last updated {rows.length ? timeAgo(rows.reduce((a, b) => (new Date(a.updatedAt ?? a.createdAt) > new Date(b.updatedAt ?? b.createdAt) ? a : b)).updatedAt ?? rows[0].createdAt) : "—"}
            </p>
          ) : null}
          {pickMode ? (
            <button
              type="button"
              onClick={cancelPinning}
              className="nb-btn nb-btn-secondary nb-btn-sm min-h-[44px] lg:min-h-[40px] flex-none"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={startPinning}
              className="nb-btn nb-btn-primary nb-btn-sm min-h-[44px] lg:min-h-[40px] flex-none lg:min-h-[44px] lg:min-h-[36px]"
            >
              + Report a hazard
            </button>
          )}
        </div>

        <div className="px-3 pt-2 lg:px-0">
          <EmergencyNotice compact />
        </div>
        {/* One scroll owner: controls must never squeeze the reports to zero height. */}
        <div className="nb-pin-rail-scroll nb-scroll mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 lg:pr-1.5" tabIndex={0} aria-label="Pin filters and reports">
        <details className="px-3 lg:px-0">
          <summary className="min-h-[44px] lg:min-h-[36px] cursor-pointer py-2 text-[11.5px] font-bold text-tertiary hover:text-text-accent">
            Island activity · {pulse.open} open pins
          </summary>
        {/* Tideglass bento: island pulse (2/3) + open/confirmed tiles (1/3). */}
        <div className="grid flex-none grid-cols-3 gap-2 px-3 pt-2 lg:px-0">
          <section className="nb-surface col-span-2 p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-tertiary">Island pulse</p>
              <span className="nb-live-dot ml-auto" aria-hidden />
            </div>
            {loading ? (
              <div className="space-y-2" aria-busy="true">
                <div className="h-3 w-full animate-pulse rounded bg-white/10" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
              </div>
            ) : error ? (
              <p className="py-2 text-[12px] font-semibold text-danger-500">Could not load reports. <button onClick={() => { setLoading(true); void load(); }} className="underline">Retry</button> · Last checked {new Date().toLocaleTimeString("en-BS", { hour: "2-digit", minute: "2-digit" })}</p>
            ) : pulse.top.length ? (
              <ul className="space-y-1.5">
                {pulse.top.map(([k, n]) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="flex w-[86px] shrink-0 items-center gap-1.5 text-[11.5px] font-bold text-secondary">
                      <span className="h-2 w-2 rounded-full" style={{ background: CATEGORIES[k]?.color }} />
                      <span className="truncate">{CATEGORIES[k]?.label ?? k}</span>
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                      <span
                        className="block h-full rounded-full transition-[width] duration-500 ease-standard"
                        style={{ width: `${(n / pulse.max) * 100}%`, background: CATEGORIES[k]?.color, boxShadow: `0 0 10px ${CATEGORIES[k]?.color}88` }}
                      />
                    </span>
                    <span className="num w-5 text-right font-mono text-[11.5px] text-tertiary">{n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-[11.5px] text-tertiary">No open reports on this island right now. Last checked {new Date().toLocaleTimeString("en-BS", { hour: "2-digit", minute: "2-digit" })}.</p>
            )}
          </section>
          <div className="flex flex-col gap-2">
            <div className="nb-surface flex flex-1 flex-col justify-center p-3">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-tertiary">Open pins</p>
              <p className="num display mt-1 text-2xl font-extrabold text-text-accent">{pulse.open}</p>
            </div>
            <div className="nb-surface flex flex-1 flex-col justify-center p-3">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-tertiary">Confirmed</p>
              <p className="num display mt-1 text-2xl font-extrabold text-primary">
                {rows.reduce((sum, r) => sum + (r.confirmations ?? 0), 0).toLocaleString("en-US")}
              </p>
            </div>
          </div>
        </div>

        </details>

        {/* Row B — category filters, always visible (they are the whole point of the list). */}
        <div className="flex-none px-3 pt-2 lg:px-0">
          <div className="flex items-center gap-1.5">
            <div className="nb-no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
              <FilterChip active={filter === "all"} onClick={() => { setFilter("all"); setListLimit(40); }} label={`All · ${rows.filter((r) => r.status !== "archived" && r.status !== "unfounded").length}`} />
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => (
                <FilterChip
                  key={k}
                  active={filter === k}
                  onClick={() => { setFilter(k); setListLimit(40); }}
                  label={CATEGORIES[k].label}
                  category={k}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMoreFilters((v) => !v)}
              aria-expanded={moreFilters}
              aria-label="Island and wire-pin filters"
              className={`min-h-[44px] lg:min-h-[34px] flex-none rounded-full px-2.5 text-[11.5px] font-bold lg:hidden ${
                moreFilters ? "bg-accent/20 text-text-accent" : "bg-white/8 text-tertiary"
              }`}
            >
              {moreFilters ? "Less" : "More"}
            </button>
          </div>
        </div>

        {/* Row C — island + wire pins. Folded away on a phone until asked for, always open on desktop. */}
        <div className={`${moreFilters ? "flex" : "hidden lg:flex"} flex-none flex-wrap items-center gap-1.5 px-3 pt-2 lg:px-0`}>
          <label className="flex items-center gap-1.5">
            <span className="text-[11.5px] font-bold uppercase tracking-wide text-tertiary">Island</span>
            <select
              value={island}
              onChange={(e) => { setIsland(e.target.value); setListLimit(40); }}
              aria-label="Filter pins by island"
              className="nb-select min-h-[44px] text-[11.5px] lg:min-h-[40px]"
            >
              <option value="all">Everywhere · {rows.filter((r) => r.status !== "archived" && r.status !== "unfounded").length}</option>
              {PARISHES.map((p) => {
                const n = rows.filter((r) => r.parish === p && r.status !== "archived" && r.status !== "unfounded").length;
                return (
                  <option key={p} value={p}>
                    {p} · {n}
                  </option>
                );
              })}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowWire((v) => !v)}
            aria-pressed={showWire}
            className={`min-h-[44px] lg:min-h-[40px] rounded-lg px-2 py-1 text-[11.5px] font-bold ${showWire ? "bg-accent/20 text-text-accent" : "bg-white/6 text-tertiary"}`}
          >
            Wire pins {showWire ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={() => setShowStale((v) => !v)}
            aria-pressed={showStale}
            className={`min-h-[44px] lg:min-h-[40px] rounded-lg px-2 py-1 text-[11.5px] font-bold ${showStale ? "bg-accent/20 text-text-accent" : "bg-white/6 text-tertiary"}`}
          >
            Older reports {showStale ? "shown" : "hidden"}
          </button>
        </div>

        {/* What the pin codes mean. Collapsed, so it costs no list room until asked for. */}
        <details className="flex-none px-3 pt-1.5 lg:px-0">
          <summary className="min-h-[32px] cursor-pointer py-1 text-[11.5px] font-bold text-tertiary hover:text-text-accent">
            What the pins mean
          </summary>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 pb-1">
            {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => (
              <li key={k} className="flex items-center gap-1.5 text-[11.5px] text-tertiary">
                <span
                  className="grid h-[22px] w-[22px] place-items-center rounded-full border border-strong text-[8px] font-extrabold text-on-accent"
                  style={{ background: CATEGORIES[k].color }}
                >
                  {CATEGORIES[k].pin}
                </span>
                {CATEGORIES[k].label}
              </li>
            ))}
            <li className="flex items-center gap-1.5 text-[11.5px] text-tertiary">
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-accent bg-sunken text-[9px] font-extrabold text-accent">
                12
              </span>
              Several reports — tap to zoom in
            </li>
          </ul>
        </details>

        {/* The pin just tapped: a bottom sheet on phones — in thumb reach, over
            the map, above the bottom nav — and the same card inline in the rail
            on desktop. CSS picks the shape; this block only describes the pin. */}
        {current ? (
          <div className="nb-pin-sheet mx-3 mt-2 lg:mx-0">
            <span className="nb-pin-sheet-grabber" aria-hidden />
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: CATEGORIES[current.category]?.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-primary">{current.title}</span>
                <span className="block truncate text-[11.5px] text-tertiary">
                  {current.street ?? "unmapped"} · {timeAgo(current.createdAt)} · {current.confirmations} ✓
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/incident/${current.id}`} className="nb-btn nb-btn-primary flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-2 text-[12px] font-extrabold">
                View report
              </Link>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="min-h-[44px] flex-none rounded-full border border-default px-3 py-2 text-[12px] font-bold text-tertiary hover:text-primary"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-2 px-3 lg:px-0">
          {pickMode ? (
            <div className="nb-surface rounded-xl2 p-3.5">
              {step === "spot" ? (
                <>
                  <p className="text-[12.5px] leading-relaxed text-tertiary">
                    Search a street, tap the map, then drag the pin tip onto the gate, drain or pothole. Use{" "}
                    <span className="font-bold text-warn-600">Aim at centre</span> for the last few metres — the crosshair is the pin.
                  </p>
                  <div className="mt-2.5 rounded-xl bg-white/5 p-2.5 text-[12px]">
                    {pick ? (
                      <>
                        <p className="font-mono text-[11.5px] text-text-accent">
                          {pick.lat.toFixed(6)}, {pick.lng.toFixed(6)}
                        </p>
                        <p className="mt-1 font-semibold text-primary">{pick.street ?? "Street name pending…"}</p>
                        <p className="text-[11.5px] text-tertiary">
                          {pick.address ?? "Matching address…"} · {pick.parish ?? "Bahamas"} · ± {pick.precisionM.toFixed(1)} m
                        </p>
                      </>
                    ) : (
                      <p className="text-tertiary">No spot chosen yet.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!pick}
                    onClick={openDetails}
                    className="nb-btn nb-btn-primary min-h-[44px] w-full rounded-xl py-2 text-[13px] font-extrabold disabled:opacity-40"
                  >
                    Next: add details →
                  </button>
                </>
              ) : (
                <div className="space-y-2.5">
                  <label className="block">
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">Headline</span>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Water across Bay Street outside the bus stand"
                      className="nb-field mt-1 text-[16px] sm:text-[13px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">Area</span>
                    <input
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                      placeholder="Bay Street"
                      className="nb-field mt-1 text-[16px] sm:text-[13px]"
                    />
                    <span className="mt-1 block text-[11.5px] text-tertiary">
                      Prefilled from the pin. Edit it if locals call the spot something else.
                    </span>
                  </label>
                  <div>
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">Category</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setForm({ ...form, category: k })}
                          className="min-h-[44px] lg:min-h-[36px] rounded-lg px-2 py-1 text-[11.5px] font-bold"
                          style={{
                            background: form.category === k ? `${CATEGORIES[k].color}2e` : "rgba(255,255,255,.06)",
                            color: form.category === k ? CATEGORIES[k].color : "var(--text-tertiary)",
                          }}
                        >
                          {CATEGORIES[k].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">How bad is it?</span>
                    <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
                      {["Minor", "Lane blocked", "Road blocked", "Dangerous"].map((label, i) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setForm({ ...form, severity: i + 1 })}
                          className={`min-h-[44px] lg:min-h-[40px] rounded-lg px-1.5 py-1.5 text-[11.5px] font-bold ${
                            form.severity === i + 1 ? "bg-danger text-on-accent" : "bg-white/6 text-tertiary"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">What should neighbours know?</span>
                    <textarea
                      value={form.details}
                      onChange={(e) => setForm({ ...form, details: e.target.value })}
                      rows={3}
                      placeholder="Water is knee deep from the traffic light to the pharmacy. Small cars are turning back."
                      className="nb-field mt-1 resize-none text-[16px] leading-relaxed sm:text-[13px]"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-tertiary">
                    <input
                      type="checkbox"
                      checked={form.anonymous}
                      onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
                      className="h-4 w-4 accent-accent"
                    />
                    {handle ? `Post as “someone” instead of @${handle}` : "Post as “someone” (you are not signed in)"}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("spot")}
                      className="nb-btn nb-btn-secondary nb-btn-sm min-h-[44px] rounded-xl border hairline px-3 py-2 text-[12.5px] font-bold"
                    >
                      ← Fix the pin
                    </button>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={saving || form.title.trim().length < 5}
                      className="nb-btn nb-btn-primary min-h-[44px] flex-1 rounded-xl py-2 text-[13px] font-extrabold disabled:opacity-45"
                    >
                      {saving ? "Publishing…" : "Publish to the map"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="nb-surface rounded-xl2 p-2.5 lg:p-3.5">
              <ul className="space-y-1.5" aria-busy={loading} onKeyDown={railKeys}>
                {loading ? (
                  <>
                    <li className="sr-only">Loading pins…</li>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <li key={i} className="min-h-[52px] pulse-skeleton px-2 py-2" aria-hidden>
                        <span className="block h-3 w-3/4 rounded bg-white/10" />
                        <span className="mt-2 block h-2.5 w-1/2 rounded bg-white/[.07]" />
                      </li>
                    ))}
                  </>
                ) : visible.length ? (
                  visible.slice(0, listLimit).map((r, idx) => {
                    const cat = CATEGORIES[r.category];
                    const sev = Math.min(Math.max(r.severity ?? 1, 1), 5);
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(r.id);
                            setFocusNonce((n) => n + 1);
                          }}
                          aria-current={selected === r.id ? "true" : undefined}
                          data-pin-row
                          tabIndex={idx === railStop ? 0 : -1}
                          className={`group min-h-[56px] w-full rounded-xl border p-2.5 text-left transition duration-200 ease-standard ${
                            selected === r.id
                              ? "border-accent-hover/50 bg-accent/12 shadow-[0_0_0_1px_var(--color-accent-hover)]"
                              : "border-transparent hover:border-white/10 hover:bg-white/[.04]"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: cat?.color, boxShadow: `0 0 8px ${cat?.color}80` }}
                            />
                            <span className="truncate text-[12.5px] font-bold tracking-tight text-primary">{r.title}</span>
                            {r.status === "resolved" ? (
                              <span className="flex-none rounded-full bg-success-500/15 px-1.5 py-0.5 text-[11.5px] font-bold text-success-600">
                                Resolved
                              </span>
                            ) : r.severity >= 3 ? (
                              <span className="flex-none rounded-full bg-danger-500/15 px-1.5 py-0.5 text-[11.5px] font-bold text-danger-500">
                                {r.severity >= 4 ? "Dangerous" : "Blocking"}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <span className="num font-mono text-[11.5px] text-tertiary">
                              {r.street ?? "unmapped"} · {timeAgo(r.createdAt)} · {r.confirmations} confirmed
                            </span>
                            <span className="ml-auto flex flex-none items-center gap-1" aria-label={`Severity ${sev} of 5`}>
                              {[1, 2, 3, 4, 5].map((i) => (
                                <span
                                  key={i}
                                  className="nb-sev"
                                  data-on={i <= sev}
                                  style={{ ["--sev-color" as string]: `var(--color-sev-${sev})` }}
                                />
                              ))}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })
                ) : error ? null : (
                  <li className="px-1 py-2 text-[12.5px] text-tertiary">
                    <p>No pins match those filters.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFilter("all");
                        setIsland("all");
                        setShowWire(true);
                        setListLimit(40);
                      }}
                      className="mt-2 min-h-[44px] lg:min-h-[40px] rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-primary hover:bg-white/20"
                    >
                      Clear filters
                    </button>
                  </li>
                )}
              </ul>

              {!loading && visible.length > listLimit ? (
                <button
                  type="button"
                  onClick={() => setListLimit((n) => n + 40)}
                  className="mt-2 min-h-[44px] w-full rounded-xl bg-white/[.07] py-2 text-[12.5px] font-bold text-primary hover:bg-white/[.12]"
                >
                  Show more pins ({visible.length - listLimit} left)
                </button>
              ) : null}

              {done ? (
                <div className="mt-2.5 rounded-xl border border-success-500/40 bg-success-500/10 p-3 text-[12.5px]">
                  <p className="font-bold text-success-600">On the map.</p>
                  <p className="mt-1 text-secondary">“{done.title}” is live at your pin. Neighbours can confirm or clear it.</p>
                  <Link href={`/incident/${done.id}`} className="mt-2 inline-block font-bold text-success-600 underline">
                    Open the report
                  </Link>
                </div>
              ) : null}

              {error ? (
                <div role="alert" className="mt-2.5 rounded-xl bg-danger-500/12 px-3 py-2.5 text-[12px] text-danger-500">
                  <p>Could not load the map feed. {error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      void load();
                    }}
                    className="mt-1.5 min-h-[44px] lg:min-h-[40px] rounded-full bg-danger-500/20 px-3 py-1.5 text-[12px] font-extrabold text-danger-500 hover:bg-danger-500/30"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
        </div>
      </aside>
    </div>
  );
}


/**
 * A category filter chip, on Pulse Layer 3.
 *
 * The hue comes from `var(--cat-*)` (so it is the light-theme hue on paper and
 * the glowing hue on black) rather than from `CATEGORIES[k].color`, which is a
 * hex tuned once for a dark night sky. Everything else — 44px on a phone, 36px
 * on desktop, `aria-pressed` for the state, the spring press — is the chip's own
 * contract in components.css.
 */
function FilterChip({
  active,
  onClick,
  label,
  category,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  /** A category key, for the hue dot. Omit for "All". */
  category?: string;
}) {
  const hue = category ? pulseCategoryMeta(category).token : "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-current={active ? "true" : undefined}
      className="pulse-chip pulse-press shrink-0"
      data-on={active ? "true" : undefined}
      style={{ ["--chip-hue" as string]: hue } as React.CSSProperties}
    >
      <span className="inline-flex items-center gap-1.5">
        {category ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: hue }} aria-hidden /> : null}
        {label}
      </span>
    </button>
  );
}
