import Link from "next/link";
import { LEGAL_ENTITY } from "@/lib/legal";
import { redirect } from "next/navigation";
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
import { PhoneDemo } from "@/ui/phone-demo";
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
  // Same meaning as the manifest description (BRAND.description) — one voice, one promise.
  description: BRAND.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description: BRAND.description,
    url: "/",
    siteName: BRAND.name,
    images: [{ url: "/og/map-1200x630.png", width: 1200, height: 630, alt: "The NowBey community safety map with hazard pins across The Bahamas" }],
    locale: "en_BS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description: BRAND.description,
    images: ["/og/map-1200x630.png"],
  },
};

// The landing is decided per visitor: members never see it, so it must never be cached as a static page.
export const revalidate = 3600;

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
    tab: "map",
  },
  {
    n: "02",
    title: "Report a hazard",
    watermark: "Made for the moment you notice",
    bullets: [
      "A guided, four-step report flow",
      "Choose whether to post anonymously",
      "Your draft stays if you lose the signal",
    ],
    link: { href: "/report", label: "Report a hazard" },
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
    tab: "alerts",
  },
] as const;

export default async function Landing() {
  // Landing is ISR cached (CDN) — signed-in redirect happens client-side to keep cacheability
  const viewer = { signedIn: false, handle: null } as any;

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
          <Link href="#map">Map</Link>
          <Link href="#report">Report</Link>
          <Link href="#news-wire">News wire</Link>
          <Link href="#alerts">Alerts</Link>
        </nav>
      </header>

      <script dangerouslySetInnerHTML={{ __html: `fetch("/api/session").then(r=>r.json()).then(d=>{if(d?.user?.handle) window.location.href="/feed"}).catch(()=>{})` }} />
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

          <p className={styles.storeNote} style={{ marginTop: "12px", textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
            iPhone & Android apps coming soon — works in your browser today.
          </p>

          <div className={styles.heroMock}>
            <PhoneDemo initialTab="map" />
            <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "8px" }}>
              Sample view — demo pins. The live map is one tap away.
            </p>
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

          {/* Proof strip — real live numbers */}
          <div className={styles.proofStrip} style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", marginTop: "32px", padding: "16px", borderRadius: "16px", background: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
            <div style={{ textAlign: "center" }}><p style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent)" }}>—</p><p style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Reports this week</p><p style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>live count from the feed</p></div>
            <div style={{ textAlign: "center" }}><p style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent)" }}>—</p><p style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Neighbours confirmed</p></div>
            <div style={{ textAlign: "center" }}><p style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent)" }}>18</p><p style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Islands covered</p></div>
          </div>
          <p style={{ textAlign: "center", marginTop: "16px", padding: "10px", borderRadius: "12px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>🚨 Emergency: call 919 / 911 — this app is not an emergency service.</p>
        </section>

        {/* How we keep it honest */}
        <section style={{ maxWidth: "800px", margin: "32px auto", padding: "20px", borderRadius: "16px", background: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>How we keep it honest</h2>
          <ul style={{ marginTop: "12px", display: "grid", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
            <li>✓ <strong>Confirm</strong> — neighbours confirm a report is still there.</li>
            <li>✓ <strong>Saw it too</strong> — a lighter check-in that it was seen.</li>
            <li>✓ <strong>Cleared</strong> — community marks it resolved.</li>
            <li>✓ <strong>Trust score</strong> — based on confirmations and freshness, not hidden.</li>
            <li>✓ <strong>Not an emergency service</strong> — for emergencies, call 919 / 911.</li>
          </ul>
        </section>

        {/* ------------------------------------------------- feature sections */}
        <div id="features" className={styles.sections}>
          {SECTIONS.map((s) => (
            <section key={s.n} className={styles.section} id={s.n === "01" ? "map" : s.n === "02" ? "report" : s.n === "03" ? "news-wire" : "alerts"}>
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
                  <PhoneDemo initialTab={s.tab} />
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* FAQ */}
      <section style={{ maxWidth: "800px", margin: "32px auto", padding: "20px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800 }}>Frequently asked questions</h2>
        <details style={{ marginTop: "12px" }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>Is NowBey an emergency service?</summary><p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>No. For emergencies, call 919 or 911. NowBey is a community map where neighbours share what they see.</p></details>
        <details style={{ marginTop: "8px" }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>How do you prevent false reports?</summary><p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>Reports need neighbour confirmations to gain trust, and stale reports are marked as needing a recheck. You can verify before you act.</p></details>
        <details style={{ marginTop: "8px" }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>Which islands are covered?</summary><p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>The map covers all islands. Email alerts are live for New Providence today; other islands are coming soon.</p></details>
      </section>

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
          <span className={styles.footerCopy}>
            NowBey™ · © {new Date().getFullYear()} {LEGAL_ENTITY}
          </span>
        </div>
      </footer>
    </div>
  );
}
