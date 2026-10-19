export function CoverageBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent ${className}`} role="note" aria-label="Live alerts: New Providence — other islands soon">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      Live alerts: New Providence — other islands soon
    </span>
  );
}
