/* ============================================================================
 * Map_2026_Mobile_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" redesign of the Expo app's primary screen: the Map tab.
 * Drop-in candidate for expo/app/(tabs)/map.tsx AFTER approval.
 *
 * Design sync: the same token names, severity ramp, category colors, materials
 * and motion language as nowbey-2026-tokens.css / Map_2026_Web_Preview.tsx —
 * expressed in React Native primitives.
 *
 * Deliberately dependency-light so it can be reviewed anywhere: core RN +
 * Animated only. PROD comments mark where Reanimated 4 (already installed),
 * expo-haptics, expo-location and gesture-handler take over.
 * ========================================================================== */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar as MockStatusBar,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

/* -------------------------------------------------------------------------- */
/* Tideglass tokens — mirrors nowbey-2026-tokens.css                          */
/* -------------------------------------------------------------------------- */
const t = {
  abyss975: "#03080f",
  abyss950: "#050d16",
  abyss900: "#081522",
  abyss850: "#0b1d2e",
  abyss800: "#0e2637",
  abyss700: "#143349",
  abyss600: "#1b4560",
  tide600: "#00a896",
  tide500: "#00c9b7",
  tide400: "#2ee6d0",
  tide300: "#74f3e3",
  conch500: "#ff7a6b",
  sun500: "#ffc531",
  sand100: "#f6ead8",
  ok500: "#3ecf9a",
  danger500: "#f43f5e",
  ink100: "#eaf6f4",
  ink200: "#b9d4d2",
  ink300: "#8fb9b6",
  ink400: "#6e97a0",
  sev: ["#3ecf9a", "#ffd766", "#ffa94d", "#ff7a6b", "#f43f5e"] as const,
  cat: {
    flood: "#38bdf8", storm: "#fbbf24", power: "#facc15", water: "#22d3ee",
    crime: "#fb7185", road: "#f97316", marine: "#2dd4bf", fire: "#ef4444",
    health: "#a78bfa", trash: "#84cc16", event: "#f472b6", notice: "#94a3b8",
    accident: "#ef4444",
  } as const,
};

const radius = { xs: 8, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
const easeSpring = Easing.bezier(0.34, 1.56, 0.64, 1);

/* -------------------------------------------------------------------------- */
/* Mock feed (PROD: /api/incidents)                                            */
/* -------------------------------------------------------------------------- */
type Pin = { id: string; title: string; street: string; cat: keyof typeof t.cat; sev: 1 | 2 | 3 | 4 | 5; mins: number; confirms: number };
const PINS: Pin[] = [
  { id: "p1", title: "Lines down after squall", street: "East St & Sandyport", cat: "power", sev: 5, mins: 12, confirms: 41 },
  { id: "p2", title: "Knee-deep water on Bay St", street: "Bay St & Shirley Ct", cat: "flood", sev: 4, mins: 6, confirms: 23 },
  { id: "p3", title: "Two-car crash, lane closed", street: "JFK Dr", cat: "accident", sev: 4, mins: 3, confirms: 9 },
  { id: "p4", title: "Boil notice: Blue Lagoon", street: "Blue Lagoon", cat: "water", sev: 3, mins: 44, confirms: 31 },
];
const PULSE = [
  { cat: "flood" as const, n: 38 },
  { cat: "power" as const, n: 24 },
  { cat: "road" as const, n: 19 },
  { cat: "crime" as const, n: 12 },
];

const ago = (m: number) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);

/* -------------------------------------------------------------------------- */
/* Micro-primitives                                                            */
/* -------------------------------------------------------------------------- */

/** Live dot — the pulse is information ("this feed is alive"), never decor. */
function LiveDot() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { to: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(a, { to: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <Animated.View
      style={{
        width: 7, height: 7, borderRadius: 7, backgroundColor: t.ok500,
        opacity: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }),
        transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
      }}
    />
  );
}

/** Spring scale on press — haptic-grade feedback, pure JS so it runs anywhere. */
function PressPill({ children, onPress, style, accent }: { children: React.ReactNode; onPress?: () => void; style?: ViewStyle; accent?: boolean }) {
  const s = useRef(new Animated.Value(1)).current;
  const press = () => {
    // PROD: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) on press-in.
    Animated.sequence([
      Animated.timing(s, { to: 0.94, duration: 90, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(s, { to: 1, friction: 3, tension: 200, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };
  return (
    <Pressable onPressIn={press} onPress={() => {}} accessibilityRole="button">
      <Animated.View
        style={[
          {
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
            borderRadius: radius.pill, paddingHorizontal: 16, minHeight: 44,
            backgroundColor: accent ? t.tide500 : "rgba(255,255,255,0.07)",
            borderWidth: accent ? 0 : 1, borderColor: "rgba(120,220,214,0.16)",
          },
          style,
          { transform: [{ scale: s }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function SeverityMeter({ sev }: { sev: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }} accessibilityLabel={`Severity ${sev} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            width: 13, height: 4, borderRadius: 4,
            backgroundColor: i <= sev ? t.sev[sev - 1] : "rgba(110,151,160,0.3)",
          }}
        />
      ))}
    </View>
  );
}

function PinCard({ pin }: { pin: Pin }) {
  const c = t.cat[pin.cat];
  return (
    <View style={s.card}>
      <View style={[s.pinBadge, { backgroundColor: c, shadowColor: c }]}>
        <Text style={s.pinBadgeText}>{pin.cat.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.cardTitle} numberOfLines={1}>{pin.title}</Text>
        <Text style={s.cardMeta} numberOfLines={1}>{pin.street}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7 }}>
          <SeverityMeter sev={pin.sev} />
          <Text style={s.mono}>{ago(pin.mins)} ago</Text>
          <Text style={[s.mono, { marginLeft: "auto", color: t.tide300 }]}>✓ {pin.confirms}</Text>
        </View>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Device frame — so the preview reads as a phone outside a simulator          */
/* -------------------------------------------------------------------------- */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.stage}>
      <View style={s.device}>
        <MockStatusBar barStyle="light-content" />
        {children}
        {/* home indicator */}
        <View style={s.homeIndicator} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* The screen — Map tab                                                        */
/* -------------------------------------------------------------------------- */
const TABS = [
  { key: "map", label: "Map", glyph: "◉" },
  { key: "wire", label: "Wire", glyph: "≋" },
  { key: "report", label: "Report", glyph: "+" },
  { key: "alerts", label: "Alerts", glyph: "◔" },
  { key: "you", label: "You", glyph: "☺" },
];

export default function Map2026MobilePreview() {
  const [tab, setTab] = useState("map");
  const [segment, setSegment] = useState<"map" | "split" | "list">("split");
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const sheetIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(sheetIn, { to: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
  }, [sheetIn]);

  return (
    <PhoneFrame>
      <View style={s.screen}>
        {/* ---- Top: segmented control + live pill (thumb-safe, glanceable) ---- */}
        <View style={s.topBar}>
          <View style={s.segment}>
            {(["map", "split", "list"] as const).map((k) => (
              <Pressable key={k} onPress={() => setSegment(k)} style={[s.segmentBtn, segment === k && s.segmentBtnOn]} accessibilityRole="button">
                <Text style={[s.segmentText, segment === k && s.segmentTextOn]}>{k === "map" ? "Map" : k === "split" ? "Both" : "List"}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.livePill}>
            <LiveDot />
            <Text style={s.liveText}>142 open</Text>
          </View>
        </View>

        {/* ---- Map stage (stylised; PROD: react-native-maps / MapCanvas) ---- */}
        <View style={s.map}>
          <View style={s.mapGlow} />
          {/* pins */}
          {PINS.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => setConfirmed(confirmed === p.id ? null : p.id)}
              style={[s.mapPinWrap, { left: `${22 + i * 19}%`, top: `${18 + (i % 3) * 22}%` }]}
              accessibilityRole="button"
            >
              {p.sev >= 4 && <View style={[s.pinRing, { borderColor: t.sev[p.sev - 1] }]} />}
              <View style={[s.mapPin, { backgroundColor: t.cat[p.cat] }]}>
                <Text style={s.mapPinText}>{p.cat.slice(0, 2).toUpperCase()}</Text>
              </View>
            </Pressable>
          ))}
          {/* cluster */}
          <View style={[s.cluster, { left: "46%", top: "52%" }]}>
            <Text style={s.clusterText}>12</Text>
          </View>

          {/* floating glass chips — control layer only */}
          <View style={s.layerChip}>
            <Text style={s.layerChipText}>Hybrid ▾</Text>
          </View>
          <Pressable style={s.locateChip} accessibilityRole="button">
            <Text style={{ color: t.ink200, fontSize: 13 }}>◎</Text>
          </Pressable>

          {/* storm banner — solid, high contrast, never glass-on-busy */}
          <View style={s.stormBanner}>
            <Text style={{ fontSize: 15 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.stormTitle}>Coastal flood watch</Text>
              <Text style={s.stormMeta}>NEMA · until 8:00pm</Text>
            </View>
            <Text style={{ color: t.ink300, fontSize: 16 }}>›</Text>
          </View>
        </View>

        {/* ---- Bottom sheet: bento pulse + feed (rises on mount) ---- */}
        <Animated.View
          style={[
            s.sheet,
            {
              opacity: sheetIn,
              transform: [{ translateY: sheetIn.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            },
          ]}
        >
          <View style={s.sheetHandle} />
          <Text style={s.sheetGrab}>Swipe up for the full list</Text>

          {/* bento: 4 pulse tiles */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
            {PULSE.map((p) => (
              <View key={p.cat} style={s.pulseTile}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: t.cat[p.cat] }} />
                  <Text style={s.pulseLabel}>{p.cat === "crime" ? "Safety" : p.cat[0].toUpperCase() + p.cat.slice(1)}</Text>
                </View>
                <Text style={s.pulseNum}>{p.n}</Text>
              </View>
            ))}
            <View style={[s.pulseTile, { borderColor: "rgba(0,201,183,0.4)" }]}>
              <Text style={s.pulseLabel}>Open pins</Text>
              <Text style={[s.pulseNum, { color: t.tide300 }]}>142</Text>
            </View>
          </ScrollView>

          {/* two preview cards — the rest lives one swipe away */}
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {PINS.slice(0, 2).map((p) => (
              <PinCard key={p.id} pin={p} />
            ))}
          </View>

          {/* primary action sits ABOVE the nav, inside the thumb arc */}
          <View style={{ padding: 16, paddingBottom: 10 }}>
            <PressPill accent onPress={() => setConfirmed("new")}>
              <Text style={{ color: t.abyss950, fontSize: 15, fontWeight: "800" }}>+  Pin a spot</Text>
            </PressPill>
          </View>
        </Animated.View>

        {/* ---- Bottom-heavy navigation: thumb zone, center action raised ---- */}
        <View style={s.nav}>
          {TABS.map((tb) => {
            const on = tab === tb.key;
            const center = tb.key === "report";
            return (
              <Pressable
                key={tb.key}
                onPress={() => setTab(tb.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={s.navItem}
              >
                <View style={[s.navGlyph, center && s.navCenter, on && !center && { backgroundColor: "rgba(0,201,183,0.16)" }]}>
                  <Text style={{ color: center ? t.abyss950 : on ? t.tide300 : t.ink400, fontSize: center ? 22 : 16, fontWeight: "800", lineHeight: center ? 24 : 18 }}>{tb.glyph}</Text>
                </View>
                <Text style={[s.navLabel, on && { color: t.tide300, fontWeight: "800" }]}>{tb.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* confirm toast — micro-interaction with a job */}
        {confirmed && (
          <View style={s.toast}>
            <Text style={{ color: t.ok500, fontWeight: "800" }}>✓</Text>
            <Text style={s.toastText}>{confirmed === "new" ? "Draft saved — add details" : "Confirmed — thank your neighbour"}</Text>
          </View>
        )}
      </View>
    </PhoneFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */
const s = StyleSheet.create({
  stage: { minHeight: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#020609", padding: 20 },
  device: {
    width: 390, height: 844, borderRadius: 54, backgroundColor: t.abyss950,
    borderWidth: 3, borderColor: "#1b4560", overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 40, shadowOffset: { width: 0, height: 24 }, elevation: 20,
  },
  homeIndicator: { position: "absolute", bottom: 8, left: "50%", marginLeft: -60, width: 120, height: 4, borderRadius: 4, backgroundColor: "rgba(234,246,244,0.35)" },
  screen: { flex: 1 },

  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 54, paddingBottom: 10 },
  segment: { flex: 1, flexDirection: "row", backgroundColor: "rgba(14,38,55,0.72)", borderRadius: radius.pill, padding: 3, borderWidth: 1, borderColor: "rgba(120,220,214,0.16)" },
  segmentBtn: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segmentBtnOn: { backgroundColor: t.tide500 },
  segmentText: { fontSize: 12.5, fontWeight: "700", color: t.ink200 },
  segmentTextOn: { color: t.abyss950, fontWeight: "800" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(14,38,55,0.72)", borderRadius: radius.pill, paddingHorizontal: 10, minHeight: 36, borderWidth: 1, borderColor: "rgba(120,220,214,0.16)" },
  liveText: { color: t.ink100, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },

  map: { flex: 1, marginHorizontal: 10, borderRadius: radius.xl, backgroundColor: t.abyss975, overflow: "hidden", borderWidth: 1, borderColor: "rgba(120,220,214,0.14)" },
  mapGlow: { position: "absolute", inset: 0, backgroundColor: t.abyss800, opacity: 0.85 },
  mapPinWrap: { position: "absolute", alignItems: "center" },
  pinRing: { position: "absolute", top: -8, width: 40, height: 40, borderRadius: 40, borderWidth: 2, opacity: 0.7 },
  mapPin: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.7)", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  mapPinText: { fontSize: 11, fontWeight: "900", color: t.abyss950 },
  cluster: { position: "absolute", width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(5,13,22,0.85)", borderWidth: 2, borderColor: t.tide300, alignItems: "center", justifyContent: "center" },
  clusterText: { color: t.tide300, fontWeight: "800", fontSize: 14 },
  layerChip: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(14,38,55,0.75)", borderRadius: radius.pill, paddingHorizontal: 12, minHeight: 34, justifyContent: "center", borderWidth: 1, borderColor: "rgba(120,220,214,0.16)" },
  layerChipText: { color: t.ink200, fontSize: 12, fontWeight: "700" },
  locateChip: { position: "absolute", top: 56, right: 12, width: 38, height: 38, borderRadius: radius.md, backgroundColor: "rgba(14,38,55,0.75)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(120,220,214,0.16)" },
  stormBanner: { position: "absolute", left: 12, right: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: t.abyss900, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 46, borderWidth: 1, borderColor: "rgba(255,197,49,0.35)", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },

  sheet: { backgroundColor: t.abyss900, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: "rgba(120,220,214,0.16)", paddingBottom: 8, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: -8 } },
  sheetHandle: { alignSelf: "center", marginTop: 8, width: 40, height: 5, borderRadius: 5, backgroundColor: "rgba(110,151,160,0.5)" },
  sheetGrab: { alignSelf: "center", marginTop: 6, fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: t.ink400 },

  pulseTile: { width: 104, backgroundColor: t.abyss850, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(120,220,214,0.14)", padding: 10, gap: 6 },
  pulseLabel: { fontSize: 11.5, fontWeight: "700", color: t.ink200 },
  pulseNum: { fontSize: 20, fontWeight: "800", color: t.sand100, fontVariant: ["tabular-nums"] },

  card: { flexDirection: "row", gap: 10, backgroundColor: t.abyss850, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(120,220,214,0.14)", padding: 12 },
  pinBadge: { width: 34, height: 34, borderRadius: radius.xs, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  pinBadgeText: { fontSize: 10.5, fontWeight: "900", color: t.abyss950 },
  cardTitle: { fontSize: 13.5, fontWeight: "800", color: t.ink100 },
  cardMeta: { fontSize: 11.5, color: t.ink300, marginTop: 2 },
  mono: { fontSize: 10.5, color: t.ink400, fontVariant: ["tabular-nums"] },

  nav: { flexDirection: "row", backgroundColor: "rgba(8,21,34,0.94)", borderTopWidth: 1, borderColor: "rgba(120,220,214,0.14)", paddingTop: 7, paddingBottom: 26, paddingHorizontal: 6 },
  navItem: { flex: 1, alignItems: "center", gap: 3, minHeight: 52 },
  navGlyph: { width: 44, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  navCenter: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.tide500, marginTop: -18, shadowColor: t.tide500, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, borderWidth: 3, borderColor: t.abyss900 },
  navLabel: { fontSize: 10, fontWeight: "700", color: t.ink400 },

  toast: { position: "absolute", left: 20, right: 20, bottom: 104, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(14,38,55,0.92)", borderRadius: radius.pill, paddingHorizontal: 16, minHeight: 42, borderWidth: 1, borderColor: "rgba(120,220,214,0.2)" },
  toastText: { color: t.ink100, fontSize: 12.5, fontWeight: "700" },
});
