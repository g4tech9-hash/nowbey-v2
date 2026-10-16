"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Admins only: pulls bars, restaurants, cafes and beaches from OpenStreetMap. Safe to run again. */
export function PlaceImportButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    if (!confirm("Import venues from OpenStreetMap? Places already listed are skipped.")) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/places/import", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "The import failed.");
      setNote(`Found ${data.found} venues. Added ${data.added} new ones.`);
      router.refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "The import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={run} disabled={busy} className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-bold text-abyss-950 disabled:opacity-50">
        {busy ? "Importing…" : "Import venues from OpenStreetMap"}
      </button>
      {note ? <span className="text-[12px] text-ink-300">{note}</span> : null}
    </div>
  );
}
