/*
 * Pure helpers for the log pipeline: scrubbing, breadcrumb hygiene, digests, AI-answer
 * validation, the "is this worth (re-)analyzing" rule and GitHub issue rendering.
 * No database or network imports here, so the hermetic unit tests can import this file
 * directly (same pattern as collect.ts). errortracking.ts / error-ai.ts do the I/O.
 */
import { createHash } from "node:crypto";

export type ErrorKind = "client" | "boundary" | "server" | "app";
export type Severity = "low" | "medium" | "high" | "critical";
export type Confidence = "low" | "medium" | "high";

export const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

/** Things that must never sit in stored logs or a GitHub issue: credential query values and bearer tokens. */
export function scrubText(value: unknown, max = 2000): string {
  let s = String(value ?? "");
  s = s.replace(/([?&](?:token|access_token|refresh_token|key|api_key|secret|password|pass|code|state|signature)=)[^&\s"'<>]+/gi, "$1[redacted]");
  s = s.replace(/\bBearer\s+[A-Za-z0-9._\-+/=]{8,}/g, "Bearer [redacted]");
  s = s.replace(/\bsk-[A-Za-z0-9_-]{12,}/g, "[redacted]");
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  return s.slice(0, max);
}

/** Keep only the path of a URL. Query strings and fragments can carry reset tokens. */
export function cleanPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const u = new URL(raw, "https://nowbey.invalid");
    return (u.pathname || "/").slice(0, 200);
  } catch {
    return raw.split(/[?#]/)[0].slice(0, 200) || null;
  }
}

/** Web and Android crashing with the same message are two bugs, not one — platform is part of the digest. */
export function digestFor(kind: string, message: string, url: string | null, platform = "web"): string {
  return createHash("sha256").update(`${kind}|${platform}|${message}|${url ?? ""}`).digest("hex").slice(0, 24);
}

export type Breadcrumb = { type: string; detail: string; at: string };

/**
 * Breadcrumbs are small "what just happened" notes (page visited, button tapped, API
 * failed). Paths only, bounded in count and size, token-scrubbed: never form values,
 * never query strings, never anything a person typed.
 */
export function sanitizeBreadcrumbs(input: unknown): Breadcrumb[] {
  if (!Array.isArray(input)) return [];
  const out: Breadcrumb[] = [];
  for (const item of input.slice(-20)) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const type = scrubText(b.type, 24).trim() || "event";
    const rawDetail = typeof b.detail === "string" ? b.detail : "";
    // Details that look like a path lose their query string; free text is token-scrubbed.
    const detail = scrubText(rawDetail.startsWith("/") ? (cleanPath(rawDetail) ?? "") : rawDetail, 160).trim();
    if (!detail) continue;
    const atRaw = typeof b.at === "string" ? b.at : "";
    const at = /^\d{4}-\d{2}-\d{2}T/.test(atRaw) ? atRaw.slice(0, 32) : new Date(0).toISOString();
    out.push({ type, detail, at });
  }
  return out;
}

/** The stored context blob: breadcrumbs plus a few bounded, non-sensitive fields. */
export function sanitizeContextJson(input: { breadcrumbs?: unknown; extra?: Record<string, unknown> }): string | null {
  const breadcrumbs = sanitizeBreadcrumbs(input.breadcrumbs);
  const extra: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.extra ?? {})) {
    if (typeof v === "string" && v.trim()) extra[scrubText(k, 24)] = scrubText(v, 120);
  }
  if (!breadcrumbs.length && !Object.keys(extra).length) return null;
  return JSON.stringify({ breadcrumbs, ...extra }).slice(0, 4000);
}

export type ErrorLike = {
  kind: string;
  platform?: string | null;
  message: string;
  stack?: string | null;
  url?: string | null;
  count: number;
  firstSeenAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
  userAgent?: string | null;
  context?: string | null;
  appVersion?: string | null;
};

export type Analysis = {
  severity: Severity;
  summary: string;
  likelyCause: string;
  suggestedFix: string;
  affectedArea: string;
  confidence: Confidence;
};

const clip = (v: unknown, max: number): string =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** A model answer becomes a proposal only when every field is present and the enums are honest. */
export function validateAnalysis(raw: unknown): Analysis | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const severity = String(a.severity ?? "").toLowerCase();
  const confidence = String(a.confidence ?? "").toLowerCase();
  const analysis: Analysis = {
    severity: (SEVERITIES as string[]).includes(severity) ? (severity as Severity) : "low",
    summary: clip(a.summary, 280),
    likelyCause: clip(a.likelyCause, 700),
    suggestedFix: clip(a.suggestedFix, 900),
    affectedArea: clip(a.affectedArea, 160),
    confidence: confidence === "high" || confidence === "medium" ? (confidence as Confidence) : "low",
  };
  if (!analysis.summary || !analysis.likelyCause || !analysis.suggestedFix) return null;
  return analysis;
}

export type AnalysisState = { status: string; analyzedCount: number; updatedAt: Date | string } | null;

/**
 * Auto-analysis rule (what the cron and the post-report hook run):
 * - never analyzed -> yes
 * - AI was unavailable -> retry only after 6 hours (quota may have reset)
 * - otherwise -> only when the bug came back at least 5 more times after the last analysis
 */
export function shouldAnalyze(error: { count: number }, state: AnalysisState, now = Date.now()): boolean {
  if (!state) return true;
  if (state.status === "issue_created" || state.status === "dismissed" || state.status === "approved") return false;
  if (state.status === "unavailable") return now - new Date(state.updatedAt).getTime() > 6 * 3_600_000;
  return error.count >= state.analyzedCount + 5;
}

export function buildAnalysisPrompt(e: ErrorLike): string {
  const crumbs = (() => {
    try {
      const parsed = JSON.parse(e.context ?? "null") as { breadcrumbs?: Breadcrumb[] } | null;
      return (parsed?.breadcrumbs ?? []).map((b) => `- [${b.type}] ${b.detail}`).join("\n");
    } catch {
      return "";
    }
  })();
  return `You are a senior engineer triaging a production error for NowBey, a Next.js (App Router, TypeScript, Drizzle/Postgres) community safety app for The Bahamas, with an Expo/React Native Android app sharing the same API. You are given one grouped error (same bug, possibly many occurrences). Diagnose it; do NOT invent files, functions or stack frames you were not shown, and say when the evidence is thin.

Answer in JSON with exactly these keys:
- "severity": "low" | "medium" | "high" | "critical" (critical = data loss, sign-in/payment broken, or server crash hitting many people; high = a feature broken for many; medium = a feature broken for some; low = cosmetic or rare)
- "summary": one plain-English sentence a non-engineer site owner can understand (max 30 words)
- "likelyCause": the most probable root cause, citing the message/stack/breadcrumbs as evidence, and what evidence is missing if unsure
- "suggestedFix": concrete fix steps a developer (or coding agent) can implement, naming the likely area of the codebase when the stack supports it
- "affectedArea": short label, e.g. "web map page", "Expo incidents API", "server /api/news"
- "confidence": "low" | "medium" | "high"

Error group:
kind: ${e.kind}
platform: ${e.platform ?? "web"}
occurrences: ${e.count}
firstSeen: ${e.firstSeenAt ? new Date(e.firstSeenAt).toISOString() : "unknown"}
lastSeen: ${e.lastSeenAt ? new Date(e.lastSeenAt).toISOString() : "unknown"}
page/route: ${e.url ?? "unknown"}
appVersion: ${e.appVersion ?? "unknown"}
message: ${scrubText(e.message, 300)}
stack (may be truncated):
${scrubText(e.stack, 1500) || "(none)"}
recent breadcrumbs before the crash:
${crumbs || "(none)"}
userAgent: ${scrubText(e.userAgent, 160) || "(none)"}`;
}

const SEVERITY_LABEL: Record<string, string> = { critical: "🔴 Critical", high: "🟠 High", medium: "🟡 Medium", low: "⚪ Low" };

/** The approved proposal becomes this issue. It is written for a human or Arena coding agent to pick up. */
export function buildGithubIssue(e: ErrorLike, a: Analysis, digest: string): { title: string; body: string } {
  const title = `[AI log fix] ${a.summary}`.slice(0, 200);
  const crumbs = (() => {
    try {
      const parsed = JSON.parse(e.context ?? "null") as { breadcrumbs?: Breadcrumb[] } | null;
      return (parsed?.breadcrumbs ?? []).map((b) => `- \`[${b.type}]\` ${b.detail}`).join("\n");
    } catch {
      return "";
    }
  })();
  const body = [
    `Created from Admin → Logs after a human approved the AI analysis. **Do not start work until the owner confirms** (reply on this issue, or the owner opens an Arena session and names this issue).`,
    ``,
    `## AI diagnosis`,
    `- **Severity:** ${SEVERITY_LABEL[a.severity] ?? a.severity} · **Confidence:** ${a.confidence} · **Affected area:** ${a.affectedArea || "unknown"}`,
    `- **What is happening:** ${a.summary}`,
    `- **Likely cause:** ${a.likelyCause}`,
    ``,
    `## Suggested fix`,
    a.suggestedFix,
    ``,
    `## Error evidence (grouped logs)`,
    `- Kind/platform: \`${e.kind}\` / \`${e.platform ?? "web"}\` · Occurrences: **${e.count}** · Digest: \`${digest}\``,
    `- First seen: ${e.firstSeenAt ? new Date(e.firstSeenAt).toISOString() : "unknown"} · Last seen: ${e.lastSeenAt ? new Date(e.lastSeenAt).toISOString() : "unknown"}`,
    `- Page/route: \`${e.url ?? "unknown"}\` · App version: ${e.appVersion ?? "unknown"}`,
    `- Message: ${scrubText(e.message, 300)}`,
    ``,
    `Stack:`,
    "```",
    scrubText(e.stack, 1800) || "(none recorded)",
    "```",
    crumbs ? `\nBreadcrumbs before the crash:\n${crumbs}` : "",
    e.userAgent ? `\nUser agent: ${scrubText(e.userAgent, 160)}` : "",
    ``,
    `## Implementation checklist`,
    `- [ ] Owner has confirmed "go" (this approval already happened once in Admin — re-confirm if the issue sat open)`,
    `- [ ] Reproduce or trace the cause in code; do not guess-fix without evidence`,
    `- [ ] Implement the smallest fix; add/extend a hermetic test where the code allows it`,
    `- [ ] Run \`npm run typecheck\`, \`npm run lint\`, \`npm test\` (and \`npm run build\` for route/UI changes)`,
    `- [ ] Open a PR referencing this issue; never deploy directly`,
    `- [ ] After merge, watch Admin → Logs: this group should stop gaining occurrences`,
  ]
    .filter((line) => line !== "")
    .join("\n");
  return { title, body: body.slice(0, 8000) };
}
