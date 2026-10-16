"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPanel, type MapPin, type PickResult } from "@/components/map/map-panel";
import { useIsMobile } from "@/lib/use-is-mobile";
import { CATEGORIES, PARISHES, timeAgo, type CategoryKey } from "@/lib/geo";

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
  const [filter, setFilter] = useState<CategoryKey | "all">("all");
  const [island, setIsland] = useState<string>(() => {
    const p = params.get("parish");
    return p && (PARISHES as readonly string[]).includes(p) ? p : "all";
  });
  const [showWire, setShowWire] = useState(true);
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
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // The map calls this whenever the pin moves, and again when the street lookup comes back.
  function handlePick(p: PickResult) {
    setPick(p);
    if (p.street || p.parish) setForm((f) => ({ ...f, area: p.street ? `${p.street}${p.parish ? `, ${p.parish}` : ""}` : f.area }));
  }

  const visible = useMemo(
    () =>
      rows.filter(
        (r) => (filter === "all" || r.category === filter) && (island === "all" || r.parish === island) && r.status !== "archived",
      ),
    [rows, filter, island],
  );

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
        <div className="mb-2 hidden flex-wrap items-end justify-between gap-2 lg:flex">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tide-400">Safety map</p>
            <h1 className="display text-[clamp(1.4rem,3.4vw,1.9rem)] font-extrabold leading-tight text-sand-100">
              What is happening, street by street
            </h1>
          </div>
          <p className="max-w-[46ch] text-[11.5px] leading-snug text-[#8fb9b6]">
            Tap a pin to read the report, or <span className="font-bold text-tide-300">Pin a spot</span> to add your own.
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
            className="h-full w-full rounded-2xl"
          />
          {pickMode || view !== "map" ? null : (
            <button
              type="button"
              onClick={startPinning}
              className="absolute bottom-3 left-1/2 z-[500] min-h-[44px] -translate-x-1/2 rounded-full bg-tide-500 px-4 py-2.5 text-[13px] font-extrabold text-abyss-950 shadow-[0_12px_28px_rgba(0,0,0,.5)] transition active:scale-95 lg:hidden"
            >
              + Pin a spot
            </button>
          )}
        </div>
      </div>

      {/* What the phone shows: the map, the list, or both. Never on desktop — there everything fits. */}
      <div className={`flex-none items-center gap-2 lg:hidden ${pickMode ? "hidden" : "flex"}`}>
        <div className="glass flex min-h-[48px] flex-1 rounded-xl p-1" role="group" aria-label="What to show on this screen">
          {PHONE_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              aria-pressed={view === m.key}
              className={`min-h-[40px] flex-1 rounded-lg px-2 text-[12px] font-bold transition ${
                view === m.key ? "bg-tide-500 text-abyss-950" : "text-[#bfe4e0] hover:bg-white/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phones: the pin list (or the pin form while pinning). Desktop: the left rail. */}
      <aside
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border hairline bg-abyss-900/95 shadow-[0_-12px_32px_rgba(0,0,0,.45)] backdrop-blur-md lg:order-1 lg:h-full lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none ${
          view === "map" ? "hidden lg:flex" : ""
        }`}
      >
        {/* Row A — the count and the one action that matters. */}
        <div className="flex flex-none items-center gap-2 px-3 pt-2.5 lg:px-0 lg:pt-0">
          <p className="display min-w-0 flex-1 truncate text-[13.5px] font-extrabold text-sand-100">
            {pickMode ? (step === "spot" ? "1 · Pick the exact spot" : "2 · Add details") : loading ? "Loading pins…" : `${visible.length} open pin${visible.length === 1 ? "" : "s"}`}
            {pickMode ? null : <span className="ml-1.5 text-[11.5px] font-semibold text-[#8fb9b6]">{island === "all" ? "everywhere" : island}</span>}
          </p>
          {pickMode ? (
            <button
              type="button"
              onClick={cancelPinning}
              className="min-h-[40px] flex-none rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-sand-100 hover:bg-white/20"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={startPinning}
              className="min-h-[40px] flex-none rounded-full bg-tide-500 px-3 py-1.5 text-[12px] font-extrabold text-abyss-950 lg:min-h-[36px]"
            >
              + Pin a spot
            </button>
          )}
        </div>

        {/* Tideglass bento: island pulse (2/3) + open/confirmed tiles (1/3). */}
        <div className="grid flex-none grid-cols-3 gap-2 px-3 pt-2 lg:px-0">
          <section className="nb-surface col-span-2 p-3">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">Island pulse</p>
              <span className="nb-live-dot ml-auto" aria-hidden />
            </div>
            {pulse.top.length ? (
              <ul className="space-y-1.5">
                {pulse.top.map(([k, n]) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="flex w-[86px] shrink-0 items-center gap-1.5 text-[11px] font-bold text-ink-200">
                      <span className="h-2 w-2 rounded-full" style={{ background: CATEGORIES[k]?.color }} />
                      <span className="truncate">{CATEGORIES[k]?.label ?? k}</span>
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                      <span
                        className="block h-full rounded-full transition-[width] duration-500 ease-standard"
                        style={{ width: `${(n / pulse.max) * 100}%`, background: CATEGORIES[k]?.color, boxShadow: `0 0 10px ${CATEGORIES[k]?.color}88` }}
                      />
                    </span>
                    <span className="num w-5 text-right font-mono text-[11px] text-ink-300">{n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-[11.5px] text-ink-400">The island is quiet — no open pins.</p>
            )}
          </section>
          <div className="flex flex-col gap-2">
            <div className="nb-surface flex flex-1 flex-col justify-center p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Open pins</p>
              <p className="num display mt-1 text-2xl font-extrabold text-tide-300">{pulse.open}</p>
            </div>
            <div className="nb-surface flex flex-1 flex-col justify-center p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Confirmed</p>
              <p className="num display mt-1 text-2xl font-extrabold text-ink-100">
                {rows.reduce((sum, r) => sum + (r.confirmations ?? 0), 0).toLocaleString("en-US")}
              </p>
            </div>
          </div>
        </div>

        {/* Row B — category filters, always visible (they are the whole point of the list). */}
        <div className="flex-none px-3 pt-2 lg:px-0">
          <div className="flex items-center gap-1.5">
            <div className="nb-no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 lg:flex-wrap lg:overflow-visible lg:pb-0">
              <FilterChip active={filter === "all"} onClick={() => { setFilter("all"); setListLimit(40); }} label={`All · ${rows.filter((r) => r.status !== "archived").length}`} />
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => (
                <FilterChip
                  key={k}
                  active={filter === k}
                  onClick={() => { setFilter(k); setListLimit(40); }}
                  label={CATEGORIES[k].label}
                  color={CATEGORIES[k].color}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMoreFilters((v) => !v)}
              aria-expanded={moreFilters}
              aria-label="Island and wire-pin filters"
              className={`min-h-[34px] flex-none rounded-full px-2.5 text-[11.5px] font-bold lg:hidden ${
                moreFilters ? "bg-tide-500/20 text-tide-300" : "bg-white/8 text-[#a9cdc9]"
              }`}
            >
              {moreFilters ? "Less" : "More"}
            </button>
          </div>
        </div>

        {/* Row C — island + wire pins. Folded away on a phone until asked for, always open on desktop. */}
        <div className={`${moreFilters ? "flex" : "hidden lg:flex"} flex-none flex-wrap items-center gap-1.5 px-3 pt-2 lg:px-0`}>
          <label className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">Island</span>
            <select
              value={island}
              onChange={(e) => { setIsland(e.target.value); setListLimit(40); }}
              aria-label="Filter pins by island"
              className="min-h-[40px] rounded-lg border border-white/10 bg-abyss-950/80 px-1.5 py-1 text-[11.5px] outline-none"
            >
              <option value="all">Everywhere</option>
              {PARISHES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowWire((v) => !v)}
            aria-pressed={showWire}
            className={`min-h-[40px] rounded-lg px-2 py-1 text-[11px] font-bold ${showWire ? "bg-tide-500/20 text-tide-300" : "bg-white/6 text-[#8fb9b6]"}`}
          >
            Wire pins {showWire ? "on" : "off"}
          </button>
        </div>

        {/* What the pin codes mean. Collapsed, so it costs no list room until asked for. */}
        <details className="flex-none px-3 pt-1.5 lg:px-0">
          <summary className="min-h-[32px] cursor-pointer py-1 text-[11.5px] font-bold text-[#8fb9b6] hover:text-tide-300">
            What the pins mean
          </summary>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 pb-1">
            {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => (
              <li key={k} className="flex items-center gap-1.5 text-[11px] text-[#a9cdc9]">
                <span
                  className="grid h-[22px] w-[22px] place-items-center rounded-full border border-white/70 text-[8px] font-extrabold text-abyss-950"
                  style={{ background: CATEGORIES[k].color }}
                >
                  {CATEGORIES[k].pin}
                </span>
                {CATEGORIES[k].label}
              </li>
            ))}
            <li className="flex items-center gap-1.5 text-[11px] text-[#a9cdc9]">
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-tide-400 bg-abyss-950 text-[9px] font-extrabold text-tide-300">
                12
              </span>
              Several reports — tap to zoom in
            </li>
          </ul>
        </details>

        {/* The pin just tapped: one clear line and the way into its report. */}
        {current ? (
          <div className="nb-glass mx-3 mt-2 flex flex-none items-center gap-2 rounded-xl px-2.5 py-2 lg:mx-0">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: CATEGORIES[current.category]?.color }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold text-sand-100">{current.title}</span>
              <span className="block truncate text-[11px] text-[#8fb9b6]">
                {current.street ?? "unmapped"} · {timeAgo(current.createdAt)} · {current.confirmations} ✓
              </span>
            </span>
            <Link href={`/incident/${current.id}`} className="min-h-[40px] flex-none rounded-full bg-tide-500/20 px-3 py-2 text-[11.5px] font-extrabold text-tide-300">
              Open
            </Link>
          </div>
        ) : null}

        <div className="nb-scroll mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 lg:px-0 lg:pb-3 lg:pr-1.5">
          {pickMode ? (
            <div className="glass rounded-2xl p-3.5">
              {step === "spot" ? (
                <>
                  <p className="text-[12.5px] leading-relaxed text-[#a9cdc9]">
                    Search a street, tap the map, then drag the pin tip onto the gate, drain or pothole. Use{" "}
                    <span className="font-bold text-sun-400">Aim at centre</span> for the last few metres — the crosshair is the pin.
                  </p>
                  <div className="mt-2.5 rounded-xl bg-white/5 p-2.5 text-[12px]">
                    {pick ? (
                      <>
                        <p className="font-mono text-[11.5px] text-tide-300">
                          {pick.lat.toFixed(6)}, {pick.lng.toFixed(6)}
                        </p>
                        <p className="mt-1 font-semibold text-sand-100">{pick.street ?? "Street name pending…"}</p>
                        <p className="text-[11.5px] text-[#8fb9b6]">
                          {pick.address ?? "Matching address…"} · {pick.parish ?? "Bahamas"} · ± {pick.precisionM.toFixed(1)} m
                        </p>
                      </>
                    ) : (
                      <p className="text-[#8fb9b6]">No spot chosen yet.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!pick}
                    onClick={openDetails}
                    className="mt-2.5 min-h-[44px] w-full rounded-xl bg-tide-500 py-2 text-[13px] font-extrabold text-abyss-950 disabled:opacity-40"
                  >
                    Next: add details →
                  </button>
                </>
              ) : (
                <div className="space-y-2.5">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Headline</span>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Water across Bay Street outside the bus stand"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[16px] outline-none focus:border-tide-400 sm:text-[13px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Area</span>
                    <input
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                      placeholder="Bay Street"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[16px] outline-none focus:border-tide-400 sm:text-[13px]"
                    />
                    <span className="mt-1 block text-[10.5px] text-[#6e97a0]">
                      Prefilled from the pin. Edit it if locals call the spot something else.
                    </span>
                  </label>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Category</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setForm({ ...form, category: k })}
                          className="min-h-[36px] rounded-lg px-2 py-1 text-[11.5px] font-bold"
                          style={{
                            background: form.category === k ? `${CATEGORIES[k].color}2e` : "rgba(255,255,255,.06)",
                            color: form.category === k ? CATEGORIES[k].color : "#a9cdc9",
                          }}
                        >
                          {CATEGORIES[k].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">How bad is it?</span>
                    <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
                      {["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"].map((label, i) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setForm({ ...form, severity: i + 1 })}
                          className={`min-h-[40px] rounded-lg px-1.5 py-1.5 text-[10.5px] font-bold ${
                            form.severity === i + 1 ? "bg-conch-500 text-abyss-950" : "bg-white/6 text-[#a9cdc9]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">What should neighbours know?</span>
                    <textarea
                      value={form.details}
                      onChange={(e) => setForm({ ...form, details: e.target.value })}
                      rows={3}
                      placeholder="Water is knee deep from the traffic light to the pharmacy. Small cars are turning back."
                      className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[16px] leading-relaxed outline-none focus:border-tide-400 sm:text-[13px]"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-[#a9cdc9]">
                    <input
                      type="checkbox"
                      checked={form.anonymous}
                      onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
                      className="h-4 w-4 accent-[#00c9b7]"
                    />
                    {handle ? `Post as “someone” instead of @${handle}` : "Post as “someone” (you are not signed in)"}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("spot")}
                      className="min-h-[44px] rounded-xl border hairline px-3 py-2 text-[12.5px] font-bold hover:bg-white/5"
                    >
                      ← Fix the pin
                    </button>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={saving || form.title.trim().length < 5}
                      className="min-h-[44px] flex-1 rounded-xl bg-tide-500 py-2 text-[13px] font-extrabold text-abyss-950 disabled:opacity-45"
                    >
                      {saving ? "Publishing…" : "Publish to the map"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-2xl p-2.5 lg:p-3.5">
              <ul className="space-y-1.5" aria-busy={loading}>
                {loading ? (
                  <>
                    <li className="sr-only">Loading pins…</li>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <li key={i} className="min-h-[52px] animate-pulse rounded-xl bg-white/[.04] px-2 py-2" aria-hidden>
                        <span className="block h-3 w-3/4 rounded bg-white/10" />
                        <span className="mt-2 block h-2.5 w-1/2 rounded bg-white/[.07]" />
                      </li>
                    ))}
                  </>
                ) : visible.length ? (
                  visible.slice(0, listLimit).map((r) => {
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
                          className={`group min-h-[56px] w-full rounded-xl border p-2.5 text-left transition duration-200 ease-standard ${
                            selected === r.id
                              ? "border-tide-400/50 bg-tide-500/12 shadow-[0_0_0_1px_var(--color-tide-400)]"
                              : "border-transparent hover:border-white/10 hover:bg-white/[.04]"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: cat?.color, boxShadow: `0 0 8px ${cat?.color}80` }}
                            />
                            <span className="truncate text-[12.5px] font-bold tracking-tight text-sand-100">{r.title}</span>
                            {r.status === "resolved" ? (
                              <span className="flex-none rounded-full bg-ok-500/15 px-1.5 py-0.5 text-[10px] font-bold text-ok-600">
                                Resolved
                              </span>
                            ) : r.severity >= 3 ? (
                              <span className="flex-none rounded-full bg-danger-500/15 px-1.5 py-0.5 text-[10px] font-bold text-danger-500">
                                {r.severity >= 4 ? "Dangerous" : "Blocking"}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <span className="num font-mono text-[11px] text-ink-400">
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
                  <li className="px-1 py-2 text-[12.5px] text-[#8fb9b6]">
                    <p>No pins match those filters.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFilter("all");
                        setIsland("all");
                        setShowWire(true);
                        setListLimit(40);
                      }}
                      className="mt-2 min-h-[40px] rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-sand-100 hover:bg-white/20"
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
                  className="mt-2 min-h-[44px] w-full rounded-xl bg-white/[.07] py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/[.12]"
                >
                  Show more pins ({visible.length - listLimit} left)
                </button>
              ) : null}

              {done ? (
                <div className="mt-2.5 rounded-xl border border-ok-500/40 bg-ok-500/10 p-3 text-[12.5px]">
                  <p className="font-bold text-ok-600">On the map.</p>
                  <p className="mt-1 text-ink-200">“{done.title}” is live at your pin. Neighbours can confirm or clear it.</p>
                  <Link href={`/incident/${done.id}`} className="mt-2 inline-block font-bold text-ok-600 underline">
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
                    className="mt-1.5 min-h-[40px] rounded-full bg-danger-500/20 px-3 py-1.5 text-[12px] font-extrabold text-danger-500 hover:bg-danger-500/30"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}


function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="min-h-[40px] shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition duration-200 ease-standard active:scale-95"
      style={{
        background: active ? `${color ?? "var(--color-tide-400)"}26` : "rgba(255,255,255,.05)",
        border: `1px solid ${active ? `${color ?? "var(--color-tide-400)"}66` : "rgba(255,255,255,.08)"}`,
        color: active ? color ?? "#8ff0e4" : "#a9cdc9",
      }}
    >
      <span className="inline-flex items-center gap-1.5">
        {color ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} /> : null}
        {label}
      </span>
    </button>
  );
}
