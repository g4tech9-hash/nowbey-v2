"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BTN = "rounded-full px-3 py-1.5 text-[12px] font-bold disabled:opacity-50";

async function patch(url: string, body: unknown) {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not do that.");
  return data;
}

/** Approve or reject a link a reader sent in. */
export function ReviewButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go(action: "approve" | "reject") {
    setBusy(action);
    setErr(null);
    try {
      await patch("/api/admin/news", { id, action });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not do that.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-1.5">
        <button type="button" disabled={busy !== null} onClick={() => go("approve")} className={`${BTN} bg-tide-500 font-extrabold text-abyss-950`}>
          {busy === "approve" ? "…" : "Approve"}
        </button>
        <button type="button" disabled={busy !== null} onClick={() => go("reject")} className={`${BTN} border hairline text-danger-500 hover:bg-white/8`}>
          {busy === "reject" ? "…" : "Reject"}
        </button>
      </div>
      {err ? <p className="text-[11.5px] text-danger-500">{err}</p> : null}
    </div>
  );
}

/** Take a story that is already public off the wire. */
export function RemoveStoryButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Take this story off the wire?")) return;
          setBusy(true);
          setErr(null);
          try {
            await patch("/api/admin/news", { id, action: "remove" });
            router.refresh();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not do that.");
          } finally {
            setBusy(false);
          }
        }}
        className={`${BTN} border hairline text-danger-500 hover:bg-white/8`}
      >
        {busy ? "…" : "Remove"}
      </button>
      {err ? <p className="text-[11.5px] text-danger-500">{err}</p> : null}
    </div>
  );
}

/** Resolve, hide or restore a report. Deleting for good is only offered for hidden reports, and only to admins. */
export function ReportActions({ id, status, canDelete }: { id: string; status: string; canDelete: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go(action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setErr(null);
    try {
      await patch("/api/admin/reports", { id, action });
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
        {status === "active" ? (
          <>
            <button type="button" disabled={busy !== null} onClick={() => go("resolve")} className={soft}>
              {busy === "resolve" ? "…" : "Mark resolved"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => go("unfounded", "Mark this report unfounded? It stays on record but leaves the active map.")} className={soft}>
              {busy === "unfounded" ? "…" : "Mark unfounded"}
            </button>
          </>
        ) : null}
        {status === "unfounded" ? (
          <button type="button" disabled={busy !== null} onClick={() => go("reopen")} className={soft}>
            {busy === "reopen" ? "…" : "Reopen"}
          </button>
        ) : null}
        {status === "resolved" ? (
          <button type="button" disabled={busy !== null} onClick={() => go("reopen")} className={soft}>
            {busy === "reopen" ? "…" : "Reopen"}
          </button>
        ) : null}
        {status !== "archived" ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => go("archive", "Hide this report from the public? You can restore it later.")}
            className={`${BTN} border hairline text-danger-500 hover:bg-white/8`}
          >
            {busy === "archive" ? "…" : "Hide"}
          </button>
        ) : (
          <>
            <button type="button" disabled={busy !== null} onClick={() => go("restore")} className={`${BTN} bg-tide-500 font-extrabold text-abyss-950`}>
              {busy === "restore" ? "…" : "Restore"}
            </button>
            {canDelete ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => go("delete", "Delete this report for good? This cannot be undone.")}
                className={`${BTN} border border-conch-500/40 text-danger-500 hover:bg-conch-500/10`}
              >
                {busy === "delete" ? "…" : "Delete for good"}
              </button>
            ) : null}
          </>
        )}
      </div>
      {err ? <p className="text-[11.5px] text-danger-500">{err}</p> : null}
    </div>
  );
}

export function EnquiryStatus({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <div className="flex gap-1">
        {(["new", "contacted", "closed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy !== null || s === status}
            aria-pressed={s === status}
            onClick={async () => {
              setBusy(s);
              setErr(null);
              try {
                await patch("/api/admin/enquiries", { id, status: s });
                router.refresh();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Could not do that.");
              } finally {
                setBusy(null);
              }
            }}
            className={`${BTN} ${s === status ? "bg-tide-500 text-abyss-950" : "bg-white/8 text-ink-200 hover:bg-white/14"}`}
          >
            {s === "new" ? "New" : s === "contacted" ? "Contacted" : "Closed"}
          </button>
        ))}
      </div>
      {err ? <p className="mt-1 text-[11.5px] text-danger-500">{err}</p> : null}
    </div>
  );
}

export function SendAlertButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (!window.confirm("Email this story to every subscriber for this island? This cannot be undone.")) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await patch("/api/admin/news", { id, action: "alert" });
      const sent = (r as { stats?: { sent?: number } }).stats?.sent ?? 0;
      window.alert(sent ? `Alert sent to ${sent} subscriber${sent === 1 ? "" : "s"}.` : "Sent. Nobody is subscribed to this island yet.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send the alert.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" disabled={busy} onClick={go} className={`${BTN} bg-tide-500 font-extrabold text-abyss-950`}>
        {busy ? "Sending…" : "Send alert"}
      </button>
      {err ? <p className="text-[11.5px] text-danger-500">{err}</p> : null}
    </div>
  );
}
