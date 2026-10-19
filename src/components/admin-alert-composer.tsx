"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { GeofenceIncident } from "./admin-geofence-map";

const GeofenceMap = dynamic(() => import("./admin-geofence-map"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[320px] place-items-center text-[12px] text-secondary">Loading map…</div>,
});

const BTN = "rounded-full px-4 py-2 text-[13px] font-bold disabled:opacity-50";
const INPUT = "w-full rounded-xl border hairline bg-raised/60 px-3 py-2 text-[13px] text-primary outline-none focus:border-accent-hover";
const LABEL = "mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-tertiary";

/**
 * Custom Geofenced Push composer.
 * Data flow: the admin picks a centre on the map (or types coordinates) → the page GETs
 * /api/admin/alerts for a live audience count → Send POSTs to the same route, which emails the
 * geofenced audience, pushes the island, and writes an audit row. Nothing sends without the
 * double confirm, and the server re-validates everything.
 */
export function AlertComposer({ incidents, defaultLat, defaultLng }: { incidents: GeofenceIncident[]; defaultLat: number; defaultLng: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [lat, setLat] = useState(String(defaultLat));
  const [lng, setLng] = useState(String(defaultLng));
  const [radius, setRadius] = useState("5");
  const [audience, setAudience] = useState<{ n: number | null; parish: string }>({ n: null, parish: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const cLat = Number(lat);
  const cLng = Number(lng);
  const cRadius = Number(radius);
  const mapOk = Number.isFinite(cLat) && Number.isFinite(cLng);

  // Live audience preview, debounced so typing does not hammer the API.
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!mapOk || !Number.isFinite(cRadius)) {
        setAudience({ n: null, parish: "" });
        return;
      }
      try {
        const res = await fetch(`/api/admin/alerts?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radiusMiles=${encodeURIComponent(radius)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) setAudience({ n: data.audience ?? 0, parish: data.parish ?? "" });
        else setAudience({ n: null, parish: "" });
      } catch {
        setAudience({ n: null, parish: "" });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [lat, lng, radius, mapOk, cRadius]);

  async function send() {
    if (!window.confirm(`Send this alert to ~${audience.n ?? "?"} people? This cannot be undone.`)) return;
    if (!window.confirm("Last check — send it now?")) return;
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, lat: cLat, lng: cLng, radiusMiles: cRadius }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send the alert.");
      const email = data.email ?? {};
      const push = data.push;
      setDone(
        `Sent. Email reached ${email.sent ?? 0} of ${email.matched ?? 0} matched${push ? `, push reached ${push.sent ?? 0}` : ""}${email.capped ? " (recipient cap hit)" : ""}.`,
      );
      setTitle("");
      setBody("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send the alert.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass overflow-hidden rounded-2xl">
        <div className="h-[320px] lg:h-[440px]">
          <GeofenceMap
            lat={mapOk ? cLat : defaultLat}
            lng={mapOk ? cLng : defaultLng}
            radiusMiles={Number.isFinite(cRadius) && cRadius > 0 ? cRadius : 5}
            incidents={incidents}
            onPick={(a, b) => {
              setLat(a.toFixed(5));
              setLng(b.toFixed(5));
            }}
          />
        </div>
        <p className="p-3 text-[11.5px] text-tertiary">Click the map to move the centre. Yellow dots are active reports.</p>
      </div>

      <div className="glass space-y-3 rounded-2xl p-4">
        <div>
          <label htmlFor="alert-title" className={LABEL}>Title</label>
          <input id="alert-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Flooding on Bay Street" className={INPUT} />
        </div>
        <div>
          <label htmlFor="alert-body" className={LABEL}>Description</label>
          <textarea id="alert-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={500} placeholder="What is happening, and what should people do?" className={INPUT} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="alert-lat" className={LABEL}>Latitude</label>
            <input id="alert-lat" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" className={INPUT} />
          </div>
          <div>
            <label htmlFor="alert-lng" className={LABEL}>Longitude</label>
            <input id="alert-lng" value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" className={INPUT} />
          </div>
          <div>
            <label htmlFor="alert-radius" className={LABEL}>Radius (mi)</label>
            <input id="alert-radius" value={radius} onChange={(e) => setRadius(e.target.value)} inputMode="decimal" className={INPUT} />
          </div>
        </div>
        <div className="rounded-xl bg-white/[.04] p-3 text-[12.5px] text-secondary">
          {audience.n === null ? (
            "Enter a point inside The Bahamas to preview the audience."
          ) : (
            <>
              Reaches <strong className="text-primary">~{audience.n} confirmed subscribers</strong>
              {audience.parish ? <> on {audience.parish} (island-wide profiles included)</> : null} plus a push to the island.
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy || !title.trim() || !body.trim() || !mapOk} onClick={send} className={`${BTN} bg-danger-500 font-extrabold text-on-accent`}>
            {busy ? "Sending…" : "Send geofenced alert"}
          </button>
          {done ? <span className="text-[12px] font-bold text-text-accent">{done}</span> : null}
          {err ? <span className="text-[12px] text-danger-400">{err}</span> : null}
        </div>
      </div>
    </div>
  );
}
