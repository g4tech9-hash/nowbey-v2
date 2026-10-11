"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { ComponentProps } from "react";

type MapProps = ComponentProps<typeof import("./NowBeyMap").default>;

function MapSkeleton({ label = "Loading aerial imagery…" }: { label?: string }) {
  return (
    <div className="relative grid h-full min-h-[240px] w-full place-items-center overflow-hidden rounded-2xl border border-tide-500/20 bg-[linear-gradient(120deg,#062434,#0a2735_45%,#10394c)]">
      <div className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(0deg,transparent_0_38px,rgba(120,220,214,.22)_38px_39px),repeating-linear-gradient(90deg,transparent_0_38px,rgba(120,220,214,.22)_38px_39px)]" />
      <div className="relative flex items-center gap-2 rounded-full bg-abyss-950/70 px-3 py-1.5 text-[12px] font-semibold text-tide-300">
        <span className="h-2 w-2 animate-ping rounded-full bg-tide-400" />
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
  return (
    <Suspense fallback={<MapSkeleton label="Wiring up the map…" />}>
      <NowBeyMap {...props} googleKey={googleKey} />
    </Suspense>
  );
}

export type { MapPin, PickResult } from "./NowBeyMap";
