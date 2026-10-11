"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  confirmations: number;
  status: string;
  handle?: string | null;
  compact?: boolean;
};

export function IncidentActions({ id, confirmations, status, handle, compact = false }: Props) {
  const router = useRouter();
  const [n, setN] = useState(confirmations);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function send(kind: string, extra: Record<string, unknown> = {}) {
    setBusy(kind);
    setNote(null);
    try {
      const res = await fetch(`/api/incidents/${id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, authorHandle: handle ?? "neighbour", ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reach the wire");
      setN(data.incident?.confirmations ?? n);
      if (data.message) setNote(data.message);
      router.refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className={`flex flex-wrap gap-1.5 ${compact ? "text-[11px]" : "text-[12px]"}`}>
        <button
          type="button"
          onClick={() => send("confirm")}
          disabled={busy !== null}
          className="rounded-full bg-tide-500/15 px-2.5 py-1 font-bold text-tide-300 ring-1 ring-tide-400/35 hover:bg-tide-500 hover:text-abyss-950 disabled:opacity-50"
        >
          Still there · {n}
        </button>
        <button
          type="button"
          onClick={() => send("photo", { note: "I saw it too." })}
          disabled={busy !== null}
          className="rounded-full bg-white/8 px-2.5 py-1 font-bold text-[#cfeee9] hover:bg-white/16 disabled:opacity-50"
        >
          Saw it too
        </button>
        {status === "active" ? (
          <button
            type="button"
            onClick={() => send("clear")}
            disabled={busy !== null}
            className="rounded-full bg-white/8 px-2.5 py-1 font-bold text-[#cfeee9] hover:bg-white/16 disabled:opacity-50"
          >
            Cleared up
          </button>
        ) : null}
        {status === "active" ? (
          <button
            type="button"
            onClick={() => send("escalate")}
            disabled={busy !== null}
            className="rounded-full bg-conch-500/15 px-2.5 py-1 font-bold text-conch-400 hover:bg-conch-500/28 disabled:opacity-50"
          >
            Getting worse
          </button>
        ) : null}
      </div>
      {note ? <p className="text-[11.5px] text-sun-400">{note}</p> : null}
    </div>
  );
}
