import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { color } from "../../src/theme";

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
      <Tabs.Screen name="index" options={{ title: "Feed", tabBarIcon: ({ color: c, size }) => <Ionicons name="newspaper-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="map" options={{ title: "Map", tabBarIcon: ({ color: c, size }) => <Ionicons name="map-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="report" options={{ title: "Report", tabBarIcon: ({ color: c, size }) => <Ionicons name="add-circle" size={size + 4} color={c} /> }} />
      <Tabs.Screen name="life" options={{ title: "Life", tabBarIcon: ({ color: c, size }) => <Ionicons name="sparkles-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="wire" options={{ title: "Wire", tabBarIcon: ({ color: c, size }) => <Ionicons name="globe-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="gas" options={{ title: "Gas", tabBarIcon: ({ color: c, size }) => <Ionicons name="speedometer-outline" size={size} color={c} /> }} />
      <Tabs.Screen name="you" options={{ title: "You", tabBarIcon: ({ color: c, size }) => <Ionicons name="person-circle-outline" size={size} color={c} /> }} />
    </Tabs>
  );
}
