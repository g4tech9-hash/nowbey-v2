"use client";

/**
 * Simplified archipelago silhouette for the radar sea (Master Build: every
 * pixel must feel deliberately Bahamian). Hand-digitized outlines of the six
 * covered islands, projected with the SAME radarXY mapping as the pins, so
 * pins always land on their island. SVG only — no heavy photos on a safety
 * screen (Section 17).
 */
import { radarXY } from "@/lib/bahamas";

/** Rough island outlines as [lat, lng] rings, north-up. */
const SHAPES: Record<string, [number, number][]> = {
  NP: [
    [25.095, -77.28], [25.1, -77.33], [25.09, -77.39], [25.07, -77.44], [25.04, -77.46],
    [25.01, -77.43], [24.995, -77.38], [25.0, -77.33], [25.03, -77.28], [25.06, -77.265], [25.08, -77.27],
  ],
  GB: [
    [26.63, -78.2], [26.62, -78.45], [26.66, -78.7], [26.7, -78.9], [26.68, -78.98],
    [26.62, -78.95], [26.55, -78.85], [26.48, -78.7], [26.44, -78.5], [26.47, -78.28], [26.53, -78.15],
  ],
  EL: [
    [25.58, -76.58], [25.56, -76.7], [25.5, -76.72], [25.44, -76.67], [25.38, -76.55],
    [25.25, -76.35], [25.15, -76.18], [25.05, -76.12], [24.95, -76.15], [24.85, -76.22],
    [24.78, -76.28], [24.8, -76.35], [24.9, -76.33], [25.0, -76.28], [25.1, -76.22],
    [25.2, -76.28], [25.32, -76.45], [25.42, -76.58], [25.5, -76.56], [25.55, -76.52],
  ],
  AB: [
    [26.9, -77.1], [26.92, -77.3], [26.88, -77.48], [26.82, -77.55], [26.75, -77.42],
    [26.7, -77.28], [26.62, -77.12], [26.52, -77.0], [26.4, -76.95], [26.28, -76.98],
    [26.18, -77.05], [26.1, -77.15], [26.15, -77.22], [26.28, -77.18], [26.4, -77.12],
    [26.5, -77.1], [26.62, -77.15], [26.72, -77.22], [26.8, -77.15],
  ],
  EX: [
    [24.32, -76.52], [24.25, -76.48], [24.1, -76.3], [23.95, -76.12], [23.8, -75.98],
    [23.65, -75.85], [23.52, -75.75], [23.45, -75.78], [23.5, -75.88], [23.62, -76.0],
    [23.75, -76.12], [23.9, -76.28], [24.05, -76.42], [24.18, -76.55], [24.26, -76.58],
  ],
  AN: [
    [24.78, -77.72], [24.8, -77.82], [24.72, -77.9], [24.6, -77.95], [24.45, -77.98],
    [24.3, -77.92], [24.15, -77.95], [24.02, -77.9], [23.95, -77.85], [23.9, -77.78],
    [23.98, -77.72], [24.1, -77.68], [24.25, -77.65], [24.4, -77.62], [24.55, -77.62], [24.68, -77.65],
  ],
};

const toPoints = (ring: [number, number][]) =>
  ring
    .map(([lat, lng]) => {
      const { x, y } = radarXY(lat, lng);
      return `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`;
    })
    .join(" ");

export function BahamasShape() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {Object.entries(SHAPES).map(([code, ring]) => (
        <polygon
          key={code}
          points={toPoints(ring)}
          fill="rgba(0, 163, 173, 0.09)"
          stroke="rgba(0, 163, 173, 0.28)"
          strokeWidth={0.35}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
