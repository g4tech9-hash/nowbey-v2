import Link from "next/link";
import type { Metadata } from "next";

import { BRAND } from "@/lib/brand";
import { LEGAL_ENTITY } from "@/lib/legal";
import { getWire } from "@/lib/wire";
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
import styles from "./landing.module.css";

/* =====================================================================
   Landing — restored from 21 October 2026 (commit 16dedfb), the last
   revision that shipped a real landing page.

   Adapted to this shell: the map, report flow and email alerts are not
   built here yet, so those destinations point at the live ones (/feed,
   /wire) or say "coming soon" instead of linking into a 404. The
   per-visitor session probe and the sign-in chip are gone with the auth
   stack; the header now links straight to the feed.
   ===================================================================== */

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description: BRAND.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description: BRAND.description,
    url: "/",
    siteName: BRAND.name,
    locale: "en_BS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description: BRAND.description,
  },
};

// Cached at the CDN; the wire underneath has its own revalidation window.
export const revalidate = 3600;

type Section = {
  n: string;
  title: string;
  watermark: string;
  bullets: readonly string[];
  tab: "map" | "report" | "wire" | "alerts";
  link?: { href: string; label: string };
  soon?: string;
};

const SECTIONS: readonly Section[] = [
  {
    n: "01",
    title: "The community map",
    watermark: "Neighbour reports in one clear view",
    bullets: [
      "Neighbour reports and local news, brought together",
      "Every story carries its category and its island",
      "Built for phones first — no app download needed",
    ],
    link: { href: "/feed", label: "Open the community feed" },
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
    soon: "The report flow is not in this build yet",
    tab: "report",
  },
  {
    n: "03",
    title: "The Bahamian news wire",
    watermark: "Local news with context",
    bullets: [
      "Bahamian headlines, brought together",
      "Civic stories — closures, outages, notices — ranked first",
      "Duplicates merged, every source named",
    ],
    link: { href: "/wire", label: "Read the news wire" },
    tab: "wire",
  },
  {
    n: "04",
    title: "Island-by-island email alerts",
    watermark: "Alerts with the right priorities",
    bullets: [
      "Island-by-island email alerts, coming next",
      "Choose your island and report types",
      "Storm warnings are never paywalled",
    ],
    soon: "Email alerts are not in this build yet",
    tab: "alerts",
  },
];

/** Live numbers for the proof strip — never let a wire fault take the page down. */
async function proofStrip() {
  try {
    const wire = await getWire();
    const civic = wire.items.filter((item) => item.civic);
    const islands = new Set(wire.items.map((item) => item.island).filter(Boolean));
    return { stories: wire.items.length, civic: civic.length, islands: islands.size };
  } catch {
    return { stories: 0, civic: 0, islands: 0 };
  }
}

export default async function Landing() {
  const proof = await proofStrip();

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
            <Btn href="/feed" variant="outline" size="sm">
              Open the feed
            </Btn>
          </div>
        </div>
        <nav className={styles.headerNav} aria-label="Landing">
          <Link href="#map">Map</Link>
          <Link href="#report">Report</Link>
          <Link href="#news-wire">News wire</Link>
          <Link href="#alerts">Alerts</Link>
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
            Neighbour reports and local news, brought together in one clear feed — made for life in
            The Bahamas.
          </p>
          <p className={styles.launchPill}>
            <Dot color="var(--nb-gold)" glow />
            Starting in New Providence
          </p>
          <div className={styles.heroCtas}>
            <Btn href="/feed">
              Open the community feed <ArrowIcon />
            </Btn>
            <Btn href="/wire" variant="outline">
              Read the news wire
            </Btn>
          </div>

          <p
            className={styles.storeNote}
            style={{
              marginTop: "12px",
              textAlign: "center",
              fontSize: "12px",
              color: "var(--text-tertiary)",
            }}
          >
            Works in your browser today — iPhone and Android apps are on the way.
          </p>

          <div className={styles.heroMock}>
            <PhoneDemo initialTab="map" />
            <p
              style={{
                textAlign: "center",
                fontSize: "11px",
                color: "var(--text-tertiary)",
                marginTop: "8px",
              }}
            >
              Sample view — demo pins. The live feed is one tap away.
            </p>
            <div className={`${styles.floatChip} ${styles.floatChipRight}`}>
              <span
                className={styles.floatIcon}
                style={{ color: "var(--nb-mint)", borderColor: "rgba(67,224,203,.4)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
              <span
                className={styles.floatIcon}
                style={{ color: "var(--nb-coral)", borderColor: "rgba(255,157,115,.4)" }}
              >
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

          {/* Proof strip — live numbers off the wire. */}
          <div className={styles.proofStrip}>
            {[
              { value: proof.stories, label: "Stories on the wire" },
              { value: proof.civic, label: "Civic stories" },
              { value: proof.islands, label: "Islands covered" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent)" }}>{stat.value}</p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <p
            style={{
              textAlign: "center",
              marginTop: "16px",
              padding: "10px",
              borderRadius: "12px",
              background: "rgba(251,191,36,0.12)",
              border: "1px solid rgba(251,191,36,0.3)",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            🚨 Emergency: call 919 / 911 — this app is not an emergency service.
          </p>
        </section>

        {/* How we keep it honest */}
        <section
          style={{
            maxWidth: "800px",
            margin: "32px auto",
            padding: "20px",
            borderRadius: "16px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border-default)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            How we keep it honest
          </h2>
          <ul
            style={{
              marginTop: "12px",
              display: "grid",
              gap: "8px",
              fontSize: "13px",
              color: "var(--text-secondary)",
            }}
          >
            <li>
              ✓ <strong>Confirm</strong> — neighbours confirm a report is still there.
            </li>
            <li>
              ✓ <strong>Saw it too</strong> — a lighter check-in that it was seen.
            </li>
            <li>
              ✓ <strong>Cleared</strong> — community marks it resolved.
            </li>
            <li>
              ✓ <strong>Route the story</strong> — every wire item names the outlet it came from.
            </li>
            <li>
              ✓ <strong>Not an emergency service</strong> — for emergencies, call 919 / 911.
            </li>
          </ul>
        </section>

        {/* ------------------------------------------------- feature sections */}
        <div id="features" className={styles.sections}>
          {SECTIONS.map((s) => (
            <section
              key={s.n}
              className={styles.section}
              id={s.n === "01" ? "map" : s.n === "02" ? "report" : s.n === "03" ? "news-wire" : "alerts"}
            >
              <SectionMark n={s.n} title={s.title} />
              <div className={styles.sectionBody}>
                <div className={styles.sectionCopy}>
                  <div className={styles.sectionBullets}>
                    {s.bullets.map((b) => (
                      <CheckRow key={b}>{b}</CheckRow>
                    ))}
                  </div>
                  {s.link ? (
                    <LinkArrow href={s.link.href}>{s.link.label}</LinkArrow>
                  ) : (
                    <div>
                      <Pill tone="gold">Coming soon</Pill>
                      {s.soon ? (
                        <p
                          style={{
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {s.soon}
                        </p>
                      ) : null}
                    </div>
                  )}
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
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800 }}>
          Frequently asked questions
        </h2>
        <details style={{ marginTop: "12px" }}>
          <summary style={{ fontWeight: 700, cursor: "pointer" }}>Is NowBey an emergency service?</summary>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>
            No. For emergencies, call 919 or 911. NowBey is a community map where neighbours share what
            they see.
          </p>
        </details>
        <details style={{ marginTop: "8px" }}>
          <summary style={{ fontWeight: 700, cursor: "pointer" }}>Where does the news come from?</summary>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>
            Bahamian outlets and civic-scoped news searches. Every story names its source and links out
            to the outlet; duplicates are merged before anything reaches the feed.
          </p>
        </details>
        <details style={{ marginTop: "8px" }}>
          <summary style={{ fontWeight: 700, cursor: "pointer" }}>Which islands are covered?</summary>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>
            The wire detects all 18 islands of The Bahamas. Email alerts are live for New Providence
            first; other islands are coming soon.
          </p>
        </details>
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
            <Link href="/wire">News wire</Link>
            <Link href="#map">Map</Link>
            <Link href="#report">Report</Link>
            <Link href="#alerts">Alerts</Link>
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
