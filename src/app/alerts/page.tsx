import type { Metadata } from "next";
import { BellRing } from "lucide-react";
import { AlertSignupForm } from "@/components/now/alert-signup-form";

export const metadata: Metadata = {
  title: "Island Alerts",
  description:
    "Free island-by-island email alerts for The Bahamas. Storm and life-safety warnings are never paywalled — they are always sent immediately at zero cost.",
};

/* SCREEN 5 — ISLAND EMAIL ALERTS (Master Build Section 7). */
export default function AlertsPage() {
  return (
    <div className="mx-auto flex max-w-[576px] flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="nbx-chip border-hz-ok/40 bg-hz-ok/15 text-hz-ok">
          <BellRing size={14} aria-hidden />
          Free Life-Safety Service • No Paywalls
        </span>
        <h1 className="nbx-h2 text-ink">Island email alerts</h1>
        <p className="nbx-body max-w-[46ch] text-ink-2">
          Choose your island and what you want to hear about. Life-safety alerts — storm warnings first —
          never sit behind a paywall.
        </p>
      </div>
      <AlertSignupForm />
    </div>
  );
}
