import type { ReactNode } from "react";
import Link from "next/link";

/* =====================================================================
   NOWBEY UI KIT — rebuilt 2026-10-17 from the reference set.
   Every primitive here reproduces the component DNA in
   docs/DESIGN_SYSTEM_REBUILD.md. Server-rendering safe (no hooks).
   ===================================================================== */

/** Brand mark: mint-stroked rounded square with pin + wave. */
export function NowBeyMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="var(--nb-surface-1)" stroke="var(--nb-mint)" strokeWidth="2" />
      <path d="M8 27c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="var(--nb-mint)" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.8" />
      <path
        d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z"
        fill="none"
        stroke="var(--nb-mint)"
        strokeWidth="2.2"
      />
      <circle cx="20" cy="15.2" r="2.6" fill="var(--nb-gold)" />
    </svg>
  );
}

/** “Now” in cream + “Bey” in mint — the wordmark from the reference header. */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="display leading-none" style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--nb-cream)" }}>
      Now<span style={{ color: "var(--nb-mint)" }}>Bey</span>
    </span>
  );
}

/** Pill button. `href` renders a Link, otherwise a button. */
export function Btn({
  href,
  variant = "primary",
  size = "md",
  block,
  type,
  disabled,
  children,
  ...rest
}: {
  href?: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "md" | "sm";
  block?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  children: ReactNode;
} & Record<string, unknown>) {
  const cls = [
    "nb-btn",
    variant === "primary" ? "nb-btn-primary" : variant === "outline" ? "nb-btn-outline" : "",
    size === "sm" ? "nb-btn-sm" : "",
    block ? "nb-btn-block" : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={cls} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}

/** Small outline pill: SAMPLE VIEW / COMING SOON / location pills. */
export function Pill({
  tone = "gold",
  children,
}: {
  tone?: "gold" | "mint" | "dark";
  children: ReactNode;
}) {
  return <span className={tone === "gold" ? "nb-pill" : tone === "mint" ? "nb-pill nb-pill-mint" : "nb-pill nb-pill-dark"}>{children}</span>;
}

/** Category badge — the “FLOODING” chip from the report mockup. */
export function CatBadge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="nb-badge-cat" style={color ? { color, borderColor: `${color}55`, background: `${color}1f` } : undefined}>
      {children}
    </span>
  );
}

export function Dot({ color, glow }: { color: string; glow?: boolean }) {
  return <span className="nb-dot" style={{ background: color, boxShadow: glow ? `0 0 8px ${color}99` : undefined }} aria-hidden />;
}

/** Toggle switch — mint track + dark knob (on) / gray track + light knob (off). */
export function Toggle({
  on,
  onClick,
  label,
  disabled,
}: {
  on: boolean;
  onClick?: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="nb-toggle"
      onClick={onClick}
      disabled={disabled}
    />
  );
}

/** Check-circle row from the feature lists (“✓ Choose your island…”). */
export function CheckRow({ children }: { children: ReactNode }) {
  return (
    <p className="nb-check-row">
      <span className="nb-check" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5 9.5 18 20 6.5" />
        </svg>
      </span>
      <span>{children}</span>
    </p>
  );
}

/** Numbered circle (stepper + “how it works” rows). */
export function NumBadge({ n, off }: { n: number | string; off?: boolean }) {
  return <span className={off ? "nb-num nb-num-off" : "nb-num"}>{n}</span>;
}

export function Divider() {
  return <hr className="nb-divider" />;
}

/** Micro label — letterspaced uppercase faint text. */
export function Label({ mint, children }: { mint?: boolean; children: ReactNode }) {
  return <p className={mint ? "nb-label nb-label-mint" : "nb-label"}>{children}</p>;
}

/** Section marker: mint-outlined square + uppercase title ( “03 · THE BAHAMIAN NEWS WIRE” ). */
export function SectionMark({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="nb-section-mark">{n}</span>
      <span className="nb-label" style={{ fontSize: 12.5 }}>
        {title}
      </span>
    </div>
  );
}

/** Link with trailing arrow — “Report a hazard →”. */
export function LinkArrow({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="nb-link-arrow">
      {children}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 12h15M13 5.5 19.5 12 13 18.5" />
      </svg>
    </Link>
  );
}

/** The stylized island map used inside the phone mockups (sample map view). */
export function SampleMap({ height = 200 }: { height?: number }) {
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 14, height, background: "#092330" }}>
      <svg viewBox="0 0 360 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {/* land band */}
        <path
          d="M-10 78 C 40 58, 80 66, 120 60 C 170 52, 210 66, 250 58 C 300 48, 340 58, 375 50 L 375 128 C 330 138, 280 128, 235 136 C 185 145, 140 132, 95 140 C 55 147, 15 138, -10 146 Z"
          fill="#2c4c49"
        />
        <path
          d="M-10 78 C 40 58, 80 66, 120 60 C 170 52, 210 66, 250 58 C 300 48, 340 58, 375 50"
          fill="none"
          stroke="#3c615c"
          strokeWidth="2"
        />
        {/* roads */}
        <path d="M-10 100 C 50 92, 110 104, 165 96 C 225 88, 285 100, 375 92" fill="none" stroke="#97aa94" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M-10 118 C 60 112, 130 124, 195 116 C 260 108, 320 118, 375 112" fill="none" stroke="#6e8577" strokeWidth="1.6" strokeDasharray="7 6" />
        <path d="M78 62 C 92 84, 88 110, 102 140" fill="none" stroke="#6e8577" strokeWidth="1.8" />
        <path d="M252 58 C 246 82, 252 108, 242 132" fill="none" stroke="#6e8577" strokeWidth="1.8" />
        {/* dashed minor route */}
        <path d="M210 96 L 246 92" stroke="#97aa94" strokeWidth="2.4" strokeDasharray="4 5" strokeLinecap="round" />
        {/* place labels */}
        <text x="150" y="42" textAnchor="middle" fill="#879e8c" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="700" letterSpacing="3">
          NEW PROVIDENCE
        </text>
        <text x="192" y="122" textAnchor="middle" fill="#879e8c" fontFamily="Manrope, sans-serif" fontSize="9" fontWeight="700" letterSpacing="2">
          BAY STREET
        </text>
        <text x="268" y="162" textAnchor="middle" fill="#879e8c" fontFamily="Manrope, sans-serif" fontSize="9.5" fontWeight="700" letterSpacing="2.5">
          NASSAU HARBOUR
        </text>
        {/* pins: coral, cyan, amber — cream stroke + dark core */}
        <g transform="translate(296, 64)">
          <path d="M0-26c-7.2 0-13 5.6-13 12.6C-13-3.4 0 12 0 12s13-15.4 13-25.4C13-20.4 7.2-26 0-26Z" fill="#ff9d73" stroke="#fff8d4" strokeWidth="2.6" />
          <circle cx="0" cy="-13.4" r="4.6" fill="#241408" />
        </g>
        <g transform="translate(216, 96)">
          <path d="M0-26c-7.2 0-13 5.6-13 12.6C-13-3.4 0 12 0 12s13-15.4 13-25.4C13-20.4 7.2-26 0-26Z" fill="#6ed6fb" stroke="#fff8d4" strokeWidth="2.6" />
          <circle cx="0" cy="-13.4" r="4.6" fill="#0c2b38" />
        </g>
        <g transform="translate(148, 136)">
          <path d="M0-26c-7.2 0-13 5.6-13 12.6C-13-3.4 0 12 0 12s13-15.4 13-25.4C13-20.4 7.2-26 0-26Z" fill="var(--nb-gold)" stroke="#fff8d4" strokeWidth="2.6" />
          <circle cx="0" cy="-13.4" r="4.6" fill="#33270a" />
        </g>
      </svg>
      <span
        className="nb-pill nb-pill-dark"
        style={{ position: "absolute", right: 10, bottom: 10, fontSize: 9.5, padding: "6px 10px" }}
      >
        Sample map view
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------
   Phone mockup chrome (landing page sample views)
   --------------------------------------------------------------------- */

export function MockStatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-4 pb-1 text-[11px] font-bold" style={{ color: "var(--nb-cream)" }}>
      <span className="num">9:41</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
          <rect x="0" y="7" width="2.6" height="4" rx="0.8" />
          <rect x="4" y="4.6" width="2.6" height="6.4" rx="0.8" />
          <rect x="8" y="2.2" width="2.6" height="8.8" rx="0.8" />
          <rect x="12" y="0" width="2.6" height="11" rx="0.8" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M1 4.2A10 10 0 0 1 15 4.2" />
          <path d="M4 7A6.2 6.2 0 0 1 12 7" />
          <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </span>
    </div>
  );
}

export function MockAppHeader({ sample = true }: { sample?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b px-6 pb-4 pt-3" style={{ borderColor: "var(--nb-stroke)" }}>
      <Wordmark size={19} />
      {sample ? <Pill tone="gold">Sample view</Pill> : null}
    </div>
  );
}

const TABS = [
  { key: "feed", label: "Feed", icon: "M4 6h16M4 12h11M4 18h7" },
  { key: "map", label: "Map", icon: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Zm0-8.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z" },
  { key: "report", label: "Report", icon: "M12 5v14M5 12h14" },
  { key: "wire", label: "Wire", icon: "M4 5h16v14H4zM4 9.5h16M8 13.5h8M8 16.5h5" },
  { key: "alerts", label: "Alerts", icon: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4 10a2.2 2.2 0 0 0 4 0" },
] as const;

export function MockTabBar({ active }: { active: string }) {
  return (
    <div className="mt-auto flex items-stretch justify-around border-t px-3 pb-5 pt-3" style={{ borderColor: "var(--nb-stroke)", background: "color-mix(in srgb, var(--nb-bg-deep) 60%, transparent)" }}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <div key={t.key} className="flex flex-col items-center gap-1.5" style={{ color: on ? "var(--nb-mint)" : "var(--nb-faint)" }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={t.icon} />
            </svg>
            <span style={{ fontSize: 10.5, fontWeight: 700 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Device frame with status bar, app header, and tab bar around arbitrary screen content. */
export function PhoneFrame({
  activeTab,
  children,
  sampleLabel,
}: {
  activeTab: string;
  children: ReactNode;
  sampleLabel?: string;
}) {
  return (
    <div className="nb-phone">
      <div className="nb-phone-screen">
        <div className="nb-phone-notch" />
        <MockStatusBar />
        <MockAppHeader />
        {sampleLabel ? (
          <p className="nb-label px-6 pt-4" style={{ color: "var(--nb-faint)" }}>
            {sampleLabel}
          </p>
        ) : null}
        {children}
        <MockTabBar active={activeTab} />
      </div>
    </div>
  );
}

/** Arrow glyph used inside buttons. */
export function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12h15M13 5.5 19.5 12 13 18.5" />
    </svg>
  );
}
