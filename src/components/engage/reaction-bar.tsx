"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REACTIONS, REACTION_KEYS, topReactions, type Engagement, type ReactionKind, type TargetType } from "@/lib/engage-kinds";

type Props = {
  type: TargetType;
  id: string;
  initial: Engagement;
  signedIn: boolean;
  /** full: every reaction in a row (detail pages). compact: one button that opens the row (cards in lists). */
  variant?: "full" | "compact";
};

export function ReactionBar({ type, id, initial, signedIn, variant = "full" }: Props) {
  const router = useRouter();
  const [eng, setEng] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(kind: ReactionKind) {
    if (!signedIn) {
      router.push(`/login?mode=signin&next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (busy) return;
    const before = eng;
    // Tapping the reaction you already chose takes it back.
    const next: ReactionKind | null = before.mine === kind ? null : kind;
    const counts = { ...before.counts };
    if (before.mine) counts[before.mine] = Math.max(0, (counts[before.mine] ?? 0) - 1);
    if (next) counts[next] = (counts[next] ?? 0) + 1;
    const total = Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0);
    setEng({ ...before, counts, total, mine: next });
    setOpen(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, kind: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save that.");
      setEng((cur) => ({ ...cur, counts: data.counts, total: data.total, mine: data.mine }));
    } catch (e) {
      setEng(before);
      setError(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  const picker = (
    <div role="group" aria-label="Reactions" className="flex flex-wrap gap-1.5">
      {REACTION_KEYS.map((k) => {
        const on = eng.mine === k;
        const n = eng.counts[k] ?? 0;
        return (
          <button
            key={k}
            type="button"
            onClick={() => void choose(k)}
            aria-pressed={on}
            aria-label={`${REACTIONS[k].label}${n ? `, ${n}` : ""}`}
            title={REACTIONS[k].label}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition ${
              on ? "bg-tide-500/25 text-tide-300 ring-1 ring-tide-400/60" : "bg-white/8 text-[#cfeee9] hover:bg-white/14"
            }`}
          >
            <span className="text-[16px] leading-none" aria-hidden="true">
              {REACTIONS[k].emoji}
            </span>
            {n > 0 ? <span>{n}</span> : null}
          </button>
        );
      })}
    </div>
  );

  const errorLine = error ? (
    <p role="alert" className="mt-1.5 text-[12px] text-conch-400">
      {error}
    </p>
  ) : null;

  if (variant === "full") {
    return (
      <div>
        {picker}
        {errorLine}
      </div>
    );
  }

  const top = topReactions(eng.counts);
  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold transition ${
            eng.mine ? "bg-tide-500/25 text-tide-300" : "bg-white/8 text-[#cfeee9] hover:bg-white/14"
          }`}
        >
          {eng.mine ? (
            <>
              <span aria-hidden="true">{REACTIONS[eng.mine].emoji}</span> {REACTIONS[eng.mine].label}
            </>
          ) : (
            "React"
          )}
        </button>
        {eng.total > 0 ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#a9cdc9]" aria-label={`${eng.total} ${eng.total === 1 ? "reaction" : "reactions"}`}>
            <span aria-hidden="true">{top.map((k) => REACTIONS[k].emoji).join("")}</span>
            {eng.total}
          </span>
        ) : null}
      </div>
      {open ? <div className="mt-2">{picker}</div> : null}
      {errorLine}
    </div>
  );
}
