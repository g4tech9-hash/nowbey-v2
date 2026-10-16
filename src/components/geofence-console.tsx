"use client";

/**
 * Geospatial Notification -- map plus composer, in one client component.
 *
 * They have to share state: clicking the map is what fills in the coordinates,
 * and the circle has to redraw as the radius slider moves. Splitting them would
 * mean lifting the picked point into a store for one form, which is more
 * machinery than the job needs.
 *
 * The map is NowBeyMap in pick mode. Its onChange hands back a PickResult with
 * the lat/lng and a reverse-geocoded address, which is why the form shows a
 * street name rather than only decimals.
 */

import { useState } from "react";
import { MapPanel } from "@/components/map/map-panel";
import type { MapPin, PickResult } from "@/components/map/NowBeyMap";

export type ConsoleIncident = {
  id: string;
  title: string;
  category: MapPin["category"];
  status: string;
  severity: number;
  lat: number;
  lng: number;
};

const FIELD =
  "mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-3 py-2 text-[13px] outline-none focus:border-tide-400";
const LABEL = "block text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]";

/** Radius presets in miles. The common cases are one tap, not a typed number. */
const PRESETS = [0.5, 1, 2, 5, 10];

export function GeofenceConsole({ center, incidents }: { center: [number, number]; incidents: ConsoleIncident[] }) {
  const [point, setPoint] = useState<{ lat: number; lng: number; label: string | null } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Active incidents become map pins, so the admin can see what is already
  // happening inside the circle they are about to page.
  const pins: MapPin[] = incidents.map((i) => ({
    id: i.id,
    lat: i.lat,
    lng: i.lng,
    category: i.category,
    title: i.title,
    status: i.status,
    href: `/i/${i.id}`,
  }));

  const canSend = Boolean(point) && title.trim().length >= 3 && description.trim().length >= 10 && !busy;

  async function send() {
    if (!point) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/geofence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          lat: point.lat,
          lng: point.lng,
          radiusMiles,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "That did not send.");

      const s = data.stats ?? {};
      setResult({
        ok: true,
        text: `Sent to ${s.sent ?? 0} device(s)${s.matched ? ` of ${s.matched} inside the circle` : ""}${
          s.skipped ? ` · ${s.skipped} skipped (recently notified)` : ""
        }${s.failed ? ` · ${s.failed} failed` : ""}`,
      });
      setTitle("");
      setDescription("");
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      {/* ---------------- Map ---------------- */}
      <div className="glass overflow-hidden rounded-2xl p-1.5">
        <div className="h-[380px] w-full overflow-hidden rounded-xl lg:h-[520px]">
          <MapPanel
            mode="pick"
            pins={pins}
            center={center}
            zoom={12}
            value={point ? { lat: point.lat, lng: point.lng } : null}
            onChange={(p: PickResult) =>
              setPoint({
                lat: p.lat,
                lng: p.lng,
                // The street comes back from the map's own lookup; when there is
                // none, the decimals are the honest answer.
                label: p.address ?? p.street ?? null,
              })
            }
          />
        </div>
        <p className="px-2.5 py-2 text-[11.5px] text-ink-400">
          Click the map to move the centre. The {incidents.length} active incident{incidents.length === 1 ? "" : "s"} are shown as
          pins.
        </p>
      </div>

      {/* ---------------- Composer ---------------- */}
      <div className="glass rounded-2xl p-4">
        <h2 className="text-[15px] font-extrabold text-sand-100">Compose the alert</h2>

        <div className="mt-3 rounded-xl border hairline bg-abyss-950/50 p-3">
          {point ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]">Centre</p>
              <p className="mt-0.5 text-[13px] font-semibold text-sand-100">{point.label ?? "Pinned location"}</p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-400">
                {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              </p>
            </>
          ) : (
            <p className="text-[12.5px] text-[#a9cdc9]">Click the map to choose the centre of the circle.</p>
          )}
        </div>

        <label className="mt-3 block">
          <span className={LABEL}>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className={FIELD}
            placeholder="Avoid Bay Street"
          />
        </label>

        <label className="mt-2.5 block">
          <span className={LABEL}>What should people do?</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            className={FIELD}
            placeholder="Police are dealing with an incident. Use East Street instead for the next hour."
          />
        </label>

        <fieldset className="mt-3">
          <legend className={LABEL}>Radius — {radiusMiles} mile{radiusMiles === 1 ? "" : "s"}</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setRadiusMiles(m)}
                aria-pressed={radiusMiles === m}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold transition ${
                  radiusMiles === m ? "bg-tide-500 text-abyss-950" : "border hairline text-ink-300 hover:bg-white/8"
                }`}
              >
                {m} mi
              </button>
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value))}
            aria-label="Radius in miles"
            className="mt-2.5 w-full accent-tide-400"
          />
          <p className="mt-1 text-[11px] text-ink-400">
            {radiusMiles >= 100
              ? "100 miles covers the whole archipelago."
              : `Roughly ${(radiusMiles * 1.6).toFixed(1)} km from the centre.`}
          </p>
        </fieldset>

        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          className="mt-4 w-full rounded-full bg-danger-500 px-4 py-2.5 text-[13px] font-extrabold text-abyss-950 hover:bg-danger-400 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send alert to this area"}
        </button>

        {/*
          The outcome, announced. A geofenced alert that silently failed is worse
          than one that never tried, because the admin believes people were told.
        */}
        {result ? (
          <p
            role={result.ok ? "status" : "alert"}
            aria-live={result.ok ? "polite" : "assertive"}
            className={`mt-2.5 rounded-lg px-3 py-2 text-[12.5px] ${
              result.ok ? "bg-tide-500/12 text-tide-300" : "bg-danger-500/15 text-danger-500"
            }`}
          >
            {result.text}
          </p>
        ) : null}

        <p className="mt-3 text-[11.5px] text-ink-400">
          A device is notified at most once every 3 minutes, so a second send inside that window is skipped rather than
          delivered twice. Devices that never shared a location are skipped by a radius send — they still get island-wide alerts.
        </p>
      </div>
    </div>
  );
}
