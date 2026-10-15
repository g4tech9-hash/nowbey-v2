import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { color } from "../../src/theme";

// Nassau hazard/news MVP: deferred tabs are opt-in at build time.
const SHOW_LIFE = process.env.EXPO_PUBLIC_FEATURE_ISLAND_LIFE === "true";
const SHOW_GAS = process.env.EXPO_PUBLIC_FEATURE_GAS_TRACKER === "true";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.bg },
        tabBarStyle: { backgroundColor: color.bg, borderTopColor: color.line },
        tabBarActiveTintColor: color.tideLight,
        tabBarInactiveTintColor: color.muted,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "800" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Feed", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="newspaper-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="map" options={{ title: "Map", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="map-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="report" options={{ title: "Report", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="add-circle" size={size + 4} color={c} /> }} />
      <Tabs.Screen name="life" options={{ href: SHOW_LIFE ? undefined : null, title: "Life", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="sparkles-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="wire" options={{ title: "Wire", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="globe-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="gas" options={{ href: SHOW_GAS ? undefined : null, title: "Gas", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="speedometer-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="you" options={{ title: "You", tabBarIcon: ({ color: c, size }: any) => <Ionicons name="person-circle-outline" size={size} color={c} /> }} />
    </Tabs>
  );
}
