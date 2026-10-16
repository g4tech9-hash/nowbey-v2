"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileAvatar({ handle, version = "" }: { handle: string; version?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-abyss-900 bg-tide-500/20 text-3xl font-extrabold text-tide-300 shadow-lg">
    {failed ? <span aria-label={`@${handle} profile initials`}>{handle.slice(0, 2).toUpperCase()}</span> :
      // Same-origin privacy-checked endpoint; not an external image URL.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/avatars/${encodeURIComponent(handle)}?v=${version}`} alt={`@${handle} profile photo`} className="h-full w-full object-cover" onError={() => setFailed(true)} />}
  </div>;
}

export function AvatarEditor({ handle }: { handle: string }) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(file?: File) {
    if (file && file.size > 3 * 1024 * 1024) { setMessage("Choose a photo under 3 MB."); return; }
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/account/avatar", { method: file ? "POST" : "DELETE", body: file });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update photo.");
      setVersion((v) => v + 1); router.refresh();
      setMessage(file ? "Profile photo updated." : "Profile photo removed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update photo."); }
    finally { setBusy(false); }
  }
  return <section className="nb-surface rounded-2xl p-4" aria-label="Profile photo">
    <div className="flex flex-wrap items-center gap-4">
      <ProfileAvatar key={version} handle={handle} version={String(version)} />
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="font-bold text-sand-100">Your profile photo</h2>
        <p className="text-sm text-ink-400">Optional · JPEG, PNG or WebP under 3 MB. Photos are cropped square; location metadata is removed. Your profile visibility applies to your photo too.</p>
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-label="Upload profile photo" className="block w-full max-w-full text-sm" onChange={(e) => { const file = e.target.files?.[0]; if (file) void save(file); e.target.value = ""; }} />
        <button type="button" disabled={busy} onClick={() => void save()} className="min-h-[44px] rounded-full border hairline px-3 text-sm font-bold disabled:opacity-50">Remove photo</button>
        <p role="status" className="text-sm text-tide-300">{busy ? "Saving…" : message}</p>
      </div>
    </div>
  </section>;
}
