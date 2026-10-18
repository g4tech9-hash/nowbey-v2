import { useCallback, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * Re-runs `load` on a timer while the screen is focused *and* the app is in the foreground.
 *
 * Why not a bare setInterval: the screens used to poll every 60 seconds even when the app was
 * backgrounded, which keeps Android's radio awake and costs battery and data on a prepaid plan — a real
 * cost in The Bahamas, on the app people open during a storm. This pauses the timer in the background and
 * refreshes once as soon as the app comes back, so the first thing the person sees is current.
 *
 * The callback is held in a ref so a new `load` identity (which changes whenever a filter changes) does not
 * restart the timer and fire a duplicate request.
 */
export function useAutoRefresh(load: () => void | Promise<void>, ms = 60_000): void {
  const saved = useRef(load);
  saved.current = load;

  useFocusEffect(
    useCallback(() => {
      const start = () => {
        if (timer) return;
        timer = setInterval(() => {
          if (AppState.currentState === "active") void saved.current();
        }, ms);
      };
      let timer: ReturnType<typeof setInterval> | null = null;
      const tick = () => {
        if (AppState.currentState === "active") void saved.current();
      };

      tick();
      start();
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          tick();
          start();
        } else if (timer) {
          clearInterval(timer);
          timer = null;
        }
      });

      return () => {
        if (timer) clearInterval(timer);
        sub.remove();
      };
    }, [ms]),
  );
}
