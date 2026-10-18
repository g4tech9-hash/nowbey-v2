/**
 * PULSE STATES — empty, error, end-of-stream, the live region, the card-level
 * crash isolator and the token circuit breaker.
 *
 * Grouped in one module so a page never has to pick between four slightly
 * different empty states written by four authors. The `"use client"` directive
 * is here because the boundary needs a lifecycle and the token probe needs
 * hooks; the presentational states stay pure.
 */
"use client";

import Link from "next/link";
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Inbox, PartyPopper } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export function EmptyState({
  title,
  blurb,
  primary,
  secondary,
  icon,
}: {
  title: string;
  blurb: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  icon?: ReactNode;
}) {
  return (
    <div className="pulse-state pulse-enter">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-default bg-hover text-tertiary">
        {icon ?? <Inbox size={19} aria-hidden />}
      </span>
      <h3 className="text-primary">{title}</h3>
      <p>{blurb}</p>
      {primary || secondary ? (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {primary ? (
            <ButtonLink href={primary.href} variant="primary" size="sm">
              {primary.label}
            </ButtonLink>
          ) : null}
          {secondary ? (
            <ButtonLink href={secondary.href} variant="ghost" size="sm">
              {secondary.label}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "The wire went quiet",
  blurb = "We could not reach the server. Anything you had typed is still on this device.",
  onRetry,
  retryLabel = "Try again",
  href,
  hrefLabel = "Open the map instead",
}: {
  title?: string;
  blurb?: string;
  onRetry?: () => void;
  retryLabel?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="pulse-state pulse-error pulse-enter" role="alert">
      <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: "var(--danger-muted)", color: "var(--danger)" }}>
        <AlertTriangle size={19} aria-hidden />
      </span>
      <h3 className="text-primary">{title}</h3>
      <p>{blurb}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <Button variant="primary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        {href ? (
          <Link href={href} className="nb-btn nb-btn-ghost nb-btn-sm">
            {hrefLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** End of stream is a promise, not an apology: this is everything there is. */
export function EndOfStream({ count, children }: { count: number; children?: ReactNode }) {
  return (
    <div className="pulse-state" style={{ borderStyle: "solid", background: "transparent" }}>
      <span className="grid h-9 w-9 place-items-center rounded-full border border-accent bg-hover text-accent">
        <PartyPopper size={16} aria-hidden />
      </span>
      <p className="text-secondary">
        <span className="font-mono font-bold tabular-nums text-primary">{count}</span>{" "}
        {count === 1 ? "signal" : "signals"} on this filter — that is everything, for now.
      </p>
      <p className="text-tertiary">New reports appear at the top within seconds of a neighbour filing one.</p>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- live region */
/**
 * AriaAnnouncer — one polite live region per view, rendered by the shell.
 *
 * Confirmations, "new signal above", live-mode toggles and filter results all
 * need announcing. Doing it per component produced three patterns and two of
 * them forgot the clear-before-set that lets the same words announce twice.
 */
export function AriaAnnouncer({ message }: { message: string }) {
  return (
    <div className="pulse-sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ boundary */
/**
 * ErrorBoundary — a crashing card costs one card, not the feed.
 *
 * A 24-card stream reading a live database will eventually meet a bad row.
 * Without a boundary per card, React unmounts the page and a person checking
 * on their street during a storm sees a stack trace. The crash still reaches
 * the self-hosted error pipeline, with a label naming the card — the one thing
 * a generic window.onerror cannot tell you.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; label?: string; fallback?: ReactNode; onError?: (error: Error) => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error);
    try {
      const payload = {
        // "boundary" is the kind the ingest pipeline already knows (src/lib/errortracking.ts
        // ErrorKind). Anything else is filed as a plain client error and the trail is lost.
        kind: "boundary",
        message: `${this.props.label ?? "component"}: ${error.message}`,
        stack: info.componentStack ?? error.stack,
        url: typeof window === "undefined" ? undefined : window.location.pathname,
      };
      // sendBeacon: a boundary hit during an unmount must still land. POST /api/errors
      // always answers 204 (rate-limited by IP, origin-checked, handle read from the
      // session by the server — never from this body).
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator && typeof Blob !== "undefined") {
        navigator.sendBeacon("/api/errors", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      }
    } catch {
      /* a crash reporter must never be able to crash */
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="pulse-state pulse-error">
        <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--danger-muted)", color: "var(--danger)" }}>
          <AlertTriangle size={16} aria-hidden />
        </span>
        <h3 className="text-primary">{this.props.label ? `${this.props.label} could not load` : "This card could not load"}</h3>
        <p>The rest of the feed is fine. Reload this card, or open the report on its own page.</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => this.setState({ error: null })}>
            Reload this card
          </Button>
        </div>
      </div>
    );
  }
}

/* ------------------------------------------------------------- token guard */
/**
 * PulseTokensGuard — the design system's own circuit breaker.
 *
 * If the token layer failed to apply (a stale CSS chunk after a partial deploy,
 * a proxy that dropped the stylesheet), every `var(--…)` would resolve to
 * nothing and the page would be black-on-black. So the shell probes one
 * semantic token on mount; on a miss it flips the root into the literal
 * fallback palette and says so. On a normal page load it does nothing at all.
 */
export function useTokensGuard(): boolean {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Detecting a stylesheet that failed to load is only possible after the browser has tried to apply it.
    There is no render-phase answer; on the server the probe has nothing to measure. */
    const probe = getComputedStyle(document.documentElement).getPropertyValue("--text-primary").trim();
    const ready = probe.length > 0;
    setOk(ready);
    if (!ready) document.documentElement.dataset.pulse = "off";
    else if (document.documentElement.dataset.pulse === "off") delete document.documentElement.dataset.pulse;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  return ok;
}

export function PulseTokensGuard() {
  const ok = useTokensGuard();
  if (ok) return null;
  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-[1100] w-[min(420px,calc(100%-24px))] -translate-x-1/2 p-3 text-[12.5px]"
      style={{
        borderRadius: "var(--pulse-shape-sm, 14px)",
        border: "1px solid var(--pulse-fallback-border, rgba(148,206,202,.18))",
        background: "var(--pulse-fallback-card-bg, #0a1116)",
        color: "var(--pulse-fallback-text, #f3f1ea)",
      }}
    >
      The styling did not load, so NowBey is showing its plain palette. Everything still works — reload to get the
      full view.
    </div>
  );
}
