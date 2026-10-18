import type { Metadata } from "next";
import { CopyDownloadBar } from "@/components/now/copy-download-bar";

export const metadata: Metadata = {
  title: "Design System",
  description:
    "The portable NowBey design system — colour tokens, typography, motion and the QA release checklist from the Master Build.",
};

/* SCREEN 6 — PROMPT / ABOUT (Master Build Section 7). */

const BRAND_TOKENS = [
  ["Aquamarine Sea", "#00A3AD", "buttons, links, active states"],
  ["Aquamarine Bright", "#00D2D3", "highlights, radar glow (sparingly)"],
  ["Deep Ocean Trench", "#002B49", "headings, hero base, brand mark"],
  ["Deep Trench Darker", "#001E36", "hero gradient end"],
  ["Sunburst Bahamas Gold", "#FFC72C", "one accent per view"],
  ["Gold Pressed", "#E6B325", "gold hover/active"],
] as const;

const HAZARD_TOKENS = [
  ["Flooding & Surge", "#3B82F6", "Waves"],
  ["Power Outage / BPL", "#F59E0B", "Zap"],
  ["Road Hazard / Blockage", "#F43F5E", "AlertTriangle"],
  ["Storm & Marine Gale", "#14B8A6", "Wind"],
  ["Brush Fire & Smoke", "#F97316", "Flame"],
  ["Community Advisory", "#6366F1", "ShieldAlert"],
  ["Success / Verified", "#10B981", "CheckCircle2"],
  ["Critical severity", "#EF4444", "reserved — alarm fatigue is real"],
] as const;

const QA = [
  "Flag ribbon + sticky header + all nav items work, both modes",
  "Dark AND light checked on every screen; toggle persists",
  "Hero stats show LIVE report count, not a hard-coded number",
  "Island cards filter the radar correctly",
  "Radar: island + category + search filters combine; counts match",
  "Pin click ↔ inspector sync; Confirm increments once, then locks",
  "Report: 3 steps, drafts kept, headline required, anonymous stores null",
  "Wire: real outlet names, external links open safely",
  "Alerts: invalid email rejected inline; success names the island",
  "Loading, empty, error states exist and look designed",
  "360px: no horizontal scroll, tap targets ≥ 44px, dock usable",
  "Keyboard-only pass: visible focus everywhere, logical order",
  "No console errors; no dead buttons; no lorem anywhere",
  "Typecheck + production build pass",
] as const;

function Swatch({ name, hex, note }: { name: string; hex: string; note: string }) {
  return (
    <li className="nbx-card flex items-center gap-3 p-3">
      <span
        className="h-10 w-10 shrink-0 rounded-[12px] border border-edge"
        style={{ background: hex }}
        aria-hidden
      />
      <span>
        <span className="block text-[13px] font-bold text-ink">{name}</span>
        <span className="nbx-num block text-[12px] font-semibold text-ink-3">{hex} · {note}</span>
      </span>
    </li>
  );
}

export default function PromptPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="nbx-label text-aqua">Design system</p>
        <h1 className="nbx-h2 mt-2 text-ink">The Master Build, portable</h1>
        <p className="nbx-body mt-2 max-w-[60ch] text-ink-2">
          Every colour, size and behaviour on NowBey comes from one strict system — so a screen can
          never drift into generic template territory. Copy or download the brief below to reuse it.
        </p>
        <div className="mt-5">
          <CopyDownloadBar />
        </div>
      </div>

      <section aria-labelledby="brand-tokens" className="flex flex-col gap-3">
        <h2 id="brand-tokens" className="nbx-h3 text-ink">Brand tokens</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BRAND_TOKENS.map(([name, hex, note]) => (
            <Swatch key={hex} name={name} hex={hex} note={note} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="hazard-tokens" className="flex flex-col gap-3">
        <h2 id="hazard-tokens" className="nbx-h3 text-ink">Semantic hazards — identical in both modes</h2>
        <p className="nbx-body text-ink-2">
          Colour never carries meaning alone: every hazard pairs its colour with an icon and a text label.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HAZARD_TOKENS.map(([name, hex, note]) => (
            <Swatch key={name} name={name} hex={hex} note={note} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="type-rules" className="flex flex-col gap-3">
        <h2 id="type-rules" className="nbx-h3 text-ink">Type, spacing, motion</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="nbx-card p-4">
            <p className="nbx-label text-ink-3">Typography</p>
            <p className="nbx-body mt-2 text-ink-2">
              Inter or system sans — never decorative for safety data. Display 40–60px/900, H2 24–30px/800,
              H3 18px/700, body 14–16px, labels 11–12px uppercase. Tabular numerals for counts and coords.
            </p>
          </div>
          <div className="nbx-card p-4">
            <p className="nbx-label text-ink-3">Spacing &amp; radius</p>
            <p className="nbx-body mt-2 text-ink-2">
              4pt scale only: 4, 8, 12, 16, 24, 32, 48. Chips 999px, buttons/inputs 12–16px, cards 24px,
              hero/modals 24–32px. Shadows soft and low — cyan-tinted on hover.
            </p>
          </div>
          <div className="nbx-card p-4">
            <p className="nbx-label text-ink-3">Motion</p>
            <p className="nbx-body mt-2 text-ink-2">
              200–300ms ease-out, hover lift max 1.05, press scale .98. Confetti only on report submit,
              alert activation and hazard confirmation. prefers-reduced-motion turns the loops off.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="qa-checklist" className="flex flex-col gap-3">
        <h2 id="qa-checklist" className="nbx-h3 text-ink">QA checklist — release gate</h2>
        <ul className="nbx-card flex flex-col gap-2.5 p-5">
          {QA.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[13px] font-semibold text-ink-2">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border border-hz-ok/50 bg-hz-ok/15 text-hz-ok">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
