import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Btn, t } from "../src/ui";
import { color, useTheme } from "../src/theme";

export default function NotFound() {
  useTheme(); // screens repaint with the scheme
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={t.h1}>Off the map</Text>
      <Text style={[t.muted, { marginTop: 8, textAlign: "center" }]}>That screen does not exist in NowBey.</Text>
      <Btn label="Back to the feed" onPress={() => router.replace("/")} style={{ marginTop: 16 }} />
    </View>
  );
}
