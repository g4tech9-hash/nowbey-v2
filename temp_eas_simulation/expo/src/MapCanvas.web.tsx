import { Pressable, ScrollView, Text, View } from "react-native";
import type { MapCanvasProps } from "./map-types";
import { color, radius } from "./theme";

/**
 * Stand-in for the web build. The native map only runs on iPhone and Android,
 * so a desktop browser gets the pin list and coordinates instead.
 */
export default function MapCanvas({ pins = [], pick, onPinPress, style }: MapCanvasProps) {
  return (
    <View style={[{ backgroundColor: color.panel2, padding: 14, justifyContent: "center" }, style]}>
      <Text style={{ color: color.sand, fontWeight: "800", fontSize: 15 }}>The map runs on iPhone and Android</Text>
      <Text style={{ color: color.muted, marginTop: 4, fontSize: 13 }}>
        Open this app on your phone for the aerial map, or use the NowBey website in a browser.
      </Text>
      {pick ? (
        <Text style={{ color: color.tidePale, marginTop: 8, fontSize: 12 }}>
          Pin: {pick.lat.toFixed(5)}, {pick.lng.toFixed(5)}
        </Text>
      ) : null}
      <ScrollView style={{ marginTop: 10, maxHeight: 140 }}>
        {pins.slice(0, 12).map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onPinPress?.(p.id)}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 }}
          >
            <View style={{ width: 9, height: 9, borderRadius: radius.pill, backgroundColor: p.color }} />
            <Text style={{ color: color.text, fontSize: 12.5, flex: 1 }} numberOfLines={1}>
              {p.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
