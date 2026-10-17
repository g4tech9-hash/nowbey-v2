import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { useId } from "react";
import { redirect } from "next/navigation";
import { NowBeyMark } from "@/components/app-shell";
import { getViewer } from "@/lib/viewer";
import { BRAND } from "@/lib/brand";
import { SUPPORT_EMAIL } from "@/lib/legal";
import splashScene from "../../expo/assets/splash-scene.jpg";
import { Reveal } from "./landing-reveal";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Know what’s happening on your island",
  description:
    "A community map for The Bahamas. See neighbourhood reports, follow local news, and set email alerts for your island. Starting in New Providence.",
};

const SHARE_URL = encodeURIComponent("https://nowbey-v2.vercel.app");
const SHARE_TEXT = encodeURIComponent("Stay close to what’s happening in The Bahamas with NowBey.");

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={styles.arrowIcon} fill="none">
      {diagonal ? <path d="M6 14 14 6M7 6h7v7" /> : <path d="M3.5 10h12m-5-5 5 5-5 5" />}
    </svg>
  );
}

function StoreBadge({ store }: { store: "apple" | "google" }) {
  const apple = store === "apple";
  return (
    <button
      type="button"
      className={styles.storeBadge}
      disabled
      title={`NowBey is not published on ${apple ? "the App Store" : "Google Play"} yet`}
      aria-label={`${apple ? "App Store" : "Google Play"} download coming soon`}
    >
      <span className={styles.storeIcon} aria-hidden="true">
        {apple ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.37 1.43c0 1.14-.42 2.24-1.13 3.02-.75.82-1.98 1.45-3.09 1.37-.14-1.1.43-2.27 1.13-3.03.77-.84 2.08-1.45 3.09-1.36ZM20.89 16.46c-.55 1.23-.81 1.78-1.51 2.86-.98 1.49-2.37 3.35-4.09 3.37-1.52.02-1.91-.98-3.97-.97-2.06.01-2.49.99-4.01.97-1.71-.02-3.03-1.69-4.01-3.18-2.74-4.18-3.03-9.08-1.34-11.69 1.2-1.85 3.09-2.93 4.87-2.93 1.81 0 2.95.99 4.45.99 1.45 0 2.33-.99 4.42-.99 1.58 0 3.25.86 4.45 2.35-3.91 2.15-3.28 7.74.74 9.22Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3.3 2.8 14.2 12 3.3 21.2c-.34-.3-.55-.77-.55-1.39V4.19c0-.62.21-1.09.55-1.39Z" fill="#43D17D" />
            <path d="m3.3 2.8 13.55 7.58-2.65 1.62L3.3 2.8Z" fill="#38B7F2" />
            <path d="m3.3 21.2 10.9-9.2 2.65 1.62L3.3 21.2Z" fill="#F7C844" />
            <path d="m16.85 10.38 3.31 1.85c.97.54.97 1 0 1.54l-3.31 1.85L14.2 12l2.65-1.62Z" fill="#F36F60" />
          </svg>
        )}
      </span>
      <span className={styles.storeCopy}>
        <span>{apple ? "Download on the" : "GET IT ON"}</span>
        <strong>{apple ? "App Store" : "Google Play"}</strong>
      </span>
      <span className={styles.soonTag}>Coming soon</span>
    </button>
  );
}

function MapArt({ compact = false }: { compact?: boolean }) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <div
      className={`${styles.mapArt} ${compact ? styles.mapArtCompact : ""}`}
      role="img"
      aria-label="Illustrative map preview with sample report pins around Nassau"
    >
      <svg viewBox="0 0 360 260" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${gradientId}-sea`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#082633" />
            <stop offset="1" stopColor="#0a1c2b" />
          </linearGradient>
          <linearGradient id={`${gradientId}-land`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#31534e" />
            <stop offset="1" stopColor="#24423f" />
          </linearGradient>
        </defs>
        <rect width="360" height="260" fill={`url(#${gradientId}-sea)`} />
        <path
          d="M-12 83c28-14 51-13 79-8 24 4 39-3 64-8 24-5 35 6 59 4 26-2 40-15 64-12 34 4 57 18 91 9v99c-31-9-53-2-81-1-29 1-44-8-69-3-26 5-38 16-66 14-25-2-46-15-72-12-26 3-43 13-69 7Z"
          fill={`url(#${gradientId}-land)`}
          stroke="#5a8074"
          strokeWidth="2"
        />
        <path d="M-5 111c51-17 83 15 130-3 39-15 64-5 94 4 39 11 70-19 147-4" fill="none" stroke="#b4c6a6" strokeWidth="5" strokeLinecap="round" opacity=".8" />
        <path d="M12 148c42-6 69-23 102-19 37 4 51 18 84 11 45-10 76-35 150-24" fill="none" stroke="#d1c8a2" strokeWidth="3" strokeLinecap="round" opacity=".76" />
        <path d="M44 77c4 33 30 45 24 75-4 20-3 36 10 59M137 72c-11 23-6 45 8 58 18 17 13 39-4 66M230 65c-5 21 9 37 23 48 16 13 13 31 2 55M301 68c-11 20-9 36 1 53 10 18 6 32-1 50" fill="none" stroke="#8da492" strokeWidth="2" strokeLinecap="round" opacity=".48" />
        <path d="M54 115 104 118M181 104l33 8M119 151l34 2M252 129l40-2" stroke="#f1e5c9" strokeWidth="1.5" strokeDasharray="3 4" opacity=".58" />
      </svg>
      <span className={styles.mapLabelIsland}>NEW PROVIDENCE</span>
      <span className={styles.mapLabelHarbour}>NASSAU HARBOUR</span>
      <span className={styles.mapLabelStreet}>BAY STREET</span>
      <span className={`${styles.mapPin} ${styles.mapPinFlood}`}><i /></span>
      <span className={`${styles.mapPin} ${styles.mapPinPower}`}><i /></span>
      <span className={`${styles.mapPin} ${styles.mapPinRoad}`}><i /></span>
      <span className={styles.mapScale}>SAMPLE MAP VIEW</span>
    </div>
  );
}

function PhonePreview({ screen, hero = false }: { screen: "map" | "report" | "wire" | "alerts"; hero?: boolean }) {
  const screenTitle = {
    map: "Neighbourhood map",
    report: "Report a hazard",
    wire: "Bahamian news wire",
    alerts: "Email alert settings",
  }[screen];
  const variantClass = screen === "report" ? styles.phoneReport : screen === "wire" ? styles.phoneWire : screen === "alerts" ? styles.phoneAlerts : styles.phoneMap;

  return (
    <div className={`${styles.device} ${variantClass} ${hero ? styles.deviceHero : ""}`} role="img" aria-label={`${screenTitle}, illustrative sample interface`}>
      <div className={styles.deviceFrame}>
        <div className={styles.deviceScreen}>
          <div className={styles.deviceStatus}>
            <span>9:41</span>
            <span className={styles.deviceSignal} aria-hidden="true"><i /><i /><i /><i /></span>
          </div>
          <div className={styles.deviceHeader}>
            <span className={styles.deviceWordmark}>Now<span>Bey</span></span>
            <span className={styles.previewLabel}>SAMPLE VIEW</span>
          </div>

          {screen === "map" ? (
            <div className={styles.deviceContent}>
              <div className={styles.screenTitleRow}>
                <div><small>COMMUNITY MAP</small><strong>New Providence</strong></div>
                <span className={styles.locationControl} aria-hidden="true">⌖</span>
              </div>
              <MapArt />
              <div className={styles.previewReportCard}>
                <div className={styles.reportCardTop}><span className={styles.floodBadge}>FLOODING</span><span>EXAMPLE</span></div>
                <strong>Water across the lane</strong>
                <span>Bay Street · Nassau</span>
                <div className={styles.confirmedLine}><i /> Neighbour confirmation</div>
              </div>
            </div>
          ) : null}

          {screen === "report" ? (
            <div className={styles.deviceContent}>
              <div className={styles.deviceSectionTitle}>Report a hazard</div>
              <div className={styles.stepRail}>
                <span className={styles.stepCurrent}><i>1</i>What</span><span><i>2</i>Where</span><span><i>3</i>Details</span>
              </div>
              <MapArt compact />
              <div className={styles.formPreviewCard}>
                <span className={styles.floodBadge}>FLOODING</span>
                <strong>Water across the lane</strong>
                <span>Bay Street · New Providence</span>
                <div className={styles.formPreviewRule} />
                <span className={styles.formPreviewHint}>Choose a clear spot. Add what neighbours need to know.</span>
                <div className={styles.formPreviewButton}>Continue <ArrowIcon /></div>
              </div>
            </div>
          ) : null}

          {screen === "wire" ? (
            <div className={styles.deviceContent}>
              <div className={styles.deviceSectionTitle}>The news wire</div>
              <p className={styles.deviceIntro}>Local coverage, collected in one place.</p>
              <div className={styles.wireStoryCard}>
                <div className={styles.wireSourceMark}>N</div>
                <div className={styles.wireSource}>BAHAMIAN OUTLET <span>REVIEWED</span></div>
                <strong>Stories from across the islands</strong>
                <p>Read the source story, see its location and join the discussion.</p>
                <div className={styles.wireStoryFooter}><span>MAP CONTEXT</span><span>Open story <ArrowIcon diagonal /></span></div>
              </div>
              <div className={styles.wireSecondaryCard}>
                <span className={styles.wireSecondaryDot} />
                <div><b>Community-submitted links</b><small>Sent for review before appearing</small></div>
              </div>
            </div>
          ) : null}

          {screen === "alerts" ? (
            <div className={styles.deviceContent}>
              <div className={styles.deviceSectionTitle}>Email alerts</div>
              <p className={styles.deviceIntro}>Choose your island and the updates you want.</p>
              <div className={styles.alertSettingsCard}>
                <div className={styles.alertIsland}><span>YOUR ISLAND</span><strong>New Providence</strong><i>✓</i></div>
                <div className={styles.alertOption}><span>Flooding</span><i className={styles.toggleOn} /></div>
                <div className={styles.alertOption}><span>Road hazards</span><i className={styles.toggleOn} /></div>
                <div className={styles.alertOption}><span>Power outages</span><i className={styles.toggleOff} /></div>
              </div>
              <div className={styles.stormNote}>
                <span className={styles.stormIcon}>✳</span>
                <div><strong>Storm warnings</strong><span>Always sent. Free for everyone.</span></div>
              </div>
              <div className={styles.emailStatus}><span className={styles.emailStatusDot} /> Email is the alert channel available today</div>
            </div>
          ) : null}

          <div className={styles.deviceTabs}>
            <span><i>⌂</i>Feed</span><span className={screen === "map" ? styles.tabActive : ""}><i>⌖</i>Map</span><span className={screen === "report" ? styles.tabActive : ""}><i>＋</i>Report</span><span className={screen === "wire" ? styles.tabActive : ""}><i>▤</i>Wire</span><span className={screen === "alerts" ? styles.tabActive : ""}><i>♧</i>Alerts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingHeader() {
  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brandLink} aria-label="NowBey home">
          <NowBeyMark size={38} />
          <span className={styles.brandName}>Now<span>Bey</span></span>
        </Link>
        <nav className={styles.navLinks} aria-label="Landing page">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#trust">Our approach</a>
        </nav>
        <div className={styles.navAccountActions}>
          <Link href="/login?mode=signin" className={styles.navSignIn}>Sign in</Link>
          <Link href="/login?mode=signup" className={styles.navSignUp}>Sign up</Link>
        </div>
        <Link href="/map" className={`${styles.navCta} ${styles.navExplore}`}>Explore the map <ArrowIcon /></Link>
      </div>
    </header>
  );
}

function FeatureCopy({
  number,
  eyebrow,
  title,
  description,
  bullets,
  href,
  linkLabel,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  href: string;
  linkLabel: string;
}) {
  return (
    <div className={styles.featureCopy}>
      <p className={styles.featureEyebrow}><span>{number}</span>{eyebrow}</p>
      <h3>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
      <ul className={styles.featureBullets}>
        {bullets.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}
      </ul>
      <Link href={href} className={styles.textLink}>{linkLabel}<ArrowIcon /></Link>
    </div>
  );
}

export default async function HomePage() {
  const viewer = await getViewer();
  if (viewer.signedIn) redirect("/feed");

  const contactHref = SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : "/support#enterprise";
  const contactLabel = SUPPORT_EMAIL ? "Email NowBey" : "Contact NowBey";

  return (
    <div className={styles.landing}>
      <LandingHeader />

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroBackdrop} aria-hidden="true">
          <Image src={splashScene} alt="" fill priority sizes="100vw" className={styles.heroSceneImage} />
          <div className={styles.heroBackdropTint} />
        </div>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}><span />COMMUNITY SAFETY FOR THE BAHAMAS</p>
              <h1 id="hero-title">Know what’s happening <em>on your island.</em></h1>
              <p className={styles.heroDescription}>
                Neighbour reports, local news and island-by-island email alerts—brought together in one clear map, made for life in The Bahamas.
              </p>
              <p className={styles.launchNote}><span className={styles.launchDot} /> Starting in New Providence</p>
              <div className={styles.heroActions}>
                <Link href="/map" className={styles.primaryButton}>Explore the map <ArrowIcon /></Link>
                <Link href="/report" className={styles.secondaryButton}>Report a hazard</Link>
              </div>
              <div className={styles.storeArea}>
                <p className={styles.storeHeading}>Native app downloads</p>
                <div className={styles.storeBadges}>
                  <StoreBadge store="apple" />
                  <StoreBadge store="google" />
                </div>
                <p className={styles.storeNote}>
                  Not published yet. <Link href="/mobile#install">Use NowBey on your phone today—no app-store download needed.</Link>
                </p>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.heroOrb} aria-hidden="true" />
              <div className={styles.heroSceneFrame} aria-hidden="true">
                <Image src={splashScene} alt="" fill sizes="(max-width: 720px) 70vw, 480px" className={styles.heroSceneAccent} />
              </div>
              <div className={`${styles.floatCard} ${styles.floatCardTop}`} aria-hidden="true">
                <span className={styles.floatIcon}>✓</span>
                <span><small>COMMUNITY UPDATE</small><strong>A neighbour confirmed</strong></span>
              </div>
              <PhonePreview screen="map" hero />
              <div className={`${styles.floatCard} ${styles.floatCardBottom}`} aria-hidden="true">
                <span className={styles.floatPin}><i /></span>
                <span><small>EXAMPLE REPORT</small><strong>Bay Street · Nassau</strong></span>
              </div>
              <p className={styles.previewCaption}>Illustrative interface · sample content, not live reports</p>
            </div>
          </div>
        </div>
        <a className={styles.scrollCue} href="#features"><span />Discover NowBey</a>
      </section>

      <section className={styles.proofStrip} aria-label="NowBey at a glance">
        <div className={styles.container}>
          <div><span className={styles.proofIcon}>⌖</span><p><strong>One shared map</strong><small>Reports, locations and context</small></p></div>
          <div><span className={styles.proofIcon}>◎</span><p><strong>Neighbour-powered</strong><small>Community reports and confirmations</small></p></div>
          <div><span className={styles.proofIcon}>✉</span><p><strong>Useful email alerts</strong><small>By island and report type</small></p></div>
        </div>
      </section>

      <section id="features" className={styles.features} aria-labelledby="features-title">
        <div className={styles.container}>
          <Reveal className={styles.sectionIntro}>
            <p className={styles.sectionEyebrow}>A clearer picture, together</p>
            <h2 id="features-title">Local information.<br /><em>Right where you need it.</em></h2>
            <p>NowBey connects the details neighbours notice with the bigger picture across the islands.</p>
          </Reveal>

          <div className={styles.featureRows}>
            <Reveal className={styles.featureRow}>
              <FeatureCopy
                number="01"
                eyebrow="The community map"
                title="See what’s changing, street by street."
                description="Browse reports about flooding, outages, road hazards and more, plotted on aerial imagery with street names. Filter by place or report type, then open a pin for its latest updates."
                bullets={["Aerial imagery with street names", "Map pins and a readable report list", "No account needed to browse"]}
                href="/map"
                linkLabel="Explore the map"
              />
              <div className={styles.featureVisual}>
                <div className={styles.visualGlow} aria-hidden="true" />
                <span className={styles.visualLabel}>A MAP WITH LOCAL CONTEXT</span>
                <PhonePreview screen="map" />
              </div>
            </Reveal>

            <Reveal className={`${styles.featureRow} ${styles.featureRowReverse}`} delay={90}>
              <FeatureCopy
                number="02"
                eyebrow="Report and confirm"
                title="Put what you see on the map."
                description="Choose what happened, place a pin and give neighbours the useful details. Other residents can confirm a report or mark that the situation has changed."
                bullets={["A guided, three-step report flow", "Choose whether to post anonymously", "Your draft stays if you lose the signal"]}
                href="/report"
                linkLabel="Report a hazard"
              />
              <div className={styles.featureVisual}>
                <div className={`${styles.visualGlow} ${styles.visualGlowCoral}`} aria-hidden="true" />
                <span className={styles.visualLabel}>MADE FOR THE MOMENT YOU NOTICE</span>
                <PhonePreview screen="report" />
              </div>
            </Reveal>

            <Reveal className={styles.featureRow} delay={80}>
              <FeatureCopy
                number="03"
                eyebrow="The Bahamian news wire"
                title="Follow local stories, connected to place."
                description="Read approved stories from Bahamian outlets in one place, see the location when it’s available, and send in a story link for review."
                bullets={["Local sources, brought together", "Stories can appear on the map", "Community links reviewed before publishing"]}
                href="/wire"
                linkLabel="Read the news wire"
              />
              <div className={styles.featureVisual}>
                <div className={styles.visualGlow} aria-hidden="true" />
                <span className={styles.visualLabel}>LOCAL NEWS, WITH CONTEXT</span>
                <PhonePreview screen="wire" />
              </div>
            </Reveal>

            <Reveal className={`${styles.featureRow} ${styles.featureRowReverse}`} delay={100}>
              <FeatureCopy
                number="04"
                eyebrow="Island-by-island email alerts"
                title="Get the updates that matter to you."
                description="Choose an island and the report types you want in your inbox. Storm warnings always reach subscribers, whatever their filters—and they’re free for everyone."
                bullets={["Email alerts are available today", "Choose your island and report types", "Storm warnings are never paywalled"]}
                href="/alerts"
                linkLabel="Set up email alerts"
              />
              <div className={styles.featureVisual}>
                <div className={`${styles.visualGlow} ${styles.visualGlowGold}`} aria-hidden="true" />
                <span className={styles.visualLabel}>ALERTS WITH THE RIGHT PRIORITIES</span>
                <PhonePreview screen="alerts" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.howSection} aria-labelledby="how-title">
        <div className={styles.container}>
          <Reveal className={styles.howIntro}>
            <p className={styles.sectionEyebrow}>Simple by design</p>
            <h2 id="how-title">A little more local.<br /><em>A lot more useful.</em></h2>
            <p>Start with what you need, then add your own perspective when you’re ready.</p>
          </Reveal>
          <div className={styles.stepsGrid}>
            <Reveal className={styles.stepCard}>
              <span className={styles.stepNumber}>01</span>
              <span className={styles.stepIcon}>⌖</span>
              <h3>Look around</h3>
              <p>Open the map and read reports without making an account.</p>
            </Reveal>
            <Reveal className={styles.stepCard} delay={80}>
              <span className={styles.stepNumber}>02</span>
              <span className={styles.stepIcon}>＋</span>
              <h3>Share what you see</h3>
              <p>Add a clear location and the details that help a neighbour understand.</p>
            </Reveal>
            <Reveal className={styles.stepCard} delay={160}>
              <span className={styles.stepNumber}>03</span>
              <span className={styles.stepIcon}>↗</span>
              <h3>Keep it current</h3>
              <p>Confirm a report or let others know when conditions have changed.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="trust" className={styles.trustSection} aria-labelledby="trust-title">
        <div className={styles.container}>
          <Reveal className={styles.trustCard}>
            <div className={styles.trustCopy}>
              <p className={styles.sectionEyebrow}>Trust, with context</p>
              <h2 id="trust-title">Neighbour insight.<br /><em>Official sources first.</em></h2>
              <p>NowBey shows what residents report. Community updates can be incomplete or out of date, so always check official guidance before you act.</p>
            </div>
            <div className={styles.officialLinks}>
              <a href="https://drm.gov.bs" target="_blank" rel="noreferrer">
                <span className={styles.sourceMonogram}>DRM</span>
                <span><strong>Disaster Risk Management</strong><small>Forecasts, alerts and shelters</small></span>
                <ArrowIcon diagonal />
              </a>
              <a href="https://bplco.com/services/outages" target="_blank" rel="noreferrer">
                <span className={`${styles.sourceMonogram} ${styles.sourceMonogramBpl}`}>BPL</span>
                <span><strong>Bahamas Power and Light</strong><small>Official outage information</small></span>
                <ArrowIcon diagonal />
              </a>
            </div>
            <p className={styles.emergencyNote}><span>For emergencies</span> call <a href="tel:919">919</a> or <a href="tel:911">911</a>. NowBey is not an emergency service.</p>
          </Reveal>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-title">
        <div className={styles.finalCtaGlow} aria-hidden="true" />
        <div className={styles.container}>
          <Reveal className={styles.finalCtaContent}>
            <p className={styles.sectionEyebrow}>Stay safe, Bahamas</p>
            <h2 id="final-title">A clearer view<br /><em>starts with us.</em></h2>
            <p>See the map. Share what you know. Look out for each other.</p>
            <div className={styles.finalActions}>
              <Link href="/map" className={styles.primaryButton}>Explore NowBey <ArrowIcon /></Link>
              <Link href="/mobile#install" className={styles.finalTextLink}>Use NowBey on your phone <ArrowIcon /></Link>
            </div>
          </Reveal>
          <div className={styles.finalPin} aria-hidden="true"><span>NB</span><i /></div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <Link href="/" className={styles.brandLink} aria-label="NowBey home">
                <NowBeyMark size={38} />
                <span className={styles.brandName}>Now<span>Bey</span></span>
              </Link>
              <p>{BRAND.tagline}. Community-powered safety and local information for The Bahamas.</p>
              <span className={styles.footerLocation}>Starting in New Providence</span>
            </div>
            <div className={styles.footerColumn}>
              <h3>Explore</h3>
              <Link href="/map">Community map</Link>
              <Link href="/report">Report a hazard</Link>
              <Link href="/wire">News wire</Link>
              <Link href="/alerts">Email alerts</Link>
            </div>
            <div className={styles.footerColumn}>
              <h3>Learn</h3>
              <Link href="/mobile#install">Use it on your phone</Link>
              <Link href="/open-now">What is open now</Link>
              <Link href="/terms">Terms of use</Link>
              <Link href="/privacy">Privacy policy</Link>
            </div>
            <div className={styles.footerColumn}>
              <h3>Get in touch</h3>
              <a href={contactHref}>{contactLabel}</a>
              <Link href="/support">Plans &amp; partnerships</Link>
              <div className={styles.footerShareLabel}>Share NowBey</div>
              <div className={styles.footerSocial} aria-label="Share NowBey on social media">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${SHARE_URL}`} target="_blank" rel="noreferrer" aria-label="Share NowBey on Facebook">Facebook</a>
                <a href={`https://twitter.com/intent/tweet?text=${SHARE_TEXT}&url=${SHARE_URL}`} target="_blank" rel="noreferrer" aria-label="Share NowBey on X">X</a>
                <a href={`https://wa.me/?text=${SHARE_TEXT}%20${SHARE_URL}`} target="_blank" rel="noreferrer" aria-label="Share NowBey on WhatsApp">WhatsApp</a>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© 2026 NowBey. Made for island life.</span>
            <span className={styles.footerSafety}>Community reports are not official warnings. Verify before you travel.</span>
            <Link href="/feed" className={styles.footerFeedLink}>Go to the community feed <ArrowIcon /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
