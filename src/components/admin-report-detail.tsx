"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, PARISHES, type CategoryKey } from "@/lib/geo";

const BTN = "rounded-full px-3 py-1.5 text-[12px] font-bold disabled:opacity-50";
const INPUT = "w-full rounded-xl border hairline bg-abyss-900/60 px-3 py-2 text-[13px] text-sand-100 outline-none focus:border-tide-400";

async function patch(body: unknown) {
  const res = await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not do that.");
  return data;
}

export type ReportForEdit = {
  id: string;
  title: string;
  details: string | null;
  category: string;
  severity: number;
  street: string | null;
  parish: string | null;
};

/** Incident Command editor: fix the headline, details, category, severity or location in place. */
export function ReportEditor({ report }: { report: ReportForEdit }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      const f = new FormData(e.currentTarget);
      await patch({
        id: report.id,
        action: "update",
        title: String(f.get("title") ?? ""),
        details: String(f.get("details") ?? ""),
        category: String(f.get("category") ?? ""),
        severity: Number(f.get("severity") ?? 2),
        street: String(f.get("street") ?? ""),
        parish: String(f.get("parish") ?? ""),
      });
      setSaved(true);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="rep-title" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]">Headline</label>
        <input id="rep-title" name="title" defaultValue={report.title} maxLength={140} required className={INPUT} />
      </div>
      <div>
        <label htmlFor="rep-details" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]">Details</label>
        <textarea id="rep-details" name="details" defaultValue={report.details ?? ""} rows={4} maxLength={2000} className={INPUT} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="rep-category" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]">Category</label>
          <select id="rep-category" name="category" defaultValue={report.category} className={INPUT}>
            {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => (
              <option key={k} value={k}>{CATEGORIES[k].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rep-severity" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]">Severity</label>
          <select id="rep-severity" name="severity" defaultValue={String(report.severity)} className={INPUT}>
            <option value="1">1 · Annoying (stays quiet)</option>
            <option value="2">2 · Blocking a lane</option>
            <option value="3">3 · Blocking a road</option>
            <option value="4">4 · Dangerous</option>
          </select>
        </div>
        <div>
          <label htmlFor="rep-street" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]">Street / landmark</label>
          <input id="rep-street" name="street" defaultValue={report.street ?? ""} maxLength={160} className={INPUT} />
        </div>
        <div>
          <label htmlFor="rep-parish" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]">Island</label>
          <select id="rep-parish" name="parish" defaultValue={report.parish ?? ""} className={INPUT}>
            <option value="">—</option>
            {PARISHES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className={`${BTN} bg-tide-500 font-extrabold text-abyss-950`}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        {saved ? <span className="text-[12px] font-bold text-tide-300">Saved.</span> : null}
        {err ? <span className="text-[12px] text-conch-400">{err}</span> : null}
      </div>
    </form>
  );
}

/** Merge another report INTO this one: its updates, comments and reactions move here, and it is hidden. */
export function ReportMerge({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const from = String(f.get("from") ?? "").trim();
    if (!from) return;
    if (!window.confirm("Merge that report into this one? Its updates, comments and confirmations move here, and it will be hidden. This cannot be undone.")) return;
    setBusy(true);
    setErr(null);
    try {
      await patch({ action: "merge", into: id, from });
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not merge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="merge-from" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]">
          Merge another report into this one (paste its id)
        </label>
        <input id="merge-from" name="from" placeholder="e.g. 3f2c…" className={INPUT} />
      </div>
      <button type="submit" disabled={busy} className={`${BTN} bg-white/10 text-sand-100 hover:bg-white/16`}>
        {busy ? "Merging…" : "Merge"}
      </button>
      {err ? <span className="text-[12px] text-conch-400">{err}</span> : null}
    </form>
  );
}
