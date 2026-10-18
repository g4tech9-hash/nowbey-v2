/**
 * The send queue, as arithmetic.
 *
 * A report written on a phone in a squall is the most valuable report the product will ever receive, and it is
 * also the one most likely to be written where there is no signal. Until now the app treated a dropped request
 * as an error: the words stayed in the form's state, so a backgrounded app or a dead battery lost them.
 *
 * Nothing in this file touches React, the network or the filesystem — it is the part that can be tested, and
 * the part where a mistake costs somebody their report. The runtime that persists it lives in `outbox.ts`.
 */

export type OutboxPayload = {
  title: string;
  details?: string;
  category: string;
  severity: number;
  lat: number;
  lng: number;
  address?: string | null;
  street?: string | null;
  parish?: string | null;
  photoNote?: string;
  anonymous?: boolean;
};

export type OutboxState = "queued" | "sending" | "failed";

export type OutboxItem = {
  /**
   * Created on the phone at compose time and sent with the report. A retry that follows a response the phone
   * never saw is the same report, not a second one — the server uses this to recognise it.
   */
  clientKey: string;
  createdAt: number;
  payload: OutboxPayload;
  /**
   * Frozen at enqueue. A report written anonymously stays anonymous even if the person signs in while it is
   * waiting: acquiring a handle during a queue must not retroactively name its author.
   */
  anonymous: boolean;
  state: OutboxState;
  attempts: number;
  /** Epoch ms. The item is not eligible before this. */
  nextAt: number;
  lastError?: string;
};

/** 2s, 8s, 30s, 2min, 5min — bounded, because an infinite retry hides a real failure. */
export const BACKOFF_MS = [0, 2_000, 8_000, 30_000, 120_000, 300_000] as const;
export const MAX_ATTEMPTS = BACKOFF_MS.length;
/** More than this waiting means something is wrong with the connection, not with the queue. */
export const MAX_ITEMS = 20;
/** A queued report older than this is history, not news. */
export const EXPIRE_MS = 24 * 60 * 60 * 1000;

export function backoffMs(attempts: number): number {
  const i = Math.min(Math.max(attempts, 0), BACKOFF_MS.length - 1);
  return BACKOFF_MS[i];
}

/** A key that is unique enough for one phone and does not need a crypto dependency. */
export function makeClientKey(now: number = Date.now(), random: number = Math.random()): string {
  return `m-${now.toString(36)}-${Math.floor(random * 0xffffffff).toString(36)}`;
}

/**
 * Add a report to the queue. Re-adding the same clientKey is a no-op, so a double tap cannot make two items.
 * Oldest items are dropped rather than growing without bound; the person is told, not silently truncated.
 */
export function enqueue(
  items: readonly OutboxItem[],
  payload: OutboxPayload,
  now: number,
  clientKey: string = makeClientKey(now),
): OutboxItem[] {
  if (items.some((i) => i.clientKey === clientKey)) return [...items];

  const item: OutboxItem = {
    clientKey,
    createdAt: now,
    payload,
    // The payload's own flag is the truth at compose time; the copy above exists so a later edit to the
    // payload cannot quietly change who is named.
    anonymous: payload.anonymous === true,
    state: "queued",
    attempts: 0,
    nextAt: now,
  };

  const next = [...items, item];
  return next.length > MAX_ITEMS ? next.slice(next.length - MAX_ITEMS) : next;
}

/** The next item that may be attempted, oldest first. `sending` items are deliberately excluded. */
export function dueItem(items: readonly OutboxItem[], now: number): OutboxItem | null {
  return (
    items
      .filter((i) => i.state === "queued" && i.nextAt <= now)
      .sort((a, b) => a.createdAt - b.createdAt)[0] ?? null
  );
}

export function markSending(items: readonly OutboxItem[], clientKey: string): OutboxItem[] {
  return items.map((i) => (i.clientKey === clientKey ? { ...i, state: "sending" as const } : i));
}

export function markSent(items: readonly OutboxItem[], clientKey: string): OutboxItem[] {
  return items.filter((i) => i.clientKey !== clientKey);
}

/**
 * Record a failed attempt. After the last backoff the item becomes `failed` and stops consuming the radio —
 * but it stays on the phone with its words intact, so the person can retry by hand or copy it out.
 */
export function markFailed(
  items: readonly OutboxItem[],
  clientKey: string,
  now: number,
  error: string,
): OutboxItem[] {
  return items.map((i) => {
    if (i.clientKey !== clientKey) return i;
    const attempts = i.attempts + 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    return {
      ...i,
      attempts,
      state: exhausted ? ("failed" as const) : ("queued" as const),
      nextAt: now + backoffMs(attempts),
      lastError: error,
    };
  });
}

/**
 * A refusal that retrying cannot fix (a 400 from validation). The item stays, with its words and the server's
 * own explanation, but it stops consuming the radio.
 */
export function markTerminal(items: readonly OutboxItem[], clientKey: string, error: string): OutboxItem[] {
  return items.map((i) =>
    i.clientKey === clientKey ? { ...i, state: "failed" as const, attempts: MAX_ATTEMPTS, lastError: error } : i,
  );
}

/** "Send now", from the banner. Clears every wait, including the backoff on exhausted items. */
export function retryNow(items: readonly OutboxItem[], now: number): OutboxItem[] {
  return items.map((i) => (i.state === "failed" ? { ...i, state: "queued" as const, attempts: 0, nextAt: now } : { ...i, nextAt: now }));
}

/** Items that someone should be told about: still waiting, or given up. */
export function waitingCount(items: readonly OutboxItem[]): number {
  return items.filter((i) => i.state === "queued" || i.state === "failed").length;
}

export function hasFailed(items: readonly OutboxItem[]): boolean {
  return items.some((i) => i.state === "failed");
}

/** Drop what has expired. A day-old report about a flooded road is not a report about this road. */
export function prune(items: readonly OutboxItem[], now: number): OutboxItem[] {
  return items.filter((i) => now - i.createdAt < EXPIRE_MS);
}

/**
 * One line for the banner. Deliberately says what happened to the words, because "Failed to send" leaves the
 * only question that matters unanswered.
 */
export function queueMessage(items: readonly OutboxItem[]): string | null {
  const waiting = waitingCount(items);
  if (waiting === 0) return null;
  if (hasFailed(items)) {
    return waiting === 1
      ? "One report could not send. It is still on this phone — tap to try again."
      : `${waiting} reports could not send. They are still on this phone — tap to try again.`;
  }
  return waiting === 1
    ? "One report is waiting for a signal. It will send by itself."
    : `${waiting} reports are waiting for a signal. They will send by themselves.`;
}
