import type { Metadata } from "next";
import { ReportForm } from "@/components/now/report-form";

export const metadata: Metadata = {
  title: "Report a Hazard",
  description:
    "File a hazard report for your island in three quick steps — flooding, power, roads, storm, fire or a community advisory. Anonymous posting respected.",
};

/* SCREEN 3 — REPORT A HAZARD (Master Build Section 7). */
export default function ReportPage() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6">
      <div>
        <p className="nbx-label text-aqua">File report</p>
        <h1 className="nbx-h2 mt-2 text-ink">Report a hazard</h1>
        <p className="nbx-body mt-2 max-w-[52ch] text-ink-2">
          Made for the moment you notice. Your draft keeps if the signal drops — nothing you type is lost.
        </p>
      </div>
      <ReportForm />
    </div>
  );
}
