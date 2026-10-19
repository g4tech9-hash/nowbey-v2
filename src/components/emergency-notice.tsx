/** Emergency numbers are tappable: on a phone, "919" should dial, not require copying. */
function Numbers() {
  return (
    <>
      <a href="tel:919" className="underline decoration-2 underline-offset-2">
        919
      </a>{" "}
      /{" "}
      <a href="tel:911" className="underline decoration-2 underline-offset-2">
        911
      </a>
    </>
  );
}

export function EmergencyNotice({ compact = false }: { compact?: boolean }) {
  const copy = "Emergency: call 919 / 911 — this app is not an emergency service.";
  if (compact) {
    return (
      <p className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[12px] font-bold text-danger" role="note" aria-label={copy}>
        Emergency: call <Numbers /> — this app is not an emergency service.
      </p>
    );
  }
  return (
    <aside role="alert" aria-label="Emergency safety notice" className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-3 text-center backdrop-blur">
      <p className="text-[13px] font-extrabold text-danger">🚨 {copy}</p>
    </aside>
  );
}

export function EmergencyStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 border-y border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-[12px] font-bold text-ink-800 ${className}`} role="note" aria-label="Emergency safety notice">
      <span aria-hidden>🚨</span>
      Emergency: call <a href="tel:919" className="underline decoration-2 underline-offset-2">919</a> / <a href="tel:911" className="underline decoration-2 underline-offset-2">911</a> — this app is not an emergency service.
    </div>
  );
}
