import { AppState, type AppStateStatus } from "react-native";
import { api, ApiError, errMsg } from "./api";
import { readJson, writeJson } from "./local-store";
import {
  dueItem,
  enqueue,
  hasFailed,
  makeClientKey,
  markFailed,
  markSending,
  markSent,
  markTerminal,
  prune,
  queueMessage,
  retryNow,
  waitingCount,
  type OutboxItem,
  type OutboxPayload,
} from "./outbox-core";
import type { CategoryKey } from "./geo";

/**
 * The runtime half of the send queue: storage, the network attempt, and a subscription small enough for
 * `useSyncExternalStore`.
 *
 * The rule the UI must never break: nothing here throws away the person's words. A failed send leaves the item
 * on the phone, a refused send leaves it with an explanation, and expiry is a day, not a minute.
 */

const QUEUE_KEY = "nowbey_outbox_v1";
const DRAFT_KEY = "nowbey_draft_v1";

let items: OutboxItem[] = [];
let loaded = false;
let flushing = false;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

async function persist() {
  await writeJson(QUEUE_KEY, items);
}

async function loadQueue() {
  const stored = await readJson<OutboxItem[]>(QUEUE_KEY);
  if (Array.isArray(stored)) {
    // An item left in `sending` means the app died between the request and the answer. Treat it as due: the
    // clientKey is what stops that from becoming a second pin on the server.
    items = prune(
      stored.map((i) => (i.state === "sending" ? { ...i, state: "queued" as const, nextAt: 0 } : i)),
      Date.now(),
    );
  }
  loaded = true;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function snapshot(): OutboxItem[] {
  return items;
}

export function isLoaded(): boolean {
  return loaded;
}

/** A server refusal we should not retry; everything else (offline, timeout, 5xx, 429) is worth waiting for. */
function retryable(e: unknown): boolean {
  if (e instanceof ApiError) return e.status >= 500 || e.status === 429 || e.status === 408;
  return true;
}

/**
 * Try everything that is due, oldest first. Safe to call from anywhere and as often as you like: concurrent
 * calls collapse into one, and an item in flight is never attempted twice.
 */
export async function flush(): Promise<{ sent: number; failed: number }> {
  if (!loaded) await loadQueue();
  if (flushing) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;

  try {
    // A cap, so a pathological queue cannot spin forever in one pass.
    for (let guard = 0; guard < 20; guard += 1) {
      const item = dueItem(items, Date.now());
      if (!item) break;

      items = markSending(items, item.clientKey);
      emit();

      try {
        // The server answers duplicate:true when a nearby report already covers this. For a queued report that
        // is a success: either it is the same report arriving twice after a lost response, or a neighbour got
        // there first — in both cases the report exists on the map and the words are no longer needed here.
        await api.createIncident({ ...(item.payload as OutboxPayload), category: item.payload.category as CategoryKey, clientKey: item.clientKey });
        items = markSent(items, item.clientKey);
        sent += 1;
      } catch (e) {
        if (retryable(e)) {
          items = markFailed(items, item.clientKey, Date.now(), errMsg(e));
        } else {
          items = markTerminal(items, item.clientKey, errMsg(e));
          failed += 1;
        }
      }

      await persist();
      emit();
    }
  } finally {
    flushing = false;
    await persist();
    emit();
  }

  return { sent, failed };
}

/** Add a report and try it immediately. Returns the key, so the caller can report its fate. */
export async function queueReport(payload: OutboxPayload): Promise<string> {
  if (!loaded) await loadQueue();
  const clientKey = makeClientKey();
  items = enqueue(items, { ...payload, anonymous: payload.anonymous === true }, Date.now(), clientKey);
  await persist();
  emit();
  void flush();
  return clientKey;
}

/** The banner's action: clear every wait, then try again. */
export async function retryAll(): Promise<void> {
  items = retryNow(items, Date.now());
  await persist();
  emit();
  await flush();
}

/** Called once from the root layout. Flushes on launch and whenever the app returns to the foreground. */
export function initOutbox(): () => void {
  if (started) return () => {};
  started = true;

  void loadQueue().then(() => {
    emit();
    void flush();
  });

  const onChange = (state: AppStateStatus) => {
    // Coming back from the background is exactly when a phone in a pocket has found signal again.
    if (state === "active") void flush();
  };
  const sub = AppState.addEventListener("change", onChange);

  return () => {
    started = false;
    sub.remove();
  };
}

/** The banner's sentence, or null when there is nothing to say. Reads the in-memory queue. */
export function currentMessage(): string | null {
  return loaded ? queueMessage(items) : null;
}

export function outboxCounts(): { waiting: number; failed: boolean } {
  return { waiting: waitingCount(items), failed: hasFailed(items) };
}

/* ------------------------------------------------------------------ drafts */

export type Draft = {
  savedAt: number;
  step: number;
  category: string;
  severity: number;
  lat: number | null;
  lng: number | null;
  placeStreet: string | null;
  placeParish: string | null;
  title: string;
  details: string;
  photoNote: string;
  anonymous: boolean;
};

export const DRAFT_TTL = 24 * 60 * 60 * 1000;

/**
 * Save the form as it stands. Called on a short debounce; a draft from yesterday is not restored, because the
 * world it described has moved (the same rule the website learned in audit R1).
 */
export async function saveDraft(draft: Omit<Draft, "savedAt">): Promise<void> {
  const empty =
    !draft.title.trim() && !draft.details.trim() && !draft.photoNote.trim() && draft.lat === null && draft.step === 0;
  if (empty) {
    await writeJson(DRAFT_KEY, null);
    return;
  }
  await writeJson(DRAFT_KEY, { ...draft, savedAt: Date.now() } satisfies Draft);
}

export async function loadDraft(): Promise<Draft | null> {
  const draft = await readJson<Draft>(DRAFT_KEY);
  if (!draft) return null;
  if (!Number.isFinite(draft.savedAt) || Date.now() - draft.savedAt > DRAFT_TTL) {
    await writeJson(DRAFT_KEY, null);
    return null;
  }
  return draft;
}

export async function clearDraft(): Promise<void> {
  await writeJson(DRAFT_KEY, null);
}
