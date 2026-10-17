"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Modal on the landing overlay material: blurred deep-navy sheet, 20px radius,
 * hairline edge, generous shadow. Esc and backdrop click close it.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  labelledBy = "nb-modal-title",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center overflow-y-auto p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[rgba(4,14,21,0.72)] backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="glass-strong relative z-10 w-full max-w-[520px] rounded-[20px] p-5 shadow-l3"
      >
        <div className="flex items-start gap-3">
          <h2 id={labelledBy} className="display min-w-0 flex-1 text-[18px] font-extrabold tracking-[-0.045em] text-sand-100">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            ✕
          </Button>
        </div>
        <div className="mt-3 text-[13px] leading-relaxed text-ink-300">{children}</div>
        {footer ? <div className="mt-4 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
