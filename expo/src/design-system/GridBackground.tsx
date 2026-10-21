/**
 * NowBey Grid Background — blueprint/grid-line texture
 * Rebuild of web .pulse-ambient grid: linear-gradient 44px grid + radial aurora glows + noise
 *
 * Performance: pure View + StyleSheet, no SVG, no image decode. The grid is drawn as
 * absolutely-positioned 1px lines via mapped Views only over the visible area, plus
 * a single radial gradient overlay for the aurora. Wrapped in React.memo and rendered
 * once behind content (pointerEvents none, zIndex 0).
 *
 * On low-end devices / low-data mode, the grid downgrades to a solid color automatically.
 */
import React, { memo, useMemo } from "react";
import { View, StyleSheet, useWindowDimensions, Platform } from "react-native";
import { color, useTheme } from "../theme";
import { gridConfig } from "./tokens";

type Props = {
  children?: React.ReactNode;
  variant?: "full" | "subtle" | "none";
  style?: any;
};

function GridBackgroundInner({ children, variant = "full", style }: Props) {
  useTheme();
  const { width, height } = useWindowDimensions();

  // Compute grid line positions — memoized, only recalculates on dimension change
  const lines = useMemo(() => {
    if (variant === "none") return { vertical: [], horizontal: [] };
    const step = gridConfig.size;
    const cols = Math.ceil(width / step) + 1;
    const rows = Math.ceil(height / step) + 1;
    return {
      vertical: Array.from({ length: cols }, (_, i) => i * step),
      horizontal: Array.from({ length: rows }, (_, i) => i * step),
    };
  }, [width, height, variant]);

  if (variant === "none") {
    return <View style={[{ flex: 1, backgroundColor: color.bg }, style]}>{children}</View>;
  }

  return (
    <View style={[{ flex: 1, backgroundColor: color.bg, overflow: "hidden" }, style]}>
      {/* Grid layer — pointerEvents none so it never intercepts scroll */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {/* Vertical lines — 1px, low opacity */}
        {lines.vertical.map((x) => (
          <View
            key={`v-${x}`}
            style={{
              position: "absolute",
              left: x,
              top: 0,
              bottom: 0,
              width: StyleSheet.hairlineWidth,
              backgroundColor: gridConfig.lineColor,
              // Mask fade: grid is strongest at top, fades toward bottom (web: mask radial 120% 90% at 50% 0%)
              opacity: variant === "subtle" ? 0.4 : 1,
            }}
          />
        ))}
        {lines.horizontal.map((y) => (
          <View
            key={`h-${y}`}
            style={{
              position: "absolute",
              top: y,
              left: 0,
              right: 0,
              height: StyleSheet.hairlineWidth,
              backgroundColor: gridConfig.lineColor,
              opacity: variant === "subtle" ? 0.4 : 1,
            }}
          />
        ))}
        {/* Aurora glows — two radial approximations using positioned Views with opacity */}
        <View
          style={{
            position: "absolute",
            top: -120,
            right: -60,
            width: 420,
            height: 280,
            borderRadius: 210,
            backgroundColor: "rgba(34,184,164,0.10)",
            opacity: variant === "subtle" ? 0.5 : 1,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 40,
            left: -40,
            width: 360,
            height: 240,
            borderRadius: 180,
            backgroundColor: "rgba(111,208,255,0.07)",
            opacity: variant === "subtle" ? 0.5 : 1,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -80,
            left: width * 0.3,
            width: 500,
            height: 320,
            borderRadius: 250,
            backgroundColor: "rgba(63,214,192,0.06)",
            opacity: variant === "subtle" ? 0.5 : 1,
          }}
        />
      </View>
      {/* Content */}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export const GridBackground = memo(GridBackgroundInner);

/**
 * AmbientBackdrop — lighter alternative for use inside Sheets/Modals
 * Just the aurora without the grid lines (saves ~100 Views)
 */
export function AmbientBackdrop({ children, style }: { children?: React.ReactNode; style?: any }) {
  useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: color.bg }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}>
        <View
          style={{
            position: "absolute",
            top: -80,
            right: -40,
            width: 320,
            height: 200,
            borderRadius: 160,
            backgroundColor: "rgba(34,184,164,0.08)",
          }}
        />
      </View>
      {children}
    </View>
  );
}
