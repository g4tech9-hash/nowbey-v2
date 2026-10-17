import Link from "next/link";
import { LOWEST_MONTHLY, money } from "@/lib/tiers";

const HOUSE_ADS = [
  {
    brand: "Island Fresh 242",
    line: "Conch, snapper and kingfish delivered across Nassau before dinner.",
    cta: "Order the catch",
    tone: "#2ee6d0",
  },
  {
    brand: "Harbour Marine",
    line: "Storm-ready shutters and generator service for Freeport homes.",
    cta: "Book a check",
    tone: "#ffc531",
  },
  {
    brand: "Sole Food Beach Club",
    line: "Friday fish fry at Montagu — ribs, conch fritters, junkanoo later.",
    cta: "See the line-up",
    tone: "#ff7a6b",
  },
  {
    brand: "Reef & Read Bookshop",
    line: "Bahamian imprint shelf: 20% off local history through Sunday.",
    cta: "Browse the shelf",
    tone: "#a78bfa",
  },
] as const;

export function AdSlot({
  index = 0,
  adFree = false,
  label = "Promoted",
  variant = "inline",
}: {
  index?: number;
  adFree?: boolean;
  label?: string;
  variant?: "inline" | "rail";
}) {
  if (adFree) {
    return (
      <p className="nb-card nb-card-tight" style={{ borderStyle: "dashed", borderColor: "rgba(67,224,203,.35)", color: "var(--nb-mint)", fontSize: 11.5, fontWeight: 700 }}>
        Ads are off on your account — NowBey stays ad-free while your plan is active.
      </p>
    );
  }
  const ad = HOUSE_ADS[index % HOUSE_ADS.length];
  return (
    <div
      className="nb-card nb-card-tight"
      style={{ borderLeft: `3px solid ${ad.tone}` }}
    >
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em]" style={{ color: ad.tone }}>
        {label}
      </p>
      <div className={`mt-2 flex gap-3 ${variant === "rail" ? "flex-col" : "items-start justify-between"}`}>
        <div>
          <p className="display text-[14.5px] font-bold" style={{ color: "var(--nb-cream)" }}>
            {ad.brand}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug" style={{ color: "var(--nb-muted)" }}>
            {ad.line}
          </p>
        </div>
        <Link
          href="/support"
          className="nb-chip shrink-0 self-center"
          style={{ color: "var(--nb-cream)" }}
        >
          {ad.cta}
        </Link>
      </div>
      <p className="mt-2 text-[11.5px]" style={{ color: "var(--nb-faint)" }}>
        House slot · sold by hand, not an ad network. Plans from ${money(LOWEST_MONTHLY)} a month remove these.
      </p>
    </div>
  );
}
