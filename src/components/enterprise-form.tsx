"use client";

import { useState } from "react";

const SIZES = [
  { value: "1-10", label: "1 to 10 people" },
  { value: "11-50", label: "11 to 50 people" },
  { value: "51-200", label: "51 to 200 people" },
  { value: "200+", label: "More than 200" },
];

const FIELD =
  "mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-3 py-2.5 text-[14px] outline-none focus:border-tide-400";
const LABEL = "text-[11.5px] font-bold uppercase tracking-wide text-tide-400";

export function EnterpriseForm() {
  const [organisation, setOrganisation] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [teamSize, setTeamSize] = useState("11-50");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="py-4 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-tide-500 text-[20px] font-black text-on-accent">
          ✓
        </span>
        <p className="display mt-3 text-[17px] font-extrabold text-sand-100">Thanks, we have your details</p>
        <p className="mx-auto mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-ink-300">
          Someone from NowBey will reply to {email} to talk about what your team needs.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch("/api/enterprise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ organisation, contactName, email, phone, teamSize, message, website }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Could not send that. Please try again.");
          setSent(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not send that. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className={LABEL}>Organisation</span>
        <input
          value={organisation}
          onChange={(e) => setOrganisation(e.target.value)}
          autoComplete="organization"
          placeholder="Harbour Authority, resort, newsroom…"
          className={FIELD}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Your name</span>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            autoComplete="name"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Phone (optional)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            autoComplete="tel"
            placeholder="+1 242 …"
            className={FIELD}
          />
        </label>
      </div>

      <label className="block">
        <span className={LABEL}>Work email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          placeholder="you@organisation.com"
          className={FIELD}
        />
      </label>

      <label className="block">
        <span className={LABEL}>Team size</span>
        <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className={FIELD}>
          {SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={LABEL}>What do you need NowBey for?</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="For example: flood alerts for our marina staff, or a feed of road reports for dispatch."
          className={`${FIELD} resize-none leading-relaxed`}
        />
      </label>

      {/* Hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {error ? <p className="rounded-lg bg-danger-500/15 px-3 py-2 text-[12.5px] text-danger-500">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-sand-100 py-3 text-[14px] font-extrabold text-on-accent hover:bg-white disabled:opacity-50"
      >
        {busy ? "Sending…" : "Talk to us"}
      </button>
      <p className="text-[11.5px] leading-snug text-ink-400">
        We only use these details to reply about Enterprise. We will not add you to a mailing list.
      </p>
    </form>
  );
}
