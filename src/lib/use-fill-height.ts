"use client";

import { useEffect } from "react";
import { fillHeight } from "./fill-height";

const NAV_SELECTOR = "[data-nb-bottom-nav]";

/**
 * Measures the page chrome and publishes `--nb-fill-h` on `<html>`.
 *
 * Re-measures when anything that changes the answer changes: the window, the visual viewport (phone browser
 * chrome sliding away, or the software keyboard opening), a resize of `<main>` (a wrapped header tagline), and
 * a scroll — because iOS resizes the visual viewport in steps while its address bar collapses.
 *
 * The variable is only *used* by the mobile/desktop workspace rules in globals.css; setting it everywhere is
 * harmless and means the map gets the right number the first time it appears.
 */
export function useFillHeight(): void {
  useEffect(() => {
    const root = document.documentElement;
    const main = document.getElementById("main");
    if (!main) return;

    let frame = 0;
    let last = "";

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nav = document.querySelector<HTMLElement>(NAV_SELECTOR);
        const navVisible = nav ? getComputedStyle(nav).display !== "none" : false;
        const style = getComputedStyle(main);
        const value = fillHeight({
          viewportHeight: window.visualViewport?.height ?? window.innerHeight,
          mainTop: main.getBoundingClientRect().top,
          mainPaddingTop: parseFloat(style.paddingTop) || 0,
          mainPaddingBottom: parseFloat(style.paddingBottom) || 0,
          navHeight: navVisible && nav ? nav.getBoundingClientRect().height : 0,
        });
        const next = `${value}px`;
        // Only touch the DOM when the number changes: a write on every scroll frame would defeat the point.
        if (next !== last) {
          root.style.setProperty("--nb-fill-h", next);
          last = next;
        }
      });
    };

    // Listen to the viewport first, then measure once, so the first paint is already correct.
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure, { passive: true });

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(main);
    const nav = document.querySelector<HTMLElement>(NAV_SELECTOR);
    if (nav) observer?.observe(nav);
    const header = document.querySelector("header");
    if (header) observer?.observe(header);

    measure();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, []);
}
