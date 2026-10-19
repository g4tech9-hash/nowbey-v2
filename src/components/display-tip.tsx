"use client";

import { useEffect, useState } from "react";
import { AccessibilityControls } from "./accessibility-controls";

const KEY = "nb_display_tip_seen";

/**
 * Shown once per browser on the first visit: text size and data saving are a tap away, before anyone has to hunt
 * for them in the footer. Dismissing it is remembered.
 */
export function DisplayTip() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {}
    const frame = requestAnimationFrame(() => setShow(!seen));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  return (
    <aside aria-label="Display options" className="mx-auto mt-2 w-full max-w-[1180px] px-3.5 sm:px-5">
      <div className="nb-surface flex flex-wrap items-center gap-3 rounded-xl2 p-3">
        <div className="min-w-[200px] flex-1">
          <p className="text-[13px] font-bold text-primary">Text hard to read, or short on data?</p>
          <p className="mt-0.5 text-[12px] text-tertiary">Choose a display option. You can change it any time in the footer.</p>
          <div className="mt-2">
            <AccessibilityControls compact />
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-[40px] rounded-full border hairline px-3.5 py-1.5 text-[12.5px] font-bold text-secondary hover:bg-white/5"
        >
          Dismiss
        </button>
      </div>
    </aside>
  );
}
