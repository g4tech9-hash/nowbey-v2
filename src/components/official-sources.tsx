/**
 * For alerts and outages, official sources come first. NowBey shows what neighbours see on the ground and links
 * to the authorities; it does not replace them. These links need no partnership.
 */
export function OfficialSources() {
  return (
    <aside aria-label="Official sources" className="nb-surface rounded-xl2 p-3.5 text-[12.5px] text-ink-300">
      <p className="text-[13px] font-bold text-sand-100">For official warnings and outages, check these first</p>
      <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
        <li>
          <a href="https://drm.gov.bs" className="font-bold text-tide-300 underline-offset-2 hover:underline">
            Disaster Risk Management (DRM)
          </a>{" "}
          · forecasts, alerts and shelters
        </li>
        <li>
          <a href="https://bplco.com/services/outages" className="font-bold text-tide-300 underline-offset-2 hover:underline">
            Bahamas Power and Light
          </a>{" "}
          · outage reports
        </li>
      </ul>
      <p className="mt-2 text-[11.5px] text-ink-400">NowBey shows what residents report. It cannot replace official warnings.</p>
    </aside>
  );
}
