/**
 * For alerts and outages, official sources come first. NowBey shows what neighbours see on the ground and links
 * to the authorities; it does not replace them. These links need no partnership.
 */
export function OfficialSources() {
  return (
    <aside aria-label="Official sources" className="pulse-official-sources nb-card nb-card-tight" style={{ fontSize: 12.5, color: "var(--nb-muted)" }}>
      <p className="text-[13px] font-bold" style={{ color: "var(--nb-cream)" }}>
        For official warnings and outages, check these first
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
        <li>
          <a href="https://drm.gov.bs" className="font-bold underline-offset-2 hover:underline" style={{ color: "var(--nb-mint)" }}>
            Disaster Risk Management (DRM)
          </a>{" "}
          · forecasts, alerts and shelters
        </li>
        <li>
          <a href="https://bplco.com/services/outages" className="font-bold underline-offset-2 hover:underline" style={{ color: "var(--nb-mint)" }}>
            Bahamas Power and Light
          </a>{" "}
          · outage reports
        </li>
      </ul>
      <p className="mt-2.5 text-[11.5px]" style={{ color: "var(--nb-faint)" }}>
        NowBey shows what residents report. It cannot replace official warnings.
      </p>
    </aside>
  );
}
