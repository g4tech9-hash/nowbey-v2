"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, PARISHES, type CategoryKey } from "@/lib/geo";
import { CATEGORY_GROUPS, categoriesInGroup, type CategoryGroup } from "@/lib/categories";
import { trackFunnel } from "@/lib/funnel-client";
import type { TierKey } from "@/lib/tiers";
import { Toggle } from "@/ui/kit";

/* =====================================================================
   Wire forms — rebuilt 2026-10-17.
   New DOM (cards, toggle rows, pill actions) matching the reference
   “Email alerts” screen; all submit logic and contract copy preserved.
   ===================================================================== */

export function SubmitLink() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [parish, setParish] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="flex flex-col gap-3.5"
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
      <label className="nb-field">
        <span className="nb-field-label nb-label nb-label-mint">Link</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.bahamaspress.com/story/"
          className="nb-input"
          style={{ fontSize: 14, padding: "11px 14px" }}
        />
      </label>
      <label className="nb-field">
        <span className="nb-field-label nb-label nb-label-mint">Why it matters (and where)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Ferry schedule cut to four runnings a week — affects Spanish Wells and Bimini traffic."
          className="nb-textarea"
          style={{ fontSize: 14, padding: "11px 14px", minHeight: 84 }}
        />
      </label>
      <select value={parish} onChange={(e) => setParish(e.target.value)} className="nb-select" style={{ fontSize: 14, padding: "11px 14px" }}>
        <option value="">Let NowBey guess the island</option>
        {PARISHES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button type="submit" disabled={busy || url.trim().length < 12} className="nb-btn nb-btn-primary nb-btn-sm nb-btn-block">
        {busy ? "Filing…" : "Send to the desk"}
      </button>
      {msg ? <p style={{ fontSize: 12.5, color: msg.ok ? "var(--nb-mint)" : "var(--nb-danger-500, #ff7a6b)" }}>{msg.text}</p> : null}
      <p className="nb-hint">Every link is checked by a NowBey editor before anyone sees it, and shows up marked “Reader tip”.</p>
    </form>
  );
}

const DEFAULT_CATS: CategoryKey[] = ["flood", "storm", "power", "water", "fire"];
/** The island the Nassau launch covers. Everything is matched per island, so this is the only one that is live. */
const LAUNCH_ISLAND = "New Providence";

/**
 * The email-alert sign-up — rebuilt as the reference settings card:
 * an island row followed by one toggle row per report type. Nassau MVP
 * rules still hold: New Providence preselected, extras folded away,
 * email + one tap is the shortest path to a working alert.
 */
export function AlertForm({ plan, defaultEmail = "" }: { plan: TierKey | null; defaultEmail?: string }) {
  const router = useRouter();
  const [target, setTarget] = useState(defaultEmail);
  const [islands, setIslands] = useState<string[]>([LAUNCH_ISLAND]);
  const [cats, setCats] = useState<CategoryKey[]>(DEFAULT_CATS);
  // Which family of reports the picker is showing. "all" is the default and it
  // is an explicit choice, not the absence of one: "leave everything
  // unselected to hear about everything" is a sentence nobody has to read twice
  // to understand.
  const [group, setGroup] = useState<CategoryGroup | "all">("all");
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
      className="flex flex-col gap-4"
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
          trackFunnel("alert_set_up");
          setMsg(
            data.mail === "sent"
              ? { ok: true, text: `Check ${target} for a confirmation email and tap the link to switch alerts on. It can take a few minutes and often lands in spam or promotions, so look there too.` }
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
      {/* 1 · Where to send it. The email is the whole first step. */}
      <label className="nb-field">
        <span className="nb-field-label nb-label nb-label-mint">Email address</span>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="nb-input"
        />
        <span className="nb-hint">Every alert email has a one-tap “Stop these alerts” link.</span>
      </label>

      {/* 2 · The island — the “YOUR ISLAND · New Providence ✓” row of the reference. */}
      <div className="nb-card-inner" style={{ padding: "6px 18px" }}>
        <div className="flex items-center justify-between gap-3 py-3.5">
          <span className="nb-label">Your island</span>
          <span className="flex items-center gap-2 text-[15px] font-bold" style={{ color: "var(--nb-cream)" }}>
            {islands[0] ?? LAUNCH_ISLAND}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--nb-mint)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12.5 9.5 18 20 6.5" />
            </svg>
          </span>
        </div>
        <hr className="nb-divider" />
        <div className="flex items-center justify-between gap-3 py-3.5">
          <span className="text-[15px] font-semibold" style={{ color: "var(--nb-text)" }}>
            {LAUNCH_ISLAND} · live now
          </span>
          <button
            type="button"
            onClick={() => setShowIslands((v) => !v)}
            aria-expanded={showIslands}
            className="nb-chip"
            style={{ cursor: "pointer" }}
          >
            {showIslands ? "Hide other islands" : "Other islands"}
          </button>
        </div>
        {showIslands ? (
          <div className="flex flex-wrap gap-1.5 pb-3.5">
            {PARISHES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggleIsland(p)}
                aria-pressed={islands.includes(p)}
                className="nb-chip"
                style={
                  islands.includes(p)
                    ? { background: "var(--nb-mint)", borderColor: "var(--nb-mint)", color: "var(--nb-mint-ink)", cursor: "pointer" }
                    : { cursor: "pointer" }
                }
              >
                {p}
              </button>
            ))}
            <p className="nb-hint w-full">
              Nassau is live today; reports elsewhere depend on neighbours filing them.{" "}
              {multi ? (
                "Your plan can follow as many islands as you like."
              ) : (
                <>
                  The free plan covers one island.{" "}
                  <Link href="/support" className="font-bold underline" style={{ color: "var(--nb-mint)" }}>
                    Pick a plan
                  </Link>{" "}
                  for more.
                </>
              )}
            </p>
          </div>
        ) : null}
      </div>

      {/* 3 · What is worth waking you up — grouped chips, with "All reports" as
          a real, visible default rather than the absence of a choice. */}
      <div className="nb-card-inner" style={{ padding: "6px 18px" }}>
        <div className="py-3.5">
          <span className="nb-label">Kinds of report</span>
        </div>

        <div className="flex flex-wrap gap-1.5 pb-3">
          <button
            type="button"
            onClick={() => {
              setGroup("all");
              setCats(DEFAULT_CATS);
            }}
            aria-pressed={group === "all"}
            className="nb-chip"
            style={group === "all" ? { background: "var(--nb-mint)", borderColor: "var(--nb-mint)", color: "var(--nb-mint-ink)" } : undefined}
          >
            All reports
          </button>
          {CATEGORY_GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGroup(g.key)}
              aria-pressed={group === g.key}
              title={g.blurb}
              className="nb-chip"
              style={group === g.key ? { background: "var(--nb-mint)", borderColor: "var(--nb-mint)", color: "var(--nb-mint-ink)" } : undefined}
            >
              {g.label}
            </button>
          ))}
        </div>

        {group === "all" ? (
          <p className="nb-hint pb-2">
            You will hear about every kind of report. Pick a family above to narrow it down. Reports rated &ldquo;annoying&rdquo;
            never trigger an email.
          </p>
        ) : (
          <>
            <p className="nb-hint pb-2">{CATEGORY_GROUPS.find((g) => g.key === group)?.blurb}.</p>
            <div className="flex flex-wrap gap-1.5 pb-3">
              {categoriesInGroup(group).map((c) => {
                const on = cats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    aria-pressed={on}
                    className="nb-chip"
                    style={on ? { background: "var(--nb-mint)", borderColor: "var(--nb-mint)", color: "var(--nb-mint-ink)" } : undefined}
                  >
                    <span className="nb-dot" style={{ background: c.color }} aria-hidden />
                    {c.label}
                  </button>
                );
              })}
            </div>
            <p className="nb-hint" style={{ paddingBottom: 14 }}>
              {cats.length
                ? `You will hear about ${cats.length} ${cats.length === 1 ? "kind" : "kinds"} of report.`
                : "Nothing selected means every report in this family."}
            </p>
          </>
        )}
      </div>

      {/* 4 · The optional extras, folded away. */}
      <div className="nb-card-inner">
        <button type="button" onClick={() => setShowRadius((v) => !v)} aria-expanded={showRadius} className="flex w-full items-center gap-2 text-left">
          <span className="min-w-0 flex-1 text-[13.5px] font-bold" style={{ color: "var(--nb-cream)" }}>
            Only near me {centre ? `· on, within ${radiusKm} km` : "· off, the whole island"}
          </span>
          <span className="flex-none text-[12px] font-bold" style={{ color: "var(--nb-mint)", cursor: "pointer" }}>
            {showRadius ? "Hide" : "Set up"}
          </span>
        </button>
        {showRadius ? (
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[5, 12, 25, 50].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  aria-pressed={radiusKm === r}
                  className="nb-chip"
                  style={
                    radiusKm === r
                      ? { background: "var(--nb-mint)", borderColor: "var(--nb-mint)", color: "var(--nb-mint-ink)", cursor: "pointer" }
                      : { cursor: "pointer" }
                  }
                >
                  {r} km
                </button>
              ))}
              <button type="button" onClick={locate} disabled={locBusy} className="nb-chip" style={{ cursor: "pointer", color: "var(--nb-cream)" }}>
                {locBusy ? "Reading location…" : centre ? "Update my location" : "Use my location"}
              </button>
              {centre ? (
                <button type="button" onClick={() => setCentre(null)} className="nb-chip" style={{ cursor: "pointer" }}>
                  Clear
                </button>
              ) : null}
            </div>
            <p className="nb-hint">
              {centre
                ? `Only reports within ${radiusKm} km of where you are now will email you.`
                : "Without a location we match the whole island. Your position is only used for matching and is never shown to anyone."}
            </p>
            {locMsg ? <p className="nb-hint" style={{ color: "#ff7a6b" }}>{locMsg}</p> : null}
          </div>
        ) : null}
      </div>

      <button type="submit" disabled={busy || !target.trim()} className="nb-btn nb-btn-primary nb-btn-block">
        {busy ? "Saving…" : "Send me a confirmation email"}
      </button>
      {msg ? <p style={{ fontSize: 13, lineHeight: 1.5, color: msg.ok ? "var(--nb-mint)" : "#ff7a6b" }}>{msg.text}</p> : null}
      <p className="nb-hint" style={{ lineHeight: 1.7 }}>
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

  if (done) return <p className="text-[12px] font-bold" style={{ color: "var(--nb-mint)" }}>Stopped. You will not get more of these.</p>;
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
        className="nb-chip"
        style={{ cursor: "pointer", color: "var(--nb-cream)" }}
      >
        {busy ? "Stopping…" : label}
      </button>
      {err ? <p className="nb-hint" style={{ color: "#ff7a6b" }}>{err}</p> : null}
    </div>
  );
}
