import type { Badge } from "@/lib/badges";

/** Small mark beside a handle: "Verified reporter" for an account a person checked, "NowBey desk" for staff. */
export function BadgeMark({ kind }: { kind: Badge | null | undefined }) {
  if (!kind) return null;
  const desk = kind === "desk";
  const label = desk ? "NowBey desk" : kind === "broadcaster" ? "Broadcaster" : "Verified reporter";
  return (
    <span
      title={desk ? "NowBey staff account" : kind === "broadcaster" ? "Approved to broadcast on NowBey" : "Verified reporter — someone at NowBey checked this account"}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[10px] font-extrabold uppercase tracking-wide ${
        desk ? "bg-tide-500/20 text-tide-300" : "bg-danger-500/15 text-danger-500"
      }`}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      {label}
    </span>
  );
}
