import { notFound } from "next/navigation";
import { desc, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientErrors, errorAnalyses } from "@/db/schema";
import { errorAiConfigured, githubConfigured, githubRepo } from "@/lib/error-ai";
import { getViewer } from "@/lib/viewer";
import { AnalyzeAllButton, LogGroupCard, type LogGroupView } from "@/components/admin-logs";
import { StatCard } from "@/components/admin-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Logs & AI fixes" };

/**
 * Where collected user logs become work. Gemini diagnoses each crash group automatically
 * (cron + post-report hook); here an admin reads the proposal and decides: Approve turns
 * it into one GitHub issue for a human/Arena session to implement, Dismiss rejects it.
 * The AI never edits code or deploys — this page is the "ask first" gate.
 */
export default async function AdminLogsPage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();

  const aiOn = errorAiConfigured();
  const ghOn = githubConfigured();

  let groups: LogGroupView[] = [];
  let weekGroups = 0;
  let pendingReview = 0;
  let issuesCreated = 0;
  let migrated = true;
  try {
    const rows = await db.select().from(clientErrors).orderBy(desc(clientErrors.count), desc(clientErrors.lastSeenAt)).limit(50);
    const analyses = rows.length
      ? await db.select().from(errorAnalyses).where(inArray(errorAnalyses.errorId, rows.map((r) => r.id)))
      : [];
    const byError = new Map(analyses.map((a) => [a.errorId, a]));
    const [week] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(clientErrors)
      .where(gte(clientErrors.lastSeenAt, new Date(Date.now() - 7 * 86_400_000)));
    weekGroups = week?.n ?? 0;
    pendingReview = analyses.filter((a) => a.status === "pending_review").length;
    issuesCreated = analyses.filter((a) => a.status === "issue_created").length;
    groups = rows.map((r) => {
      let breadcrumbs: LogGroupView["breadcrumbs"] = [];
      try {
        const parsed = JSON.parse(r.context ?? "null") as { breadcrumbs?: LogGroupView["breadcrumbs"] } | null;
        if (Array.isArray(parsed?.breadcrumbs)) breadcrumbs = parsed.breadcrumbs;
      } catch {
        // Context is diagnostics only; a bad blob never breaks this page.
      }
      const a = byError.get(r.id);
      return {
        id: r.id,
        kind: r.kind,
        platform: r.platform,
        message: r.message,
        stack: r.stack,
        url: r.url,
        handle: r.handle,
        count: r.count,
        firstSeenAt: r.firstSeenAt.toISOString(),
        lastSeenAt: r.lastSeenAt.toISOString(),
        appVersion: r.appVersion,
        userAgent: r.userAgent,
        breadcrumbs,
        analysis: a
          ? {
              status: a.status,
              severity: a.severity,
              summary: a.summary,
              likelyCause: a.likelyCause,
              suggestedFix: a.suggestedFix,
              affectedArea: a.affectedArea,
              confidence: a.confidence,
              updatedAt: a.updatedAt.toISOString(),
              githubIssueUrl: a.githubIssueUrl,
              githubIssueNumber: a.githubIssueNumber,
              reviewedBy: a.reviewedBy,
            }
          : null,
      };
    });
    // What needs a decision first: pending proposals by severity, then the biggest groups.
    const rank = (g: LogGroupView) =>
      g.analysis?.status === "pending_review"
        ? { critical: 0, high: 1, medium: 2, low: 3 }[g.analysis.severity] ?? 3
        : g.analysis
          ? 5
          : 4;
    groups.sort((x, y) => rank(x) - rank(y) || y.count - x.count);
  } catch {
    migrated = false; // add-client-errors.sql / add-error-ai.sql not run yet
  }

  return (
    <div className="space-y-5">
      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-primary">How this works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-secondary">
          <li><strong className="text-primary">Logs collect themselves.</strong> Web crashes, server errors and Expo app failures arrive with breadcrumbs (pages visited, failed API calls), platform and version — no user has to send anything.</li>
          <li><strong className="text-primary">AI diagnoses, it does not fix.</strong> Gemini reads each new group and writes the diagnosis below. It never edits code, opens PRs or deploys.</li>
          <li><strong className="text-primary">You decide.</strong> Approve a proposal and it becomes one GitHub issue with the evidence and a checklist. Then say “implement issue #N” in Arena (or hand it to a developer) — the fix still goes through a branch, PR and the deploy gate.</li>
        </ol>
        <ul className="mt-3 space-y-1.5 text-[12.5px]">
          <li className={aiOn ? "text-secondary" : "text-warn-400"}>
            {aiOn ? "✓ AI diagnosis (Gemini) is on — new groups are analyzed by the cron (/api/cron/error-analysis) and after new reports." : "! AI diagnosis is off: add GEMINI_API_KEY (aistudio.google.com, free tier). Logs still collect; diagnoses wait as “unavailable”."}
          </li>
          <li className={ghOn ? "text-secondary" : "text-warn-400"}>
            {ghOn
              ? `✓ GitHub handoff is on — approvals create issues in ${githubRepo()}. The token needs Issues read/write on that repo only.`
              : "! GitHub handoff is off: add GITHUB_TOKEN (fine-grained token, Issues read/write) and GITHUB_REPO=owner/repo. Approvals are saved and wait — they are never faked as issues."}
          </li>
          {!migrated ? <li className="text-warn-400">! The log tables are not in this database yet: run add-client-errors.sql, then add-error-ai.sql.</li> : null}
        </ul>
        <div className="mt-3">
          <AnalyzeAllButton aiOn={aiOn} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Crash groups (7d)" value={weekGroups} sub="browser + server + app, grouped per bug" tone={weekGroups ? "warn" : undefined} />
        <StatCard label="AI proposals waiting" value={pendingReview} sub="read, then approve or dismiss" tone={pendingReview ? "warn" : undefined} />
        <StatCard label="GitHub issues created" value={issuesCreated} sub="handed off for implementation" />
      </section>

      {groups.length ? (
        <section className="space-y-3">
          {groups.map((g) => (
            <LogGroupCard key={g.id} group={g} aiOn={aiOn} githubOn={ghOn} />
          ))}
        </section>
      ) : (
        <p className="glass rounded-2xl p-4 text-[13px] text-secondary">{migrated ? "Nothing on record — quiet is good. New crashes from the site or the app will appear here." : "Run the two SQL files named above, then this page fills itself in."}</p>
      )}
    </div>
  );
}
