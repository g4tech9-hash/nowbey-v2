"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PARISHES } from "@/lib/geo";

export function GasForm({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [station, setStation] = useState("");
  const [parish, setParish] = useState("New Providence");
  const [fuel, setFuel] = useState("regular");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!signedIn) {
    return <p className="text-[13px] text-sand-200">Sign in on the <a className="underline" href="/you">You page</a> to report a price. Everyone can read them.</p>;
  }
  const input = "mt-1 w-full rounded-lg border border-white/10 bg-base/70 px-2.5 py-2 text-[13px] outline-none focus:border-accent-hover";
  return (
    <form
      className="space-y-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const res = await fetch("/api/gas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ station, parish, fuel, price }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Could not save that price.");
          setMsg({ ok: true, text: "Thanks! Your price is on the board." });
          setPrice("");
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save that price." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block"><span className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">Station</span>
        <input value={station} onChange={(e) => setStation(e.target.value)} placeholder="Shell, Prince George Wharf" className={input} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">Island</span>
          <select value={parish} onChange={(e) => setParish(e.target.value)} className={input}>{PARISHES.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="block"><span className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">Fuel</span>
          <select value={fuel} onChange={(e) => setFuel(e.target.value)} className={input}><option value="regular">Regular</option><option value="premium">Premium</option><option value="diesel">Diesel</option></select></label>
      </div>
      <label className="block"><span className="text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">Price per gallon (B$)</span>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="5.49" className={input} /></label>
      <button disabled={busy} className="rounded-full bg-accent-hover px-4 py-2 text-[13px] font-extrabold text-on-accent disabled:opacity-60">{busy ? "Saving..." : "Report price"}</button>
      {msg ? <p className={`text-[12px] ${msg.ok ? "text-text-accent" : "text-red-300"}`}>{msg.text}</p> : null}
    </form>
  );
}
