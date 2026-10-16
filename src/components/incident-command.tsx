/**
 * Incident Command -- the interactive half.
 *
 * A table of reports with three staff actions per row: edit the details, move it
 * through its lifecycle (active / resolved / unfounded), or merge it into
 * another report. Every action PATCHes /api/admin/incidents and refreshes the
 * server component above on success.
 *
 * Written to the same standard as the rest of the admin surface: a busy flag per
 * row so a double-click cannot fire twice, an error line that actually appears
 * when the server says no, and role="alert" so a screen-reader user hears the
 * outcome rather than watching a row silently fail to change.
 */

"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/admin-ui";

export type IncidentRow = {
  id: string;
  title: string;
  details: string | null;
  category: string;
  severity: number;
  status: string;
  sourceKind: string;
  sourceName: string | null;
  address: string | null;
  parish: string | null;
  lat: number;
  lng: number;
  authorHandle: string | null;
  confirmations: number;
  sightings: number;
  createdAt: string;
  resolvedAt: string | null;
  ago: string;
  source: { label: string; tone: "violet" | "slate" };
};

const STATUSES = ["active", "resolved", "unfounded"] as const;
type Status = (typeof STATUSES)[number];

const SEVERITY_LABEL = ["", "Minor", "Moderate", "Serious", "Critical"];

const FIELD =
  "mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-3 py-2 text-[13px] outline-none focus:border-tide-400";
const LABEL = "block text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]";
const BTN = "rounded-full border hairline px-3 py-1 text-[11.5px] font-bold text-ink-300 hover:bg-white/8 disabled:opacity-50";
const BTN_ON = "rounded-full bg-tide-500 px-3 py-1 text-[11.5px] font-extrabold text-abyss-950 disabled:opacity-50";

export function IncidentCommand({
  rows,
  statusTone,
}: {
  rows: IncidentRow[];
  statusTone: Record<string, "sun" | "tide" | "slate">;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function patch(id: string, payload: Record<string, unknown>, done?: () => void) {
    setBusy(id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "That did not work.");
      setMsg({ ok: true, text: typeof data.error === "string" ? data.error : "Saved." });
      done?.();
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not reach the server." });
    } finally {
      setBusy(null);
    }
  }

  if (!rows.length) return null;

  return (
    <div className="space-y-3">
      {msg ? (
        <p
          role={msg.ok ? "status" : "alert"}
          aria-live={msg.ok ? "polite" : "assertive"}
          className={`rounded-lg px-3 py-2 text-[12.5px] ${msg.ok ? "bg-tide-500/12 text-tide-300" : "bg-danger-500/15 text-danger-500"}`}
        >
          {msg.text}
        </p>
      ) : null}

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">Incidents, newest first</caption>
          <thead className="bg-white/5 text-[10.5px] font-bold uppercase tracking-wide text-[#6e97a0]">
            <tr>
              <th scope="col" className="px-4 py-2.5">Incident</th>
              <th scope="col" className="px-4 py-2.5">Location</th>
              <th scope="col" className="px-4 py-2.5">When</th>
              <th scope="col" className="px-4 py-2.5">Source</th>
              <th scope="col" className="px-4 py-2.5">Status</th>
              <th scope="col" className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y hairline">
            {rows.map((r) => (
              // Fragment, not <>, so the pair of rows can carry the key React
              // needs for a list. The short syntax cannot take one.
              <Fragment key={r.id}>
                <tr className="align-top transition hover:bg-white/[.04]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sand-100">{r.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-400">
                      {SEVERITY_LABEL[r.severity] ?? "Unknown"} · {r.category} · {r.confirmations} confirmed · {r.sightings} seen
                      {r.authorHandle ? ` · @${r.authorHandle}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[#a9cdc9]">
                    {r.address ?? r.parish ?? "—"}
                    <span className="mt-0.5 block font-mono text-[10.5px] text-ink-400">
                      {r.lat.toFixed(3)}, {r.lng.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#a9cdc9]">
                    {r.ago}
                    {r.resolvedAt ? <span className="mt-0.5 block text-[11px] text-tide-300">closed</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={r.source.tone}>{r.source.label}</Pill>
                    {r.sourceName ? <span className="mt-1 block text-[11px] text-ink-400">{r.sourceName}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={statusTone[r.status] ?? "slate"}>{r.status}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOpen(open === r.id ? null : r.id)}
                        aria-expanded={open === r.id}
                        className={BTN}
                      >
                        {open === r.id ? "Close" : "Manage"}
                      </button>
                      {r.status !== "resolved" ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void patch(r.id, { action: "setStatus", status: "resolved" })}
                          className="rounded-full bg-tide-500/18 px-3 py-1 text-[11.5px] font-bold text-tide-300 hover:bg-tide-500/30 disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>

                {open === r.id ? (
                  <tr className="bg-abyss-950/40">
                    <td colSpan={6} className="px-4 py-4">
                      <ManagePanel row={r} busy={busy === r.id} onPatch={(payload, done) => void patch(r.id, payload, done)} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * The per-row panel. Editing, the status lifecycle, and merging -- the three
 * things the Incident Command module exists to do.
 */
function ManagePanel({
  row,
  busy,
  onPatch,
}: {
  row: IncidentRow;
  busy: boolean;
  onPatch: (payload: Record<string, unknown>, done?: () => void) => void;
}) {
  const [form, setForm] = useState({
    title: row.title,
    details: row.details ?? "",
    address: row.address ?? "",
    severity: String(row.severity),
    category: row.category,
  });
  const [status, setStatus] = useState<Status>(row.status as Status);
  const [reason, setReason] = useState("");
  const [intoId, setIntoId] = useState("");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ---- Edit the details ---- */}
      <section>
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#6e97a0]">Edit details</h3>
        <div className="mt-2 grid gap-2.5">
          <label className="block">
            <span className={LABEL}>Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={140}
              className={FIELD}
            />
          </label>
          <label className="block">
            <span className={LABEL}>Description</span>
            <textarea
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              maxLength={4000}
              rows={3}
              className={FIELD}
            />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className={LABEL}>Address</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                maxLength={200}
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Severity</span>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className={FIELD}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} — {SEVERITY_LABEL[n]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onPatch({
                  action: "edit",
                  title: form.title,
                  details: form.details,
                  address: form.address,
                  severity: Number(form.severity),
                  category: form.category,
                })
              }
              className={BTN_ON}
            >
              {busy ? "Saving…" : "Save details"}
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        {/* ---- Status lifecycle ---- */}
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#6e97a0]">Status</h3>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Incident status">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1 text-[11.5px] font-bold capitalize transition disabled:opacity-50 ${
                  status === s ? "bg-tide-500 text-abyss-950" : "border hairline text-ink-300 hover:bg-white/8"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* "Unfounded" accuses the reporter, so it needs a reason before it can be saved. */}
          {status === "unfounded" ? (
            <label className="mt-2.5 block">
              <span className={LABEL}>Why is it unfounded?</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                className={FIELD}
                placeholder="Kept in the activity log"
              />
            </label>
          ) : null}

          <div className="mt-2.5">
            <button
              type="button"
              disabled={busy || status === row.status}
              onClick={() => onPatch({ action: "setStatus", status, reason })}
              className={BTN_ON}
            >
              {busy ? "Saving…" : `Mark ${status}`}
            </button>
            {status === row.status ? <span className="ml-2 text-[11.5px] text-ink-400">already {status}</span> : null}
          </div>
        </section>

        {/* ---- Merge ---- */}
        <section>
          <h3 className="text-[12px] font-bold uppercase-wide text-[#6e97a0]">Merge into another incident</h3>
          <p className="mt-1 text-[11.5px] text-ink-400">
            Everything pointing here — confirmations, comments, sightings — moves to the incident you name, and this row is
            deleted. Use it when two people reported the same thing.
          </p>
          <label className="mt-2 block">
            <span className={LABEL}>Target incident id</span>
            <input
              value={intoId}
              onChange={(e) => setIntoId(e.target.value)}
              className={`${FIELD} font-mono`}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </label>
          <div className="mt-2.5">
            <button
              type="button"
              disabled={busy || !intoId.trim()}
              onClick={() => {
                // A merge deletes this row. Confirm first, because there is no undo.
                if (!window.confirm(`Merge "${row.title}" into ${intoId.trim()}? This cannot be undone.`)) return;
                onPatch({ action: "merge", intoId: intoId.trim() });
              }}
              className="rounded-full border border-conch-500/40 px-3 py-1 text-[11.5px] font-bold text-conch-400 hover:bg-conch-500/15 disabled:opacity-50"
            >
              {busy ? "Merging…" : "Merge this incident"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
