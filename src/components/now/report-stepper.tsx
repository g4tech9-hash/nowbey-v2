"use client";

/**
 * Report stepper (Master Build Section 6.7) — 3 pills: 1 What / 2 Where /
 * 3 Details. Current = Aquamarine, done = Emerald tint + check, upcoming = muted.
 */
import { CheckCircle2 } from "lucide-react";

const STEPS = ["What", "Where", "Details"] as const;

export function ReportStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Report steps">
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={`nbx-chip min-h-[44px] px-4 text-[12px] ${
                active
                  ? "nbx-grad-primary border-transparent text-white"
                  : done
                    ? "border-hz-ok/40 bg-hz-ok/15 text-hz-ok"
                    : "border-edge bg-transparent text-ink-3"
              }`}
            >
              {done ? <CheckCircle2 size={14} aria-hidden /> : <span className="nbx-num">{n}</span>}
              {label}
            </span>
            {n < 3 ? <span aria-hidden className="text-ink-3">→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
