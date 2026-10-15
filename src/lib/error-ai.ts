/*
 * AI log analysis with a human gate — the loop the owner asked for:
 *
 *   logs auto-collect (errortracking) → Gemini diagnoses each new crash group →
 *   an admin reads the proposal in /admin/logs and clicks Approve (or Dismiss) →
 *   approval creates ONE GitHub issue containing the diagnosis, the evidence and an
 *   implementation checklist → a human or an Arena coding session implements it
 *   through the normal branch + PR + deploy gate.
 *
 * The AI running inside this app never edits code, opens PRs or deploys anything.
 * Without GEMINI_API_KEY nothing here pretends otherwise: analyses are stored as
 * "unavailable" with the reason, and the cron retries after 6 hours. Without
 * GITHUB_TOKEN/GITHUB_REPO an approval is recorded as "approved" and waits —
 * it is never reported as an issue that does not exist.
 */
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clientErrors, errorAnalyses } from "@/db/schema";
import { aiConfigured, geminiJson } from "@/lib/ai";
import { buildAnalysisPrompt, buildGithubIssue, shouldAnalyze, validateAnalysis, type Analysis } from "@/lib/error-core";

type ErrorRow = typeof clientErrors.$inferSelect;
type AnalysisRow = typeof errorAnalyses.$inferSelect;

export function errorAiConfigured(): boolean {
  return aiConfigured();
}

export function githubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN?.trim() && githubRepo());
}

/** "owner/repo" from GITHUB_REPO (or the Actions-provided GITHUB_REPOSITORY). Null when malformed. */
export function githubRepo(): string | null {
  const raw = (process.env.GITHUB_REPO ?? process.env.GITHUB_REPOSITORY ?? "").trim();
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(raw) ? raw : null;
}

async function upsertAnalysis(error: ErrorRow, status: string, a: Analysis | null, note?: string): Promise<AnalysisRow> {
  const values = {
    digest: error.digest,
    status,
    severity: a?.severity ?? "low",
    summary: a?.summary ?? note ?? "Analysis unavailable.",
    likelyCause: a?.likelyCause ?? null,
    suggestedFix: a?.suggestedFix ?? null,
    affectedArea: a?.affectedArea ?? null,
    confidence: a?.confidence ?? "low",
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
    analyzedCount: error.count,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(errorAnalyses)
    .values({ errorId: error.id, ...values })
    .onConflictDoUpdate({ target: errorAnalyses.errorId, set: values })
    .returning();
  return row;
}

/** Diagnose one crash group. Returns the stored row, or null when the error no longer exists. Never throws. */
export async function analyzeErrorGroup(errorId: number): Promise<AnalysisRow | null> {
  try {
    const [error] = await db.select().from(clientErrors).where(eq(clientErrors.id, errorId)).limit(1);
    if (!error) return null;
    if (!aiConfigured()) {
      return upsertAnalysis(error, "unavailable", null, "GEMINI_API_KEY is not set, so no AI diagnosis yet. Logs keep collecting; add the key and this runs by itself.");
    }
    const raw = await geminiJson<Record<string, unknown>>(buildAnalysisPrompt(error), { maxTokens: 700, temperature: 0.1 });
    const analysis = validateAnalysis(raw);
    if (!analysis) {
      return upsertAnalysis(error, "unavailable", null, "Gemini did not answer with a usable diagnosis this time. It will be retried automatically.");
    }
    return upsertAnalysis(error, "pending_review", analysis);
  } catch (err) {
    console.warn(`[error-ai] analysis failed for ${errorId}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export type AnalyzeStats = { configured: boolean; checked: number; analyzed: number; unavailable: number; skipped: number };

/**
 * The automatic pass: diagnose groups that shouldAnalyze() picks (new groups, revived
 * bugs, stale "unavailable" rows). Bounded per run so a crash storm cannot spend the
 * whole Gemini quota in one cron tick.
 */
export async function analyzePendingErrorGroups(limit = 5): Promise<AnalyzeStats> {
  const stats: AnalyzeStats = { configured: aiConfigured(), checked: 0, analyzed: 0, unavailable: 0, skipped: 0 };
  const errors = await db.select().from(clientErrors).orderBy(desc(clientErrors.lastSeenAt)).limit(100);
  if (!errors.length) return stats;
  const states = await db
    .select()
    .from(errorAnalyses)
    .where(inArray(errorAnalyses.errorId, errors.map((e) => e.id)));
  const byError = new Map(states.map((s) => [s.errorId, s]));
  for (const error of errors) {
    if (stats.checked >= Math.min(20, Math.max(1, limit))) break;
    const state = byError.get(error.id) ?? null;
    if (!shouldAnalyze(error, state)) {
      stats.skipped += 1;
      continue;
    }
    stats.checked += 1;
    const row = await analyzeErrorGroup(error.id);
    if (!row) continue;
    if (row.status === "pending_review") stats.analyzed += 1;
    else stats.unavailable += 1;
    // Gemini stopped answering: leave the rest queued instead of stamping them all failed.
    if (row.status === "unavailable" && aiConfigured()) break;
  }
  return stats;
}

/* In-memory throttle so busy error traffic cannot turn the report hook into a Gemini loop. */
let lastAutoRun = 0;
export async function maybeAutoAnalyze(): Promise<void> {
  const now = Date.now();
  if (now - lastAutoRun < 10 * 60_000) return;
  lastAutoRun = now;
  await analyzePendingErrorGroups(3).catch(() => undefined);
}

export type ApproveResult =
  | { ok: true; issueUrl: string; issueNumber: number; alreadyExisted?: boolean }
  | { ok: false; error: string };

/**
 * Approval = create the GitHub issue a human/Arena session will implement.
 * Records "approved" first, so a missing token or a GitHub outage leaves an honest
 * waiting state — never a lost approval and never a fake issue link.
 */
export async function approveAndCreateIssue(errorId: number, actor: string): Promise<ApproveResult> {
  const [error] = await db.select().from(clientErrors).where(eq(clientErrors.id, errorId)).limit(1);
  if (!error) return { ok: false, error: "That crash group no longer exists." };
  const [existing] = await db.select().from(errorAnalyses).where(eq(errorAnalyses.errorId, errorId)).limit(1);
  if (!existing || existing.status === "unavailable") return { ok: false, error: "Analyze this group with AI first, then approve its proposal." };
  if (existing.status === "dismissed") return { ok: false, error: "This proposal was dismissed. Re-analyze the group to get a fresh proposal before approving." };
  if (existing.githubIssueUrl && existing.githubIssueNumber) {
    return { ok: true, issueUrl: existing.githubIssueUrl, issueNumber: existing.githubIssueNumber, alreadyExisted: true };
  }
  const analysis: Analysis = {
    severity: (["low", "medium", "high", "critical"] as const).includes(existing.severity as never) ? (existing.severity as Analysis["severity"]) : "low",
    summary: existing.summary,
    likelyCause: existing.likelyCause ?? "",
    suggestedFix: existing.suggestedFix ?? "",
    affectedArea: existing.affectedArea ?? "",
    confidence: existing.confidence === "high" || existing.confidence === "medium" ? existing.confidence : "low",
  };
  if (!analysis.likelyCause || !analysis.suggestedFix) return { ok: false, error: "This proposal has no diagnosis yet. Re-run the AI analysis first." };

  await db
    .update(errorAnalyses)
    .set({ status: "approved", reviewedBy: actor, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(errorAnalyses.id, existing.id));

  const repo = githubRepo();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!repo || !token) {
    return {
      ok: false,
      error: "Approved and saved. To turn approvals into GitHub issues, add GITHUB_TOKEN (a fine-grained token with Issues read/write on this repo) and GITHUB_REPO=owner/repo, then approve again.",
    };
  }

  const issue = buildGithubIssue(error, analysis, error.digest);
  try {
    const created = await postIssue(repo, token, issue, true);
    if (!created) return { ok: false, error: "GitHub did not accept the issue. The approval is saved; check GITHUB_TOKEN's Issues permission and approve again." };
    await db
      .update(errorAnalyses)
      .set({ status: "issue_created", githubIssueNumber: created.number, githubIssueUrl: created.url, updatedAt: new Date() })
      .where(eq(errorAnalyses.id, existing.id));
    return { ok: true, issueUrl: created.url, issueNumber: created.number };
  } catch (err) {
    console.warn(`[error-ai] GitHub issue failed: ${err instanceof Error ? err.message : err}`);
    return { ok: false, error: "GitHub could not be reached. The approval is saved; approve again to retry." };
  }
}

/** Create the issue. Some repos reject unknown labels with 422, so retry once without them. */
async function postIssue(
  repo: string,
  token: string,
  issue: { title: string; body: string },
  withLabels: boolean,
): Promise<{ number: number; url: string } | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "nowbey-log-agent",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ title: issue.title, body: issue.body, ...(withLabels ? { labels: ["bug", "ai-analysis"] } : {}) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 422 && withLabels) return postIssue(repo, token, issue, false);
  if (!res.ok) return null;
  const data = (await res.json()) as { number?: number; html_url?: string };
  return typeof data.number === "number" && data.html_url ? { number: data.number, url: data.html_url } : null;
}

export async function dismissAnalysis(errorId: number, actor: string): Promise<boolean> {
  const done = await db
    .update(errorAnalyses)
    .set({ status: "dismissed", reviewedBy: actor, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(errorAnalyses.errorId, errorId))
    .returning({ id: errorAnalyses.id });
  return done.length > 0;
}
