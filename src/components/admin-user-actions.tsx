"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INPUT, LABEL } from "@/components/password-field";

type Props = {
  handle: string;
  role: string;
  suspended: boolean;
  tier: string | null;
  payingViaStripe: boolean;
  isSelf: boolean;
  envAdmin: boolean;
  targetIsAdmin: boolean;
  hasEmail: boolean;
  emailVerified: boolean;
};

const BTN = "rounded-lg bg-white/10 px-3 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/16 disabled:opacity-50";

export function AdminUserActions(p: Props) {
  const router = useRouter();
  const [role, setRole] = useState(p.role);
  const [plan, setPlan] = useState(p.tier ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function run(action: string, extra: Record<string, unknown> = {}, done = "Done.") {
    setBusy(action);
    setMsg(null);
    if (action !== "resetLink") setLink(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: p.handle, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not do that.");
      if (data.url) setLink(data.url);
      setMsg({ ok: true, text: done });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not do that." });
    } finally {
      setBusy(null);
    }
  }

  const row = "flex flex-wrap items-end gap-2";
  return (
    <div className="space-y-5">
      <div>
        <p className={LABEL}>Role</p>
        <div className={`${row} mt-1`}>
          <select value={role} onChange={(e) => setRole(e.target.value)} disabled={p.isSelf || p.envAdmin} className={`${INPUT} w-auto`} aria-label="Role">
            <option value="resident">Resident</option>
            <option value="editor">Editor (moderates reports and the wire)</option>
            <option value="admin">Admin (manages everything)</option>
          </select>
          <button type="button" disabled={busy !== null || p.isSelf || p.envAdmin || role === p.role} onClick={() => run("setRole", { role }, `Role changed to ${role}.`)} className={BTN}>
            Save role
          </button>
        </div>
        {p.isSelf ? <p className="mt-1 text-[11.5px] text-[#8fb9b6]">You cannot change your own role.</p> : null}
        {p.envAdmin ? <p className="mt-1 text-[11.5px] text-[#8fb9b6]">This member is an admin through ADMIN_HANDLES in the server settings.</p> : null}
      </div>

      <div>
        <p className={LABEL}>Complimentary plan</p>
        <div className={`${row} mt-1`}>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} disabled={p.payingViaStripe} className={`${INPUT} w-auto`} aria-label="Complimentary plan">
            <option value="">No plan (free)</option>
            <option value="conch">Conch</option>
            <option value="rock">Rock Sound</option>
            <option value="admiral">Admiral</option>
          </select>
          <button
            type="button"
            disabled={busy !== null || p.payingViaStripe || plan === (p.tier ?? "")}
            onClick={() => run("setPlan", { tier: plan || null }, plan ? "Complimentary plan granted." : "Plan removed.")}
            className={BTN}
          >
            Save plan
          </button>
        </div>
        <p className="mt-1 text-[11.5px] text-[#8fb9b6]">
          {p.payingViaStripe
            ? "This member pays through Stripe, so their plan is managed there."
            : "For community partners and staff. It involves no payment and stays until you remove it."}
        </p>
      </div>

      <div>
        <p className={LABEL}>Access</p>
        {p.suspended ? (
          <div className="mt-1">
            <button type="button" disabled={busy !== null} onClick={() => run("unsuspend", {}, "Account restored.")} className={BTN}>
              Restore this account
            </button>
          </div>
        ) : (
          <div className={`${row} mt-1`}>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Reason (only staff see this)" className={`${INPUT} min-w-[220px] flex-1`} aria-label="Reason for suspending" />
            <button
              type="button"
              disabled={busy !== null || p.isSelf || p.targetIsAdmin}
              onClick={() => {
                if (window.confirm(`Suspend @${p.handle}? They will be signed out everywhere and cannot sign in.`)) void run("suspend", { reason }, "Account suspended.");
              }}
              className="rounded-lg bg-conch-500/90 px-3 py-2 text-[12.5px] font-extrabold text-abyss-950 hover:bg-conch-500 disabled:opacity-50"
            >
              Suspend
            </button>
          </div>
        )}
        {!p.suspended && (p.isSelf || p.targetIsAdmin) ? <p className="mt-1 text-[11.5px] text-[#8fb9b6]">Admins cannot be suspended. Remove their admin role first.</p> : null}
      </div>

      <div>
        <p className={LABEL}>Help this member</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" disabled={busy !== null} onClick={() => run("signOutEverywhere", {}, "Signed out of every device.")} className={BTN}>
            Sign out everywhere
          </button>
          <button type="button" disabled={busy !== null} onClick={() => run("resetLink", {}, "Reset link created. Copy it below and send it to them yourself.")} className={BTN}>
            Create a password reset link
          </button>
          {p.hasEmail && !p.emailVerified ? (
            <button type="button" disabled={busy !== null} onClick={() => run("markVerified", {}, "Email marked as confirmed.")} className={BTN}>
              Mark email as confirmed
            </button>
          ) : null}
        </div>
        {link ? (
          <div className="mt-2 rounded-lg border border-tide-400/30 bg-tide-500/8 p-2.5">
            <p className="text-[11.5px] text-[#8fb9b6]">One hour, one use. Shown only now, and not kept in the activity log.</p>
            <div className="mt-1.5 flex gap-2">
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className={`${INPUT} min-w-0 flex-1 font-mono text-[11.5px]`} aria-label="Password reset link" />
              <button type="button" onClick={() => void navigator.clipboard?.writeText(link)} className={BTN}>
                Copy
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {msg ? (
        <p role={msg.ok ? "status" : "alert"} className={`rounded-lg px-2.5 py-2 text-[12.5px] ${msg.ok ? "bg-tide-500/12 text-tide-300" : "bg-conch-500/15 text-conch-400"}`}>
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
