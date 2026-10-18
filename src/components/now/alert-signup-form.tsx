"use client";

/**
 * Island email alerts (Master Build Section 7 — Screen 5). Free life-safety
 * service, no paywalls. Email is validated inline; the success panel carries
 * the API's confirmation message naming the island, then confetti.
 */
import { useState } from "react";
import { CheckCircle2, Info, Mail, Send } from "lucide-react";
import { HAZARD_META, ISLANDS, type HazardType } from "@/lib/bahamas";
import { useConfetti } from "./confetti";
import { Btn, hazardIcon } from "./ui";

const TILES: HazardType[] = ["flooding", "power_outage", "road_hazard", "safety"];

export function AlertSignupForm() {
  const fire = useConfetti();
  const [email, setEmail] = useState("");
  const [island, setIsland] = useState("");
  const [types, setTypes] = useState<HazardType[]>([]);
  const [frequency, setFrequency] = useState<"instant" | "daily_digest">("instant");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const toggleType = (t: HazardType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Inline rule from the spec: must contain @.
    if (!email.includes("@") || !email.includes(".")) {
      setEmailError("That email address does not look right — check it and try again.");
      return;
    }
    setEmailError(null);
    if (!island) {
      setError("Pick the island you want alerts for.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          island,
          // Storm & gale warnings always arrive — sent immediately at zero cost.
          types: [...new Set([...types, "weather"])],
          frequency,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error ?? "Could not switch alerts on.");
      setMessage(data.message);
      fire();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch alerts on.");
    } finally {
      setBusy(false);
    }
  };

  if (message) {
    return (
      <div role="status" className="nbx-card flex flex-col items-center gap-3 border-hz-ok/40 bg-hz-ok/10 p-8 text-center">
        <span className="text-hz-ok">
          <CheckCircle2 size={40} aria-hidden />
        </span>
        <h2 className="nbx-h2 text-ink">Alerts are on</h2>
        <p className="nbx-body max-w-[42ch] text-ink-2">{message}</p>
        <p className="text-[12px] font-semibold text-ink-3">
          Life-safety alerts are free — storm warnings are never paywalled.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="nbx-label text-ink-3">Email address</span>
        <span className="relative flex">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
            <Mail size={16} aria-hidden />
          </span>
          <input
            type="email"
            className="nbx-field pl-9"
            placeholder="neighbour@example.com"
            value={email}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "email-error" : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            required
          />
        </span>
        {emailError ? (
          <span id="email-error" role="alert" className="text-[12px] font-bold text-hz-critical">
            {emailError}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="nbx-label text-ink-3">Primary island</span>
        <select className="nbx-field" value={island} onChange={(e) => setIsland(e.target.value)} required>
          <option value="">Choose your island</option>
          {ISLANDS.map((i) => (
            <option key={i.code} value={i.name}>
              {i.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="nbx-label text-ink-3">Alert types</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TILES.map((t) => {
            const on = types.includes(t);
            return (
              <button
                key={t}
                type="button"
                className="nbx-tile min-h-[56px]"
                aria-pressed={on}
                data-on={on}
                onClick={() => toggleType(t)}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
                  style={{
                    background: `color-mix(in srgb, var(${HAZARD_META[t].colorVar}) 15%, transparent)`,
                    color: `var(${HAZARD_META[t].textVar})`,
                  }}
                >
                  {hazardIcon(t, 18)}
                </span>
                <span className="flex-1">{HAZARD_META[t].label}</span>
                {on ? <CheckCircle2 size={18} className="text-aqua" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        <p className="text-[12px] font-semibold text-ink-3">
          Storm &amp; gale warnings are always included — you never need to tick a box for them.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="nbx-label text-ink-3">Frequency</legend>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="nbx-seg" aria-pressed={frequency === "instant"} onClick={() => setFrequency("instant")}>
            Instant
          </button>
          <button type="button" className="nbx-seg" aria-pressed={frequency === "daily_digest"} onClick={() => setFrequency("daily_digest")}>
            Daily digest
          </button>
        </div>
      </fieldset>

      <p className="flex items-start gap-2 rounded-[12px] border border-edge bg-gold/10 p-3 text-[13px] font-semibold leading-relaxed text-ink">
        <span className="mt-0.5 text-gold-pressed">
          <Info size={16} aria-hidden />
        </span>
        <span>Storm warnings are always sent immediately at zero cost.</span>
      </p>

      {error ? (
        <p role="alert" className="rounded-[12px] border border-hz-critical/40 bg-hz-critical/10 p-2.5 text-[12px] font-bold text-hz-critical">
          {error}
        </p>
      ) : null}

      <Btn type="submit" variant="primary" loading={busy} icon={<Send size={16} aria-hidden />} className="w-full">
        Switch alerts on
      </Btn>

      {/* Honest channel status — the product never claims channels it cannot deliver. */}
      <div className="rounded-[12px] border border-edge p-3 text-[12px] leading-relaxed text-ink-2">
        <p className="nbx-label mb-1.5 text-ink-3">What reaches you</p>
        <p>Email is the one channel that always works today. Text messages are not available yet.</p>
        <p className="mt-1">
          Website push: <strong className="text-ink">Not switched on for this site yet</strong>. The Android app has
          a push switch of its own; iPhone users can still add NowBey to the Home Screen.
        </p>
      </div>
    </form>
  );
}
