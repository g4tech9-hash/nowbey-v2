"use client";

import { useId, useState } from "react";
import { passwordStrength } from "@/lib/password";

const SEGMENT = ["", "bg-conch-500", "bg-sun-500", "bg-tide-400", "bg-tide-400"];

export const INPUT =
  "w-full rounded-lg border border-white/10 bg-abyss-950/70 px-3 py-2.5 text-[14px] outline-none focus:border-tide-400";
export const LABEL = "text-[11.5px] font-bold uppercase tracking-wide text-tide-400";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  meter = false,
  ctx,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  /** show the strength bar and the reason a password is rejected */
  meter?: boolean;
  ctx?: { handle?: string; email?: string };
  hint?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  const s = meter ? passwordStrength(value, ctx) : null;

  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`${INPUT} pr-16`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11.5px] font-bold text-tide-300 hover:bg-white/8"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {s && value ? (
        <div className="mt-1.5" aria-live="polite">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i <= s.score ? SEGMENT[s.score] : "bg-white/10"}`} />
            ))}
          </div>
          <p className={`mt-1 text-[11.5px] ${s.problem ? "text-danger-500" : "text-ink-400"}`}>{s.problem ?? s.label}</p>
        </div>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}
