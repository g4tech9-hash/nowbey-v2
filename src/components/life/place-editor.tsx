"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { compressImage } from "@/lib/image-client";
import { DAYS, DAY_LABELS, type Day } from "@/lib/places";

type Props = {
  placeId: string;
  kind: string;
  signedIn: boolean;
  initial: { address: string | null; hours: Partial<Record<Day, string>>; menuText: string | null };
};

const field = "mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[13px] outline-none focus:border-tide-400";
const label = "text-[11.5px] font-bold uppercase tracking-wide text-tide-400";

export function PlaceEditor({ placeId, kind, signedIn, initial }: Props) {
  const router = useRouter();
  const [address, setAddress] = useState(initial.address ?? "");
  const [hours, setHours] = useState<Partial<Record<Day, string>>>(initial.hours);
  const [menu, setMenu] = useState(initial.menuText ?? "");
  const [photoKind, setPhotoKind] = useState<"photo" | "menu">(kind === "food" || kind === "night" ? "menu" : "photo");
  const [busy, setBusy] = useState<null | "save" | "upload">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!signedIn) {
    return <p className="text-[13px] text-sand-200">Sign in on the <a className="underline" href="/you">You page</a> to add hours, an address, a menu or photos.</p>;
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    try {
      const res = await fetch(`/api/life/place/${placeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, hours, menuText: menu }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      setMsg({ ok: true, text: "Saved. Thank you." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setBusy(null);
    }
  }

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy("upload");
    setMsg(null);
    try {
      const form = new FormData();
      form.append("kind", photoKind);
      for (const f of Array.from(files).slice(0, 6)) {
        const blob = await compressImage(f);
        form.append("photos", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      }
      const res = await fetch(`/api/life/place/${placeId}`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not upload.");
      setMsg({ ok: true, text: "Photos added. Thank you." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not upload." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className={label}>Address</span>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area" className={field} maxLength={160} />
      </label>

      <div>
        <p className={label}>Opening hours</p>
        <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
          {DAYS.map((d) => (
            <label key={d} className="flex items-center gap-2 text-[12.5px]">
              <span className="w-20 shrink-0 text-sand-200">{DAY_LABELS[d]}</span>
              <input
                value={hours[d] ?? ""}
                onChange={(e) => setHours({ ...hours, [d]: e.target.value })}
                placeholder="9:00 AM - 5:00 PM or Closed"
                className="w-full rounded-lg border border-white/10 bg-abyss-950/70 px-2 py-1.5 text-[12.5px] outline-none focus:border-tide-400"
                maxLength={60}
              />
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className={label}>Menu or popular items (one per line)</span>
        <textarea value={menu} onChange={(e) => setMenu(e.target.value)} rows={5} placeholder={"Cracked conch - $24\nGrouper sandwich - $16"} className={field} maxLength={4000} />
      </label>
      <button type="button" disabled={busy !== null} onClick={save} className="rounded-full bg-tide-400 px-4 py-2 text-[13px] font-extrabold text-abyss-950 disabled:opacity-60">
        {busy === "save" ? "Saving..." : "Save details"}
      </button>

      <div className="border-t border-white/10 pt-4">
        <p className={label}>Add photos</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <select value={photoKind} onChange={(e) => setPhotoKind(e.target.value as "photo" | "menu")} className="rounded-lg border border-white/10 bg-abyss-950/80 px-2 py-1.5 text-[12.5px]">
            <option value="photo">Photo of the place</option>
            <option value="menu">Photo of the menu</option>
          </select>
          <input type="file" accept="image/*" multiple disabled={busy !== null} onChange={(e) => void upload(e.target.files)} className="text-[12.5px]" />
        </div>
        {busy === "upload" ? <p className="mt-1 text-[12px] text-sand-200">Uploading...</p> : null}
      </div>

      {msg ? <p className={`text-[12px] ${msg.ok ? "text-tide-300" : "text-red-300"}`}>{msg.text}</p> : null}
    </div>
  );
}
