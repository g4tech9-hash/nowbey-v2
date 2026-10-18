"use client";

import { useRef, useState } from "react";
import { ConfirmButton, ErrorState, Lift, Pressable } from "@/ui/pulse";
import { DUR, EASE, SPRING } from "@/lib/pulse/motion";

/**
 * Motion you can feel, with the numbers next to it.
 *
 * The four durations and the one curve are the whole vocabulary, so the guide
 * plays them from the same helpers the app uses — `entranceStyle`, the spring
 * easing, the press scale — rather than a second copy that could drift. The
 * slider re-runs the entrance so you can watch the settle; "reduced" is what
 * `prefers-reduced-motion` (or Settings → motion: reduced) collapses it to.
 */
export function DesignDemos() {
  const [nonce, setNonce] = useState(0);
  const [reduced, setReduced] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const play = () => {
    const node = boxRef.current;
    if (node) {
      // Restart the animation without remounting the subtree.
      node.style.animation = "none";
      void node.offsetWidth;
      node.style.animation = "";
    }
    setNonce((n) => n + 1);
  };

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
      <div className="pulse-demo-stage" ref={boxRef} data-reduced={reduced ? "true" : undefined}>
        <div className="pulse-demo-spring" key={nonce} style={reduced ? { animation: "none", opacity: 1, transform: "none" } : undefined}>
          <Pressable>
            <span className="nb-btn nb-btn-primary">Spring settle · 340ms</span>
          </Pressable>
          <Lift className="pulse-demo-tile">
            <span className="nb-label">Lift · 3px, 200ms</span>
          </Lift>
          <span className="pulse-demo-shimmer" aria-hidden />
        </div>
      </div>

      <div className="pulse-demo-legend">
        <p className="nb-label">The numbers</p>
        <ul className="mt-2 grid gap-1 font-mono text-[11.5px] text-tertiary">
          <li>stiffness {SPRING.stiffness} · damping {SPRING.damping}</li>
          <li>{`--pulse-ease-spring: ${EASE.spring}`}</li>
          <li>press scale 0.92 · hover scale 1.03</li>
          <li>tap {DUR.tap}ms · state {DUR.state}ms · enter {DUR.enter}ms · sweep {DUR.sweep}ms</li>
          <li>shimmer 1.4s loop</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="nb-btn nb-btn-secondary nb-btn-sm" onClick={play}>
            Play again
          </button>
          <button
            type="button"
            className="nb-btn nb-btn-ghost nb-btn-sm"
            aria-pressed={reduced}
            onClick={() => setReduced((v) => !v)}
          >
            {reduced ? "Reduced: on" : "Reduced: off"}
          </button>
        </div>
        <p className="nb-hint mt-2">
          Reduced motion is not “no motion”: the card still fades in, it just stops travelling. That is what makes the
          animation safe for a vestibular sensitivity without making the page feel dead.
        </p>
      </div>
    </div>
  );
}

/**
 * The burst, in isolation. It is local state only — the styleguide must never
 * write to the wire — but every other line of it (the spring press, the six
 * particles, the rollback when a toggle returns false) is the real component.
 */
export function ConfirmButtonDemo() {
  const [n, setN] = useState(3);
  const [on, setOn] = useState(false);
  const [loud, setLoud] = useState("Nothing sent. Tap it and watch the tick.");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ConfirmButton
        count={n}
        active={on}
        label="Still there"
        activeLabel="You confirmed it"
        onToggle={() => {
          setOn(!on);
          setN((v) => (on ? v - 1 : v + 1));
          setLoud(on ? "Un-confirmed — no burst, because removing information is not a reward." : "Confirmed — six particles, one beat.");
        }}
      />
      <span className="nb-hint">{loud}</span>
    </div>
  );
}

/**
 * The error state, with a retry that actually retries.
 *
 * `onRetry` is a function, and a function cannot cross the server/client boundary
 * — so the interactive variant of every state lives in a client module, which is
 * also where a page should import it from. The link variant (a route to go back
 * to) is safe to render straight from a server component.
 */
export function ErrorStateDemo() {
  const [tries, setTries] = useState(0);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ErrorState
        title={tries === 0 ? "The wire did not answer" : tries === 1 ? "Still nothing. The island is quiet." : "Third try — now it is worth checking your connection"}
        blurb="Nothing you typed was lost, and the feed is showing the last thing we had."
        onRetry={() => setTries((n) => n + 1)}
        retryLabel={tries === 0 ? "Try again" : `Retry (${tries + 1})`}
      />
      <ErrorState title="Offline?" blurb="The last snapshot is readable without a connection." href="/feed" hrefLabel="Back to the feed" />
    </div>
  );
}
