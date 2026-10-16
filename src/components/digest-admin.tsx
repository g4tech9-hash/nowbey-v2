"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";

export type DraftRow = {
  id: string;
  parish: string;
  subject: string;
  bodyHtml: string;
  itemCount: number;
  generatedBy: string;
  status: string;
  recipients: string;
  sentAt: string | null;
  createdAt: string;
};

export type PartnerRow = { id: string; organisation: string; email: string; parish: string; paymentStatus: string };

type Props = {
  initialDrafts: DraftRow[];
  partners: PartnerRow[];
  aiOn: boolean;
  mailOn: boolean;
  parishes: string[];
  categories: { key: string; label: string }[];
};

/**
 * The revenue page: draft the weekly Community Digest (Gemini-written when the key is set),
 * read it, then email it to the paying HOA's list. Emails never send on their own.
 */
export function DigestAdmin({ initialDrafts, partners, aiOn, mailOn, parishes, categories }: Props) {
  const [parish, setParish] = useState("New Providence");
  const [picked, setPicked] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>(initialDrafts);
  const [openId, setOpenId] = useState<string | null>(initialDrafts[0]?.id ?? null);
  const [partnerId, setPartnerId] = useState("");
  const [extraEmails, setExtraEmails] = useState("");
  const [busy, setBusy] = useState<"generate" | "send" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const open = useMemo(() => drafts.find((d) => d.id === openId) ?? null, [drafts, openId]);
  const partner = useMemo(() => partners.find((p) => p.id === partnerId) ?? null, [partners, partnerId]);

  const recipientCount = useMemo(() => {
    const extra = extraEmails.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => s.includes("@"));
    return (partner ? 1 : 0) + extra.length;
  }, [partner, extraEmails]);

  function toggleCategory(key: string) {
    setPicked((cur) => (cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]));
  }

  async function generate() {
    setBusy("generate");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", parish, categories: picked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const draft: DraftRow = {
        ...data.draft,
        sentAt: data.draft.sentAt ?? null,
        createdAt: data.draft.createdAt ?? new Date().toISOString(),
        recipients: data.draft.recipients ?? "",
      };
      setDrafts((cur) => [draft, ...cur]);
      setOpenId(draft.id);
      setMsg({
        ok: true,
        text:
          draft.generatedBy === "ai"
            ? `Drafted with Gemini from ${draft.itemCount} items — read it before you send.`
            : `Drafted with the plain template from ${draft.itemCount} items (Gemini is off — add GEMINI_API_KEY for the written version).`,
      });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Generation failed." });
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!open || open.status === "sent") return;
    setBusy("send");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", id: open.id, partnerId: partnerId || undefined, recipients: extraEmails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sending failed.");
      setDrafts((cur) => cur.map((d) => (d.id === open.id ? { ...d, status: "sent", sentAt: new Date().toISOString() } : d)));
      setMsg({ ok: true, text: `Sent to ${data.stats.sent} address${data.stats.sent === 1 ? "" : "es"}${data.stats.failed ? ` (${data.stats.failed} failed — check the email log)` : ""}.` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Sending failed." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl2 border border-brand/30 bg-brand/8 px-4 py-3 text-sm leading-relaxed text-ink-200">
        <p className="display text-base font-bold text-sand-100">Community Digest · $25/mo partner product</p>
        <p className="mt-1">
          Pick the island (and optionally narrow categories), draft the week, read it, send it to the partner&apos;s list.
          Gemini writes the subject, intro and one-liners when its key is set — you approve every word before anything sends.
        </p>
        <p className="nb-meta mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-dim">
          <span className="inline-flex items-center gap-1.5">
            AI writer: {aiOn ? <span className="font-bold text-cyan">on</span> : <span className="font-bold text-alert">off (template mode)</span>}
          </span>
          <span className="inline-flex items-center gap-1.5">
            Email: {mailOn ? <span className="font-bold text-cyan">set up</span> : <span className="font-bold text-alert">not set up — sending will fail</span>}
          </span>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="nb-surface rounded-xl2 p-4">
            <label className="block text-xs font-bold text-ink-dim" htmlFor="dg-parish">Island</label>
            <select
              id="dg-parish"
              value={parish}
              onChange={(e) => setParish(e.target.value)}
              className="mt-1 w-full rounded-lg border hairline bg-white/5 px-2.5 py-2 text-sm text-sand-100"
            >
              {parishes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <p className="mt-3 text-xs font-bold text-ink-dim">Categories <span className="font-normal">(leave all off for everything)</span></p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCategory(c.key)}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition duration-200 ease-standard ${picked.includes(c.key) ? "bg-brand/25 text-cyan ring-1 ring-cyan/50" : "bg-white/6 text-ink-200 hover:bg-white/12"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={generate}
              disabled={busy !== null}
              className="nb-glow mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-3 py-2 text-sm font-extrabold text-white transition duration-200 ease-standard hover:bg-brand-light disabled:opacity-50"
            >
              <Icon name="sparkle" size={14} />
              {busy === "generate" ? "Drafting…" : "Draft this week's digest"}
            </button>

            {msg ? (
              <p className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs ${msg.ok ? "bg-brand/10 text-cyan" : "bg-alert/15 text-alert"}`}>{msg.text}</p>
            ) : null}
          </div>

          <div className="nb-surface rounded-xl2 p-4">
            <p className="display text-base font-bold text-sand-100">Send to</p>
            <label className="mt-2 block text-xs font-bold text-ink-dim" htmlFor="dg-partner">Digest partner</label>
            <select
              id="dg-partner"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="mt-1 w-full rounded-lg border hairline bg-white/5 px-2.5 py-2 text-sm text-sand-100"
            >
              <option value="">— no partner, paste addresses below —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.organisation} ({p.parish}){p.paymentStatus === "paid" ? "" : ` · ${p.paymentStatus}`}
                </option>
              ))}
            </select>
            {partner ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-dim">
                <Icon name="arrow-right" size={12} />
                {partner.email}
              </p>
            ) : null}

            <label className="mt-2 block text-xs font-bold text-ink-dim" htmlFor="dg-emails">Extra addresses (one per line or comma-separated)</label>
            <textarea
              id="dg-emails"
              value={extraEmails}
              onChange={(e) => setExtraEmails(e.target.value)}
              rows={3}
              placeholder="hoa-board@example.com&#10;president@example.com"
              className="mt-1 w-full rounded-lg border hairline bg-white/5 px-2.5 py-2 font-mono text-xs text-sand-100"
            />

            <button
              type="button"
              onClick={send}
              disabled={busy !== null || !open || open.status === "sent" || recipientCount === 0}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber px-3 py-2 text-sm font-extrabold text-page transition duration-200 ease-standard hover:bg-amber-soft disabled:opacity-40"
            >
              <Icon name="send" size={14} />
              {busy === "send" ? "Sending…" : open?.status === "sent" ? "Already sent" : `Send to ${recipientCount || "—"} address${recipientCount === 1 ? "" : "es"}`}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="nb-surface rounded-xl2 p-4">
            <p className="display text-base font-bold text-sand-100">Recent drafts</p>
            {drafts.length ? (
              <ul className="mt-2 space-y-1.5">
                {drafts.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(d.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition duration-200 ease-standard ${d.id === openId ? "bg-brand/15 ring-1 ring-cyan/40" : "bg-white/4 hover:bg-white/9"}`}
                    >
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-bold text-sand-100">{d.subject}</span>
                      </span>
                      <span className="nb-meta mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-ink-dim">
                        <span>{d.parish}</span>
                        <span>· {d.itemCount} items</span>
                        <span className={d.generatedBy === "ai" ? "font-bold text-cyan" : ""}>{d.generatedBy === "ai" ? "Gemini" : "template"}</span>
                        <span className={d.status === "sent" ? "font-bold text-cyan" : "text-amber"}>{d.status === "sent" ? "sent" : "draft"}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-dim">No drafts yet — make the first one.</p>
            )}
          </div>

          {open ? (
            <div className="nb-surface rounded-xl2 p-4">
              <p className="nb-meta text-2xs font-bold uppercase text-ink-dim">Preview — exactly what lands in the inbox</p>
              <div
                className="mt-2 overflow-hidden rounded-xl border hairline bg-card [&_a]:pointer-events-none"
                // Every variable inside was escaped by the generator; links are ours from the database.
                dangerouslySetInnerHTML={{ __html: open.bodyHtml }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
