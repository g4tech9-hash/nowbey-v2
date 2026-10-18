"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

/**
 * The one way Pulse reads browser state.
 *
 * `localStorage`, `navigator.onLine`, `matchMedia` and the `documentElement`
 * dataset are all stores living outside React. The reflex is to read one in an
 * effect and copy it into `useState`, which costs a render with the wrong value
 * first — that is the mechanism behind a theme control that flashes "Dark"
 * before settling on the stored "Light". `useSyncExternalStore` reads the truth
 * during render, and its third argument is what the server renders, so SSR and
 * the first client paint agree instead of disagreeing for one frame.
 *
 * Two rules for callers:
 *   • `read` must return a value that survives `Object.is` when nothing changed.
 *     Strings, booleans and numbers are fine; for a parsed object use
 *     `useStoredJson`, which caches by the raw string.
 *   • `events` is how a same-tab write wakes other subscribers: the `storage`
 *     event only fires in *other* tabs, so Pulse dispatches its own
 *     (`nb:theme`, `nb:saved`, …) and this subscribes to them.
 */
export function usePrefStore<T>(read: () => T | null, fallback: T, events: string[] = []): T {
  const key = events.join(" ");
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      for (const name of key.split(" ").filter(Boolean)) window.addEventListener(name, onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        for (const name of key.split(" ").filter(Boolean)) window.removeEventListener(name, onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => {
    try {
      const value = read();
      return value === null || value === undefined ? fallback : value;
    } catch {
      // A private-mode throw, a disabled storage API, a torn read: the fallback
      // is a valid answer, and it must never be the reason a page cannot render.
      return fallback;
    }
  }, [read, fallback]);

  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** A localStorage key holding a string, decoded to `T` and cached per raw value. */
export function useStoredJson<T>(key: string, fallback: T, decode: (raw: string) => T, events: string[] = []): T {
  // useSyncExternalStore compares with Object.is, so a fresh parse on every call
  // would look like a new value forever. Cache on the raw string instead.
  const cache = useRef<{ raw: string | null; value: T }>({ raw: null, value: fallback });
  const stable = useCallback(() => {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(key);
    if (cache.current.raw !== raw) {
      let value: T;
      try {
        value = raw === null ? fallback : decode(raw);
      } catch {
        value = fallback;
      }
      cache.current = { raw, value };
    }
    return cache.current.value;
  }, [key, decode, fallback]);
  return usePrefStore(stable, fallback, events.length ? events : [key]);
}

/** An event bus helper for the writers: dispatch after a same-tab mutation. */
export function emitPrefChange(name: string, detail?: unknown) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** `matchMedia` as a store — the only correct way to ask the browser a question
 *  it can answer before paint and change its mind about later. */
export function useMediaMatch(query: string, serverMatches = false): boolean {
  const subscribe = useMemo(
    () =>
      (onStoreChange: () => void) => {
        const mq = window.matchMedia(query);
        mq.addEventListener("change", onStoreChange);
        return () => mq.removeEventListener("change", onStoreChange);
      },
    [query],
  );
  const get = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, get, () => serverMatches);
}
