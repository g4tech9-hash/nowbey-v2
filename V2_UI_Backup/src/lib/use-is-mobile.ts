"use client";

import { useEffect, useState } from "react";

/**
 * True on the one-column layout with the fixed bottom nav.
 * Must match Tailwind's `lg` breakpoint (and the .nb-fill-view media query).
 * Note: pointer type is deliberately NOT part of the query — touch laptops and
 * large tablets must get the desktop layout, not the phone sheet.
 */
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mobile;
}
