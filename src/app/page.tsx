import Link from "next/link";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { getViewer } from "@/lib/viewer";
import {
  ArrowIcon,
  Btn,
  CheckRow,
  Dot,
  LinkArrow,
  NowBeyMark,
  Pill,
  SectionMark,
  Wordmark,
} from "@/ui/kit";
import { MockCommunityMap, MockEmailAlerts, MockNewsWire, MockReportHazard } from "@/ui/mock-screens";
import { PhoneFrame } from "@/ui/kit";
import { SessionChip } from "@/components/nav-links";
import styles from "./landing.module.css";

/* =====================================================================
   Landing — rebuilt from scratch 2026-10-17 against the reference set
   (1002177501 hero, 1002177501/500/499/491 feature sections).
   New DOM: hero stack, store cards, numbered sections each pairing a
   check-list + arrow link with a phone mockup of the real app screen.
   ===================================================================== */

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description:
    "A community map for The Bahamas. See neighbourhood reports, follow local news, and set email alerts for your island. Starting in New Providence.",
};

const SECTIONS = [
  {
    n: "01",
    title: "The community map",
    watermark: "Neighbour reports in one clear view",
    bullets: [
      "Neighbour reports and local news, brought together",
      "Every pin links to the live report and its updates",
      "Built for phones first — no app download needed",
    ],
    link: { href: "/map", label: "Explore the map" },
    screen: <MockCommunityMap />,
    tab: "map",
  },
  {
    n: "02",
    title: "Report a hazard",
    watermark: "Made for the moment you notice",
    bullets: [
      "A guided, three-step report flow",
      "Choose whether to post anonymously",
      "Your draft stays if you lose the signal",
    ],
    link: { href: "/report", label: "Report a hazard" },
    screen: <MockReportHazard />,
    tab: "report",
  },
  {
    n: "03",
    title: "The Bahamian news wire",
    watermark: "Local news with context",
    bullets: [
      "Bahamian headlines, brought together",
      "Stories can appear on the map",
      "Community links reviewed before publishing",
    ],
    link: { href: "/wire", label: "Read the news wire" },
    screen: <MockNewsWire />,
    tab: "wire",
  },
  {
    n: "04",
    title: "Island-by-island email alerts",
    watermark: "Alerts with the right priorities",
    bullets: [
      "Island-by-island email alerts, available today",
      "Choose your island and report types",
      "Storm warnings are never paywalled",
    ],
    link: { href: "/alerts", label: "Set up email alerts" },
    screen: <MockEmailAlerts />,
    tab: "alerts",
  },
] as const;

export default async function Landing() {
  const viewer = await getViewer();

  return (
    <div className={styles.landing}>
      {/* ---------------------------------------------------------- header */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <Link href="/" className={styles.brand}>
            <NowBeyMark size={40} />
            <Wordmark size={25} />
          </Link>
          <div className={styles.headerAuth}>
            <SessionChip handle={viewer.handle} />
          </div>
        </div>
        <nav className={styles.headerNav} aria-label="Landing">
          <Link href="#features">Features</Link>
          <Link href="#how">How it works</Link>
          <Link href="#approach">Our approach</Link>
        </nav>
      </header>

      <main id="main">
        {/* ------------------------------------------------------- hero */}
        <section className={styles.hero}>
          <p className={styles.heroEyebrow}>
            <Dot color="var(--nb-mint)" glow />
            Community safety for The Bahamas
          </p>
          <h1 className={styles.heroTitle}>
            Know what’s happening <em>on your island.</em>
          </h1>
          <p className={styles.heroLead}>
            Neighbour reports, local news and island-by-island email alerts—brought together in one clear map,
            made for life in The Bahamas.
          </p>
          <p className={styles.launchPill}>
            <Dot color="var(--nb-gold)" glow />
            Starting in New Providence
          </p>
          <div className={styles.heroCtas}>
            <Btn href="/map">
              Explore the map <ArrowIcon />
            </Btn>
            <Btn href="/report" variant="outline">
              Report a hazard
            </Btn>
          </div>

          <div className={styles.stores}>
            <p className="nb-label">Native app downloads</p>
            <div className={styles.storeGrid}>
              <div className={styles.storeCard}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--nb-cream)" aria-hidden>
                  <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6 0 0-2.5-1-2.5-3.5ZM14.2 5.7c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2.1-.5 2.7-1.3Z" />
                </svg>
                <span>
                  <small>Download on the</small>
                  <strong>App Store</strong>
                </span>
                <Pill>Coming soon</Pill>
              </div>
              <div className={styles.storeCard}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
                  <path d="M3.6 2.3 14.3 12 3.6 21.7c-.3-.2-.6-.7-.6-1.4V3.7c0-.7.3-1.2.6-1.4Z" fill="#43e0cb" />
                  <path d="m14.3 12 3.2-2.9 3.8 2.2c1 .6 1 1.9 0 2.5l-3.8 2.2-3.2-2.9Z" fill="#f6c75d" />
                  <path d="M14.3 12 3.6 21.7c.4.2 1 .2 1.6-.2l12.3-7-3.2-2.5Z" fill="#ff7a6b" />
                  <path d="M14.3 12l3.2-2.9L5.2 2.5c-.6-.4-1.2-.4-1.6-.2L14.3 12Z" fill="#b5c9ca" />
                </svg>
                <span>
                  <small>Get it on</small>
                  <strong>Google Play</strong>
                </span>
                <Pill>Coming soon</Pill>
              </div>
            </div>
            <p className={styles.storeNote}>
              <strong>Not published yet:</strong> Use NowBey on your phone today—no app-store download needed.
            </p>
          </div>

          <div className={styles.heroMock}>
            <PhoneFrame activeTab="map">
              <MockCommunityMap />
            </PhoneFrame>
            <div className={`${styles.floatChip} ${styles.floatChipRight}`}>
              <span className={styles.floatIcon} style={{ color: "var(--nb-mint)", borderColor: "rgba(67,224,203,.4)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5 9.5 18 20 6.5" />
                </svg>
              </span>
              <span>
                <small className="nb-label" style={{ fontSize: 9 }}>
                  Community update
                </small>
                <strong>A neighbour confirmed</strong>
              </span>
            </div>
            <div className={`${styles.floatChip} ${styles.floatChipLeft}`}>
              <span className={styles.floatIcon} style={{ color: "var(--nb-coral)", borderColor: "rgba(255,157,115,.4)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.3" fill="currentColor" />
                </svg>
              </span>
              <span>
                <small className="nb-label" style={{ fontSize: 9 }}>
                  Example report
                </small>
                <strong>Bay Street · Nassau</strong>
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- feature sections */}
        <div id="features" className={styles.sections}>
          {SECTIONS.map((s) => (
            <section key={s.n} className={styles.section} id={s.n === "02" ? "how" : s.n === "04" ? "approach" : undefined}>
              <SectionMark n={s.n} title={s.title} />
              <div className={styles.sectionBody}>
                <div className={styles.sectionCopy}>
                  <div className={styles.sectionBullets}>
                    {s.bullets.map((b) => (
                      <CheckRow key={b}>{b}</CheckRow>
                    ))}
                  </div>
                  <LinkArrow href={s.link.href}>{s.link.label}</LinkArrow>
                </div>
                <div className={styles.sectionMock}>
                  <p className={styles.watermark} aria-hidden>
                    {s.watermark}
                  </p>
                  <PhoneFrame activeTab={s.tab}>{s.screen}</PhoneFrame>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* ---------------------------------------------------------- footer */}
      <footer className={styles.footer}>
        <div className={styles.footerRow}>
          <div className={styles.brand}>
            <NowBeyMark size={34} />
            <span>
              <Wordmark size={20} />
              <span className={styles.footerTag}>{BRAND.promise}</span>
            </span>
          </div>
          <nav className={styles.footerNav} aria-label="Footer">
            <Link href="/feed">Feed</Link>
            <Link href="/map">Map</Link>
            <Link href="/report">Report</Link>
            <Link href="/wire">News wire</Link>
            <Link href="/alerts">Alerts</Link>
            <Link href="/support">Plans</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
        <div className={styles.footerBase}>
          <span className={styles.footerLocation}>
            <Dot color="var(--nb-gold)" />
            Starting in New Providence
          </span>
          <span className={styles.footerCopy}>© {new Date().getFullYear()} NowBey</span>
        </div>
      </footer>
    </div>
  );
}
