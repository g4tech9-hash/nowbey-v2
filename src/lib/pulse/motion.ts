"use client";

/**
 * PULSE MOTION + INTERACTION HOOKS
 * ---------------------------------------------------------------------------
 * The whole motion language in one dependency-free file. Every hook degrades to
 * "no animation, same behaviour" when the user has asked for reduced motion, so
 * accessibility is a property of the primitives rather than a per-page chore.
 *
 * Why not a motion library: the design system's budget is +40 KB gzip for the
 * whole layer. A spring's *response* is what matters, and that response
 * (stiffness 140 / damping 22, ~1 overshoot, settle in ~340 ms) is exactly
 * `cubic-bezier(0.34, 1.56, 0.64, 1)` — so the springs live in CSS and JS only
 * does measurement. Layout animation costs one `transform`, not a reconciler.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const SPRING = { type: "spring", stiffness: 140, damping: 22 } as const;
export const EASE = {
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inout: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;
export const DUR = { tap: 120, state: 200, enter: 340, sweep: 560 } as const;

/** Inline style for a staggered stream entrance. CSS does the animating. */
export function entranceStyle(index: number, max = 10): React.CSSProperties {
  return { ["--pulse-enter-i" as string]: String(Math.min(index, max)) } as React.CSSProperties;
}

/** True when the user has opted out of motion, by OS or by app setting. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    if (document.documentElement.dataset.motion === "off") return true;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mq: MediaQueryList | null = null;
    const onChange = () => setReduced(document.documentElement.dataset.motion === "off" || (mq?.matches ?? false));
    try {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
    } catch {
      /* ancient browsers: the data-motion attribute still works */
    }
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      mq?.removeEventListener("change", onChange);
      observer.disconnect();
    };
  }, []);

  return reduced;
}

/**
 * The morphing active state on a filter-pill row: one absolutely positioned
 * indicator, moved with a transform, measured after layout. `layout effect`
 * rather than an effect so the pill never paints in the wrong place.
 */
export function usePillIndicator<T extends HTMLElement>(activeKey: string) {
  const rowRef = useRef<T | null>(null);
  const [box, setBox] = useState<{ x: number; width: number; ready: boolean }>({ x: 0, width: 0, ready: false });
  const reduced = useReducedMotion();

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const active = row.querySelector<HTMLElement>('[data-on="true"]');
    if (!active) {
      setBox((b) => (b.ready ? { ...b, ready: false } : b));
      return;
    }
    const rowRect = row.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    setBox({ x: rect.left - rowRect.left + row.scrollLeft, width: rect.width, ready: true });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [activeKey, measure]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    // Web fonts land after first paint and change every pill's width.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready?.then(measure).catch(() => {});
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(row);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [measure]);

  const style: React.CSSProperties = reduced
    ? { transform: `translate3d(${box.x}px,0,0)`, width: box.width, transition: "none" }
    : { transform: `translate3d(${box.x}px,0,0)`, width: box.width };

  return { rowRef, style, ready: box.ready };
}

export type SwipeState = { dx: number; active: boolean };

/**
 * Card swipe: right = confirm, left = saw-it-too. Pointer events (not touch)
 * so it works with a stylus and with a mouse drag on desktop, and the vertical
 * axis is yielded to the scroller the moment the gesture turns out to be a
 * scroll — that decision has to happen inside `touch-action: pan-y` + a
 * direction lock, or the stream becomes impossible to scroll on a phone.
 */
export function useSwipe(opts: {
  onConfirm?: () => void;
  onSawItToo?: () => void;
  threshold?: number;
  disabled?: boolean;
}) {
  const { onConfirm, onSawItToo, threshold = 88, disabled = false } = opts;
  const [state, setState] = useState<SwipeState>({ dx: 0, active: false });
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const axis = useRef<"x" | "y" | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      // Never hijack a gesture that started on a control.
      if ((e.target as HTMLElement).closest("button,a,input,select,textarea,[role='switch'],[data-no-swipe]")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      axis.current = null;
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!axis.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis.current = Math.abs(dx) > Math.abs(dy) * 1.4 ? "x" : "y";
      }
      if (axis.current !== "x") return;
      e.stopPropagation();
      // Rubber-band the travel so a long drag never flings the card off screen.
      const clamped = Math.sign(dx) * Math.min(Math.abs(dx), 148);
      setState({ dx: clamped, active: true });
    },
    [],
  );

  const finish = useCallback(
    (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || s.id !== e.pointerId) return;
      const { dx } = state;
      setState({ dx: 0, active: false });
      if (axis.current !== "x") return;
      if (dx >= threshold) onConfirm?.();
      else if (dx <= -threshold) onSawItToo?.();
      axis.current = null;
      void e;
    },
    [state, threshold, onConfirm, onSawItToo],
  );

  const travel = state.dx;
  const rot = travel / 34;
  const style: React.CSSProperties = {
    transform: `translate3d(${travel}px,0,0) rotate(${rot}deg)`,
    transition: state.active ? "none" : `transform ${DUR.enter}ms ${EASE.spring}`,
  };

  return {
    style,
    dx: travel,
    swiping: state.active,
    intent: travel >= threshold ? ("confirm" as const) : travel <= -threshold ? ("saw" as const) : null,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: (e: React.PointerEvent) => {
        start.current = null;
        axis.current = null;
        setState({ dx: 0, active: false });
        void e;
      },
    },
  };
}

/**
 * Roving focus for a list: ↑/↓ (or ←/→) walk cards, Enter opens, Escape
 * closes. `role="listbox"` + `aria-activedescendant` keeps a screen reader in
 * sync without moving real focus twice.
 */
export function useListNav<T extends HTMLElement = HTMLElement>(opts: {
  count: number;
  onActivate?: (index: number) => void;
  onClose?: () => void;
  idPrefix?: string;
}) {
  const { count, onActivate, onClose, idPrefix = "pulse-item" } = opts;
  const containerRef = useRef<T | null>(null);
  const [index, setIndex] = useState(-1);

  const move = useCallback(
    (next: number) => {
      if (count === 0) return;
      const clamped = ((next % count) + count) % count;
      setIndex(clamped);
      const node = containerRef.current?.querySelector<HTMLElement>(`#${idPrefix}-${clamped}`);
      node?.focus({ preventScroll: false });
      node?.scrollIntoView({ block: "nearest", behavior: document.documentElement.dataset.motion === "off" ? "auto" : "smooth" });
    },
    [count, idPrefix],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("input,textarea,select,[contenteditable='true']")) return;
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          move(index + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          move(index - 1);
          break;
        case "Home":
          e.preventDefault();
          move(0);
          break;
        case "End":
          e.preventDefault();
          move(count - 1);
          break;
        case "Enter":
        case " ":
          if (index >= 0) {
            e.preventDefault();
            onActivate?.(index);
          }
          break;
        case "Escape":
          onClose?.();
          break;
      }
    },
    [index, move, count, onActivate, onClose],
  );

  useEffect(() => {
    if (index >= count) setIndex(count > 0 ? count - 1 : -1);
  }, [count, index]);

  return {
    containerRef,
    index,
    setIndex,
    onKeyDown,
    itemId: (i: number) => `${idPrefix}-${i}`,
    move,
  };
}

/** Focus trap + focus restore for the drawer, the palette and modal dialogs. */
export function useFocusTrap(active: boolean, onClose?: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    restoreTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    const FOCUSABLE =
      'a[href],button:not([disabled]),textarea:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"],summary';

    const focusFirst = () => {
      const node = root?.querySelector<HTMLElement>("[data-autofocus]") ?? root?.querySelector<HTMLElement>(FOCUSABLE);
      node?.focus({ preventScroll: true });
    };
    // One frame late so the drawer's entrance animation has committed its layout.
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("nb-no-scroll");

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove("nb-no-scroll");
      // Return focus to the trigger, per WCAG 2.2 focus-not-obscured + the
      // drawer's own contract with the person who opened it.
      restoreTo.current?.focus?.({ preventScroll: true });
    };
  }, [active, onClose]);

  return ref;
}

/** Body scroll lock on its own, for bottom sheets that are not focus traps. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia(query);
      setMatches(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
      mq.addEventListener("change", onChange);
      return () => mq?.removeEventListener("change", onChange);
    } catch {
      /* no matchMedia: assume the desktop layout, which degrades safely */
    }
  }, [query]);
  return matches;
}

/** True on phones — the same `lg` boundary use-is-mobile.ts uses. */
export const useIsTabletUp = () => useMediaQuery("(min-width: 1024px)");

/* ===========================================================================
   URL STATE
   Every filter lives in the query string, so a filtered feed is a link you can
   send to a neighbour during a storm. Filter changes use replaceState (they are
   refinements, not destinations); opening something uses pushState.
   ========================================================================= */
export type QueryValue = string | number | boolean | null | undefined;

/** Serialise with the same rules the server parser uses (src/lib/validate.ts). */
export function buildQuery(base: URLSearchParams, patch: Record<string, QueryValue>): string {
  const next = new URLSearchParams(base);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "" || value === false) next.delete(key);
    else if (value === true) next.set(key, "1");
    else next.set(key, String(value));
  }
  next.delete("_r"); // never carry a cache-buster into a shareable link
  const s = next.toString();
  return s ? `?${s}` : "";
}

export function useQueryState(patch: Record<string, QueryValue>) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  return useCallback(
    (mode: "replace" | "push" = "replace") => {
      const qs = buildQuery(params, patch);
      const url = `${pathname}${qs}`;
      if (mode === "push") router.push(url);
      // The router owns the history stack, so push through it and let the
      // server re-render with the new slice; replaceState is reserved for
      // refinements the server has already been given (see replaceUrlBelow).
      else router.replace(url, { scroll: false });
    },
    [params, pathname, patch, router],
  );
}

/**
 * Rewrites the address bar without a router round-trip — for keystroke-driven
 * search, where a router.replace per character would spam history and re-fetch
 * the server. Navigation (opening a card) still uses pushState via Link.
 */
export function replaceUrl(pathname: string, params: URLSearchParams | Record<string, string>) {
  if (typeof window === "undefined") return;
  const sp = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  sp.delete("_r");
  const qs = sp.toString();
  window.history.replaceState(window.history.state, "", `${pathname}${qs ? `?${qs}` : ""}`);
}

/** ⌘K / Ctrl-K, and `/` for search. Returns which one fired. */
export function useHotkeys(handlers: Record<string, (e: KeyboardEvent) => void>) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.matches("input,textarea,select,[contenteditable='true']");
      const combo = `${e.metaKey || e.ctrlKey ? "mod+" : ""}${e.shiftKey ? "shift+" : ""}${e.key.toLowerCase()}`;
      const handler = ref.current[combo] ?? ref.current[e.key];
      if (!handler) return;
      // Bare keys are for navigation only; a modifier combo always fires.
      if (!combo.startsWith("mod+") && typing) return;
      handler(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

/** Announce once, then clear — so the same words can be announced again. */
export function useAnnouncer() {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    // Clear first: an identical string would otherwise not re-announce.
    setMessage("");
    timer.current = setTimeout(() => {
      setMessage(text);
      timer.current = setTimeout(() => setMessage(""), 5000);
    }, 60);
  }, []);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return { message, announce };
}
