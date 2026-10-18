"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Modal — Pulse sheet material with the drawer's discipline.
 *
 * Esc closes, the backdrop closes, focus moves into the dialog and *returns to
 * the control that opened it* when it closes (the same focus-restore promise the
 * detail drawer makes). On a phone it rises from the bottom like the other
 * sheets; from 640px it is a centred card. The scrim is a real button, so
 * "tap outside" is reachable by keyboard too.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  labelledBy = "nb-modal-title",
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>("[data-autofocus],button,textarea,input,select,a[href]");
      first?.focus({ preventScroll: true });
    });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      (restoreTo.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === "sm" ? "min(420px, 100%)" : size === "lg" ? "min(760px, 100%)" : "min(560px, 100%)";

  return (
    <div className="fixed inset-0 z-[900] grid place-items-end overflow-y-auto p-0 sm:place-items-center sm:p-4">
      <button type="button" aria-label="Close" className="pulse-sheet-scrim" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="pulse-drawer pulse-enter relative z-10 mx-auto"
        style={{ width, inset: "auto 0 0 0", maxHeight: "92dvh", borderRadius: "var(--pulse-shape-lg) var(--pulse-shape-lg) 0 0" }}
      >
        <div className="sm:hidden mx-auto mt-2 h-1 w-11 rounded-full" style={{ background: "var(--border-strong)" }} aria-hidden />
        <div className="flex items-start gap-3 border-b border-default p-4 pb-3">
          <h2 id={labelledBy} className="min-w-0 flex-1 text-[18px] font-extrabold tracking-[-0.03em] text-primary">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" className="pulse-tight">
            ✕
          </Button>
        </div>
        <div className="pulse-scroll overflow-y-auto p-4 text-[13.5px] leading-[1.7] text-secondary" style={{ maxHeight: "62dvh" }}>
          {children}
        </div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-default p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
