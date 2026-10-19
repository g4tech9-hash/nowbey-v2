"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type LogAnalysisView = {
  status: string;
  severity: string;
  summary: string;
  likelyCause: string | null;
  suggestedFix: string | null;
  affectedArea: string | null;
  confidence: string;
  updatedAt: string;
  githubIssueUrl: string | null;
  githubIssueNumber: number | null;
  reviewedBy: string | null;
} | null;

export type LogGroupView = {
  id: number;
  kind: string;
  platform: string;
  message: string;
  stack: string | null;
  url: string | null;
  handle: string | null;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  appVersion: string | null;
  userAgent: string | null;
  breadcrumbs: { type: string; detail: string; at: string }[];
  analysis: LogAnalysisView;
};

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-danger-500/25 text-danger-500",
  high: "bg-warn-500/20 text-warn-600",
  medium: "bg-accent/18 text-text-accent",
  low: "bg-white/10 text-secondary",
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: "Waiting for your review",
  approved: "Approved — waiting for GitHub setup",
  issue_created: "GitHub issue created",
  dismissed: "Proposal dismissed",
  unavailable: "AI unavailable — will retry",
};

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch("/api/admin/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

/** One crash group with its AI proposal and the approve/dismiss gate. */
export function LogGroupCard({ group, aiOn, githubOn }: { group: LogGroupView; aiOn: boolean; githubOn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const a = group.analysis;

  const run = (action: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      if (action === "delete") {
        await fetch("/api/admin/errors", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: group.id }) });
        setNote("Crash group dismissed.");
        router.refresh();
        return;
      }
      const { ok, data } = await post({ action, id: group.id });
      if (!ok) {
        setNote(typeof data.error === "string" ? data.error : "That did not work. Try again.");
        return;
      }
      if (action === "approve" && typeof data.issueUrl === "string") {
        setNote(`GitHub issue #${String(data.issueNumber)} created — hand it to Arena or a developer to implement.`);
      } else if (action === "analyze") {
        setNote(data.status === "pending_review" ? "AI diagnosis ready below." : "AI could not diagnose this yet (see status). It retries automatically.");
      } else if (action === "dismiss-analysis") {
        setNote("Proposal dismissed. The crash group stays on record.");
      }
      router.refresh();
    });
  };

  return (
    <article className="nb-surface rounded-xl2 p-4">
      <div className="flex flex-wrap items-start gap-2">
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-extrabold uppercase ${group.kind === "server" ? "bg-danger-500/20 text-danger-500" : group.kind === "app" ? "bg-violet/20 text-violet" : "bg-accent/18 text-text-accent"}`}>
          {group.kind} · {group.platform}
        </span>
        {a && a.status !== "unavailable" ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-extrabold uppercase ${SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.low}`}>{a.severity}</span>
        ) : null}
        <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-primary">{group.message}</p>
        <span className="shrink-0 text-[12px] font-bold text-tertiary">×{group.count}</span>
      </div>

      <p className="mt-1.5 text-[11.5px] text-tertiary">
        {group.url ?? "—"} · first {new Date(group.firstSeenAt).toLocaleString()} · last {new Date(group.lastSeenAt).toLocaleString()}
        {group.handle ? ` · @${group.handle}` : ""} {group.appVersion ? `· v${group.appVersion}` : ""}
      </p>

      {a ? (
        <div className="mt-3 rounded-xl bg-white/4 p-3">
          <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-accent">
            AI diagnosis · {STATUS_LABEL[a.status] ?? a.status}
            {a.status !== "unavailable" ? ` · confidence ${a.confidence}` : ""}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-primary">{a.summary}</p>
          {a.likelyCause ? <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary"><strong className="text-primary">Likely cause:</strong> {a.likelyCause}</p> : null}
          {a.suggestedFix ? <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary"><strong className="text-primary">Suggested fix:</strong> {a.suggestedFix}</p> : null}
          {a.affectedArea ? <p className="mt-1 text-[11.5px] text-tertiary">Area: {a.affectedArea}</p> : null}
          {a.githubIssueUrl ? (
            <p className="mt-1.5 text-[12.5px]">
              <a href={a.githubIssueUrl} target="_blank" rel="noreferrer" className="font-bold text-text-accent underline">
                GitHub issue #{a.githubIssueNumber}
              </a>
              <span className="text-tertiary"> — tell Arena “implement issue #{a.githubIssueNumber}” (or hand it to a developer). Nothing ships without the usual PR + deploy gate.</span>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-tertiary">Not analyzed yet — automatic analysis runs on the cron and after new reports{aiOn ? "" : " (needs GEMINI_API_KEY)"}.</p>
      )}

      {note ? <p className="mt-2 rounded-lg bg-accent/12 px-3 py-2 text-[12.5px] font-semibold text-text-accent">{note}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run("analyze")}
          className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-extrabold text-on-accent disabled:opacity-50"
        >
          {pending ? "Working…" : a ? "Re-analyze with AI" : "Analyze with AI"}
        </button>
        {a && (a.status === "pending_review" || a.status === "approved") ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                "approve",
                githubOn
                  ? "Create a GitHub issue from this AI proposal? A human or Arena session still has to confirm before implementing anything."
                  : "Approve this proposal? GitHub is not connected yet, so it will be saved as Approved and wait — no issue will be created until GITHUB_TOKEN + GITHUB_REPO are set.",
              )
            }
            className="rounded-full bg-warn-500 px-3.5 py-1.5 text-[12px] font-extrabold text-on-accent disabled:opacity-50"
          >
            Approve → create GitHub issue
          </button>
        ) : null}
        {a && a.status === "pending_review" ? (
          <button type="button" disabled={pending} onClick={() => run("dismiss-analysis", "Dismiss this AI proposal? The crash group itself stays.") } className="rounded-full border hairline px-3 py-1.5 text-[12px] font-bold text-tertiary hover:bg-white/8 disabled:opacity-50">
            Dismiss proposal
          </button>
        ) : null}
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border hairline px-3 py-1.5 text-[12px] font-bold text-tertiary hover:bg-white/8">
          {open ? "Hide evidence" : "Show stack + breadcrumbs"}
        </button>
        <button type="button" disabled={pending} onClick={() => run("delete", "Dismiss this crash group? It comes back if the bug happens again.")} className="rounded-full border hairline px-3 py-1.5 text-[12px] font-bold text-tertiary hover:bg-white/8 disabled:opacity-50">
          Dismiss group
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          {group.breadcrumbs.length ? (
            <div>
              <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-tertiary">Breadcrumbs before the crash</p>
              <ol className="mt-1 space-y-0.5 text-[12px] text-tertiary">
                {group.breadcrumbs.map((b, i) => (
                  <li key={i} className="font-mono">[{b.type}] {b.detail}</li>
                ))}
              </ol>
            </div>
          ) : null}
          <div>
            <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-tertiary">Stack</p>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-base/70 p-3 font-mono text-[11.5px] leading-relaxed text-tertiary">{group.stack ?? "(none recorded)"}</pre>
          </div>
          {group.userAgent ? <p className="break-all font-mono text-[11.5px] text-tertiary">{group.userAgent}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

/** Batch actions for the Logs page header. */
export function AnalyzeAllButton({ aiOn }: { aiOn: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const { ok, data } = await post({ action: "analyze-all" });
            const stats = (data.stats ?? {}) as Record<string, unknown>;
            setNote(ok ? `Checked ${String(stats.checked ?? 0)} groups — ${String(stats.analyzed ?? 0)} diagnosed, ${String(stats.unavailable ?? 0)} unavailable.` : "Analysis run failed. Try again.");
            router.refresh();
          })
        }
        className="rounded-full bg-accent px-4 py-2 text-[12.5px] font-extrabold text-on-accent disabled:opacity-50"
      >
        {pending ? "Analyzing…" : "Analyze queued groups now"}
      </button>
      {!aiOn ? <span className="text-[11.5px] text-warn-600">GEMINI_API_KEY not set — diagnoses will wait as “unavailable”.</span> : null}
      {note ? <span className="text-[12px] font-semibold text-text-accent">{note}</span> : null}
    </span>
  );
}
