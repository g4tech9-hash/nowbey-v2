import Link from "next/link";
import { AvatarStack, CardLayered, CatBadge, FreshnessPill, FilterPillRow, SeverityTag, Skeleton, SkeletonIncidentCard, Ticker, TrustMeter, EmptyState, EndOfStream, ActionPill, ThemeToggle, LiveModeToggle } from "@/ui/pulse";
import { ContrastRow } from "@/components/pulse/contrast-row";
import { PULSE_CATEGORIES, PULSE_SIGNAL_LEGEND, CategoryGlyph } from "@/ui/pulse/glyph";
import { AccessibilityPicker, ThemePicker } from "@/ui/pulse/theme";
import { PageIntro } from "@/components/ui";
import { ConfirmButtonDemo, DesignDemos, ErrorStateDemo } from "@/components/pulse/design-demos";
import { readTheme } from "@/lib/pulse/prefs";

export const metadata = {
  title: "Pulse — the design language",
  description:
    "Every token, component and rule NowBey is built from: three CSS layers, two authored themes, spring motion, and the thirteen components every page composes from.",
};

/**
 * THE STYLEGUIDE — `/design`
 *
 * Not a marketing page about the system: the system's own surface. Each entry
 * shows the live component (interactive where it is interactive), the token it
 * reads, and the rule it exists to enforce. If a component here cannot be
 * rendered, it is broken everywhere.
 *
 * The contrast table at the bottom is *computed* from the authored values rather
 * than pasted in, so it cannot drift out of date the way a screenshot does.
 */
export default async function DesignPage() {
  const theme = readTheme() ?? "dark";
  const pairs = [
    { label: "Body text on the page", fg: "--text-primary", bg: "--bg-base", min: 4.5 },
    { label: "Secondary text on the page", fg: "--text-secondary", bg: "--bg-base", min: 4.5 },
    { label: "Tertiary text on a card", fg: "--text-tertiary", bg: "--card-bg", min: 4.5 },
    { label: "Accent text on the page", fg: "--text-accent", bg: "--bg-base", min: 4.5 },
    { label: "Danger text on the page", fg: "--danger", bg: "--bg-base", min: 4.5 },
    { label: "Primary button label", fg: "--btn-primary-text", bg: "--btn-primary-bg", min: 4.5 },
    { label: "Card edge against the page (UI)", fg: "--card-border", bg: "--bg-base", min: 3 },
    { label: "Accent surface against the page (UI)", fg: "--accent", bg: "--bg-base", min: 3 },
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-10">
      <PageIntro
        eyebrow={`Pulse design language · ${theme} theme live`}
        title="NowBey Pulse"
        blurb="Three token layers, two authored themes, spring motion, and thirteen components every page composes from. Nothing below is a picture of a component — every one is the real thing, reading the real tokens, in the theme you are looking at."
        actions={
          <>
            <ThemeToggle />
            <Link href="/feed" className="nb-btn nb-btn-secondary nb-btn-sm">
              See it on the feed
            </Link>
          </>
        }
        className="mb-6"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <ThemePicker />
      </div>

      {/* ---------------------------------------------------------------- 1. layers */}
      <LayerSection
        n="01"
        title="Three layers, one direction"
        body="Components may read Layer 2 (semantics) and Layer 3 (component aliases). Never Layer 1. That indirection is the whole trick: a theme change is a re-map of semantics, not a search-and-replace of hexes — which is why the light theme is not the dark theme upside down."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <TokenCard
            layer="Layer 1 — primitives"
            items={[
              ["--pulse-hue-teal-400", "#3fd6c0"],
              ["--pulse-space-4", "16px"],
              ["--pulse-shape-md", "18px"],
              ["--pulse-duration-state", "200ms"],
              ["--pulse-ease-spring", "cubic-bezier(.34,1.56,.64,1)"],
            ]}
            note="Raw values. Theme-independent. No component reads these."
          />
          <TokenCard
            layer="Layer 2 — semantics"
            items={[
              ["--bg-base", "true black / warm sand"],
              ["--text-primary", "18.5:1 · 14.4:1"],
              ["--accent", "teal-400 / #075e55"],
              ["--danger", "coral-400 / #b03328"],
              ["--cat-flooding", "per-theme hue"],
            ]}
            note="Meaning, restated per theme. This is where a hue is chosen, not inherited."
          />
          <TokenCard
            layer="Layer 3 — components"
            items={[
              ["--card-bg", "surface for data"],
              ["--card-shadow", "elevation for the card"],
              ["--chip-radius", "pill geometry"],
              ["--btn-primary-hover", "hover target"],
              ["--input-border-focus", "focus language"],
            ]}
            note="Per-part aliases, so a component has one knob per visual job."
          />
        </div>
      </LayerSection>

      {/* ---------------------------------------------------------------- 2. colour */}
      <LayerSection
        n="02"
        title="Category hues are authored twice"
        body="The same flood marker has to glow on black and sit still on sand. So each category has two hues, chosen independently, and the light set is clamped to ≥3:1 against paper. The signal layer groups categories so a reader can trust the *colour family* even when the exact hue moves."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.keys(PULSE_CATEGORIES).map((key) => (
            <CardLayered key={key} className="pulse-card-pad" category={key} spine>
              <span className="flex items-center gap-2">
                <CategoryGlyph category={key} size={16} />
                <span className="text-[12.5px] font-bold text-primary">{PULSE_CATEGORIES[key as keyof typeof PULSE_CATEGORIES].label}</span>
              </span>
              <p className="mt-1.5 font-mono text-[10.5px] text-tertiary">{PULSE_CATEGORIES[key as keyof typeof PULSE_CATEGORIES].token}</p>
              <p className="mt-1 font-mono text-[10.5px] text-tertiary">signal · {PULSE_CATEGORIES[key as keyof typeof PULSE_CATEGORIES].signal}</p>
            </CardLayered>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PULSE_SIGNAL_LEGEND.map((g) => (
            <span key={g.key} className="pulse-chip">
              <span className="pulse-catdot" style={{ ["--spine" as string]: g.token }} aria-hidden />
              {g.label}
            </span>
          ))}
        </div>
      </LayerSection>

      {/* ---------------------------------------------------------------- 3. type */}
      <LayerSection
        n="03"
        title="Type: display for promise, sans for reading, mono for numbers"
        body="Bricolage Grotesque carries headlines (tight tracking, heavy weight). Inter carries prose at a measured 68ch. JetBrains Mono carries every count, coordinate and timestamp — with tabular figures, so a live number updating does not shuffle the row beside it."
      >
        <div className="grid gap-2">
          {[
            ["--pulse-text-display", "display", "What is happening on the island"],
            ["--pulse-text-3xl", "display", "Floodwater across Bay Street"],
            ["--pulse-text-xl", "display", "A card title, at rest"],
            ["--pulse-text-base", "sans", "Body copy sits here: two lines, never more, on a card."],
            ["--pulse-text-sm", "sans", "Secondary detail: what neighbours should know before they route around it."],
            ["--pulse-text-xs", "mono", "24.9 · -77.6 · ± 12 m · updated 14 min ago"],
            ["--pulse-text-2xs", "mono", "CONFIRMED · 4 · SOLID"],
          ].map(([step, family, sample]) => (
            <div key={step as string} className="flex flex-wrap items-baseline gap-3 border-b border-default pb-2 last:border-0">
              <code className="w-[168px] flex-none font-mono text-[11px] text-tertiary">{step}</code>
              <span
                className="min-w-0 flex-1 text-primary"
                style={{
                  fontFamily: family === "mono" ? "var(--font-mono)" : family === "display" ? "var(--font-display)" : "var(--font-sans)",
                  fontSize: `var(${step})`,
                  fontWeight: family === "sans" ? 400 : 700,
                  letterSpacing: family === "display" ? "-0.035em" : family === "mono" ? "0.04em" : "0",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {sample}
              </span>
              <span className="nb-label">{family}</span>
            </div>
          ))}
        </div>
      </LayerSection>

      {/* ---------------------------------------------------------------- 4. motion */}
      <LayerSection
        n="04"
        title="Motion: one spring, four durations, zero dependencies"
        body="stiffness 140 · damping 22 lands as cubic-bezier(0.34, 1.56, 0.64, 1) — a 6% overshoot that settles in one beat. Press shrinks to 0.92, a fine pointer hovers to 1.03, shimmer runs on a 1.4s loop. Every duration is on the four-step scale, and prefers-reduced-motion (or Settings → motion: reduced) collapses all of it to a crossfade of opacity."
      >
        <DesignDemos />
      </LayerSection>

      {/* ---------------------------------------------------------------- 5. the thirteen */}
      <LayerSection
        n="05"
        title="The thirteen components"
        body="Every page in the app is assembled from these. If a screen needs something else, the library grows first — that is the only way the two themes stay coherent."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <Demo name="CatBadge" token="--cat-* · --chip-*">
            <div className="flex flex-wrap gap-2">
              <CatBadge category="flood" />
              <CatBadge category="power" size="sm" />
              <CatBadge category="crime" />
              <CatBadge category="marine" />
            </div>
          </Demo>
          <Demo name="FreshnessPill" token="--success · --warning · --text-tertiary">
            <div className="flex flex-wrap gap-2">
              <FreshnessPill freshness="live" time={new Date().toISOString()} label="now" />
              <FreshnessPill freshness="watching" time={new Date(Date.now() - 5e6).toISOString()} label="1h ago" />
              <FreshnessPill freshness="stale" time={new Date(Date.now() - 4e8).toISOString()} label="4d ago" />
            </div>
          </Demo>
          <Demo name="SeverityTag + meter" token="--sev-1…5 · category hue">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityTag severity={2} category="road" />
              <SeverityTag severity={3} category="power" />
              <SeverityTag severity={4} category="flood" />
              <SeverityTag severity={5} category="storm" />
            </div>
          </Demo>
          <Demo name="TrustMeter" token="--trust-* · TRUST_TOKEN[tier]">
            <div className="grid gap-2">
              {[18, 42, 68, 91].map((v) => (
                <TrustMeter key={v} value={v} label={`Trust ${v} of 100, shown out loud`} />
              ))}
            </div>
          </Demo>
          <Demo name="ConfirmButton (with burst)" token="--btn-primary-* · nb-burst">
            <ConfirmButtonDemo />
          </Demo>
          <Demo name="AvatarStack" token="--cat-* for the deterministic hue">
            <div className="flex flex-wrap items-center gap-3">
              <AvatarStack seed="kemar" count={4} />
              <AvatarStack seed="marcus-boat" count={9} max={5} />
              <AvatarStack seed="someone" count={1} />
            </div>
          </Demo>
          <Demo name="CardLayered" token="--card-bg · --card-border · --card-radius · --card-shadow">
            <CardLayered category="health" spine interactive raised className="pulse-card-pad">
              <h3 className="pulse-card-title">Data surfaces are cards, not glass</h3>
              <p className="pulse-card-body">
                Translucency is chrome. Anything a person has to read sits on an elevated surface with a real edge, so the
                words survive a bright porch.
              </p>
            </CardLayered>
          </Demo>
          <Demo name="Skeleton" token="--skeleton-shine · 1.4s shimmer">
            <div className="grid gap-2">
              <SkeletonIncidentCard />
              <div className="flex gap-2">
                <Skeleton width={120} height={28} radius="var(--pulse-shape-pill)" />
                <Skeleton width="100%" height={28} radius="var(--pulse-shape-pill)" />
              </div>
            </div>
          </Demo>
          <Demo name="PillRow (morphing indicator)" token="--chip-bg · one travelling highlight">
            <FilterPillRow
              ariaLabel="Demo filter"
              size="sm"
              value="power"
              options={[
                { value: "", label: "All" },
                { value: "flood", label: "Flooding", hue: "var(--cat-flooding)", count: 6 },
                { value: "power", label: "Power", hue: "var(--cat-power)", count: 3 },
                { value: "road", label: "Road", hue: "var(--cat-road)", count: 11 },
              ]}
            />
          </Demo>
          <Demo name="Ticker" token="--pulse-duration-sweep · 44px/s · role=region">
            <Ticker
              lead="Live wire"
              items={[
                { id: "a", label: "Bay Street underpass, 3 confirmations", href: "/feed?category=flood" },
                { id: "b", label: "Power out in Fox Hill", href: "/feed?category=power" },
                { id: "c", label: "Fuel at $4.31/gal on West Bay St", href: "/gas" },
              ]}
            />
          </Demo>
          <Demo name="State components" token="--card-* · --danger-muted">
            <div className="grid gap-2">
              <EmptyState
                title="Nothing filed under that yet"
                blurb="Clear the filters, or be the first to report it."
                primary={{ href: "/report", label: "Report a spot" }}
                secondary={{ href: "/feed", label: "Clear filters" }}
              />
              <ErrorStateDemo />
              <EndOfStream count={24} />
            </div>
          </Demo>
          <Demo name="ActionPill + LiveModeToggle" token="--chip-* · --btn-ghost-*">
            <div className="flex flex-wrap items-center gap-2">
              <ActionPill active>Saw it too</ActionPill>
              <ActionPill tone="danger">Getting worse</ActionPill>
              <LiveModeToggle />
            </div>
          </Demo>
        </div>
        <p className="nb-hint mt-3">
          The thirteenth and fourteenth — <strong className="text-primary">CommandPalette</strong> (press{" "}
          <kbd className="pulse-kbd">⌘</kbd> <kbd className="pulse-kbd">K</kbd> or <kbd className="pulse-kbd">/</kbd> on any
          page) and <strong className="text-primary">Drawer</strong> (open a report from the feed) — need the live app around
          them, so they are demonstrated where they are used rather than mocked here.
        </p>
      </LayerSection>

      {/* ---------------------------------------------------------------- 6. contrast */}
      <LayerSection
        n="06"
        title="Contrast, measured not promised"
        body={`WCAG 2.2 asks for 4.5:1 on text and 3:1 on interface edges. These pairs are resolved from the tokens you are looking at right now (${theme} theme) and computed here — the same maths a checker would do.`}
      >
        <div className="grid gap-2">
          {pairs.map((p) => (
            <ContrastRow key={p.label} label={p.label} fg={p.fg} bg={p.bg} min={p.min} />
          ))}
        </div>
        <p className="nb-hint mt-3">
          Values are read with <code className="font-mono">getComputedStyle</code> after the theme applies, so a failure here
          means a failure everywhere. The <code className="font-mono">scripts/contrast-audit.mjs</code> check runs the same
          maths over both themes headlessly.
        </p>
      </LayerSection>

      {/* ---------------------------------------------------------------- 7. contract */}
      <LayerSection
        n="07"
        title="The responsive contract"
        body="One grid, three geometries, and the same components at every size — nothing is hidden below a breakpoint, only re-stacked."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ["< 640px", "single column · bottom nav, five slots, raised centre Report · sheets from below · 44px targets · safe-area padding"],
            ["640–1024", "two columns · nav pills in the bar · the inspector docks under the stream, never behind a tab"],
            ["≥ 1024", "three columns · sticky nav rail · stream capped at 680px · inspector sticky right · FAB bottom-right"],
          ].map(([size, rule]) => (
            <CardLayered key={size} className="pulse-card-pad">
              <p className="font-mono text-[12px] font-bold text-accent">{size}</p>
              <p className="mt-1.5 text-[12.5px] leading-[1.7] text-secondary">{rule}</p>
            </CardLayered>
          ))}
        </div>
        <div className="mt-3">
          <AccessibilityPicker />
        </div>
      </LayerSection>
    </div>
  );
}

function LayerSection({ n, title, body, children }: { n: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="pulse-doc-section">
      <header className="flex items-start gap-3">
        <span className="nb-num" aria-hidden>
          {n}
        </span>
        <div className="min-w-0">
          <h2 className="text-[20px] font-extrabold leading-tight tracking-[-0.04em] text-primary">{title}</h2>
          <p className="pulse-lede mt-1.5">{body}</p>
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TokenCard({ layer, items, note }: { layer: string; items: [string, string][]; note: string }) {
  return (
    <CardLayered className="pulse-card-pad">
      <p className="nb-label">{layer}</p>
      <ul className="mt-2 grid gap-1.5">
        {items.map(([k, v]) => (
          <li key={k} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-default pb-1.5 last:border-0">
            <code className="font-mono text-[11px] text-accent">{k}</code>
            <span className="font-mono text-[11px] text-tertiary">{v}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] leading-[1.65] text-tertiary">{note}</p>
    </CardLayered>
  );
}

function Demo({ name, token, children }: { name: string; token: string; children: React.ReactNode }) {
  return (
    <CardLayered className="pulse-card-pad pulse-demo">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-extrabold tracking-[-0.03em] text-primary">{name}</h3>
        <code className="font-mono text-[10.5px] text-tertiary">{token}</code>
      </div>
      <div className="mt-3">{children}</div>
    </CardLayered>
  );
}

