"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FLAG_REASONS, type FlagReason } from "@/lib/life-kinds";

type Note = { ok: boolean; text: string } | null;

export function PostActions({ id, title, isOwner, canDelete }: { id: string; title: string; isOwner: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState<Note>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<FlagReason>("spam");
  const [busy, setBusy] = useState<"report" | "delete" | null>(null);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote({ ok: true, text: "Link copied. Paste it anywhere to share." });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // they closed the share sheet
      setNote({ ok: false, text: "Could not copy the link. Copy the address from your browser instead." });
    }
  }

  async function report() {
    setBusy("report");
    setNote(null);
    try {
      const res = await fetch(`/api/life/${id}/flag`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send that.");
      setReporting(false);
      setNote({ ok: true, text: data.already ? "You have already reported this post. Thank you." : "Thank you. Our team will take a look." });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Could not send that." });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this post for good? Its photos, comments and reactions go with it. This cannot be undone.")) return;
    setBusy("delete");
    setNote(null);
    try {
      const res = await fetch(`/api/life/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete it.");
      router.push("/life");
      router.refresh();
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Could not delete it." });
      setBusy(null);
    }
  }

  const btn = "inline-flex min-h-[36px] items-center rounded-full bg-white/8 px-3.5 text-[12.5px] font-bold text-secondary hover:bg-white/14 disabled:opacity-50";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={share} className={btn}>
          Share
        </button>
        {!isOwner ? (
          <button type="button" onClick={() => setReporting((v) => !v)} aria-expanded={reporting} className={btn}>
            Report
          </button>
        ) : null}
        {canDelete ? (
          <button type="button" disabled={busy !== null} onClick={remove} className={`${btn} text-danger-500`}>
            {busy === "delete" ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>
      {reporting ? (
        <div className="mt-2.5 rounded-xl border hairline bg-white/[.03] p-3">
          <label className="block text-[12px] font-bold text-primary">
            What is wrong with this post?
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as FlagReason)}
              className="mt-1.5 block w-full rounded-lg border border-white/10 bg-base/80 px-2.5 py-2 text-[13px] font-normal outline-none focus:border-accent-hover"
            >
              {(Object.keys(FLAG_REASONS) as FlagReason[]).map((r) => (
                <option key={r} value={r}>
                  {FLAG_REASONS[r]}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2.5 flex gap-2">
            <button type="button" disabled={busy !== null} onClick={report} className="rounded-lg bg-danger-500 px-3.5 py-2 text-[12.5px] font-extrabold text-on-accent disabled:opacity-50">
              {busy === "report" ? "Sending…" : "Send report"}
            </button>
            <button type="button" onClick={() => setReporting(false)} className="rounded-lg border hairline px-3.5 py-2 text-[12.5px] font-bold text-primary hover:bg-white/8">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {note ? (
        <p role="status" className={`mt-2 text-[12.5px] ${note.ok ? "text-text-accent" : "text-danger-500"}`}>
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
