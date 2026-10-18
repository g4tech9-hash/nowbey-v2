"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { DUR, EASE } from "@/lib/pulse/motion";

/**
 * ConfirmButton — the product's core micro-interaction.
 *
 * "Still there" is what turns one person's report into four people's fact, so
 * it is the one control in the app that gets a celebration: the button springs
 * down to 0.92 under the finger, and on a successful confirm six particles
 * burst from the tick. It is deliberately not animated on *un*-confirming, and
 * deliberately not animated at all under reduced motion — a burst is a reward
 * for adding information, not for removing it.
 *
 * The button owns the animation and the accessible state. The *request* stays
 * with the caller (`onToggle`), so this component can drive the existing
 * `/api/incidents/:id/updates` contract, a mock, or a local-only flow without
 * knowing which.
 */
export function ConfirmButton({
  count,
  active = false,
  onToggle,
  small = false,
  label = "Still there",
  activeLabel,
  busyLabel = "Saving…",
  onResult,
}: {
  count: number;
  active: boolean;
  /** Return false (or a rejected promise) to keep the button un-pressed. */
  onToggle: () => boolean | void | Promise<boolean | void>;
  small?: boolean;
  label?: string;
  activeLabel?: string;
  busyLabel?: string;
  /** Lets the parent feed the polite live region. */
  onResult?: (next: { active: boolean; count: number }) => void;
}) {
  const [burst, setBurst] = useState(false);
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(count);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    setLocal(count);
  }, [count]);

  useEffect(
    () => () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const reduced = typeof window !== "undefined" && document.documentElement.dataset.motion === "off";

  const click = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const willConfirm = !active;
    // Optimistic count: the number is the reward, and a storm is not the time
    // to make someone wait on a round trip to feel they contributed.
    if (willConfirm) setLocal((n) => n + 1);
    else setLocal((n) => Math.max(0, n - 1));
    let accepted: boolean | void = true;
    try {
      accepted = await onToggle();
    } catch {
      accepted = false;
    }
    if (!mounted.current) return;
    setBusy(false);
    if (accepted === false) {
      setLocal(count); // roll the optimistic value back
      return;
    }
    onResult?.({ active: willConfirm, count: willConfirm ? local : local });
    if (willConfirm && !reduced) {
      setBurst(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => mounted.current && setBurst(false), DUR.sweep);
    }
  }, [active, busy, onToggle, onResult, count, local, reduced]);

  const text = active ? (activeLabel ?? "Confirmed") : label;

  return (
    <button
      type="button"
      className="pulse-confirm"
      data-active={active ? "true" : undefined}
      data-small={small ? "true" : undefined}
      aria-pressed={active}
      aria-busy={busy}
      disabled={busy}
      onClick={click}
      style={{ transition: `transform ${DUR.tap}ms ${EASE.spring}, background-color ${DUR.state}ms ${EASE.out}` }}
    >
      {burst ? (
        <span className="pulse-burst" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <i key={i} />
          ))}
        </span>
      ) : null}
      {busy ? (
        <Loader2 size={14} className="animate-spin" aria-hidden />
      ) : (
        <Check size={14} strokeWidth={3} aria-hidden style={{ opacity: active ? 1 : 0.55 }} />
      )}
      <span>{busy ? busyLabel : text}</span>
      <span className="pulse-confirm-count" aria-hidden>
        {local}
      </span>
      <span className="pulse-sr-only">
        {local} {local === 1 ? "neighbour" : "neighbours"} confirmed.{" "}
        {busy ? busyLabel : active ? "You confirmed it." : `Press to confirm.`}
      </span>
    </button>
  );
}

/** The secondary action beside a confirm: "saw it too", save, flag, watch. */
export function ActionPill({
  children,
  onClick,
  active = false,
  ariaLabel,
  disabled,
  tone = "neutral",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  tone?: "neutral" | "accent" | "danger";
}) {
  const color = tone === "danger" ? "var(--danger)" : tone === "accent" ? "var(--text-accent)" : "var(--text-secondary)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaLabel && !children ? active : undefined}
      className="pulse-confirm"
      data-small="true"
      data-active={active ? "true" : undefined}
      style={{ color: active ? "var(--text-accent)" : color }}
    >
      {children}
    </button>
  );
}

type ReactNodeLike = React.ReactNode;
