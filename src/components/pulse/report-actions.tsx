"use client";

import { Flame, Eye, Check, CloudOff } from "lucide-react";
import { ActionPill, AriaAnnouncer, ConfirmButton } from "@/ui/pulse";
import { useAnnouncer } from "@/lib/pulse/motion";
import { useIncidentUpdate } from "./use-incident-update";

/**
 * The four things a neighbour can do to a report, in the order they cost them.
 *
 * Confirm is the primary and the only one that gets a celebration; "saw it too"
 * is a lighter version of the same fact; "cleared up" and "getting worse" are
 * rarer and live beside them, because severity and status are how the feed
 * decides what to show first. Same `POST /api/incidents/:id/updates` body the
 * old component sent — `{kind, authorHandle, note?}` — so the server, the rate
 * limit and the timeline all behave exactly as before. The difference is what
 * the *person* gets: a busy label on the button that was pressed, a count that
 * moves before the response lands and rolls back if it fails, and a spoken
 * outcome through the polite live region.
 */
export function ReportActions({
  id,
  confirmations,
  status,
  handle = null,
  stub = false,
  sticky = false,
}: {
  id: string;
  confirmations: number;
  status: string;
  handle?: string | null;
  stub?: boolean;
  /** Phones: the bar sticks to the bottom edge, above the safe area. */
  sticky?: boolean;
}) {
  const { send, pending } = useIncidentUpdate(id, handle, stub);
  const { announce, message } = useAnnouncer();
  const open = status === "active";

  return (
    <div className={sticky ? "pulse-action-bar" : "flex flex-wrap items-center gap-2"}>
      <AriaAnnouncer message={message} />
      <ConfirmButton
        count={confirmations}
        active={false}
        label="Still there"
        activeLabel="Counted"
        onResult={(r) => announce(r.active ? `Confirmed. ${r.count} neighbours now say it is still there.` : "Removed your confirmation.")}
        onToggle={async () => {
          const out = await send("confirm");
          if (!out.ok) {
            announce(out.message);
            throw new Error(out.message);
          }
          announce(`${out.message} ${out.confirmations ?? ""}${out.confirmations ? " neighbours now confirm it." : ""}`);
        }}
      />
      <ActionPill tone="neutral" ariaLabel="Mark that you saw it too" disabled={pending !== null} onClick={() => void run("photo", "I saw it too.")}>
        <Eye size={14} strokeWidth={2.4} aria-hidden />
        {pending === "photo" ? "Saving…" : "Saw it too"}
      </ActionPill>
      {open ? (
        <ActionPill tone="neutral" ariaLabel="Mark this cleared up" disabled={pending !== null} onClick={() => void run("clear")}>
          <CloudOff size={14} strokeWidth={2.4} aria-hidden />
          {pending === "clear" ? "Saving…" : "Cleared up"}
        </ActionPill>
      ) : null}
      {open ? (
        <ActionPill tone="danger" ariaLabel="Report that this is getting worse" disabled={pending !== null} onClick={() => void run("escalate")}>
          <Flame size={14} strokeWidth={2.4} aria-hidden />
          {pending === "escalate" ? "Saving…" : "Getting worse"}
        </ActionPill>
      ) : null}
      {pending ? (
        <span className="pulse-sending">
          <Check size={13} strokeWidth={2.6} aria-hidden />
          {pending === "confirm" ? "Confirming…" : pending === "photo" ? "Sending…" : "Saving…"}
        </span>
      ) : null}
    </div>
  );

  async function run(kind: "photo" | "clear" | "escalate", note?: string) {
    const out = await send(kind, note);
    announce(out.message);
  }
}
