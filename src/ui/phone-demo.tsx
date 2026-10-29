"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MockAppHeader, MockStatusBar } from "./kit";
import { MockCommunityMap, MockEmailAlerts, MockFeed, MockNewsWire, MockReportHazard } from "./mock-screens";

/* =====================================================================
   PhoneDemo — the landing page's interactive sample phone.

   The frame behaves like the device it imitates: the tab bar is real
   buttons that switch screens, each screen scrolls inside the fixed
   viewport (and keeps its own scroll position between visits, the way
   iOS/Android tabs do), and the in-screen controls (alert toggles, the
   report stepper) hold real state.

   Screens mount on first visit — the hero SSRs exactly one screen, so
   the demo costs nothing until someone taps it. Every screen stays
   labelled as a sample (gold "Sample view" pill + "Example" cards);
   nothing here ever claims to be live data.
   ===================================================================== */

const TABS = [
  { key: "feed", label: "Feed", icon: "M4 6h16M4 12h11M4 18h7" },
  { key: "map", label: "Map", icon: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Zm0-8.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z" },
  { key: "report", label: "Report a hazard", icon: "M12 5v14M5 12h14" },
  { key: "wire", label: "Wire", icon: "M4 5h16v14H4zM4 9.5h16M8 13.5h8M8 16.5h5" },
  { key: "alerts", label: "Alerts", icon: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4 10a2.2 2.2 0 0 0 4 0" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const SCREENS: Record<TabKey, () => ReactNode> = {
  feed: MockFeed,
  map: MockCommunityMap,
  report: MockReportHazard,
  wire: MockNewsWire,
  alerts: MockEmailAlerts,
};

export function PhoneDemo({ initialTab }: { initialTab: TabKey }) {
  const [active, setActive] = useState<TabKey>(initialTab);
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set([initialTab]));
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (key: TabKey) => {
    setActive(key);
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
  };

  // ARIA tabs pattern: arrows move (and select), Home/End jump to the ends.
  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.key === active);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const target = TABS[next];
    select(target.key);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="nb-phone">
      <div className="nb-phone-screen">
        <div className="nb-phone-notch" />
        <MockStatusBar />
        <MockAppHeader />
        <div className="nb-phone-scroll">
          {TABS.map((t) => {
            const Screen = SCREENS[t.key];
            const on = t.key === active;
            return (
              <section
                key={t.key}
                id={`${baseId}-pane-${t.key}`}
                role="tabpanel"
                aria-labelledby={`${baseId}-tab-${t.key}`}
                className="nb-phone-pane"
                hidden={!on}
              >
                {/* Content mounts on first visit; the shell always exists so
                    aria-controls never points at nothing. */}
                {visited.has(t.key) ? <Screen /> : null}
              </section>
            );
          })}
        </div>
        <div className="nb-phone-tabs" role="tablist" aria-label="Sample app screens" onKeyDown={onTabKeyDown}>
          {TABS.map((t, i) => {
            const on = t.key === active;
            return (
              <button
                key={t.key}
                id={`${baseId}-tab-${t.key}`}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${baseId}-pane-${t.key}`}
                tabIndex={on ? 0 : -1}
                className="nb-phone-tab"
                style={{ color: on ? "var(--nb-mint)" : "var(--nb-faint)" }}
                onClick={() => select(t.key)}
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={t.icon} />
                </svg>
                <span className="nb-phone-tab-label">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
