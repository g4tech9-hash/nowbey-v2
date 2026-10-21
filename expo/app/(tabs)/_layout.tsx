/**
 * Pulse Bottom Nav — rebuild with haptics + reanimated + SafeArea
 * Center FAB is elevated, spring-scaled, and handles Dynamic Island / nav bar insets.
 */
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { color, useTheme } from "../../src/theme";
import { hapticMedium } from "../../src/design-system/haptics";
import { ReportQuickSheet } from "../../src/design-system/ReportQuickSheet";

const EXPANDED = process.env.EXPO_PUBLIC_LAUNCH_STAGE === "expanded";
const SHOW_LIFE = EXPANDED && process.env.EXPO_PUBLIC_FEATURE_ISLAND_LIFE === "true";
const SHOW_GAS = EXPANDED && process.env.EXPO_PUBLIC_FEATURE_GAS_TRACKER === "true";

type PressHandler = NonNullable<ComponentProps<typeof Pressable>["onPress"]>;

function ReportTabButton({ onPress, accessibilityState, accessibilityLabel }: { onPress?: PressHandler; accessibilityState?: { selected?: boolean }; accessibilityLabel?: string }) {
  useTheme();
  const focused = Boolean(accessibilityState?.selected);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? "Report a hazard"}
      accessibilityState={accessibilityState}
      onPress={(e) => {
        hapticMedium();
        onPress?.(e as any);
      }}
      onPressIn={() => (scale.value = withSpring(0.88, { damping: 14, stiffness: 320 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14, stiffness: 320 }))}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.88 : 1 }]}
    >
      <Animated.View style={animatedStyle}>
        <View
          style={[
            styles.disc,
            {
              backgroundColor: color.tide,
              borderColor: color.bg,
              shadowColor: color.tide,
              shadowOpacity: focused ? 0.65 : 0.4,
            },
          ]}
        >
          <Ionicons name="add" size={28} color={color.bg} />
        </View>
      </Animated.View>
      <Text style={[styles.label, { color: focused ? color.tideLight : color.muted }]}>Report</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: "center", justifyContent: "flex-start", minHeight: 44, minWidth: 44 },
  disc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -16,
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  label: { marginTop: 2, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
});

export default function TabsLayout() {
  useTheme();
  const [quickOpen, setQuickOpen] = React.useState(false);

  // Intercept the centre tab: open the half-sheet instead of navigating to /report.
  // The /report route still exists for the "Advanced" link and deep-links.
  const QuickReportButton = React.useCallback(
    (props: any) => (
      <ReportTabButton
        {...props}
        onPress={() => {
          hapticMedium();
          setQuickOpen(true);
        }}
        accessibilityState={{ selected: false }}
      />
    ),
    [],
  );

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: color.bg },
          tabBarStyle: {
            backgroundColor: color.bg,
            borderTopColor: color.line,
            borderTopWidth: 1,
            overflow: "visible",
            height: 64,
            paddingTop: 4,
          },
          tabBarActiveTintColor: color.tideLight,
          tabBarInactiveTintColor: color.muted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "800" as any, letterSpacing: 0.3 },
          tabBarItemStyle: { minHeight: 44 },
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Feed", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="newspaper-outline" size={size} color={c} /> }} />
        <Tabs.Screen name="map" options={{ title: "Map", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="map-outline" size={size} color={c} /> }} />
        <Tabs.Screen
          name="report"
          listeners={{ tabPress: (e: any) => e.preventDefault() }}
          options={{
            title: "Report",
            tabBarButton: QuickReportButton,
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen name="life" options={{ href: SHOW_LIFE ? undefined : null, title: "Life", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="sparkles-outline" size={size} color={c} /> }} />
        <Tabs.Screen name="wire" options={{ title: "Wire", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="globe-outline" size={size} color={c} /> }} />
        <Tabs.Screen name="gas" options={{ href: SHOW_GAS ? undefined : null, title: "Gas", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="speedometer-outline" size={size} color={c} /> }} />
        <Tabs.Screen name="you" options={{ title: "You", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="person-circle-outline" size={size} color={c} /> }} />
      </Tabs>
      <ReportQuickSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}
