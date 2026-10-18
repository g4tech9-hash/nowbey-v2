"use client";

/**
 * Client data hooks for the safety surfaces — every fetch exposes loading,
 * empty and error states so no screen can render blank.
 *
 * Loading is DERIVED from the request key (no setState in effect bodies);
 * data lands in promise callbacks.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SafetyReport, WireStory } from "@/lib/safety-store";

export type LoadState = "loading" | "ready" | "error";

export function useReports(island?: string, type?: string) {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `reports:${island ?? ""}:${type ?? ""}:${reloadKey}`;
  const [loadedKey, setLoadedKey] = useState("");
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [error, setError] = useState("");
  const loading = loadedKey !== requestKey;
  const state: LoadState = error && !loading ? "error" : loading ? "loading" : "ready";

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (island) params.set("island", island);
    if (type) params.set("type", type);
    const qs = params.toString();
    fetch(`/api/reports${qs ? `?${qs}` : ""}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error ?? "Could not load incidents.");
        if (!alive) return;
        setReports(data.reports ?? []);
        setError("");
        setLoadedKey(requestKey);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setReports([]);
        setError(err instanceof Error ? err.message : "Could not load incidents.");
        setLoadedKey(requestKey);
      });
    return () => {
      alive = false;
    };
  }, [island, type, requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { reports, state, error, reload, loading };
}

export function useWire() {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `wire:${reloadKey}`;
  const [loadedKey, setLoadedKey] = useState("");
  const [stories, setStories] = useState<WireStory[]>([]);
  const [error, setError] = useState("");
  const loading = loadedKey !== requestKey;
  const state: LoadState = error && !loading ? "error" : loading ? "loading" : "ready";

  useEffect(() => {
    let alive = true;
    fetch("/api/wire", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error ?? "Could not load the wire.");
        if (!alive) return;
        setStories(data.stories ?? []);
        setError("");
        setLoadedKey(requestKey);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setStories([]);
        setError(err instanceof Error ? err.message : "Could not load the wire.");
        setLoadedKey(requestKey);
      });
    return () => {
      alive = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { stories, state, error, reload, loading };
}

/** Search across settlement / street / title — combined client-side with the other filters. */
export function filterBySearch<T extends { title: string; settlement: string; address: string; description: string }>(
  rows: T[],
  search: string,
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    [r.title, r.settlement, r.address, r.description].some((f) => (f ?? "").toLowerCase().includes(q)),
  );
}

/**
 * One confirmation per report per browser (the master build's double-confirm
 * guard). Server-side the count increments atomically once per call.
 */
export function confirmLockKey(id: string): string {
  return `nb_confirmed_${id}`;
}

export function alreadyConfirmed(id: string): boolean {
  try {
    return localStorage.getItem(confirmLockKey(id)) === "1";
  } catch {
    return false;
  }
}

export function markConfirmed(id: string): void {
  try {
    localStorage.setItem(confirmLockKey(id), "1");
  } catch {
    /* private mode — the visible state still locks for this session */
  }
}

/** Live incident count for the hero stat row (live data, never hard-coded). */
export function useActiveCount() {
  const { reports, state, reload } = useReports();
  const count = useMemo(() => reports.filter((r) => r.status === "active").length, [reports]);
  return { count, state, reload };
}
