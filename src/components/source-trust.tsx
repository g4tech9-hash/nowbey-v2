import { nowMs } from "@/lib/geo";

type Props = {
  sourceKind: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  confirmations: number;
  updatedAt: Date | string;
  status: string;
};

export function SourceTrust({ sourceKind, sourceName, sourceUrl, confirmations, updatedAt, status }: Props) {
  const official = sourceKind === "official";
  const ageHours = (nowMs() - new Date(updatedAt).getTime()) / 3_600_000;
  const freshness = status !== "active" ? "Closed or resolved" : ageHours <= 3 ? "Updated recently" : ageHours <= 18 ? "May need a new check" : "Stale — verify before travelling";

  return (
    <aside className="mt-3 rounded-xl border hairline bg-white/[.04] p-3" aria-label="Source and trust information">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-tide-400">Why you are seeing this</p>
      <div className="mt-1.5 grid gap-1 text-[12.5px] leading-relaxed text-ink-300 sm:grid-cols-3">
        <p><strong className="text-sand-100">Source:</strong> {official ? (sourceName ?? "Official bulletin") : "Community report"}</p>
        <p><strong className="text-sand-100">Checks:</strong> {confirmations} neighbour{confirmations === 1 ? "" : "s"} confirmed it</p>
        <p><strong className="text-sand-100">Freshness:</strong> {freshness}</p>
      </div>
      <p className="mt-1.5 text-[11.5px] text-ink-400">
        {official ? "Imported from a named public source; open the original before making a safety decision." : "Not an official warning. Community information can be incomplete or wrong."}
        {official && sourceUrl ? <> <a href={sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-tide-300 underline">Open original source</a>.</> : null}
      </p>
    </aside>
  );
}
