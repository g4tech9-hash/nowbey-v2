"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, PARISHES, type CategoryKey } from "@/lib/geo";
import type { TierKey } from "@/lib/tiers";

export function SubmitLink() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [parish, setParish] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="space-y-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const res = await fetch("/api/news/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, note, parish }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Could not file that link.");
          setMsg({ ok: true, text: "Thanks! A NowBey editor will look at your link before it appears on the wire." });
          setUrl("");
          setNote("");
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not file that link." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Link</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.bahamaspress.com/story/"
          className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[13px] outline-none focus:border-tide-400"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Why it matters (and where)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Ferry schedule cut to four runnings a week — affects Spanish Wells and Bimini traffic."
          className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[13px] leading-relaxed outline-none focus:border-tide-400"
        />
      </label>
      <select
        value={parish}
        onChange={(e) => setParish(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-abyss-950/80 px-2 py-1.5 text-[12px] outline-none"
      >
        <option value="">Let NowBey guess the island</option>
        {PARISHES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={busy || url.trim().length < 12}
        className="w-full rounded-xl bg-tide-500 py-2 text-[13px] font-extrabold text-abyss-950 disabled:opacity-45"
      >
        {busy ? "Filing…" : "Send to the desk"}
      </button>
      {msg ? <p className={`text-[11.5px] ${msg.ok ? "text-tide-300" : "text-conch-400"}`}>{msg.text}</p> : null}
      <p className="text-[10.5px] leading-snug text-[#6e97a0]">
        Every link is checked by a NowBey editor before anyone sees it, and shows up marked “Reader tip”.
      </p>
    </form>
  );
}

const DEFAULT_CATS: CategoryKey[] = ["flood", "storm", "power", "water", "fire"];
/** The island the Nassau launch covers. Everything is matched per island, so this is the only one that is live. */
const LAUNCH_ISLAND = "New Providence";

/**
 * The email-alert sign-up. Nassau MVP rules:
 *  - one island is preselected and stays first, because that is what the launch covers;
 *  - the optional extras (other islands, a radius around you) are folded away until asked for;
 *  - the shortest path to a working alert is: type your email, tap the button.
 * The full island list and the location/radius matcher still exist behind "More options" — they are
 * simply not in the way of the common case.
 */
export function AlertForm({ plan, defaultEmail = "" }: { plan: TierKey | null; defaultEmail?: string }) {
  const router = useRouter();
  const [target, setTarget] = useState(defaultEmail);
  const [islands, setIslands] = useState<string[]>([LAUNCH_ISLAND]);
  const [cats, setCats] = useState<CategoryKey[]>(DEFAULT_CATS);
  const [radiusKm, setRadiusKm] = useState(12);
  const [centre, setCentre] = useState<{ lat: number; lng: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showIslands, setShowIslands] = useState(false);
  const [showRadius, setShowRadius] = useState(false);
  const multi = plan !== null;

  const toggleIsland = (p: string) => {
    if (!multi) return setIslands([p]);
    setIslands(islands.includes(p) ? (islands.length > 1 ? islands.filter((v) => v !== p) : islands) : [...islands, p]);
  };
  const toggleCat = (k: CategoryKey) => setCats(cats.includes(k) ? cats.filter((v) => v !== k) : [...cats, k]);

  const locate = () => {
    if (!navigator.geolocation) {
      setLocMsg("This device does not share its location.");
      return;
    }
    setLocBusy(true);
    setLocMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        setCentre({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocBusy(false);
        setLocMsg("Could not read your location. Island-wide matching stays on.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const res = await fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channel: "email",
              target,
              parishes: islands,
              categories: cats,
              radiusKm,
              lat: centre?.lat ?? null,
              lng: centre?.lng ?? null,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Could not save that.");
          setMsg(
            data.mail === "sent"
              ? { ok: true, text: `Check ${target} for a confirmation email and tap the link to switch alerts on.` }
              : { ok: false, text: "We saved your alert profile but could not send the confirmation email just now. Please try again in a little while." },
          );
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save that." });
        } finally {
          setBusy(false);
        }
      }}
    >
      {/* 1 · Where to send it. The email is the whole first step — everything else has a default. */}
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Email address</span>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-3 py-2.5 text-[16px] outline-none focus:border-tide-400 sm:text-[14px]"
        />
        <span className="mt-1 block text-[11.5px] text-[#8fb9b6]">Every alert email has a one-tap “Stop these alerts” link.</span>
      </label>

      {/* 2 · The island. Nassau is already chosen, so this reads as a fact rather than a question. */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Where</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-lg bg-tide-500 px-2.5 py-1.5 text-[12px] font-bold text-abyss-950">{LAUNCH_ISLAND} · live now</span>
          <button
            type="button"
            onClick={() => setShowIslands((v) => !v)}
            aria-expanded={showIslands}
            className="min-h-[34px] rounded-lg bg-white/6 px-2.5 py-1.5 text-[12px] font-semibold text-[#a9cdc9] hover:bg-white/12"
          >
            {showIslands ? "Hide other islands" : "Other islands"}
          </button>
        </div>
        {showIslands ? (
          <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl bg-white/[.04] p-2">
            {PARISHES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggleIsland(p)}
                aria-pressed={islands.includes(p)}
                className={`min-h-[34px] rounded-lg px-2 py-1 text-[11.5px] font-semibold ${
                  islands.includes(p) ? "bg-tide-500 text-abyss-950" : "bg-white/6 text-[#a9cdc9] hover:bg-white/12"
                }`}
              >
                {p}
              </button>
            ))}
            <p className="w-full px-1 pt-1 text-[11.5px] text-[#8fb9b6]">
              Nassau is live today; reports elsewhere depend on neighbours filing them.{" "}
              {multi ? "Your plan can follow as many islands as you like." : (
                <>
                  The free plan covers one island.{" "}
                  <Link href="/support" className="font-bold text-tide-300 underline">
                    Pick a plan
                  </Link>{" "}
                  for more.
                </>
              )}
            </p>
          </div>
        ) : null}
      </div>

      {/* 3 · What is worth waking you up. */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Kinds of report</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => {
            const on = cats.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleCat(k)}
                aria-pressed={on}
                className="min-h-[34px] rounded-lg px-2 py-1 text-[11.5px] font-bold"
                style={{ background: on ? `${CATEGORIES[k].color}2e` : "rgba(255,255,255,.05)", color: on ? CATEGORIES[k].color : "#8fb9b6" }}
              >
                {CATEGORIES[k].label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11.5px] text-[#8fb9b6]">
          Leave everything unselected to hear about every report. Reports rated “annoying” never trigger an email.
        </p>
      </div>

      {/* 4 · The optional extras, folded away. Most people want the whole island. */}
      <div className="rounded-xl border hairline bg-white/[.03] p-2.5">
        <button
          type="button"
          onClick={() => setShowRadius((v) => !v)}
          aria-expanded={showRadius}
          className="flex w-full items-center gap-2 text-left"
        >
          <span className="min-w-0 flex-1 text-[12.5px] font-bold text-sand-100">
            Only near me {centre ? `· on, within ${radiusKm} km` : "· off, the whole island"}
          </span>
          <span className="flex-none text-[11.5px] font-bold text-tide-300">{showRadius ? "Hide" : "Set up"}</span>
        </button>
        {showRadius ? (
          <div className="mt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[5, 12, 25, 50].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  aria-pressed={radiusKm === r}
                  className={`min-h-[34px] rounded-lg px-2.5 py-1 text-[11.5px] font-semibold ${
                    radiusKm === r ? "bg-tide-500 text-abyss-950" : "bg-white/6 text-[#a9cdc9] hover:bg-white/12"
                  }`}
                >
                  {r} km
                </button>
              ))}
              <button
                type="button"
                onClick={locate}
                disabled={locBusy}
                className="min-h-[34px] rounded-lg border hairline px-2.5 py-1.5 text-[12px] font-bold text-sand-100 hover:bg-white/8 disabled:opacity-50"
              >
                {locBusy ? "Reading location…" : centre ? "Update my location" : "Use my location"}
              </button>
              {centre ? (
                <button
                  type="button"
                  onClick={() => setCentre(null)}
                  className="min-h-[34px] rounded-lg px-2 py-1.5 text-[12px] font-bold text-[#8fb9b6] hover:text-sand-100"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <p className="mt-1.5 text-[11.5px] text-[#8fb9b6]">
              {centre
                ? `Only reports within ${radiusKm} km of where you are now will email you.`
                : "Without a location we match the whole island. Your position is only used for matching and is never shown to anyone."}
            </p>
            {locMsg ? <p className="mt-1 text-[11.5px] text-conch-400">{locMsg}</p> : null}
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={busy || !target.trim()}
        className="min-h-[48px] w-full rounded-xl bg-tide-500 py-2.5 text-[14px] font-extrabold text-abyss-950 disabled:opacity-45"
      >
        {busy ? "Saving…" : "Send me a confirmation email"}
      </button>
      {msg ? <p className={`text-[12.5px] leading-snug ${msg.ok ? "text-tide-300" : "text-conch-400"}`}>{msg.text}</p> : null}
      <p className="text-[11.5px] leading-relaxed text-[#8fb9b6]">
        Email is the one channel that always works today. Phone push is a separate switch — it stays off until you turn it on, and only the
        Android app and some browsers can show it. Text messages are not available yet.
      </p>
    </form>
  );
}

/** Stops an alert profile, either by the secret link in an email (token) or by id for the signed-in owner. */
export function StopAlertButton({ token, id, label = "Stop these alerts" }: { token?: string; id?: number; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (done) return <p className="text-[12px] font-bold text-tide-300">Stopped. You will not get more of these.</p>;
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const res = await fetch("/api/alerts", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(token ? { token } : { id }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error ?? "That link has already been used.");
            setDone(true);
            router.refresh();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not stop that.");
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-full border hairline px-3 py-1.5 text-[12px] font-bold text-sand-100 hover:bg-white/8 disabled:opacity-50"
      >
        {busy ? "Stopping…" : label}
      </button>
      {err ? <p className="mt-1 text-[11.5px] text-conch-400">{err}</p> : null}
    </div>
  );
}
