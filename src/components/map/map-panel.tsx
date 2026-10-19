"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import type { ComponentProps } from "react";

type MapProps = ComponentProps<typeof import("./NowBeyMap").default>;

function MapSkeleton({ label = "Loading map…" }: { label?: string }) {
  return (
    <div className="relative grid h-full min-h-[120px] w-full place-items-center overflow-hidden rounded-2xl border border-accent/20 bg-[linear-gradient(120deg,#062434,#0a2735_45%,#10394c)]">
      <div className="nb-decorative absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(0deg,transparent_0_38px,rgba(120,220,214,.22)_38px_39px),repeating-linear-gradient(90deg,transparent_0_38px,rgba(120,220,214,.22)_38px_39px)]" />
      <div className="relative flex items-center gap-2 rounded-full bg-base/70 px-3 py-1.5 text-[12px] font-semibold text-text-accent">
        <span className="h-2 w-2 animate-ping rounded-full bg-accent-hover" />
        {label}
      </div>
    </div>
  );
}

const NowBeyMap = dynamic(() => import("./NowBeyMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapPanel(props: MapProps) {
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const [lowData, setLowData] = useState(false);
  const [loadAnyway, setLoadAnyway] = useState(false);

  useEffect(() => {
    let enabled = false;
    try { enabled = localStorage.getItem("nb_low_data") === "1"; } catch {}
    const frame = requestAnimationFrame(() => setLowData(enabled));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (lowData && !loadAnyway) {
    return (
      <div className={`nb-data-heavy grid min-h-[130px] place-items-center rounded-2xl border hairline bg-white/[.04] p-3 text-center ${props.className ?? ""}`}>
        <div>
          <p className="font-bold text-primary">Map paused to save mobile data</p>
          <p className="mt-1 text-[12.5px] text-tertiary">The report list and location text still work.</p>
          <button type="button" onClick={() => setLoadAnyway(true)} className="mt-3 min-h-[44px] rounded-full bg-accent px-4 py-2 text-[13px] font-extrabold text-on-accent">
            Load this map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-data-heavy h-full w-full">
      <Suspense fallback={<MapSkeleton label="Loading the map…" />}>
        <NowBeyMap {...props} googleKey={googleKey} />
      </Suspense>
    </div>
  );
}

export type { MapPin, PickResult } from "./NowBeyMap";
