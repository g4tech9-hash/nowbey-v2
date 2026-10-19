"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SCENE_PHOTOS_PRESENT, SCENES } from "@/lib/themes";

/**
 * The opening screen: a Nassau twilight photo, the NowBey mark drawing itself, the tagline and a few waves.
 * It shows once per visit (per browser tab). Tap, click or press any key to skip it. If scripts are blocked
 * it still hides itself, because the fade-out is a plain CSS animation.
 */
export function SplashScreen({ tagline, promise }: { tagline: string; promise: string }) {
  const [phase, setPhase] = useState<"show" | "leave" | "gone">("show");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- The skip decision must run before
       the first paint of the splash itself; deferring it would flash the splash we are
       trying to suppress. This is a mount-time capability gate, not derived state. */
    // Skip entirely when motion off, low-data, reduced-motion, or deep link
    try {
      if (document.documentElement.dataset.motion === "off") { setPhase("gone"); return; }
      if (localStorage.getItem("nb_low_data") === "1") { setPhase("gone"); return; }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPhase("gone"); return; }
      // Deep links: incident, /map?focus= — never show splash
      if (window.location.pathname.startsWith("/incident") || new URLSearchParams(window.location.search).has("focus")) { setPhase("gone"); return; }
      if (sessionStorage.getItem("nb_splash_seen")) { setPhase("gone"); return; }
      sessionStorage.setItem("nb_splash", "1");
      sessionStorage.setItem("nb_splash_seen", "1");
    } catch {}
    const skip = () => setPhase((p) => (p === "show" ? "leave" : p));
    const done = window.setTimeout(() => setPhase("gone"), 1100);
    window.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(done);
      window.removeEventListener("keydown", skip);
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (phase !== "leave") return;
    const t = window.setTimeout(() => setPhase("gone"), 320);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      id="nb-splash"
      className={`nb-splash${phase === "leave" ? " is-leaving" : ""}`}
      aria-hidden="true"
      onClick={() => setPhase((p) => (p === "show" ? "leave" : p))}
    >
      {SCENE_PHOTOS_PRESENT ? (
        <div className="nb-splash-photo">
          <Image src={SCENES.nassau.src} alt="" fill sizes="100vw" preload style={{ objectFit: "cover", objectPosition: SCENES.nassau.focus }} />
        </div>
      ) : null}
      <div className="nb-splash-veil" />

      <div className="nb-splash-waves">
        <svg viewBox="0 0 2400 120" preserveAspectRatio="none">
          <path d="M0 60q150-50 300 0t300 0 300 0 300 0 300 0 300 0 300 0 300 0V120H0z" fill="rgba(46,230,208,.22)" />
        </svg>
        <svg viewBox="0 0 2400 120" preserveAspectRatio="none">
          <path d="M0 70q150 40 300 0t300 0 300 0 300 0 300 0 300 0 300 0 300 0V120H0z" fill="rgba(255,196,102,.16)" />
        </svg>
      </div>

      <div className="nb-splash-body">
        <svg className="nb-splash-mark" viewBox="0 0 40 40">
          <defs>
            <linearGradient id="nbsplash" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2ee6d0" />
              <stop offset="55%" stopColor="#00c9b7" />
              <stop offset="100%" stopColor="#ff7a6b" />
            </linearGradient>
          </defs>
          <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="rgba(6,36,52,.72)" stroke="url(#nbsplash)" strokeWidth="2" />
          <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="#2ee6d0" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path
            className="nb-splash-pin"
            d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z"
            fill="none"
            stroke="url(#nbsplash)"
            strokeWidth="2.2"
          />
          <circle cx="20" cy="15.2" r="2.4" fill="#ffc531" />
        </svg>
        <p className="nb-splash-word">
          Now<b>Bey</b>
        </p>
        <p className="nb-splash-tag">{tagline}</p>
        <p className="nb-splash-line">{promise}</p>
      </div>

      <p className="nb-splash-hint">Tap to continue</p>
    </div>
  );
}
