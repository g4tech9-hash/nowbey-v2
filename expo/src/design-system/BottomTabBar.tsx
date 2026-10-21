/**
 * BottomTabBar — Pulse bottom navigation with central elevated FAB
 * Spec:
 * - Deep slate bg (#0F172A → color.bg #0c151d), top hairline border
 * - 5 tabs: Feed, Map, [+] (FAB), Wire, You
 * - Central "+" is absolute-positioned, elevated with shadow, reanimated scale-in on press
 * - Handles iOS Dynamic Island / home indicator via SafeArea, Android nav bar via insets
 * - Each tab has 44x44 hitSlop, accessibility role
 * - Active tint = mint #3fd6c0, inactive = muted gray
 */
import React, { memo, useCallback } from "react";
import { View, Text, Pressable, Platform, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from "react-native-reanimated";
import { color, radius, useTheme } from "../theme";
import { hapticLight, hapticMedium } from "./haptics";

type TabKey = "index" | "map" | "report" | "wire" | "you";

type TabConfig = {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  href: string;
};

const TABS: TabConfig[] = [
  { key: "index", label: "Feed", icon: "home-outline", iconActive: "home", href: "/" },
  { key: "map", label: "Map", icon: "map-outline", iconActive: "map", href: "/map" },
  { key: "report", label: "Report", icon: "add", iconActive: "add", href: "/report" }, // center FAB
  { key: "wire", label: "Wire", icon: "newspaper-outline", iconActive: "newspaper", href: "/wire" },
  { key: "you", label: "You", icon: "person-outline", iconActive: "person", href: "/you" },
];

type Props = {
  active: TabKey;
  onTabPress: (key: TabKey) => void;
  hidden?: boolean;
};

function BottomTabBarInner({ active, onTabPress, hidden }: Props) {
  useTheme();
  const insets = useSafeAreaInsets();
  const fabScale = useSharedValue(1);

  const fabAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleFabPressIn = useCallback(() => {
    fabScale.value = withSpring(0.88, { damping: 14, stiffness: 320 });
  }, [fabScale]);

  const handleFabPressOut = useCallback(() => {
    fabScale.value = withSpring(1, { damping: 14, stiffness: 320 });
  }, [fabScale]);

  const handlePress = useCallback(
    (key: TabKey) => {
      const isFab = key === "report";
      if (isFab) hapticMedium();
      else hapticLight();
      onTabPress(key);
    },
    [onTabPress],
  );

  if (hidden) return null;

  // Safe area bottom: handles home indicator (34pt on iPhone 14) + Android nav bar
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View
      style={
        {
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-around",
          backgroundColor: color.bg,
          borderTopWidth: 1,
          borderTopColor: color.line,
          paddingTop: 6,
          paddingBottom: bottomPad,
          paddingHorizontal: 4,
          // Ensure bar doesn't clip the elevated FAB
          overflow: "visible",
          // iOS shadow for bar elevation
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        } as ViewStyle
      }
    >
      {TABS.map((tab) => {
        const isCenter = tab.key === "report";
        const isActive = active === tab.key;

        if (isCenter) {
          // ── Central FAB — elevated, mint disc with shadow ──
          return (
            <View key={tab.key} style={{ alignItems: "center", justifyContent: "flex-end", flex: 1, overflow: "visible" }}>
              <Animated.View style={fabAnimated}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Report a hazard"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => handlePress(tab.key)}
                  onPressIn={handleFabPressIn}
                  onPressOut={handleFabPressOut}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={({ pressed }) => ({
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: color.tide,
                    alignItems: "center",
                    justifyContent: "center",
                    // Elevated shadow — web .pulse-glow-teal
                    shadowColor: color.tide,
                    shadowOpacity: 0.45,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 8,
                    // Negative margin lifts it above the bar top edge
                    marginBottom: 8,
                    // Lift above bar (absolute-style)
                    marginTop: -16,
                    opacity: pressed ? 0.9 : 1,
                    borderWidth: 2,
                    borderColor: color.bg,
                  })}
                >
                  <Ionicons name="add" size={28} color={color.bg} />
                </Pressable>
              </Animated.View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 0.4,
                  color: isActive ? color.tide : color.muted,
                  marginTop: 2,
                  textAlign: "center",
                }}
              >
                {tab.label}
              </Text>
            </View>
          );
        }

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => handlePress(tab.key)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              minWidth: 44,
              paddingVertical: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ alignItems: "center", gap: 3 }}>
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? color.tide : color.muted}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? "800" : "600",
                  letterSpacing: 0.3,
                  color: isActive ? color.tide : color.muted,
                }}
              >
                {tab.label}
              </Text>
              {/* Active indicator dot */}
              {isActive ? (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color.tide, marginTop: 1 }} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export const BottomTabBar = memo(BottomTabBarInner);
export type { TabKey };
