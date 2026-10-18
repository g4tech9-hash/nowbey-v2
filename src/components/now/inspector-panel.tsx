"use client";

/**
 * Inspector panel (Master Build Section 6.6) — chips row, title, body, location
 * box, reporter line and the big Confirm button. Confirm is optimistic (+1),
 * locks to a confirmed Emerald state and fires the brand confetti once.
 */
import { useState } from "react";
import { CheckCircle2, MapPin, ShieldAlert, ThumbsUp } from "lucide-react";
import type { SafetyReport } from "@/lib/safety-store";
import { useConfetti } from "./confetti";
import { alreadyConfirmed, markConfirmed } from "./use-safety";
import { EmptyState, HazardChip, SeverityChip, StatusChip } from "./ui";
import { timeAgo } from "./format";

export function InspectorPanel({ report }: { report: SafetyReport | null }) {
  const fire = useConfetti();
  // Mount state is derived per report (the parent keys this panel by report id).
  const [confirmed, setConfirmed] = useState(() => (report ? alreadyConfirmed(report.id) : false));
  const [count, setCount] = useState(report?.confirmedCount ?? 0);
  const [error, setError] = useState<string | null>(null);

  if (!report) {
    return (
      <section aria-label="Incident inspector" className="nbx-card flex min-h-0 flex-col p-4 lg:max-h-[52%]">
        <EmptyState
          icon={<ShieldAlert size={36} aria-hidden />}
          title="Tap a pin or a report to see what, where, how bad and how sure."
        />
      </section>
    );
  }

  const confirm = async () => {
    if (confirmed) return;
    setConfirmed(true);
    setCount((c) => c + 1);
    setError(null);
    fire();
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(report.id)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error ?? "Could not confirm that report.");
      setCount(data.report.confirmedCount);
    } catch (err) {
      // Roll the optimistic bump back so the number stays honest.
      setCount((c) => c - 1);
      setConfirmed(false);
      setError(err instanceof Error ? err.message : "Could not confirm that report.");
    }
  };

  return (
    <section
      aria-label="Incident inspector"
      className="nbx-card flex min-h-0 flex-col gap-3 overflow-y-auto p-4 lg:max-h-[52%]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <HazardChip type={report.hazardType} />
        <SeverityChip severity={report.severity} />
        <StatusChip status={report.status} className="ml-auto" />
      </div>

      <h3 className="nbx-h3 text-ink">{report.title}</h3>
      <p className="nbx-body text-ink-2">{report.description || "No extra detail shared yet."}</p>

      <div className="rounded-[12px] border border-edge p-3">
        <p className="flex items-start gap-2 text-[13px] font-semibold text-ink">
          <span className="mt-0.5 text-aqua">
            <MapPin size={16} aria-hidden />
          </span>
          <span>
            {report.address || report.settlement || report.island}
            <span className="block text-[12px] font-semibold text-ink-2">
              {[report.settlement, report.island].filter(Boolean).join(" · ")}
            </span>
            <span className="nbx-num block text-[12px] text-ink-3">
              {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
            </span>
          </span>
        </p>
      </div>

      <p className="text-[13px] font-semibold text-ink-2">
        Reported by{" "}
        <span className="text-ink">{report.isAnonymous || !report.reporterName ? "Anonymous Neighbour" : report.reporterName}</span>
        <span className="text-ink-3"> · {timeAgo(report.createdAt)}</span>
      </p>
      <p className="flex items-center gap-1.5 text-[12px] font-bold text-hz-ok">
        <CheckCircle2 size={14} aria-hidden />
        {count} neighbour{count === 1 ? "" : "s"} confirmed
        {report.status === "verified" ? " · Verified" : ""}
      </p>

      {error ? (
        <p role="alert" className="rounded-[12px] border border-hz-critical/40 bg-hz-critical/10 p-2.5 text-[12px] font-semibold text-hz-critical">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={confirm}
        disabled={confirmed}
        aria-pressed={confirmed}
        className={`nbx-btn w-full ${confirmed ? "cursor-default border border-hz-ok/40 bg-hz-ok/15 text-hz-ok" : "nbx-btn-primary"}`}
      >
        {confirmed ? (
          <>
            <CheckCircle2 size={18} aria-hidden />
            Confirmed — thank you
          </>
        ) : (
          <>
            <ThumbsUp size={18} aria-hidden />
            Confirm this report
          </>
        )}
      </button>
    </section>
  );
}
