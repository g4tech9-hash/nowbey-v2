/**
 * Skeleton loaders — shape-matched for HazardCard / NewsWireCard
 * Uses Animated shimmer (no moti dependency required, but API-compatible)
 * Web parity: .nb-skeleton shimmer, card-shaped placeholders
 */
import React, { useEffect, useRef } from "react";
import { View, Animated, type ViewStyle } from "react-native";
import { color, radius, useTheme } from "../theme";

function ShimmerBlock({ style }: { style?: ViewStyle }) {
  useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: color.panel3,
          borderRadius: 8,
          opacity,
        } as any,
        style,
      ]}
    />
  );
}

export function HazardCardSkeleton() {
  useTheme();
  return (
    <View
      style={{
        backgroundColor: color.panel2,
        borderColor: color.line,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: 16,
        gap: 10,
      }}
    >
      {/* Header: badge + time */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <ShimmerBlock style={{ width: 110, height: 22, borderRadius: radius.pill }} />
        <ShimmerBlock style={{ width: 60, height: 12 }} />
      </View>
      {/* Title */}
      <ShimmerBlock style={{ width: "88%", height: 16 }} />
      <ShimmerBlock style={{ width: "62%", height: 16 }} />
      {/* Body */}
      <ShimmerBlock style={{ width: "100%", height: 12, opacity: 0.6 } as any} />
      <ShimmerBlock style={{ width: "76%", height: 12, opacity: 0.6 } as any} />
      {/* Footer */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <ShimmerBlock style={{ width: 90, height: 20, borderRadius: radius.pill }} />
        <ShimmerBlock style={{ width: 90, height: 20, borderRadius: radius.pill }} />
      </View>
    </View>
  );
}

export function NewsWireCardSkeleton() {
  useTheme();
  return (
    <View
      style={{
        backgroundColor: color.panel2,
        borderColor: color.line,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <ShimmerBlock style={{ width: 90, height: 22, borderRadius: radius.pill }} />
        <ShimmerBlock style={{ width: 50, height: 12 }} />
      </View>
      <ShimmerBlock style={{ width: "92%", height: 16 }} />
      <ShimmerBlock style={{ width: "84%", height: 16 }} />
      <ShimmerBlock style={{ width: "100%", height: 12 } as any} />
      <ShimmerBlock style={{ width: 120, height: 12 }} />
    </View>
  );
}

export function FilterPillSkeleton() {
  return (
    <View style={{ flexDirection: "row", gap: 8, paddingVertical: 6 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <ShimmerBlock key={i} style={{ width: 80 + (i % 3) * 16, height: 44, borderRadius: radius.pill }} />
      ))}
    </View>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12, padding: 16 }}>
      <FilterPillSkeleton />
      {Array.from({ length: count }).map((_, i) => (
        <HazardCardSkeleton key={i} />
      ))}
    </View>
  );
}
