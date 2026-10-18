/**
 * ============================================================================
 *  STAGING FILE — DO NOT APPLY WITHOUT APPROVAL
 * ============================================================================
 *  New file:  src/components/partners-admin.tsx
 *  Audit ref: BUG-01
 *
 *  Client half of the Partners fix. Modelled directly on
 *  src/components/digest-admin.tsx so it reads as part of the same codebase:
 *  "use client", useState for the list, an async run() that POSTs to
 *  /api/admin/digest with an action, a msg line for the outcome, and
 *  router.refresh() to revalidate the server component above.
 *
 *  The API additions it depends on are in
 *  Staging_Fix_DigestRoute_Partners.ts.
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PARISHES } from "@/lib/geo";

export type PartnerRow = {
  id: string;
  organisation: string;
  contactName: string;
  email: string;
  parish: string;
  categories: string;
  paymentStatus: string;
  planInterval: string;
  lastPaymentAt: string | null;
  createdAt: string;
};

const PAYMENT = ["unpaid", "paid", "comp"] as const;

const FIELD =
  "mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-3 py-2 text-[13px] outline-none focus:border-tide-400";
const LABEL = "block text-[11.5px] font-bold uppercase tracking-wide text-tertiary";

const blank = {
  organisation: "",
  contactName: "",
  email: "",
  parish: "New Providence",
  categories: "",
};

export function PartnersAdmin({ initialPartners }: { initialPartners: PartnerRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<PartnerRow[]>(initialPartners);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/digest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "That did not work.");
    return data;
  }

  async function create() {
    setBusy("create");
    setMsg(null);
    try {
      const data = await post({ action: "partnerCreate", ...draft });
      setRows((cur) => [data.partner, ...cur]);
      setDraft(blank);
      setAdding(false);
      setMsg({ ok: true, text: `${data.partner.organisation} added.` });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not add that partner." });
    } finally {
      setBusy(null);
    }
  }

  async function save(id: string, patch: Partial<PartnerRow>) {
    setBusy(id);
    setMsg(null);
    try {
      const data = await post({ action: "partnerUpdate", id, ...patch });
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...data.partner } : r)));
      setEditing(null);
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save that." });
    } finally {
      setBusy(null);
    }
  }

  async function setPayment(id: string, paymentStatus: string) {
    setBusy(id);
    setMsg(null);
    try {
      const data = await post({ action: "partnerPayment", id, paymentStatus });
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...data.partner } : r)));
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change the payment status." });
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string, organisation: string) {
    if (!window.confirm(`Delete ${organisation}? This cannot be undone.`)) return;
    setBusy(id);
    setMsg(null);
    try {
      await post({ action: "partnerDelete", id });
      setRows((cur) => cur.filter((r) => r.id !== id));
      setMsg({ ok: true, text: `${organisation} deleted.` });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not delete that partner." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      {/* ---- Add ---- */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="display text-[18px] font-extrabold text-sand-100">
            {rows.length ? `${rows.length} partner${rows.length === 1 ? "" : "s"}` : "No partners yet"}
          </h2>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
            className="rounded-full bg-tide-500 px-3 py-1.5 text-[12px] font-extrabold text-on-accent hover:bg-tide-400"
          >
            {adding ? "Cancel" : "+ Add Partner"}
          </button>
        </div>

        {adding ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={LABEL}>Organisation</span>
              <input
                value={draft.organisation}
                onChange={(e) => setDraft({ ...draft, organisation: e.target.value })}
                maxLength={120}
                className={FIELD}
                placeholder="Cable Beach HOA"
              />
            </label>
            <label className="block">
              <span className={LABEL}>Contact name</span>
              <input
                value={draft.contactName}
                onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
                maxLength={120}
                className={FIELD}
                placeholder="Dana Rolle"
              />
            </label>
            <label className="block">
              <span className={LABEL}>Email</span>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                maxLength={160}
                className={FIELD}
                placeholder="board@example.com"
              />
            </label>
            <label className="block">
              <span className={LABEL}>Island</span>
              <select
                value={draft.parish}
                onChange={(e) => setDraft({ ...draft, parish: e.target.value })}
                className={FIELD}
              >
                {PARISHES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className={LABEL}>Categories (optional, comma-separated)</span>
              <input
                value={draft.categories}
                onChange={(e) => setDraft({ ...draft, categories: e.target.value })}
                maxLength={200}
                className={FIELD}
                placeholder="flood, storm, road"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => void create()}
                disabled={busy !== null}
                className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-on-accent hover:bg-tide-400 disabled:opacity-50"
              >
                {busy === "create" ? "Saving…" : "Save partner"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ---- Outcome, announced ---- */}
      {msg ? (
        <p
          role={msg.ok ? "status" : "alert"}
          aria-live={msg.ok ? "polite" : "assertive"}
          className={`rounded-lg px-3 py-2 text-[12.5px] ${msg.ok ? "bg-tide-500/12 text-tide-300" : "bg-danger-500/15 text-danger-500"}`}
        >
          {msg.text}
        </p>
      ) : null}

      {/* ---- List ---- */}
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="glass rounded-2xl p-4">
              {editing === p.id ? (
                <EditRow
                  row={p}
                  busy={busy === p.id}
                  onCancel={() => setEditing(null)}
                  onSave={(patch) => void save(p.id, patch)}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-sand-100">
                      {p.organisation}
                    </span>
                    <span className="text-[12px] text-secondary">{p.parish}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${
                        p.paymentStatus === "paid"
                          ? "bg-tide-500/20 text-tide-300"
                          : p.paymentStatus === "comp"
                            ? "bg-sun-500/20 text-sun-400"
                            : "bg-conch-500/20 text-conch-400"
                      }`}
                    >
                      {p.paymentStatus}
                    </span>
                  </div>

                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-4">
                    <div>
                      <dt className="text-tertiary">Contact</dt>
                      <dd className="text-sand-100">{p.contactName}</dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className="text-tertiary">Email</dt>
                      <dd className="truncate font-mono text-sand-100">{p.email}</dd>
                    </div>
                    <div>
                      <dt className="text-tertiary">Plan</dt>
                      <dd className="text-sand-100">{p.planInterval}ly</dd>
                    </div>
                    <div>
                      <dt className="text-tertiary">Last payment</dt>
                      <dd className="text-sand-100">
                        {p.lastPaymentAt ? new Date(p.lastPaymentAt).toLocaleDateString() : "never"}
                      </dd>
                    </div>
                    <div className="col-span-3">
                      <dt className="text-tertiary">Categories</dt>
                      <dd className="text-sand-100">{p.categories || "everything"}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t hairline pt-3">
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-tertiary">Payment</span>
                    {PAYMENT.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void setPayment(p.id, s)}
                        disabled={busy !== null}
                        aria-pressed={p.paymentStatus === s}
                        className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold transition disabled:opacity-50 ${
                          p.paymentStatus === s
                            ? "bg-tide-500 text-on-accent"
                            : "border hairline text-ink-300 hover:bg-white/8"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    <span className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(p.id)}
                        className="rounded-full border hairline px-3 py-1 text-[11.5px] font-bold text-tide-300 hover:bg-white/8"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(p.id, p.organisation)}
                        disabled={busy !== null}
                        className="rounded-full border border-conch-500/40 px-3 py-1 text-[11.5px] font-bold text-conch-400 hover:bg-conch-500/15 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="glass rounded-2xl px-4 py-10 text-center text-[13px] text-secondary">
          No partners registered yet. Add one above, then approve a weekly draft on the Digest page to email them.
        </p>
      )}
    </div>
  );
}

function EditRow({
  row,
  busy,
  onCancel,
  onSave,
}: {
  row: PartnerRow;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: Partial<PartnerRow>) => void;
}) {
  const [form, setForm] = useState({
    organisation: row.organisation,
    contactName: row.contactName,
    email: row.email,
    parish: row.parish,
    categories: row.categories,
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className={LABEL}>Organisation</span>
        <input
          value={form.organisation}
          onChange={(e) => setForm({ ...form, organisation: e.target.value })}
          maxLength={120}
          className={FIELD}
        />
      </label>
      <label className="block">
        <span className={LABEL}>Contact name</span>
        <input
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          maxLength={120}
          className={FIELD}
        />
      </label>
      <label className="block">
        <span className={LABEL}>Email</span>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          maxLength={160}
          className={FIELD}
        />
      </label>
      <label className="block">
        <span className={LABEL}>Island</span>
        <select
          value={form.parish}
          onChange={(e) => setForm({ ...form, parish: e.target.value })}
          className={FIELD}
        >
          {PARISHES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className={LABEL}>Categories</span>
        <input
          value={form.categories}
          onChange={(e) => setForm({ ...form, categories: e.target.value })}
          maxLength={200}
          className={FIELD}
        />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={busy}
          className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-on-accent hover:bg-tide-400 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border hairline px-4 py-2 text-[13px] font-bold text-ink-300 hover:bg-white/8"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
