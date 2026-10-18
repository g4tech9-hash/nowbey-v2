"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The behaviour that makes `role="dialog" aria-modal="true"` true rather than aspirational.
 *
 * Before this, the app asserted `aria-modal="true"` and then did none of it: focus stayed on the trigger
 * behind the overlay, Tab walked into the page underneath, Escape was bound to `window` (so it also fired
 * while a nested menu was open), and closing dropped focus on `<body>`. A screen reader was told the rest of
 * the page was unavailable while it remained fully reachable.
 *
 * What this does, in the order a person experiences it:
 *  1. remembers what had focus, and puts it back when the dialog closes;
 *  2. moves focus into the dialog (the dialog itself, so its name and description are announced);
 *  3. keeps Tab and Shift+Tab inside it;
 *  4. closes on Escape, on the dialog's own keydown, not the window's;
 *  5. stops the page behind from scrolling (iOS included, where `overflow:hidden` alone is not enough);
 *  6. marks the rest of the page `inert` where the browser supports it, so nothing behind can be reached.
 */
export function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <div
      aria-hidden="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="absolute inset-0 h-full w-full bg-[rgba(4,14,21,0.72)] backdrop-blur-sm"
    />
  );
}

export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  // Kept current in an effect rather than during render: the linter forbids the render-time write, and the
  // keydown handler is installed after paint anyway, so it always reads the latest callback.
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const siblings = Array.from(document.body.children).filter(
      (el) => el !== node.parentElement && el instanceof HTMLElement,
    ) as HTMLElement[];
    const inerted = siblings.filter((el) => !el.hasAttribute("data-nb-dialog-root"));
    for (const el of inerted) el.setAttribute("inert", "");

    const bodyOverflow = document.body.style.overflow;
    const bodyPadding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    // Compensate for the scrollbar so locking the page does not shift everything 15px sideways.
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    node.focus({ preventScroll: true });

    const items = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && (el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement),
      );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const list = items();
      if (list.length === 0) {
        event.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      for (const el of inerted) el.removeAttribute("inert");
      document.body.style.overflow = bodyOverflow;
      document.body.style.paddingRight = bodyPadding;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return ref;
}
