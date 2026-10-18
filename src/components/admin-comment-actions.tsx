"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BTN = "rounded-full px-3 py-1.5 text-[12px] font-bold disabled:opacity-50";

export function CommentModActions({ id, status, flagged }: { id: number; status: string; flagged: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go(action: string, confirmText?: string, extra?: Record<string, unknown>) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setErr(null);
    try {
      const res = await fetch("/api/admin/comments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, ...extra }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not do that.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not do that.");
    } finally {
      setBusy(null);
    }
  }

  const soft = `${BTN} bg-white/10 text-sand-100 hover:bg-white/16`;
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1.5">
        {status === "published" ? (
          <button type="button" disabled={busy !== null} onClick={() => go("hide", "Hide this comment from the public? You can restore it later.")} className={`${BTN} border hairline text-danger-500 hover:bg-white/8`}>
            {busy === "hide" ? "…" : "Hide"}
          </button>
        ) : status === "hidden" ? (
          <button type="button" disabled={busy !== null} onClick={() => go("restore")} className={`${BTN} bg-tide-500 font-extrabold text-on-accent`}>
            {busy === "restore" ? "…" : "Restore"}
          </button>
        ) : null}
        {flagged ? (
          <>
            <button type="button" disabled={busy !== null} onClick={() => go("approve")} className={`${BTN} bg-tide-500 font-extrabold text-on-accent`}>
              {busy === "approve" ? "…" : "Approve"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => go("clearFlags")} className={soft}>
              {busy === "clearFlags" ? "…" : "Dismiss reports"}
            </button>
          </>
        ) : null}
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => go("delete", "Delete this comment? If people replied to it, it stays as a blank so their replies still make sense.")}
          className={`${BTN} border border-conch-500/40 text-danger-500 hover:bg-conch-500/10`}
        >
          {busy === "delete" ? "…" : "Delete"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            const reason = window.prompt("Why is this comment being removed? This warning goes on the author's staff record.", "broke the community rules");
            if (reason === null) return;
            go("deleteWarn", undefined, { reason });
          }}
          className={`${BTN} bg-conch-500 font-extrabold text-on-accent`}
        >
          {busy === "deleteWarn" ? "…" : "Delete & warn user"}
        </button>
      </div>
      {err ? <p className="text-[11.5px] text-danger-500">{err}</p> : null}
    </div>
  );
}
