/*
 * A tiny Gemini client (Google AI Studio key). No SDK: one POST per call, JSON in, text out.
 * Everything here returns null instead of throwing — the news wire, digests and pages must keep
 * working on the plain-English fallbacks when the key is missing, the quota is spent or Google is down.
 *
 * Cost kill switch (run instructions: docs/AI_LOG_FIXES.md § "Running the cost kill"):
 * - AI_ENABLED=false (env) hard-stops every call immediately on next deploy/restart.
 * - AI_DAILY_CALL_LIMIT (env, default 500) caps calls per UTC day; usage is ledgered in
 *   ai_usage_daily (add-ai-usage.sql) with token counts, and falls back to a per-instance
 *   in-memory counter when that table has not been migrated yet.
 * - Removing GEMINI_API_KEY remains the nuclear option.
 */

export function aiKillSwitchOn(): boolean {
  const v = (process.env.AI_ENABLED ?? "").trim().toLowerCase();
  return v === "false" || v === "0" || v === "off";
}

export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim()) && !aiKillSwitchOn();
}

/** Daily Gemini call cap. Bounded so a typo cannot silently uncap or zero the product. */
export function aiDailyLimit(): number {
  const n = Number.parseInt(process.env.AI_DAILY_CALL_LIMIT ?? "", 10);
  if (!Number.isFinite(n)) return 500;
  return Math.min(100_000, Math.max(1, n));
}

export function isOverDailyLimit(callsToday: number, limit: number): boolean {
  return callsToday >= limit;
}

/** Rough Gemini Flash text pricing for the ledger display. An estimate, never a bill. */
export function estimateCostUsd(promptTokens: number, outputTokens: number): number {
  return (promptTokens * 0.1 + outputTokens * 0.4) / 1_000_000;
}

export type AiBudgetStatus = {
  killSwitch: boolean;
  limit: number;
  callsToday: number;
  promptTokens: number;
  outputTokens: number;
  estUsd: number;
  overLimit: boolean;
  /** False until add-ai-usage.sql has run; the in-memory fallback still enforces the cap per instance. */
  ledgerReady: boolean;
};

const dayKey = (d = new Date()): string => d.toISOString().slice(0, 10);

/* Per-instance fallback + 60s cache so the budget check is not a DB query per AI call. */
let memoryCalls = 0;
let memoryDay = dayKey();
let budgetCache: { at: number; status: AiBudgetStatus } | null = null;

function rollMemoryDay(): void {
  const today = dayKey();
  if (memoryDay !== today) {
    memoryDay = today;
    memoryCalls = 0;
  }
}

export async function aiBudgetStatus(): Promise<AiBudgetStatus> {
  if (budgetCache && Date.now() - budgetCache.at < 60_000) return budgetCache.status;
  rollMemoryDay();
  const base: AiBudgetStatus = {
    killSwitch: aiKillSwitchOn(),
    limit: aiDailyLimit(),
    callsToday: memoryCalls,
    promptTokens: 0,
    outputTokens: 0,
    estUsd: 0,
    overLimit: isOverDailyLimit(memoryCalls, aiDailyLimit()),
    ledgerReady: false,
  };
  try {
    const { db } = await import("@/db");
    const { aiUsageDaily } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(aiUsageDaily).where(eq(aiUsageDaily.day, dayKey())).limit(1);
    if (row) {
      base.callsToday = Math.max(row.calls, memoryCalls);
      base.promptTokens = row.promptTokens;
      base.outputTokens = row.outputTokens;
      base.estUsd = estimateCostUsd(row.promptTokens, row.outputTokens);
      base.overLimit = isOverDailyLimit(base.callsToday, base.limit);
    }
    base.ledgerReady = true;
  } catch {
    // Table not migrated (or DB down): the cap still holds per instance via memoryCalls.
  }
  budgetCache = { at: Date.now(), status: base };
  return base;
}

/** After a real Gemini answer: count it. Ledger problems never break the feature that called. */
async function recordAiUsage(promptTokens: number, outputTokens: number): Promise<void> {
  rollMemoryDay();
  memoryCalls += 1;
  budgetCache = null;
  try {
    const { db } = await import("@/db");
    const { aiUsageDaily } = await import("@/db/schema");
    const { sql } = await import("drizzle-orm");
    await db
      .insert(aiUsageDaily)
      .values({ day: dayKey(), calls: 1, promptTokens, outputTokens })
      .onConflictDoUpdate({
        target: aiUsageDaily.day,
        set: {
          calls: sql`${aiUsageDaily.calls} + 1`,
          promptTokens: sql`${aiUsageDaily.promptTokens} + ${promptTokens}`,
          outputTokens: sql`${aiUsageDaily.outputTokens} + ${outputTokens}`,
          updatedAt: new Date(),
        },
      });
  } catch {
    // add-ai-usage.sql not run yet — the in-memory counter above still enforces the cap.
  }
}

function model(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

/* Stay under the free tier's requests-per-minute: never two calls closer than this. */
let lastCall = 0;
const MIN_GAP_MS = 400;

type GenerateOpts = {
  /** Ask for application/json back. Plain text otherwise. */
  json?: boolean;
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
};

export async function geminiGenerate(prompt: string, opts: GenerateOpts = {}): Promise<string | null> {
  if (!prompt.trim()) return null;
  return callGemini([{ text: prompt.slice(0, 20_000) }], opts);
}

/** A JPEG/PNG blob Gemini can look at, alongside a text prompt. */
export type GeminiImage = { data: Buffer; mimeType: "image/jpeg" | "image/png" | "image/webp" };

/** Text + images call (moderating an upload, describing a photo). Same null-on-any-failure rule. */
export async function geminiVision(prompt: string, images: GeminiImage[], opts: GenerateOpts = {}): Promise<string | null> {
  const parts = [
    { text: prompt.slice(0, 6_000) },
    ...images.slice(0, 4).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data.toString("base64") } })),
  ];
  return callGemini(parts, opts);
}

/* The NowBey directive (condensed from docs/AI_AGENT_DIRECTIVE.md, the full rule book). Sent as the
 * systemInstruction on every call. Keep the two in step. */
export const NOWBEY_AI_DIRECTIVE = [
  "You are the AI helper for NowBey, a community safety and neighbourhood map for The Bahamas.",
  "You suggest, summarise, sort and flag so people act faster. People decide.",
  "Rules:",
  "- Never publish, hide, block, delete, merge or re-categorise anything. A flag only queues an item for a human moderator.",
  "- Never send emails, alerts, digests or push messages. Never edit code, open pull requests or deploy.",
  "- Never give emergency, medical or legal instructions, or judge whether a person is in danger. Emergency calls go to the official lines shown in the app.",
  "- Never judge a person's identity or motives, or state that a named person did something.",
  "- Never invent facts, names, numbers, addresses, statistics or statements. Use only what the input says. Keep Bahamian place names and dialect.",
  "- If the input is too thin to act on, return the empty answer the task allows. Do not guess.",
  "- Answer only in the format the task asks for. When JSON is asked for, return JSON only: no greeting, no apology, no reasoning.",
  "- Be calm, plain and direct. Respect every length cap the task gives.",
].join("\n");

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GeminiBodyOpts = {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
};

export function buildGeminiBody(parts: GeminiPart[], opts: GeminiBodyOpts = {}) {
  return {
    systemInstruction: { parts: [{ text: NOWBEY_AI_DIRECTIVE }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxTokens ?? 1024,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
}

type Part = GeminiPart;

async function callGemini(parts: Part[], opts: GenerateOpts): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || aiKillSwitchOn()) return null;
  // Cost kill, part two: the daily cap. Over it, every feature keeps its plain fallback.
  const budget = await aiBudgetStatus();
  if (budget.overLimit) {
    console.warn(`[ai] daily call limit reached (${budget.callsToday}/${budget.limit}) — using plain fallbacks until tomorrow (UTC)`);
    return null;
  }

  const wait = MIN_GAP_MS - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
        body: JSON.stringify(buildGeminiBody(parts, opts)),
      },
    );
    if (!res.ok) {
      console.warn(`[ai] Gemini answered HTTP ${res.status} — leaving the plain fallback in place`);
      return null;
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    await recordAiUsage(data.usageMetadata?.promptTokenCount ?? 0, data.usageMetadata?.candidatesTokenCount ?? 0);
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return text.trim() || null;
  } catch (err) {
    console.warn(`[ai] Gemini call failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/** Parse a model answer as JSON, tolerating ```json fences. Null when it is not usable JSON. */
export function parseModelJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    const inner = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
    try {
      return JSON.parse(inner) as T;
    } catch {
      console.warn("[ai] Gemini answered, but not with JSON — leaving the plain fallback in place");
      return null;
    }
  }
}

/** Gemini with responseMimeType json, parsed for you. Null when the answer is not usable JSON. */
export async function geminiJson<T>(prompt: string, opts: Omit<GenerateOpts, "json"> = {}): Promise<T | null> {
  const raw = await geminiGenerate(prompt, { ...opts, json: true });
  return parseModelJson<T>(raw);
}

/** Vision call with a JSON answer. */
export async function geminiVisionJson<T>(prompt: string, images: GeminiImage[], opts: Omit<GenerateOpts, "json"> = {}): Promise<T | null> {
  const raw = await geminiVision(prompt, images, { ...opts, json: true });
  return parseModelJson<T>(raw);
}

/** Collapse whitespace and take one line, so model text can never break a headline, subject or push title. */
export function oneLine(s: unknown, max: number): string {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
