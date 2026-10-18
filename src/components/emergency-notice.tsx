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

/**
 * Not `role="alert"`.
 *
 * This banner is part of the page, not an event: it exists on first paint, does not change, and says nothing
 * that is not also in the surrounding text. `role="alert"` made every screen reader interrupt whatever it was
 * reading to shout it, every single page load — and an alert that fires on every load is an alert people
 * learn to ignore, which is the opposite of what an emergency notice is for. It is a landmark instead, so it
 * can be found on purpose and skipped when it is not wanted.
 */
export function EmergencyNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="rounded-xl border border-conch-500/60 bg-conch-500/10 px-3 py-2 text-[12px] font-bold text-danger-500">
        Emergency: call <Numbers /> · this app is not an emergency service.
      </p>
    );
  }
  return (
    <aside aria-label="Emergency safety notice" className="rounded-2xl border-2 border-conch-500 bg-conch-500/10 p-3 text-center">
      <p className="text-[13px] font-extrabold text-danger-500">
        🚨 For emergencies, call <Numbers /> — this app is not an emergency service.
      </p>
    </aside>
  );
}
