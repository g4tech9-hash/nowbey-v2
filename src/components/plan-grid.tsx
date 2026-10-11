"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FREE_PLAN, TIERS, money, yearlySaving, type Interval, type Perk, type TierKey } from "@/lib/tiers";

export function PerkList({ perks, tone }: { perks: Perk[]; tone: string }) {
  return (
    <ul className="mt-3 flex-1 space-y-1.5 text-[12.5px] text-[#cfeee9]">
      {perks.map((p) => (
        <li key={p.text} className="flex gap-2 leading-snug">
          <span className="mt-[1px] font-bold" style={{ color: tone }} aria-hidden>
            ✓
          </span>
          <span>
            {p.text}
            {p.soon ? (
              <span className="ml-1.5 whitespace-nowrap rounded-full bg-white/10 px-1.5 py-[1px] text-[9.5px] font-bold uppercase tracking-wide text-[#bfe4e0]">
                Soon
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

type Props = {
  /** true when a payment provider is connected; false means plans switch on in demo mode */
  live: boolean;
  signedIn: boolean;
  currentTier: TierKey | null;
  currentInterval: Interval | null;
  /** true when staff gave this member a plan, so there is no billing to manage */
  complimentary?: boolean;
};

export function PlanGrid({ live, signedIn, currentTier, currentInterval, complimentary = false }: Props) {
  const router = useRouter();
  const [billing, setBilling] = useState<Interval>(currentInterval ?? "month");
  const [busy, setBusy] = useState<TierKey | null>(null);
  const [note, setNote] = useState<{ tier: TierKey; text: string; ok: boolean } | null>(null);
  const managed = live && currentTier !== null && !complimentary;

  async function choose(tier: TierKey) {
    if (!signedIn) {
      router.push("/login?next=/support");
      return;
    }
    setBusy(tier);
    setNote(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval: billing }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login?next=/support");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setNote({ tier, ok: true, text: "Plan switched on. Ads are off." });
      router.refresh();
    } catch (e) {
      setNote({ tier, ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  const onFree = currentTier === null;

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border hairline bg-abyss-900/60 p-1 text-[12.5px] font-bold" role="group" aria-label="Billing period">
        {(["month", "year"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setBilling(v)}
            aria-pressed={billing === v}
            className={`rounded-full px-3.5 py-1.5 transition ${billing === v ? "bg-tide-500 text-abyss-950" : "text-[#bfe4e0] hover:bg-white/8"}`}
          >
            {v === "month" ? "Monthly" : "Yearly"}
            {v === "year" ? <span className="ml-1.5 text-[10.5px] opacity-80">2 months free</span> : null}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass flex flex-col rounded-2xl p-4" style={onFree ? { boxShadow: `inset 0 0 0 1px ${FREE_PLAN.tone}` } : undefined}>
          <p className="display text-[15px] font-extrabold" style={{ color: FREE_PLAN.tone }}>
            {FREE_PLAN.name}
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="display text-[28px] font-extrabold text-sand-100">$0</span>
            <span className="text-[11.5px] text-[#8fb9b6]">forever</span>
          </p>
          <p className="mt-1 min-h-[16px] text-[11.5px] text-transparent" aria-hidden>
            .
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#a9cdc9]">{FREE_PLAN.blurb}</p>
          <PerkList perks={FREE_PLAN.perks} tone={FREE_PLAN.tone} />
          <p className="mt-3 rounded-lg bg-white/8 px-2 py-1.5 text-center text-[11.5px] font-bold text-[#cfeee9]">
            {onFree ? "Your current plan" : "Always available"}
          </p>
        </div>

        {Object.values(TIERS).map((t) => {
          const current = currentTier === t.key;
          const price = billing === "year" ? t.yearly : t.monthly;
          return (
            <div
              key={t.key}
              className="glass flex flex-col rounded-2xl p-4"
              style={current ? { boxShadow: `inset 0 0 0 1px ${t.tone}` } : undefined}
            >
              <p className="display text-[15px] font-extrabold" style={{ color: t.tone }}>
                {t.name}
              </p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="display text-[28px] font-extrabold text-sand-100">${money(price)}</span>
                <span className="text-[11.5px] text-[#8fb9b6]">{billing === "year" ? "per year" : "per month"}</span>
              </p>
              <p className="mt-1 min-h-[16px] text-[11.5px] font-semibold text-tide-300">
                {billing === "year" ? `$${money(t.yearly / 12)} a month · save $${money(yearlySaving(t))}` : ""}
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#a9cdc9]">{t.blurb}</p>
              <PerkList perks={t.perks} tone={t.tone} />

              {current ? (
                <div className="mt-3 rounded-lg bg-tide-500/18 px-2 py-1.5 text-center text-[11.5px] font-bold text-tide-300">
                  Your current plan
                </div>
              ) : managed ? (
                <Link
                  href="/you"
                  className="mt-3 rounded-xl border hairline py-2.5 text-center text-[12.5px] font-bold text-sand-100 hover:bg-white/8"
                >
                  Manage your plan
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => choose(t.key)}
                  className="mt-3 w-full rounded-xl bg-sand-100 py-2.5 text-[13px] font-extrabold text-abyss-950 hover:bg-white disabled:opacity-50"
                >
                  {busy === t.key ? "One moment…" : signedIn ? `Get ${t.name}` : "Sign in to choose"}
                </button>
              )}
              {note?.tier === t.key ? (
                <p className={`mt-1.5 text-[11.5px] leading-snug ${note.ok ? "text-tide-300" : "text-conch-400"}`}>{note.text}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
