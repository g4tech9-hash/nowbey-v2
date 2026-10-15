"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPanel, type MapPin, type PickResult } from "@/components/map/map-panel";
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

/** Phone sheet detents. Desktop ignores this and always shows the full rail. */
type SheetState = "peek" | "open" | "full";

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
  const [sheet, setSheet] = useState<SheetState>("peek");

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
      setSheet("open");
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
    setSheet("open");
  }

  function cancelPinning() {
    setPickMode(false);
    setPick(null);
    setStep("spot");
  }

  // While pinning, the sheet stays at least open so the form never hides under the grabber.
  const effective: SheetState = pickMode && sheet === "peek" ? "open" : sheet;

  // Drag the grabber to snap between detents; a tap toggles peek <-> open.
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  function onGrabberDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { y: e.clientY, moved: false };
  }
  function onGrabberMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    if (Math.abs(e.clientY - drag.current.y) > 8) drag.current.moved = true;
  }
  function onGrabberUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (!d.moved || Math.abs(dy) < 24) {
      setSheet((s) => (s === "peek" ? "open" : s === "open" ? "peek" : "open"));
      return;
    }
    if (dy < 0) setSheet((s) => (s === "peek" ? "open" : "full"));
    else setSheet((s) => (s === "full" ? "open" : "peek"));
  }

  return (
    // Phones/tablets: .nb-fill-view makes this exactly viewport-minus-chrome tall, with the
    // map and the sheet stacked in-flow — the sheet can never slide over the bottom nav.
    // Desktop: a two-column grid with a static side rail.
    <div className={`nb-fill-view lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start ${effective === "full" ? "gap-0 lg:gap-4" : "gap-3 lg:gap-4"}`}>
      <div
        className={`relative flex min-h-0 min-w-0 flex-col transition-all duration-300 lg:order-2 ${
          effective === "full" ? "max-h-0 flex-none overflow-hidden opacity-0 lg:max-h-none lg:overflow-visible lg:opacity-100" : "flex-1"
        }`}
      >
        <div className="mb-2 hidden flex-wrap items-end justify-between gap-2 lg:flex">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tide-400">Safety map</p>
            <h1 className="display text-[clamp(1.4rem,3.4vw,1.9rem)] font-extrabold leading-tight text-sand-100">
              Aerial streets, street names, your pin to the metre
            </h1>
          </div>
          <p className="max-w-[46ch] text-[11.5px] leading-snug text-[#8fb9b6]">
            Hybrid imagery by Esri, streets from OpenStreetMap, search and street matching from Nominatim —{" "}
            <span className="font-bold text-tide-300">no API key needed</span>. Drag the yellow figure onto a road for street level.
          </p>
        </div>
        <div className="relative min-h-0 flex-1">
          <MapPanel
            mode={pickMode ? "pick" : "browse"}
            pins={[...pins, ...wirePins]}
            value={pick ? { lat: pick.lat, lng: pick.lng } : null}
            onChange={handlePick}
            center={[25.0629, -77.3417]}
            zoom={14}
            initialLayer="hybrid"
            focusId={selected}
            focusNonce={focusNonce}
            className="h-full w-full lg:h-[clamp(420px,68vh,720px)]"
          />
          {pickMode ? null : (
            <button
              type="button"
              onClick={startPinning}
              className="absolute bottom-3 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-tide-500 px-4 py-2.5 text-[13px] font-extrabold text-abyss-950 shadow-[0_12px_28px_rgba(0,0,0,.5)] transition active:scale-95 lg:hidden"
            >
              + Pin a spot
            </button>
          )}
        </div>
      </div>

      {/* Phone sheet / desktop rail. In-flow on purpose: fixed sheets covered the nav. */}
      <aside
        className={`flex min-h-0 min-w-0 flex-none flex-col overflow-hidden rounded-2xl border hairline bg-abyss-900/95 shadow-[0_-12px_32px_rgba(0,0,0,.45)] backdrop-blur-md transition-[height] duration-300 lg:order-1 lg:h-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none ${
          effective === "peek" ? "h-[96px]" : effective === "open" ? "h-[54%]" : "h-full"
        }`}
      >
        {/* Grabber — phones/tablets only. The whole bar is the drag handle. */}
        <div
          className="flex h-11 flex-none touch-none select-none items-center gap-2 px-3 pt-1 lg:hidden"
          onPointerDown={onGrabberDown}
          onPointerMove={onGrabberMove}
          onPointerUp={onGrabberUp}
          onPointerCancel={() => (drag.current = null)}
          role="button"
          tabIndex={0}
          aria-label="Drag to resize the pins panel, or tap to expand"
          aria-expanded={effective !== "peek"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSheet((s) => (s === "peek" ? "open" : "peek"));
            }
          }}
        >
          <span className="grid h-8 w-12 flex-none cursor-grab place-items-center rounded-full bg-white/8 active:cursor-grabbing">
            <span className="h-1 w-6 rounded-full bg-tide-300" />
          </span>
          <p className="min-w-0 flex-1 truncate text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#8fb9b6]">
            {pickMode ? "Pinning a spot" : loading ? "Loading pins…" : `${visible.length} pin${visible.length === 1 ? "" : "s"} · ${island === "all" ? "Everywhere" : island}`}
          </p>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={() => setSheet((s) => (s === "full" ? "open" : "full"))}
            className="grid h-8 w-12 flex-none place-items-center rounded-full bg-white/8 active:scale-95"
            aria-label={effective === "full" ? "Shrink the panel" : "Expand the panel full height"}
            aria-expanded={effective === "full"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#74f3e3" strokeWidth="2" aria-hidden>
              {effective === "full" ? <path d="M6 14l6-6 6 6" /> : <path d="M6 10l6 6 6-6" />}
            </svg>
          </button>
        </div>

        {/* Category filters stay visible even in peek, so filtering never needs the full panel. */}
        <div className="flex-none px-3 pb-2 lg:px-0 lg:pb-0">
          <div className="nb-no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 lg:flex-wrap lg:overflow-visible lg:pb-0">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All · ${rows.filter((r) => r.status !== "archived").length}`} />
            {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => (
              <FilterChip
                key={k}
                active={filter === k}
                onClick={() => setFilter(k)}
                label={CATEGORIES[k].label}
                color={CATEGORIES[k].color}
              />
            ))}
          </div>
        </div>

        <div
          className={`nb-scroll min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pb-4 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0 ${
            effective === "peek" ? "hidden lg:flex" : "flex"
          }`}
        >
        {pickMode ? (
          <div className="glass rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <p className="display text-[15px] font-extrabold text-sand-100">
                {step === "spot" ? "1 · Pick the exact spot" : "2 · Add details"}
              </p>
              <button
                type="button"
                onClick={cancelPinning}
                className="min-h-[36px] rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold hover:bg-white/20"
              >
                Cancel
              </button>
            </div>

            {step === "spot" ? (
              <>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#a9cdc9]">
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
              <div className="mt-2 space-y-2.5">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Headline</span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Water across Bay Street outside the bus stand"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[13px] outline-none focus:border-tide-400"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Area</span>
                  <input
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="Bay Street"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[13px] outline-none focus:border-tide-400"
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
                        className="min-h-[32px] rounded-lg px-2 py-1 text-[11.5px] font-bold"
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
                  <div className="mt-1 flex gap-1">
                    {["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"].map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setForm({ ...form, severity: i + 1 })}
                        className={`min-h-[40px] flex-1 rounded-lg px-1.5 py-1.5 text-[10.5px] font-bold ${
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
                    className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[13px] outline-none focus:border-tide-400"
                  />
                </label>
                <label className="flex items-center gap-2 text-[12px] text-[#a9cdc9]">
                  <input
                    type="checkbox"
                    checked={form.anonymous}
                    onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
                    className="h-3.5 w-3.5 accent-[#00c9b7]"
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
          <div className="glass rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="display text-[15px] font-extrabold text-sand-100">Live pins</p>
              <button
                type="button"
                onClick={startPinning}
                className="min-h-[36px] rounded-full bg-tide-500 px-3 py-1.5 text-[12px] font-extrabold text-abyss-950"
              >
                + Pin a spot
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">Island</span>
              <select
                value={island}
                onChange={(e) => setIsland(e.target.value)}
                aria-label="Filter pins by island"
                className="min-h-[36px] rounded-lg border border-white/10 bg-abyss-950/80 px-1.5 py-1 text-[11.5px] outline-none"
              >
                <option value="all">Everywhere</option>
                {PARISHES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowWire((v) => !v)}
                aria-pressed={showWire}
                className={`min-h-[36px] rounded-lg px-2 py-1 text-[11px] font-bold ${showWire ? "bg-tide-500/20 text-tide-300" : "bg-white/6 text-[#8fb9b6]"}`}
              >
                Wire pins {showWire ? "on" : "off"}
              </button>
            </div>

            <ul className="nb-scroll mt-2.5 space-y-1.5 pr-1 lg:max-h-[38vh] lg:overflow-auto">
              {loading ? (
                <li className="text-[12.5px] text-[#6e97a0]">Loading pins…</li>
              ) : visible.length ? (
                visible.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r.id);
                        setFocusNonce((n) => n + 1);
                      }}
                      aria-current={selected === r.id ? "true" : undefined}
                      className={`min-h-[44px] w-full rounded-xl px-2 py-1.5 text-left transition ${
                        selected === r.id ? "bg-tide-500/18 ring-1 ring-tide-400/40" : "hover:bg-white/5"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORIES[r.category]?.color }} />
                        <span className="truncate text-[12.5px] font-semibold text-sand-100">{r.title}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#6e97a0]">
                        {r.street ?? "unmapped"} · {timeAgo(r.createdAt)} · {r.confirmations} ✓
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-[12.5px] text-[#6e97a0]">No pins match those filters.</li>
              )}
            </ul>
          </div>
        )}

        {done ? (
          <div className="rounded-2xl border border-tide-400/40 bg-tide-500/10 p-3.5 text-[12.5px]">
            <p className="font-bold text-tide-300">On the map.</p>
            <p className="mt-1 text-[#cfeee9]">
              “{done.title}” is live at your pin. Neighbours can confirm or clear it.
            </p>
            <Link href={`/incident/${done.id}`} className="mt-2 inline-block font-bold text-tide-300 underline">
              Open the report
            </Link>
          </div>
        ) : null}

        {error ? <p className="rounded-xl bg-conch-500/15 px-3 py-2 text-[12px] text-conch-400">{error}</p> : null}
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
      className="min-h-[32px] shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition active:scale-95"
      style={{
        background: active ? `${color ?? "#2ee6d0"}2e` : "rgba(255,255,255,.06)",
        color: active ? color ?? "#2ee6d0" : "#a9cdc9",
      }}
    >
      {label}
    </button>
  );
}
