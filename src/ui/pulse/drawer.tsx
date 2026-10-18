"use client";

import { useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/pulse/motion";
import { rememberSeen } from "@/lib/pulse/saved";

/**
 * Drawer — the progressively disclosed third level: stream → card → drawer.
 *
 * It is the same component on a phone and on a laptop; the only difference is
 * geometry (a right-hand panel at ≥640px, a bottom sheet below), which is why
 * there is one focus trap, one Escape contract and one focus restore to get
 * right. The trigger element is remembered so focus goes back to exactly the
 * card it came from — otherwise a keyboard user is dumped at the top of a
 * 24-card stream every time they close something.
 */
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  labelledBy = "pulse-drawer-title",
  describeId,
  remember,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  labelledBy?: string;
  describeId?: string;
  /** Marks this incident as read in the device-local "recently seen" list. */
  remember?: { id: string; title: string };
}) {
  const close = useCallback(() => onClose(), [onClose]);
  const trapRef = useFocusTrap(open, close);

  useEffect(() => {
    if (open && remember) rememberSeen(remember.id, remember.title);
  }, [open, remember]);

  // Lock the page behind the sheet without a scroll jump on iOS.
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const prev = document.body.style.position;
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.position = prev;
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo({ top: y, behavior: "auto" });
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="pulse-sheet-scrim" aria-label="Close panel" onClick={close} />
      <div
        ref={trapRef}
        className="pulse-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describeId}
      >
        <div className="pulse-sheet-grab" aria-hidden />
        <header className="flex items-start gap-3 border-b border-default px-4 pb-3 pt-3">
          <div className="min-w-0 flex-1">
            {eyebrow}
            <h2 id={labelledBy} className="mt-1 text-[18px] font-extrabold leading-snug tracking-[-0.03em] text-primary">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close panel"
            className="nb-btn nb-btn-ghost pulse-tight"
            style={{ width: 44, minWidth: 44, height: 44, padding: 0, borderRadius: "var(--pulse-shape-pill)" }}
          >
            <X size={16} aria-hidden />
          </button>
        </header>
        <div className="pulse-drawer-body pulse-scroll">{children}</div>
        {footer ? <div className="pulse-drawer-foot">{footer}</div> : null}
      </div>
    </>
  );
}
