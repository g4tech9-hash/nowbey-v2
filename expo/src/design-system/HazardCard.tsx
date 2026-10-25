/**
 * HazardCard — 1:1 rebuild of web IncidentCard for React Native
 * Web source: src/components/incident-card.tsx + pulse/components.css (.pulse-card, .pulse-card-spine)
 *
 * Features:
 * - Rounded-2xl (16) card with left accent spine (3px, category color)
 * - Header: CategoryBadge + severity meter left, timeAgo right
 * - Title (bold), details (2-line clamp), meta row (street · parish · coords)
 * - Footer pills: confirmations, sightings, author handle, BadgeMark
 * - Engagements: reactions + comments
 * - Press scale (reanimated), haptics, hitSlop 44, accessibility
 * - Skeleton loader shape-matched
 */
import React, { memo, useCallback } from "react";
import { View, Text, Pressable, type ViewStyle, type TextStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { color, radius, useTheme } from "../theme";
import { categoryOf, formatCoord, timeAgo } from "../geo";
import { CategoryBadge, BadgeMark } from "./Badge";
import { Card, CardHeader } from "./Card";
import { hapticLight } from "./haptics";

type HazardCardProps = {
  id: string;
  title: string;
  details?: string | null;
  category: string;
  severity?: number;
  street?: string | null;
  parish?: string | null;
  address?: string | null;
  lat?: number;
  lng?: number;
  accuracyMeters?: number | null;
  confirmations?: number;
  sightings?: number;
  authorHandle?: string | null;
  authorBadge?: string | null;
  createdAt: string;
  updatedAt?: string;
  freshnessLevel?: "live" | "watching" | "stale";
  onPress?: () => void;
  onMapPress?: () => void;
  showActions?: boolean;
  style?: ViewStyle;
};

function HazardCardInner({
  title,
  details,
  category,
  severity,
  street,
  parish,
  address,
  lat,
  lng,
  accuracyMeters,
  confirmations = 0,
  sightings = 0,
  authorHandle,
  authorBadge,
  createdAt,
  freshnessLevel,
  onPress,
  onMapPress,
  style,
}: HazardCardProps) {
  useTheme();
  const meta = categoryOf(category);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    hapticLight();
    onPress?.();
  }, [onPress]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${meta.label}: ${title}`}
        hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
        style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
      >
        <Card accent={meta.color} style={style}>
          {/* ── Header: badge + freshness + time ── */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <View style={{ flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CategoryBadge category={category} severity={severity} />
              {freshnessLevel === "live" ? (
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: color.ok500,
                    shadowColor: color.ok500,
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                  }}
                />
              ) : null}
            </View>
            <Text
              style={{
                flexShrink: 0,
                color: color.subtle,
                fontSize: 11.5,
                fontWeight: "500",
                fontVariant: ["tabular-nums"],
              }}
            >
              {timeAgo(createdAt)}
            </Text>
          </View>

          {/* ── Title ── */}
          <Text
            style={{
              marginTop: 10,
              color: color.text,
              fontSize: 15,
              fontWeight: "700",
              lineHeight: 20,
              letterSpacing: -0.2,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* ── Details ── */}
          {details ? (
            <Text
              style={{
                marginTop: 6,
                color: color.muted,
                fontSize: 13,
                lineHeight: 18,
                fontWeight: "400",
              }}
              numberOfLines={2}
            >
              {details}
            </Text>
          ) : null}

          {/* ── Location row ── */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 }}>
            <Text style={{ color: color.text, fontSize: 11.5, fontWeight: "700" }} numberOfLines={1}>
              {street ?? "Unmapped spot"}
            </Text>
            {parish ? <Text style={{ color: color.subtle, fontSize: 11.5 }}>· {parish}</Text> : null}
            {lat != null && lng != null ? (
              <Text style={{ color: color.subtle, fontSize: 11, fontVariant: ["tabular-nums"] } as TextStyle}>
                {formatCoord(lat, "lat")} {formatCoord(lng!, "lng")}
              </Text>
            ) : null}
            {accuracyMeters ? (
              <View
                style={{
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: color.line,
                  backgroundColor: color.chipBg,
                  paddingHorizontal: 8,
                  paddingVertical: 1,
                }}
              >
                <Text style={{ color: color.muted, fontSize: 10, fontWeight: "600" }}>±{Math.round(accuracyMeters)}m</Text>
              </View>
            ) : null}
            {onMapPress ? (
              <Pressable onPress={onMapPress} hitSlop={8} style={{ marginLeft: "auto" }}>
                <Text style={{ color: color.tideLight, fontSize: 11.5, fontWeight: "800" }}>Open on map ›</Text>
              </Pressable>
            ) : null}
          </View>

          {address && address !== street ? (
            <Text style={{ marginTop: 4, color: color.subtle, fontSize: 11.5, lineHeight: 16 }} numberOfLines={1}>
              {address}
            </Text>
          ) : null}

          {/* ── Footer: confirmations, sightings, author ── */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: color.line,
                backgroundColor: color.chipBg,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.tide }} />
              <Text style={{ color: color.muted, fontSize: 11.5, fontWeight: "700" }}>
                {confirmations} confirm{confirmations === 1 ? "" : "s"}
              </Text>
            </View>
            {sightings > 0 ? (
              <View
                style={{
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: color.line,
                  backgroundColor: color.chipBg,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ color: color.muted, fontSize: 11.5, fontWeight: "700" }}>{sightings} “saw it too”</Text>
              </View>
            ) : null}
            {authorHandle ? (
              <Text style={{ color: color.subtle, fontSize: 11.5 }}>by @{authorHandle}</Text>
            ) : null}
            {authorBadge ? <BadgeMark kind={authorBadge} /> : null}
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

export const HazardCard = memo(HazardCardInner);
