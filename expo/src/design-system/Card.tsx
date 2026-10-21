/**
 * Card — Pulse surface component
 * Web parity: .pulse-card / .nb-card → bg-raised (#152230), border-default, radius-lg (16), elev-2
 * Variants: default, spine (category accent left border), glass
 */
import React, { memo } from "react";
import { View, type ViewStyle, StyleSheet } from "react-native";
import { color, radius, useTheme } from "../theme";
import { elevation } from "./tokens";

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  accent?: string; // category color → left spine (3px)
  variant?: "default" | "glass" | "elevated";
  padding?: number;
};

function CardInner({ children, style, accent, variant = "default", padding = 16 }: CardProps) {
  useTheme();

  const base: ViewStyle = {
    backgroundColor: variant === "glass" ? "rgba(21,34,48,0.62)" : color.panel2,
    borderColor: color.line,
    borderWidth: 1,
    borderRadius: radius.card, // 16 — web rounded-2xl, spec: cards 16, sheets 24
    padding,
    overflow: "hidden",
    ...elevation.l2,
  };

  // Category spine: 3px left border + subtle glow (web .pulse-card-spine::after)
  const spineStyle: ViewStyle | null = accent
    ? {
        borderLeftColor: accent,
        borderLeftWidth: 3,
        // Glow handled via shadow on the spine edge — approximated with border shadow
      }
    : null;

  const glassStyle: ViewStyle | null =
    variant === "glass"
      ? {
          // backdrop blur via pseudo — on native we approximate with translucent + border
          backgroundColor: color.panel2,
          borderColor: color.line,
        }
      : null;

  return <View style={[base, spineStyle, glassStyle, style as ViewStyle]}>{children}</View>;
}

export const Card = memo(CardInner);

/**
 * CardHeader — row: badge left, timestamp right (web IncidentCard header pattern)
 */
export function CardHeader({ left, right, style }: { left: React.ReactNode; right?: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, style]}>
      <View style={{ flexShrink: 1, flexDirection: "row", alignItems: "center" }}>{left}</View>
      {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
    </View>
  );
}

/**
 * CardFooter — muted meta row: location · parish · confirmations
 */
export function CardFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 }, style]}>
      {children}
    </View>
  );
}
