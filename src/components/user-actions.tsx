"use client";

/**
 * User Management -- the three actions the module exists for, on the row
 * itself rather than one click deeper:
 *
 *   Suspend Account            stops the person signing in, everywhere
 *   Ban Device                 stops the hardware, so a fresh email on the same
 *                              handset does not walk back in
 *   Verified Broadcaster       clears them to go live on the island feed
 *
 * They live in the table rather than on the member detail page on purpose: a
 * moderation decision is usually made while looking at a list, and the detail
 * page is where you go to read the history afterwards.
 *
 * Each button owns its own busy flag, so two rows can be in flight at once and
 * a double-click cannot fire the same action twice. Every outcome lands in a
 * live region.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/admin-ui";

const BTN = "rounded-full border hairline px-2.5 py-1 text-[11px] font-bold text-ink-300 hover:bg-white/8 disabled:opacity-50";
const BTN_ON = "rounded-full bg-tide-500 px-2.5 py-1 text-[11px] font-extrabold text-abyss-950 hover:bg-tide-400 disabled:opacity-50";
const BTN_WARN = "rounded-full border border-conch-500/40 px-2.5 py-1 text-[11px] font-bold text-conch-400 hover:bg-conch-500/15 disabled:opacity-50";

export type UserActionRow = {
  handle: string;
  status: string;
  isAdmin: boolean;
  isSelf: boolean;
  /** Live broadcaster badge, and the ban that goes with it if there is one. */
  broadcaster: { granted: boolean; reason: string | null };
  deviceBans: { active: number; total: number };
};

export function UserActions({ row }: { row: UserActionRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function patch(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: row.handle, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "That did not work.");
      setMsg({ ok: true, text: typeof data.error === "string" ? data.error : "Saved." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not reach the server." });
    } finally {
      setBusy(null);
    }
  }

  const suspended = row.status === "suspended";
  // Admins are refused by the API, and an admin cannot act on themselves.
  // Disabling here as well means the refusal is visible before the click.
  const blocked = row.isAdmin || row.isSelf;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          disabled={busy !== null || blocked}
          onClick={() => void patch({ action: suspended ? "unsuspend" : "suspend", reason: "" }, "suspend")}
          className={suspended ? BTN_ON : BTN_WARN}
          title={blocked ? "Admins cannot be suspended here." : undefined}
        >
          {busy === "suspend" ? "…" : suspended ? "Unsuspend" : "Suspend"}
        </button>

        <button
          type="button"
          disabled={busy !== null || blocked}
          onClick={() => {
            const why = window.prompt(`Ban @${row.handle}'s device(s)? Give a reason — the member cannot appeal what they were not told:`);
            if (why === null || why.trim().length < 4) {
              if (why !== null) window.alert("A reason of at least 4 characters is required.");
              return;
            }
            void patch({ action: "banDevice", reason: why.trim() }, "ban");
          }}
          className={BTN_WARN}
          title={blocked ? "Admins cannot be device-banned here." : undefined}
        >
          {busy === "ban" ? "…" : "Ban Device"}
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (row.broadcaster.granted) {
              void patch({ action: "setBroadcaster", on: false }, "bcast");
              return;
            }
            const why = window.prompt(`Clear @${row.handle} to broadcast? Say what was checked — it shows with the badge:`);
            if (why === null || why.trim().length < 4) {
              if (why !== null) window.alert("A reason of at least 4 characters is required.");
              return;
            }
            void patch({ action: "setBroadcaster", on: true, reason: why.trim() }, "bcast");
          }}
          className={row.broadcaster.granted ? BTN_ON : BTN}
        >
          {busy === "bcast" ? "…" : row.broadcaster.granted ? "Revoke Broadcaster" : "Make Broadcaster"}
        </button>
      </div>

      <div className="flex flex-wrap justify-end gap-1">
        {row.deviceBans.active > 0 ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void patch({ action: "unbanDevice" }, "unban")}
            className="rounded-full bg-danger-500/15 px-2 py-0.5 text-[10.5px] font-bold text-danger-500 hover:bg-danger-500/25 disabled:opacity-50"
          >
            {busy === "unban" ? "…" : `Lift device ban (${row.deviceBans.active})`}
          </button>
        ) : null}
        {row.broadcaster.granted ? <Pill tone="violet">Broadcaster</Pill> : null}
      </div>

      {msg ? (
        <p
          role={msg.ok ? "status" : "alert"}
          aria-live={msg.ok ? "polite" : "assertive"}
          className={`text-[11px] ${msg.ok ? "text-tide-300" : "text-danger-500"}`}
        >
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
