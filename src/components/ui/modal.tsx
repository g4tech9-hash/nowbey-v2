"use client";

import { useId, type ReactNode } from "react";
import { Button } from "./button";
import { Scrim, useDialog } from "./use-dialog";

/**
 * Modal on the landing overlay material: blurred deep-navy sheet, 20px radius,
 * hairline edge, generous shadow.
 *
 * Behaviour (focus trap, initial focus, focus restore, page scroll lock, Escape, inert background) lives in
 * useDialog, because the phone's "More" sheet needs exactly the same contract and having two copies is how
 * they drift apart. The backdrop is a plain element with an onMouseDown, not a full-size <button
 * aria-label="Close">, which used to put "Close" in the tab order *before* the dialog it closes.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Read aloud once when the dialog opens, before the content. Use for the consequence sentence. */
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const auto = useId();
  const titleId = labelledBy ?? `nb-modal-title-${auto}`;
  const descId = `nb-modal-desc-${auto}`;
  const ref = useDialog(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center overflow-y-auto p-4" data-nb-dialog-root>
      <Scrim onClose={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="glass-strong relative z-10 w-full max-w-[520px] rounded-[20px] p-5 shadow-l3 outline-none"
      >
        <div className="flex items-start gap-3">
          <h2 id={titleId} className="display min-w-0 flex-1 text-[18px] font-extrabold tracking-[-0.045em] text-sand-100">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            ✕
          </Button>
        </div>
        <div className="mt-3 text-[13px] leading-relaxed text-ink-300">
          {description ? (
            <p id={descId} className="sr-only">
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {footer ? <div className="mt-4 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
