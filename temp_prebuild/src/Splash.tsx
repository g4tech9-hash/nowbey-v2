import { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BRAND } from "./brand";
import { color } from "./theme";

const SCENE = require("../assets/splash-scene.jpg");

/** The opening screen: a Nassau twilight photo, the NowBey pin, the tagline. Tap to skip. */
export function Splash({ onDone }: { onDone: () => void }) {
  const fade = useRef(new Animated.Value(1)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const leaving = useRef(false);

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(fade, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => onDone());
  }, [fade, onDone]);

  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const timer = setTimeout(leave, 2900);
    return () => clearTimeout(timer);
  }, [leave, rise]);

  const lift = (delay: number) => ({
    opacity: rise.interpolate({ inputRange: [delay, Math.min(1, delay + 0.5)], outputRange: [0, 1], extrapolate: "clamp" }),
    transform: [{ translateY: rise.interpolate({ inputRange: [delay, Math.min(1, delay + 0.5)], outputRange: [16, 0], extrapolate: "clamp" }) }],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={leave} accessibilityRole="button" accessibilityLabel="Skip the welcome screen">
        <ImageBackground source={SCENE} resizeMode="cover" style={StyleSheet.absoluteFill}>
          <View style={styles.veil}>
            <View style={styles.center}>
              <Animated.View style={[styles.mark, lift(0)]}>
                <Ionicons name="location" size={54} color={color.tideLight} />
              </Animated.View>
              <Animated.Text style={[styles.word, lift(0.12)]}>
                Now<Text style={{ color: color.tideLight }}>Bey</Text>
              </Animated.Text>
              <Animated.Text style={[styles.tag, lift(0.3)]}>{BRAND.tagline}</Animated.Text>
              <Animated.Text style={[styles.promise, lift(0.45)]}>{BRAND.promise}</Animated.Text>
            </View>
            <Text style={styles.hint}>Tap to continue</Text>
          </View>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, backgroundColor: color.bg },
  veil: { flex: 1, backgroundColor: "rgba(3,18,27,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  center: { alignItems: "center" },
  mark: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,36,52,0.72)",
    borderWidth: 2,
    borderColor: color.tide,
  },
  word: { marginTop: 18, fontSize: 52, fontWeight: "800", letterSpacing: -1.5, color: "#fff0d9" },
  tag: { marginTop: 4, fontSize: 13, fontWeight: "800", letterSpacing: 4.5, textTransform: "uppercase", color: "#ffd98a" },
  promise: { marginTop: 18, fontSize: 15, lineHeight: 21, textAlign: "center", color: "rgba(255,240,217,0.86)", maxWidth: 280 },
  hint: { position: "absolute", bottom: 44, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,240,217,0.55)" },
});
