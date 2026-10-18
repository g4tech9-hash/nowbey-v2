/**
 * WATCH LIST — client-side today, deliberately.
 * ---------------------------------------------------------------------------
 * There is no `saved_incidents` table and no endpoint for it, so the Pulse
 * watch list is stored on the device. That is the honest state of the product:
 * saving works offline during an outage (arguably better than a server round
 * trip), it does not follow you to another device, and the UI says so rather
 * than implying a sync that does not exist.
 *
 * The shape is exactly the row an endpoint would return, so the day
 * `POST /api/incidents/:id/save` exists, only `persist()` below changes.
 */
import { useCallback } from "react";
import { useStoredJson } from "./store";
import type { CategoryKey } from "@/lib/geo";

export const WATCH_KEY = "nb_saved";
export const WATCH_EVENT = "nb:saved";

export type SavedIncident = {
  id: string;
  title: string;
  category: CategoryKey;
  parish: string | null;
  street: string | null;
  severity: number;
  confirmations: number;
  createdAt: string;
  /** When this device saved it — the order the watch list sorts by. */
  savedAt: string;
};

function isRow(v: unknown): v is SavedIncident {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.title === "string" && typeof r.category === "string";
}

export function readWatchList(): SavedIncident[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRow).slice(0, 200);
  } catch {
    return [];
  }
}

function writeWatchList(rows: SavedIncident[]) {
  try {
    if (rows.length) localStorage.setItem(WATCH_KEY, JSON.stringify(rows));
    else localStorage.removeItem(WATCH_KEY);
  } catch {
    /* quota or private mode: the list still works for this visit */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(WATCH_EVENT, { detail: rows }));
}

export function isSaved(id: string): boolean {
  return readWatchList().some((r) => r.id === id);
}

export function toggleSaved(row: Omit<SavedIncident, "savedAt"> & { savedAt?: string }): boolean {
  const rows = readWatchList();
  const at = rows.findIndex((r) => r.id === row.id);
  if (at >= 0) {
    rows.splice(at, 1);
    writeWatchList(rows);
    return false;
  }
  writeWatchList([{ ...row, savedAt: row.savedAt ?? new Date().toISOString() }, ...rows].slice(0, 200));
  return true;
}

/** An immutable empty list, so `Object.is` can tell "still nothing saved" apart
 *  from "a new array of nothing saved". */
const EMPTY_WATCH: SavedIncident[] = [];
const decodeWatch = (raw: string): SavedIncident[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRow) : [];
  } catch {
    return [];
  }
};

/**
 * Live view of the watch list. Every Save button and the /saved page share it.
 *
 * The list is read through the pref store rather than copied out of
 * localStorage in an effect: a page that renders empty for a frame and then
 * fills in makes "Saved" look broken, and the /saved page's empty state would
 * briefly lie. Every writer here already dispatches WATCH_EVENT, so a tap in
 * the header, one in a drawer and the /saved page agree without polling; the
 * `storage` listener inside the store covers a second tab.
 */
export function useWatchList() {
  // decodeWatch is hoisted for the same reason as decodeSeen below: a snapshot
  // reader that changes identity every render re-subscribes every render.
  const rows = useStoredJson<SavedIncident[]>(WATCH_KEY, EMPTY_WATCH, decodeWatch, [WATCH_EVENT]);
  const ids = new Set(rows.map((r) => r.id));

  const toggle = useCallback((row: Omit<SavedIncident, "savedAt">) => toggleSaved(row), []);
  const clear = useCallback(() => writeWatchList([]), []);

  // `loaded` distinguishes "this device has nothing" from "we have not asked
  // this device yet". With a synchronous store read they are the same moment, so
  // the flag stays in the API for callers that branch on it.
  return { rows, ids, loaded: true, toggle, clear };
}

/**
 * The last thing each device opened, so a returning reader resumes where the
 * feed was instead of at the top. Capped, timestamped, and safe to lose.
 */
const SEEN_KEY = "nb_seen";
const SEEN_EVENT = "nb:seen";
const EMPTY_SEEN: SeenRow[] = [];

export function rememberSeen(id: string, title: string) {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const list: { id: string; title: string; at: string }[] = raw ? JSON.parse(raw) : [];
    const next = [{ id, title, at: new Date().toISOString() }, ...list.filter((r) => r.id !== id)].slice(0, 12);
    localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SEEN_EVENT, { detail: next }));
  } catch {
    /* ignore — this is a nicety */
  }
}

export type SeenRow = { id: string; title: string; at: string };

export function readSeen(): SeenRow[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as { id: string; title: string; at: string }[]) : [];
  } catch {
    return [];
  }
}

/**
 * A module-level decoder, on purpose: `useSyncExternalStore` re-subscribes
 * whenever `getSnapshot` changes identity, so an inline arrow would make every
 * render look like a new store. Hoisted, it is stable for the life of the tab.
 */
const decodeSeen = (raw: string): SeenRow[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SeenRow[]) : [];
  } catch {
    return [];
  }
};

export function useRecentlySeen() {
  return useStoredJson<SeenRow[]>(SEEN_KEY, EMPTY_SEEN, decodeSeen, [SEEN_EVENT]);
}
