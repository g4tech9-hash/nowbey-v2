/*
 * A tiny Gemini client (Google AI Studio key). No SDK: one POST per call, JSON in, text out.
 * Everything here returns null instead of throwing — the news wire, digests and pages must keep
 * working on the plain-English fallbacks when the key is missing, the quota is spent or Google is down.
 */

export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
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

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

async function callGemini(parts: Part[], opts: GenerateOpts): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

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
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: opts.temperature ?? 0.3,
            maxOutputTokens: opts.maxTokens ?? 1024,
            ...(opts.json ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );
    if (!res.ok) {
      console.warn(`[ai] Gemini answered HTTP ${res.status} — leaving the plain fallback in place`);
      return null;
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
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
