"use client";

import { useState } from "react";
import { PARISHES } from "@/lib/geo";

export function ServiceStatusForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setMessage("");
      const form = new FormData(event.currentTarget);
      const body = Object.fromEntries(form.entries());
      try {
        const response = await fetch("/api/admin/statuses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, verified: form.get("verified") === "on" }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save status.");
        setMessage("Saved. Refreshing…"); window.location.reload();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save status."); setBusy(false); }
    }}>
      <Field name="name" label="Business or service name" required />
      <label className="text-[12px] font-bold text-ink-300">Service type<select name="kind" className="mt-1 min-h-[44px] w-full rounded-xl border hairline bg-abyss-900 px-3 text-sand-100"><option value="pharmacy">Pharmacy</option><option value="food">Food store</option><option value="fuel">Fuel</option><option value="hardware">Hardware</option><option value="water">Drinking water</option><option value="charging">Phone charging</option><option value="clinic">Clinic</option><option value="shelter">Shelter</option><option value="other">Other</option></select></label>
      <label className="text-[12px] font-bold text-ink-300">Status<select name="status" className="mt-1 min-h-[44px] w-full rounded-xl border hairline bg-abyss-900 px-3 text-sand-100"><option value="open">Open</option><option value="limited">Limited service</option><option value="closed">Closed</option><option value="unknown">Needs a new check</option></select></label>
      <label className="text-[12px] font-bold text-ink-300">Island<select name="parish" defaultValue="New Providence" className="mt-1 min-h-[44px] w-full rounded-xl border hairline bg-abyss-900 px-3 text-sand-100">{PARISHES.map((p) => <option key={p}>{p}</option>)}</select></label>
      <Field name="address" label="Address or area" /><Field name="sourceName" label="Source name" />
      <Field name="sourceUrl" label="Source link" type="url" /><Field name="hours" label="Expires after hours" type="number" defaultValue="24" />
      <label className="sm:col-span-2 text-[12px] font-bold text-ink-300">Public note<textarea name="note" maxLength={500} className="mt-1 min-h-24 w-full rounded-xl border hairline bg-abyss-900 p-3 text-sand-100" /></label>
      <label className="flex min-h-[44px] items-center gap-2 text-[13px] font-bold text-sand-100"><input name="verified" type="checkbox" /> Staff checked this source</label>
      <div className="flex items-center gap-3"><button disabled={busy} className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-on-accent disabled:opacity-50">{busy ? "Saving…" : "Publish status"}</button>{message ? <span className="text-[12px] text-sun-600">{message}</span> : null}</div>
    </form>
  );
}

export function DeleteServiceStatus({ id }: { id: number }) {
  return <button type="button" className="text-[11.5px] font-bold text-danger-500 underline" onClick={async () => { if (!confirm("Remove this public status?")) return; await fetch("/api/admin/statuses", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); window.location.reload(); }}>Remove</button>;
}

function Field({ name, label, type = "text", required = false, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
  return <label className="text-[12px] font-bold text-ink-300">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} className="mt-1 min-h-[44px] w-full rounded-xl border hairline bg-abyss-900 px-3 text-sand-100" /></label>;
}
