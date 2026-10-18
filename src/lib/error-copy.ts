/**
 * Turns whatever a fetch or a server threw into a sentence a person can act on.
 *
 * The audit found "Failed to fetch" leaking to the screen: that is the browser's internal message for "the
 * network layer gave up", and it tells a resident in a storm precisely nothing — not whether their report was
 * saved, not whether to wait, not whether to try again. Worse, it appears at exactly the moment the answer
 * matters.
 *
 * The rules: say what happened, say whether anything was lost, and say what to do next. Never blame the person
 * and never show an error code alone.
 */
const OFFLINE =
  "Your phone cannot reach NowBey right now. That usually means the signal dropped. Nothing you typed has been sent — wait for a bar or two and try again.";
const TIMEOUT = "NowBey took too long to answer. The signal may be poor. Try again in a moment.";
const SERVER = "Something went wrong on our side, not yours. Try again in a moment — if it keeps happening, the report is still in your draft.";
const UNKNOWN = "That did not go through. Try again — if it keeps happening, contact support from the Support page.";

export function humanError(error: unknown, fallback = UNKNOWN): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof (error as { message?: unknown })?.message === "string"
          ? String((error as { message: string }).message)
          : "";

  const message = raw.trim();
  if (!message) return fallback;

  // The browser's own words for a dead connection, in the three spellings it uses.
  if (/^(failed to fetch|networkerror|network request failed|load failed)$/i.test(message)) return OFFLINE;
  if (/\b(offline|no internet|internet connection|enotfound|econnrefused|network)\b/i.test(message)) return OFFLINE;
  if (/\b(timeout|timed out|aborted)\b/i.test(message)) return TIMEOUT;
  if (/^HTTP\s*5\d\d\b/i.test(message) || /\b(internal server error|bad gateway|service unavailable)\b/i.test(message)) return SERVER;
  if (/^(HTTP\s*)?(4\d\d)\b/i.test(message) && message.length < 12) return fallback;

  // A message the server wrote for a person (they all start with a capital and end in a full stop) is already
  // useful; keep it. Anything else — a stack fragment, a DOMException name — is replaced.
  if (/^[A-Z"“]/.test(message) && /[.!?]$/.test(message) && message.length < 400) return message;

  return fallback;
}
