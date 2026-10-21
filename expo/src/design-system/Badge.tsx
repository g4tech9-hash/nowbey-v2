/**
 * Badge / CategoryBadge / FreshnessDot — status indicators
 * Web parity: .pulse-catbadge, .pulse-fresh, .pulse-sev
 */
import React, { memo } from "react";
import { View, Text, type ViewStyle } from "react-native";
import { color, radius, useTheme } from "../theme";
import { categoryOf } from "../geo";

type CatBadgeProps = {
  category: string;
  severity?: number; // 1-4, null = no meter
  size?: "sm" | "md";
};

// Severity meter: 4 ticks, filled up to level with sevColor(level)
function SeverityMeter({ level }: { level: number }) {
  useTheme();
  const n = Math.min(Math.max(Math.round(level), 1), 4);
  // Resolve color at render — severity hues are per-theme
  const { sevColor } = require("../theme");
  const c = sevColor(n);
  return (
    <View style={{ flexDirection: "row", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 4,
            borderRadius: 2,
            backgroundColor: i <= n ? c : color.track,
          }}
        />
      ))}
    </View>
  );
}

function CategoryBadgeInner({ category, severity, size = "sm" }: CatBadgeProps) {
  useTheme();
  const meta = categoryOf(category);
  const c = meta.color;
  const isSmall = size === "sm";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: `${c}26`,
          borderWidth: 1,
          borderColor: `${c}40`,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 3 : 4,
          borderRadius: radius.pill,
        }}
      >
        <Text
          style={{
            color: c,
            fontSize: isSmall ? 10.5 : 11.5,
            fontWeight: "800",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            lineHeight: 12,
          }}
        >
          {meta.label.toUpperCase()}
        </Text>
      </View>
      {severity && severity >= 1 && severity <= 4 ? <SeverityMeter level={severity} /> : null}
    </View>
  );
}

export const CategoryBadge = memo(CategoryBadgeInner);

// FreshnessDot — live/watching/stale indicator (web .pulse-live-dot)
export function FreshnessDot({ level }: { level?: "live" | "watching" | "stale" }) {
  useTheme();
  if (!level || level === "stale") return null;
  const tint = level === "live" ? color.ok500 : color.sun;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: tint,
          shadowColor: tint,
          shadowOpacity: 0.5,
          shadowRadius: 4,
        }}
      />
      <Text style={{ color: tint, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 }}>
        {level === "live" ? "LIVE" : "WATCHING"}
      </Text>
    </View>
  );
}

// Verified badge (desk / verified reporter)
export function BadgeMark({ kind }: { kind?: string | null }) {
  useTheme();
  if (!kind) return null;
  const desk = kind === "desk";
  const tint = desk ? color.tidePale : color.conchLight;
  return (
    <View
      style={{
        backgroundColor: `${tint}2a`,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: `${tint}30`,
      }}
    >
      <Text style={{ color: tint, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>
        {desk ? "✓ NOWBEY DESK" : "✓ VERIFIED"}
      </Text>
    </View>
  );
}

// Simple pill badge for counts (e.g. "3 confirmed")
export function CountPill({ label }: { label: string }) {
  useTheme();
  return (
    <View
      style={{
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: color.line,
        backgroundColor: color.chipBg,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: color.muted, fontSize: 11.5, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}
