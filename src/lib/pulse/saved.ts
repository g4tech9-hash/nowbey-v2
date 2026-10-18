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
import { useCallback, useEffect, useState } from "react";
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

/** Live view of the watch list. Every Save button and the /saved page share it. */
export function useWatchList() {
  const [rows, setRows] = useState<SavedIncident[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRows(readWatchList());
    setLoaded(true);
    const onWatch = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setRows(detail.filter(isRow));
    };
    window.addEventListener(WATCH_EVENT, onWatch);
    // Two tabs, one list: keep them in step.
    const onStorage = (e: StorageEvent) => {
      if (e.key === WATCH_KEY) setRows(readWatchList());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WATCH_EVENT, onWatch);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const ids = new Set(rows.map((r) => r.id));
  const toggle = useCallback((row: Omit<SavedIncident, "savedAt">) => {
    const nowSaved = toggleSaved(row);
    setRows(readWatchList());
    return nowSaved;
  }, []);

  const clear = useCallback(() => {
    writeWatchList([]);
    setRows([]);
  }, []);

  return { rows, ids, loaded, toggle, clear };
}

/**
 * The last thing each device opened, so a returning reader resumes where the
 * feed was instead of at the top. Capped, timestamped, and safe to lose.
 */
const SEEN_KEY = "nb_seen";

export function rememberSeen(id: string, title: string) {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const list: { id: string; title: string; at: string }[] = raw ? JSON.parse(raw) : [];
    const next = [{ id, title, at: new Date().toISOString() }, ...list.filter((r) => r.id !== id)].slice(0, 12);
    localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nb:seen", { detail: next }));
  } catch {
    /* ignore — this is a nicety */
  }
}

export function readSeen(): { id: string; title: string; at: string }[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as { id: string; title: string; at: string }[]) : [];
  } catch {
    return [];
  }
}

export function useRecentlySeen() {
  const [rows, setRows] = useState<{ id: string; title: string; at: string }[]>([]);
  useEffect(() => {
    setRows(readSeen());
    const onSeen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setRows(detail);
    };
    window.addEventListener("nb:seen", onSeen);
    return () => window.removeEventListener("nb:seen", onSeen);
  }, []);
  return rows;
}
