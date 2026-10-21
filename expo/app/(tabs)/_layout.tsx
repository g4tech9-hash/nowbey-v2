/**
 * Pulse bottom nav — safe-area aware, notched for the FAB, 44pt targets.
 *
 * What changed:
 *  - The bar height is now `content + insets.bottom`, so it grows into the
 *    Android navigation/gesture area instead of sitting under it. It used to be
 *    a flat 64pt with no inset handling at all.
 *  - The centre Report disc sits in a notch cut out of the bar's top border,
 *    and no longer prints a text label under itself — the plus and the notch
 *    are the label, and screen readers get it from accessibilityLabel.
 *  - Touch targets are 44pt minimum on every slot.
 *
 * Two literals are load-bearing: `marginTop: -18` (matches the web .pulse-fab
 * translate3d(-14px, -18px, 0)) and the plain
 * `tabBarButton: (props) => <ReportTabButton {...props} />` form. Both are
 * asserted by tests/map-layout.test.mjs — keep them if you touch this file.
 */
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, useTheme } from "../../src/theme";
import { elevation, z } from "../../src/design-system/tokens";
import { hapticMedium } from "../../src/design-system/haptics";
import { ReportQuickSheet } from "../../src/design-system/ReportQuickSheet";

const EXPANDED = process.env.EXPO_PUBLIC_LAUNCH_STAGE === "expanded";
const SHOW_LIFE = EXPANDED && process.env.EXPO_PUBLIC_FEATURE_ISLAND_LIFE === "true";
const SHOW_GAS = EXPANDED && process.env.EXPO_PUBLIC_FEATURE_GAS_TRACKER === "true";

/** Bar geometry */
const BAR_H = 52; // content row: icon + label
const FAB = 56; // disc
const FAB_LIFT = 18; // how far the disc breaks the bar's top edge
const NOTCH = FAB + 24; // the circle masked out of the border
const SLOT_MIN = 44; // HIG / Material 3 minimum target

type PressHandler = NonNullable<ComponentProps<typeof Pressable>["onPress"]>;

/**
 * The centre button lives inside the tab bar, but the half-sheet it opens has to
 * be a sibling of <Tabs> — a sheet rendered inside a 64px tab-bar slot would be
 * clipped to the slot. Context carries the opener down instead of props, which
 * keeps `tabBarButton` the plain one-line form the mobile spec audits for.
 */
const QuickReportContext = React.createContext<() => void>(() => {});

function ReportTabButton({ onPress, accessibilityState, accessibilityLabel }: { onPress?: PressHandler; accessibilityState?: { selected?: boolean }; accessibilityLabel?: string }) {
  useTheme();
  const openQuick = React.useContext(QuickReportContext);
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
        // The quick composer opens instead of navigating to the /report tab.
        // /report still exists for the "Advanced" link and deep links.
        openQuick();
        onPress?.(e as any);
      }}
      onPressIn={() => (scale.value = withSpring(0.88, { damping: 14, stiffness: 320 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14, stiffness: 320 }))}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={styles.slot}
    >
      <Animated.View
        style={[
          styles.disc,
          animatedStyle,
          {
            backgroundColor: color.tide,
            borderColor: color.bg,
            shadowColor: color.tide,
            shadowOpacity: focused ? 0.65 : 0.4,
          },
        ]}
      >
        <Ionicons name="add" size={28} color={color.bg} />
      </Animated.View>
      {/*
        No text label under the disc on purpose: the disc is lifted 18px out of
        the bar, so a label under it collided with the bar's own text line. The
        plus glyph plus the notch carry the meaning; accessibilityLabel carries
        it for screen readers.
      */}
    </Pressable>
  );
}

/**
 * The bar plate. Drawn as a background (not borderTopWidth) so the notch circle
 * can mask the 1px border around the disc — that gap is what makes the FAB read
 * as breaking the bar rather than sitting on top of it.
 */
function TabBarBackground() {
  useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, overflow: "hidden" }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: color.line }} />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -FAB_LIFT - 2,
          left: "50%",
          marginLeft: -NOTCH / 2,
          width: NOTCH,
          height: NOTCH,
          borderRadius: NOTCH / 2,
          backgroundColor: color.bg,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: "center", justifyContent: "flex-start", minHeight: SLOT_MIN, minWidth: SLOT_MIN },
  disc: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    // Matches the web FAB: .pulse-fab { transform: translate3d(-14px, -18px, 0) }
    // — literal on purpose, tests/map-layout.test.mjs asserts "marginTop: -18".
    marginTop: -18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});

export default function TabsLayout() {
  useTheme();
  const insets = useSafeAreaInsets();
  const [quickOpen, setQuickOpen] = React.useState(false);
  const openQuick = React.useCallback(() => setQuickOpen(true), []);

  // The bar grows into the gesture area instead of hiding under it.
  const barH = BAR_H + insets.bottom;

  return (
    <QuickReportContext.Provider value={openQuick}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: color.bg },
          tabBarBackground: () => <TabBarBackground />,
          tabBarStyle: {
            height: barH,
            paddingTop: 6,
            paddingBottom: insets.bottom,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            // The disc breaks the bar's top edge, so the bar must not clip it.
            overflow: "visible",
            zIndex: z.tabbar,
            ...elevation.l2,
          },
          tabBarActiveTintColor: color.tideLight,
          tabBarInactiveTintColor: color.muted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "800" as any, letterSpacing: 0.3 },
          tabBarItemStyle: { minHeight: SLOT_MIN },
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
            tabBarButton: (props) => <ReportTabButton {...props} />,
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen name="life" options={{ href: SHOW_LIFE ? undefined : null, title: "Life", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="sparkles-outline" size={size} color={c} /> }} />
        <Tabs.Screen name="wire" options={{ title: "Wire", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="globe-outline" size={size} color={c} /> }} />
        <Tabs.Screen name="gas" options={{ href: SHOW_GAS ? undefined : null, title: "Gas", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="speedometer-outline" size={size} color={c} /> }} />
        <Tabs.Screen name="you" options={{ title: "You", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="person-circle-outline" size={size} color={c} /> }} />
      </Tabs>
      <ReportQuickSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </QuickReportContext.Provider>
  );
}
