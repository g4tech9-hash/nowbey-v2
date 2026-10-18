"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * One place that talks to `/api/incidents/:id/updates`.
 *
 * The contract is unchanged from the component this replaces — POST
 * `{kind, authorHandle, note?}`, read back `{incident:{confirmations}, message}`
 * — but the *shape of the result* is what the Pulse controls need: a boolean
 * success so `ConfirmButton` can roll its optimistic count back, and a message
 * for the polite live region. Errors are returned, not thrown: a failed confirm
 * must never take the stream down with it.
 *
 * `stub: true` (no database configured, or a design walkthrough) keeps the count
 * moving locally so the flow is still testable; nothing is sent.
 */
export type UpdateResult = { ok: boolean; message: string; confirmations?: number };

export function useIncidentUpdate(id: string, handle: string | null | undefined, stub = false) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const send = useCallback(
    async (kind: "confirm" | "photo" | "clear" | "escalate", note?: string): Promise<UpdateResult> => {
      if (stub) {
        await new Promise((r) => setTimeout(r, 260));
        return {
          ok: true,
          message: kind === "confirm" ? "Noted — the count is up." : kind === "photo" ? "Marked: you saw it too." : "Saved.",
          confirmations: undefined,
        };
      }
      setPending(kind);
      try {
        const res = await fetch(`/api/incidents/${id}/updates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, authorHandle: handle ?? "neighbour", ...(note ? { note } : {}) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, message: data?.error ?? "Could not reach the wire." };
        // The server is the source of truth for the count; let it re-render.
        router.refresh();
        return {
          ok: true,
          message: data?.message ?? (kind === "confirm" ? "Still there — thanks." : "Saved."),
          confirmations: typeof data?.incident?.confirmations === "number" ? data.incident.confirmations : undefined,
        };
      } catch {
        return { ok: false, message: "Could not reach the wire. Your tap was not counted." };
      } finally {
        setPending(null);
      }
    },
    [id, handle, router, stub],
  );

  return { send, pending };
}
