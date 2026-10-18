"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Tells a screen reader that the page changed.
 *
 * This app is a single-page shell: tapping "Map", "Feed" or "Alerts" swaps the whole main region without a
 * page load and without moving focus. Sighted users see a new heading; a screen reader user hears nothing at
 * all, keeps their virtual cursor where it was, and has no way to know the navigation worked. WCAG 2.2 4.1.3
 * (Status Messages) and 2.4.3 (Focus Order) both apply.
 *
 * The polite live region is rendered empty on first paint and only filled after a real navigation, so the
 * first page is not announced twice (the document title already does that job).
 */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const region = useRef<HTMLDivElement | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // The heading is what a sighted reader lands on; announce the same thing, and which page it is, so the
    // region is short enough to be useful rather than a 30-word sentence read at 100% speed.
    const heading = document.querySelector("main h1")?.textContent?.trim();
    const label = heading ? `${heading}. ${document.title}` : document.title;
    // Wait one frame: the new route's heading may not be in the DOM on the same tick as the pathname change.
    const frame = requestAnimationFrame(() => {
      if (region.current) region.current.textContent = label;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return <div ref={region} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />;
}
