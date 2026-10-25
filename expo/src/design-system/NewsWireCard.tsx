/**
 * NewsWireCard — 1:1 rebuild of web Wire card
 * Web source: wire page + src/components/wire-forms.tsx
 * Shares HazardCard geometry (rounded-2xl card, left spine) but tuned for news:
 * - Source name + map indicator footer
 * - Summary 2-line clamp, title 3-line
 * - Link affordance (“React and comment ›”)
 */
import React, { memo, useCallback } from "react";
import { View, Text, Pressable, Linking, type ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { color, radius, useTheme } from "../theme";
import { categoryOf, timeAgo } from "../geo";
import { CategoryBadge } from "./Badge";
import { Card } from "./Card";
import { hapticLight } from "./haptics";

type Props = {
  id: string;
  title: string;
  summary?: string | null;
  category: string;
  sourceName: string;
  parish?: string | null;
  lat?: number | null;
  lng?: number | null;
  url: string;
  publishedAt: string;
  onPress?: () => void;
  style?: ViewStyle;
};

function NewsWireCardInner({ title, summary, category, sourceName, parish, lat, url, publishedAt, onPress, style }: Props) {
  useTheme();
  const meta = categoryOf(category);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    hapticLight();
    if (onPress) onPress();
    else Linking.openURL(url).catch(() => {});
  }, [onPress, url]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => (scale.value = withSpring(0.98, { damping: 20, stiffness: 300 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 20, stiffness: 300 }))}
        accessibilityRole="link"
        accessibilityLabel={`${sourceName}: ${title}`}
        hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      >
        <Card accent={meta.color} style={style}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <CategoryBadge category={category} />
            <Text style={{ color: color.subtle, fontSize: 11.5, fontWeight: "500", fontVariant: ["tabular-nums"] as any }}>
              {timeAgo(publishedAt)}
            </Text>
          </View>

          <Text
            style={{ marginTop: 10, color: color.text, fontSize: 15, fontWeight: "700", lineHeight: 20, letterSpacing: -0.2 }}
            numberOfLines={3}
          >
            {title}
          </Text>

          {summary ? (
            <Text style={{ marginTop: 6, color: color.muted, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
              {summary.replace(/<[^>]*>/g, "")}
            </Text>
          ) : null}

          <Text style={{ marginTop: 10, color: color.subtle, fontSize: 11.5 }}>
            {sourceName}
            {parish ? ` · ${parish}` : ""}
            {lat != null ? " · on the map" : ""}
          </Text>

          <Pressable
            hitSlop={8}
            onPress={() => Linking.openURL(url).catch(() => {})}
            accessibilityRole="link"
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            <Text style={{ color: color.tideLight, fontSize: 12, fontWeight: "800" }}>React and comment ›</Text>
          </Pressable>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

export const NewsWireCard = memo(NewsWireCardInner);
