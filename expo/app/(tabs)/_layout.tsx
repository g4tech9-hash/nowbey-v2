import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, useTheme } from "../../src/theme";

// Nassau hazard/news MVP: stale individual flags cannot bypass the launch-stage gate.
const EXPANDED = process.env.EXPO_PUBLIC_LAUNCH_STAGE === "expanded";
const SHOW_LIFE = EXPANDED && process.env.EXPO_PUBLIC_FEATURE_ISLAND_LIFE === "true";
const SHOW_GAS = EXPANDED && process.env.EXPO_PUBLIC_FEATURE_GAS_TRACKER === "true";

/**
 * The raised centre action, as the mobile spec draws it: a teal disc that
 * breaks the top edge of the bar, with its label below.
 *
 * It stays a real tab (not a floating button over the screen): it navigates
 * through the same router as every other tab, so the back stack, deep links and
 * the tab's accessibility state behave exactly as they did when it was a plain
 * icon. The disc rises with a negative margin and the bar is told not to clip.
 */
/** Pressable's own handler signature — React Navigation passes one straight through. */
type PressHandler = NonNullable<ComponentProps<typeof Pressable>["onPress"]>;

type ReportTabButtonProps = {
  onPress?: PressHandler;
  accessibilityState?: { selected?: boolean };
  accessibilityLabel?: string;
};

function ReportTabButton({ onPress, accessibilityState, accessibilityLabel }: ReportTabButtonProps) {
  useTheme(); // repaint the disc with the scheme
  const focused = Boolean(accessibilityState?.selected);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? "Report a hazard"}
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.85 : 1 }]}
    >
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
      <Text style={[styles.label, { color: focused ? color.tideLight : color.muted }]}>Report</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  disc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  label: { marginTop: 2, fontSize: 11.5, fontWeight: "800" },
});

export default function TabsLayout() {
  useTheme(); // tab bar colours follow the scheme
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.bg },
        // `overflow: visible` is what lets the centre disc break the bar's top
        // edge instead of being clipped to a semicircle on Android.
        tabBarStyle: { backgroundColor: color.bg, borderTopColor: color.line, overflow: "visible" },
        tabBarActiveTintColor: color.tideLight,
        tabBarInactiveTintColor: color.muted,
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: "800" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Feed", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="newspaper-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="map" options={{ title: "Map", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="map-outline" size={size} color={c} /> }} />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarButton: (props) => <ReportTabButton {...props} />,
          // The custom button draws its own label and icon; without this the bar
          // would print a second "Report" under the disc.
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen name="life" options={{ href: SHOW_LIFE ? undefined : null, title: "Life", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="sparkles-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="wire" options={{ title: "Wire", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="globe-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="gas" options={{ href: SHOW_GAS ? undefined : null, title: "Gas", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="speedometer-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="you" options={{ title: "You", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="person-circle-outline" size={size} color={c} /> }} />
    </Tabs>
  );
}
