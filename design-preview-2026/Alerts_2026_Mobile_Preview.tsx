/* ============================================================================
 * Alerts_2026_Mobile_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" Alerts tab for Expo — synced with
 * Alerts_2026_Web_Preview.tsx. Drop-in candidate for expo/app/(tabs)/
 * (alerts) AFTER approval.
 *
 * Mobile adaptations: thumb-zone form, honest states kept verbatim (verified /
 * waiting-for-confirmation / push not switched on), spring press feedback.
 * Core RN only.
 * ========================================================================== */
import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar as MockStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const t = {
  abyss975: "#03080f", abyss950: "#050d16", abyss900: "#081522", abyss850: "#0b1d2e",
  abyss800: "#0e2637", abyss700: "#143349",
  tide500: "#00c9b7", tide400: "#2ee6d0", tide300: "#74f3e3",
  sun500: "#ffc531", conch500: "#ff7a6b", ok500: "#3ecf9a", danger500: "#f43f5e",
  ink100: "#eaf6f4", ink200: "#b9d4d2", ink300: "#8fb9b6", ink400: "#6e97a0",
  cat: { flood: "#38bdf8", storm: "#fbbf24", power: "#facc15", road: "#f97316", accident: "#ef4444", crime: "#fb7185" } as const,
};

const radius = { xs: 8, sm: 10, md: 14, lg: 20, pill: 999 };

const CATS = [
  { k: "flood", l: "Flooding", c: t.cat.flood },
  { k: "storm", l: "Storm", c: t.cat.storm },
  { k: "power", l: "Power", c: t.cat.power },
  { k: "crime", l: "Safety", c: t.cat.crime },
  { k: "road", l: "Road", c: t.cat.road },
  { k: "accident", l: "Accident", c: t.cat.accident },
] as const;

const PROFILES = [
  { id: "a1", email: "s•••@gmail.com", cats: ["flood", "storm", "power"], verified: true },
  { id: "a2", email: "sasha.work@•••.bs", cats: ["road", "accident"], verified: false },
];

function PressPill({ children, onPress, style, accent }: { children: React.ReactNode; onPress?: () => void; style?: object; accent?: boolean }) {
  const s = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => {
        Animated.sequence([
          Animated.timing(s, { toValue: 0.95, duration: 90, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.spring(s, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }),
        ]).start();
      }}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          {
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
            borderRadius: radius.pill, paddingHorizontal: 18, minHeight: 46,
            backgroundColor: accent ? t.tide500 : t.abyss800,
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

export default function Alerts2026MobilePreview() {
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<string[]>(["flood", "storm"]);
  const [saved, setSaved] = useState(false);

  return (
    <View style={s.stage}>
      <View style={s.device}>
        <MockStatusBar barStyle="light-content" />
        <View style={s.screen}>
          {/* header */}
          <View style={s.header}>
            <Text style={s.kicker}>ALERTS</Text>
            <Text style={s.h1}>Only the ones that{"\n"}affect your shore</Text>
            <Text style={s.sub}>Nassau first — New Providence at launch. A matching report emails you a link straight to the pin.</Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 16 }}>
            {/* storm promise */}
            <View style={[s.card, { borderColor: "rgba(255,197,49,0.4)" }]}>
              <Text style={{ fontSize: 15 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Storm warnings are always sent</Text>
                <Text style={s.cardBody}>Official storm warnings reach every confirmed address on the island — free plan included.</Text>
              </View>
            </View>

            {/* form */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Start a free alert profile</Text>
              <View style={s.inputRow}>
                <Text style={{ fontSize: 13 }}>✉️</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={t.ink400}
                  keyboardType="email-address"
                  style={s.input}
                />
              </View>
              <Text style={s.fieldLabel}>What should reach you?</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {CATS.map((c) => {
                  const on = picked.includes(c.k);
                  return (
                    <Pressable
                      key={c.k}
                      onPress={() => setPicked((p) => (p.includes(c.k) ? p.filter((x) => x !== c.k) : [...p, c.k]))}
                      style={[s.chip, on && { backgroundColor: t.tide500, borderColor: t.tide500 }]}
                      accessibilityRole="button"
                    >
                      <View style={{ width: 7, height: 7, borderRadius: 7, backgroundColor: on ? t.abyss950 : c.c }} />
                      <Text style={[s.chipText, on && { color: t.abyss950 }]}>{c.l}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ marginTop: 12 }}>
                <PressPill accent onPress={() => setSaved(true)}>
                  <Text style={{ color: t.abyss950, fontSize: 14, fontWeight: "800" }}>🔔  Send confirmation email</Text>
                </PressPill>
              </View>
              {saved && <Text style={s.saved}>✓ Sent — check {email || "your inbox"} for the link.</Text>}
            </View>

            {/* profiles */}
            <Text style={s.sectionTitle}>Your alert profiles</Text>
            {PROFILES.map((p) => (
              <View key={p.id} style={s.card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[s.statusChip, p.verified ? { backgroundColor: "rgba(62,207,154,0.16)" } : { backgroundColor: "rgba(255,197,49,0.14)" }]}>
                    <Text style={[s.statusText, { color: p.verified ? t.ok500 : t.sun500 }]}>{p.verified ? "ON" : "AWAITING CONFIRMATION"}</Text>
                  </View>
                  <Text style={s.mono}>{p.email}</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  {p.cats.map((c) => (
                    <View key={c} style={s.catChip}>
                      <Text style={s.catChipText}>{CATS.find((x) => x.k === c)?.l ?? c}</Text>
                    </View>
                  ))}
                  <Text style={[s.mono, { alignSelf: "center" }]}>· New Providence</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  {!p.verified && (
                    <Pressable style={s.miniBtn} accessibilityRole="button">
                      <Text style={s.miniBtnText}>Resend email</Text>
                    </Pressable>
                  )}
                  <Pressable style={[s.miniBtn, { borderColor: "rgba(244,63,94,0.4)" }]} accessibilityRole="button">
                    <Text style={[s.miniBtnText, { color: t.danger500 }]}>Stop alerts</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {/* honest push */}
            <View style={s.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={s.cardTitle}>🔔 Push alerts on this device</Text>
                <View style={s.offChip}><Text style={s.offChipText}>NOT ON</Text></View>
              </View>
              <Text style={s.cardBody}>Not switched on for this site yet — and we will not pretend otherwise. Email works today; the Android app has its own push switch once installed.</Text>
            </View>

            {/* plan */}
            <View style={s.card}>
              <Text style={s.fieldLabel}>YOUR PLAN</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: t.ink100 }}>Free</Text>
              <Text style={s.cardBody}>One profile per address, one island, storm warnings always sent.</Text>
            </View>
          </ScrollView>

          {/* bottom nav — Alerts active */}
          <View style={s.nav}>
            {[
              { g: "◉", l: "Map" }, { g: "≋", l: "Wire" }, { g: "+", l: "Report" }, { g: "◔", l: "Alerts" }, { g: "☺", l: "You" },
            ].map((tb, i) => {
              const on = i === 3;
              return (
                <Pressable key={tb.l} style={s.navItem} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <View style={[s.navGlyph, on && { backgroundColor: "rgba(0,201,183,0.16)" }, tb.l === "Report" && s.navCta]}>
                    <Text style={{ color: tb.l === "Report" ? t.abyss950 : on ? t.tide300 : t.ink400, fontSize: tb.l === "Report" ? 22 : 16, fontWeight: "800", lineHeight: tb.l === "Report" ? 24 : 18 }}>{tb.g}</Text>
                  </View>
                  <Text style={[s.navLabel, on && { color: t.tide300, fontWeight: "800" }]}>{tb.l}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={s.homeIndicator} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: { minHeight: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#020609", padding: 20 },
  device: { width: 390, height: 844, borderRadius: 54, backgroundColor: t.abyss950, borderWidth: 3, borderColor: t.abyss700, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 40, shadowOffset: { width: 0, height: 24 }, elevation: 20 },
  homeIndicator: { position: "absolute", bottom: 8, left: "50%", marginLeft: -60, width: 120, height: 4, borderRadius: 4, backgroundColor: "rgba(234,246,244,0.35)" },
  screen: { flex: 1 },

  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.6, color: t.tide300, textTransform: "uppercase" },
  h1: { fontSize: 24, fontWeight: "800", color: t.ink100, lineHeight: 29, marginTop: 4 },
  sub: { fontSize: 12, color: t.ink300, lineHeight: 17, marginTop: 8 },

  card: { backgroundColor: t.abyss900, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(120,220,214,0.14)", padding: 12, flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "flex-start", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardTitle: { fontSize: 13.5, fontWeight: "800", color: t.ink100 },
  cardBody: { fontSize: 11.5, color: t.ink300, lineHeight: 16, marginTop: 3 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: t.ink100, marginTop: 4 },

  inputRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.abyss950, borderRadius: radius.sm, borderWidth: 1, borderColor: "rgba(120,220,214,0.16)", paddingHorizontal: 10, minHeight: 44, marginTop: 10 },
  input: { flex: 1, color: t.ink100, fontSize: 13.5 },
  fieldLabel: { width: "100%", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: t.ink400, textTransform: "uppercase", marginTop: 12 },

  chip: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 34, borderRadius: radius.pill, paddingHorizontal: 11, borderWidth: 1, borderColor: "rgba(120,220,214,0.2)" },
  chipText: { fontSize: 11, fontWeight: "800", color: t.ink300 },

  saved: { width: "100%", fontSize: 11.5, fontWeight: "800", color: t.ok500, marginTop: 8 },

  statusChip: { borderRadius: radius.pill, paddingHorizontal: 8, minHeight: 22, justifyContent: "center" },
  statusText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  mono: { fontSize: 10.5, color: t.ink400, fontVariant: ["tabular-nums"] },
  catChip: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radius.pill, paddingHorizontal: 8, minHeight: 22, justifyContent: "center" },
  catChipText: { fontSize: 10, fontWeight: "700", color: t.ink200 },

  miniBtn: { borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(120,220,214,0.2)", paddingHorizontal: 12, minHeight: 34, justifyContent: "center" },
  miniBtnText: { fontSize: 11, fontWeight: "800", color: t.ink200 },

  offChip: { marginLeft: "auto", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radius.pill, paddingHorizontal: 8, minHeight: 22, justifyContent: "center" },
  offChipText: { fontSize: 9, fontWeight: "800", color: t.ink400, letterSpacing: 0.5 },

  nav: { flexDirection: "row", backgroundColor: "rgba(8,21,34,0.94)", borderTopWidth: 1, borderColor: "rgba(120,220,214,0.14)", paddingTop: 7, paddingBottom: 26, paddingHorizontal: 6 },
  navItem: { flex: 1, alignItems: "center", gap: 3, minHeight: 52 },
  navGlyph: { width: 44, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  navCta: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.tide500, marginTop: -18, borderWidth: 3, borderColor: t.abyss900, shadowColor: t.tide500, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  navLabel: { fontSize: 10, fontWeight: "700", color: t.ink400 },
});
