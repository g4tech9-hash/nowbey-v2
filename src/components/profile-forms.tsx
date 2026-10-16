"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INPUT, LABEL } from "@/components/password-field";

type Msg = { ok: boolean; text: string } | null;

const SAVE = "rounded-xl bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950 disabled:opacity-50";
const BIO_MAX = 200;

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={`mt-2.5 rounded-lg px-2.5 py-2 text-[12.5px] ${msg.ok ? "bg-tide-500/12 text-tide-300" : "bg-danger-500/15 text-danger-500"}`}>
      {msg.text}
    </p>
  );
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export type ProfileSettingsInput = { visibility: "open" | "private"; bio: string | null; showAlertSummary: boolean };

/**
 * The three settings a member controls about their profile. Nothing here is required: an empty bio is fine,
 * and the defaults (open, no summary) are what a member has before they ever open this page.
 */
export function ProfileForm({ settings }: { settings: ProfileSettingsInput }) {
  const router = useRouter();
  const [bio, setBio] = useState(settings.bio ?? "");
  const [visibility, setVisibility] = useState<"open" | "private">(settings.visibility);
  const [showAlertSummary, setShowAlertSummary] = useState(settings.showAlertSummary);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          await send("/api/account/profile", "PATCH", { visibility, bio, showAlertSummary });
          setMsg({ ok: true, text: "Saved." });
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className={LABEL}>One line about you (optional)</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          rows={2}
          maxLength={BIO_MAX}
          placeholder="For example: East End resident, keeps an eye on the harbour road."
          className={`${INPUT} mt-1 resize-none`}
        />
      </label>
      <p className="mt-1 text-[11.5px] text-ink-400">
        {BIO_MAX - bio.length} characters left. It appears at the top of your profile.
      </p>

      <fieldset className="mt-4">
        <legend className={LABEL}>Who can see your profile</legend>
        <div className="mt-1.5 space-y-2">
          <label className="flex items-start gap-2.5">
            <input type="radio" name="visibility" checked={visibility === "open"} onChange={() => setVisibility("open")} className="mt-0.5" />
            <span className="text-[13px] text-sand-100">
              <span className="font-bold">Open</span>
              <span className="block text-[12px] text-ink-400">
                Anyone can open your profile and see your reports, your badge and, if you switch it on below, how many islands your alerts cover.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5">
            <input type="radio" name="visibility" checked={visibility === "private"} onChange={() => setVisibility("private")} className="mt-0.5" />
            <span className="text-[13px] text-sand-100">
              <span className="font-bold">Private</span>
              <span className="block text-[12px] text-ink-400">
                Your handle still appears on the reports you file, but nobody can open a profile page about you. Your reports stay on the map either way.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <label className="mt-4 flex items-start gap-2.5">
        <input type="checkbox" checked={showAlertSummary} onChange={(e) => setShowAlertSummary(e.target.checked)} className="mt-0.5" />
        <span className="text-[13px] text-sand-100">
          <span className="font-bold">Show how many islands my alerts cover</span>
          <span className="block text-[12px] text-ink-400">
            Just the number. Your email address and the kinds of alerts you chose are never shown to anyone.
          </span>
        </span>
      </label>

      <button type="submit" disabled={busy} className={`${SAVE} mt-4`}>
        {busy ? "Saving…" : "Save profile"}
      </button>
      <Note msg={msg} />
    </form>
  );
}

/**
 * Hide one of your own reports from your profile, or put it back. The report itself is not affected: it
 * stays on the map, keeps its confirmations and still counts in your record — only the listing changes.
 */
export function HideReportButton({ incidentId, hidden, title }: { incidentId: string; hidden: boolean; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <span>
      <button
        type="button"
        disabled={busy}
        title={hidden ? `Show “${title}” on your profile again` : `Take “${title}” off your profile (it stays on the map)`}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            await send("/api/account/profile/hidden", hidden ? "DELETE" : "POST", { incidentId });
            router.refresh();
          } catch (err) {
            setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change that." });
          } finally {
            setBusy(false);
          }
        }}
        className={`rounded-full border hairline px-3 py-1.5 text-[11.5px] font-bold ${
          hidden ? "bg-sand-100 text-abyss-950 hover:bg-white" : "text-sand-100 hover:bg-white/8"
        } disabled:opacity-50`}
      >
        {busy ? "Saving…" : hidden ? "Show on profile" : "Hide from profile"}
      </button>
      <Note msg={msg} />
    </span>
  );
}
