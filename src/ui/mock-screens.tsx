import { CatBadge, CheckRow, Dot, NumBadge, Pill, SampleMap, Toggle } from "./kit";

/* =====================================================================
   Landing-page sample screens — rebuilt from the four references.
   These reproduce, structure-for-structure, the mockup interiors in
   1002177501 (community map), 1002177500 (email alerts),
   1002177499 (news wire) and 1002177491 (report a hazard).
   ===================================================================== */

/** Community map sample (hero mockup + section 02). */
export function MockCommunityMap() {
  return (
    <div className="flex flex-col gap-4 px-6 pb-6 pt-5">
      <div>
        <p className="nb-label">Community map</p>
        <p className="display mt-1.5 text-[24px] font-extrabold leading-tight">New Providence</p>
      </div>

      <SampleMap height={198} />

      {/* floating update chip */}
      <div
        className="nb-card nb-card-tight"
        style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", background: "rgba(12,34,45,.95)" }}
      >
        <span
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: "rgba(67,224,203,.14)",
            border: "1px solid rgba(67,224,203,.4)",
            color: "var(--nb-mint)",
            flex: "none",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5 9.5 18 20 6.5" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="nb-label" style={{ fontSize: 9.5 }}>
            Community update
          </span>
          <span className="block text-[13.5px] font-bold" style={{ color: "var(--nb-text)" }}>
            A neighbour confirmed
          </span>
        </span>
      </div>

      <div className="nb-card nb-card-tight" style={{ background: "rgba(17,39,50,.85)" }}>
        <div className="flex items-center gap-2.5">
          <CatBadge>Flooding</CatBadge>
          <span className="nb-label ml-auto" style={{ fontSize: 9.5 }}>
            Example
          </span>
        </div>
        <p className="display mt-2.5 text-[17px] font-bold leading-snug">Water across the lane</p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--nb-muted)" }}>
          Bay Street · Nassau
        </p>
        <div className="mt-3 flex items-center gap-2 text-[11.5px] font-semibold" style={{ color: "var(--nb-faint)" }}>
          <Dot color="var(--nb-coral)" glow />
          Example report · awaiting confirmation
        </div>
      </div>
    </div>
  );
}

/** Email alerts sample (reference 1002177500). */
export function MockEmailAlerts() {
  return (
    <div className="flex flex-col gap-4 px-6 pb-6 pt-5">
      <div>
        <p className="display text-[24px] font-extrabold leading-tight">Email alerts</p>
        <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--nb-muted)" }}>
          Choose your island and the updates you want.
        </p>
      </div>

      <div className="nb-card nb-card-tight" style={{ padding: "6px 18px" }}>
        <div className="flex items-center justify-between py-3.5">
          <span className="nb-label">Your island</span>
          <span className="flex items-center gap-2 text-[14.5px] font-bold" style={{ color: "var(--nb-cream)" }}>
            New Providence
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--nb-mint)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12.5 9.5 18 20 6.5" />
            </svg>
          </span>
        </div>
        <hr className="nb-divider" />
        <AlertRow label="Flooding" on />
        <hr className="nb-divider" />
        <AlertRow label="Road hazards" on />
        <hr className="nb-divider" />
        <AlertRow label="Power outages" on={false} />
      </div>

      <div className="nb-card-gold">
        <span
          aria-hidden
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            border: "1px solid color-mix(in srgb, var(--warning) 34%, transparent)",
            background: "color-mix(in srgb, var(--warning) 12%, var(--bg-raised))",
            color: "var(--warning)",
            flex: "none",
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
          </svg>
        </span>
        <span>
          <span className="block text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
            Storm warnings
          </span>
          <span className="mt-0.5 block text-[12.5px]" style={{ color: "var(--text-tertiary)" }}>
            Always sent. Free for everyone.
          </span>
        </span>
      </div>

      <p className="flex items-center gap-2.5 text-[12px]" style={{ color: "var(--nb-faint)" }}>
        <Dot color="var(--nb-mint)" />
        Email is the alert channel available today
      </p>
    </div>
  );
}

function AlertRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-[15px] font-semibold" style={{ color: "var(--nb-text)" }}>
        {label}
      </span>
      <Toggle on={on} label={label} />
    </div>
  );
}

/** News wire sample (reference 1002177499). */
export function MockNewsWire() {
  return (
    <div className="flex flex-col gap-4 px-6 pb-6 pt-5">
      <div>
        <p className="display text-[24px] font-extrabold leading-tight">The news wire</p>
        <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--nb-muted)" }}>
          Local coverage, collected in one place.
        </p>
      </div>

      <div className="nb-card nb-card-tight">
        <div
          aria-hidden
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            display: "grid",
            placeItems: "center",
            background: "color-mix(in srgb, var(--accent) 16%, var(--bg-raised))",
            color: "var(--text-accent)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          N
        </div>
        <div className="mt-3.5 flex items-center gap-2.5">
          <span className="nb-label">Bahamian outlet</span>
          <Pill tone="mint">Reviewed</Pill>
        </div>
        <p className="display mt-2 text-[18px] font-bold leading-snug">Stories from across the islands</p>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
          Read the source story, see its location and join the discussion.
        </p>
        <div className="mt-5 flex items-center justify-between">
          <span className="nb-label" style={{ fontSize: 9.5 }}>
            Map context
          </span>
          <span className="nb-link-arrow" style={{ fontSize: 13.5 }}>
            Open story
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </span>
        </div>
      </div>

      <div className="nb-card nb-card-tight" style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(17,39,50,.85)" }}>
        <Dot color="var(--nb-coral)" glow />
        <span>
          <span className="block text-[13.5px] font-bold" style={{ color: "var(--nb-cream)" }}>
            Community-submitted links
          </span>
          <span className="mt-0.5 block text-[12px]" style={{ color: "var(--nb-faint)" }}>
            Sent for review before appearing
          </span>
        </span>
      </div>
    </div>
  );
}

/** Report a hazard sample (reference 1002177491). */
export function MockReportHazard() {
  return (
    <div className="flex flex-col gap-4 px-6 pb-6 pt-5">
      <p className="display text-[24px] font-extrabold leading-tight">Report a hazard</p>

      {/* stepper */}
      <div className="flex items-stretch rounded-2xl border" style={{ borderColor: "var(--nb-stroke-soft)", background: "rgba(12,34,45,.6)" }}>
        <StepCell n={1} label="What" active />
        <span className="my-3 w-px" style={{ background: "var(--nb-stroke-soft)" }} />
        <StepCell n={2} label="Where" />
        <span className="my-3 w-px" style={{ background: "var(--nb-stroke-soft)" }} />
        <StepCell n={3} label="Details" />
      </div>

      <SampleMap height={188} />

      <div className="nb-card nb-card-tight">
        <CatBadge>Flooding</CatBadge>
        <p className="display mt-3 text-[18px] font-bold leading-snug">Water across the lane</p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--nb-muted)" }}>
          Bay Street · New Providence
        </p>
        <p className="mt-3.5 text-[12px]" style={{ color: "var(--nb-faint)" }}>
          Choose a clear spot. Add what neighbours need to know.
        </p>
        <div className="nb-btn nb-btn-primary nb-btn-block" style={{ marginTop: 16 }}>
          Continue
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 12h15M13 5.5 19.5 12 13 18.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function StepCell({ n, label, active }: { n: number; label: string; active?: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-2.5 py-3.5">
      <NumBadge n={n} off={!active} />
      <span className="text-[13px] font-bold" style={{ color: active ? "var(--nb-mint)" : "var(--nb-faint)" }}>
        {label}
      </span>
    </div>
  );
}

/** Feature bullet list used beside the mockups. */
export function MockBullets({ items }: { items: string[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((t) => (
        <CheckRow key={t}>{t}</CheckRow>
      ))}
    </div>
  );
}
