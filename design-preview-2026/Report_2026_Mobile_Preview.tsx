/* ============================================================================
 * Report_2026_Mobile_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" report flow for Expo — the mobile "Pin a spot"
 * experience: pick mode on the map, then a thumb-zone detail sheet. Drop-in
 * candidate for expo/app/(tabs)/report.tsx AFTER approval.
 *
 * Mobile adaptations: crosshair pick on a full-bleed map, category rail,
 * severity segmented control with live label, one-thumb submit, success and
 * error states kept honest. Core RN only.
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
  ok500: "#3ecf9a", danger500: "#f43f5e",
  ink100: "#eaf6f4", ink200: "#b9d4d2", ink300: "#8fb9b6", ink400: "#6e97a0",
  sev: ["#3ecf9a", "#ffd766", "#ffa94d", "#ff7a6b", "#f43f5e"] as const,
  cat: {
    flood: "#38bdf8", storm: "#fbbf24", power: "#facc15", water: "#22d3ee",
    crime: "#fb7185", road: "#f97316", marine: "#2dd4bf", fire: "#ef4444",
    health: "#a78bfa", trash: "#84cc16", event: "#f472b6", notice: "#94a3b8",
    accident: "#ef4444",
  } as const,
};

const radius = { xs: 8, sm: 10, md: 14, lg: 20, pill: 999 };

const CATS = [
  { k: "flood", l: "Flood", c: t.cat.flood },
  { k: "power", l: "Power", c: t.cat.power },
  { k: "storm", l: "Storm", c: t.cat.storm },
  { k: "road", l: "Road", c: t.cat.road },
  { k: "crime", l: "Safety", c: t.cat.crime },
  { k: "water", l: "Water", c: t.cat.water },
  { k: "accident", l: "Crash", c: t.cat.accident },
] as const;

const SEV = [
  { n: 1, l: "Minor", hint: "Worth knowing" },
  { n: 2, l: "Moderate", hint: "Plan around it" },
  { n: 3, l: "Elevated", hint: "Affects the area" },
  { n: 4, l: "High", hint: "Avoid if you can" },
  { n: 5, l: "Critical", hint: "Danger — stay clear" },
] as const;

type Stage = "spot" | "details" | "done";

export default function Report2026MobilePreview() {
  const [stage, setStage] = useState<Stage>("spot");
  const [cat, setCat] = useState("flood");
  const [sev, setSev] = useState(3);
  const [title, setTitle] = useState("");
  const [anon, setAnon] = useState(false);

  const sheetUp = useRef(new Animated.Value(0)).current;
  if (stage === "details" && sheetUp.__getValue() === 0) {
    Animated.spring(sheetUp, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
  }

  return (
    <View style={s.stage}>
      <View style={s.device}>
        <MockStatusBar barStyle="light-content" />
        <View style={s.screen}>
          {/* full-bleed map */}
          <View style={s.map}>
            <View style={s.mapGlow} />
            {[
              { x: "20%", y: "26%", c: t.cat.power },
              { x: "58%", y: "44%", c: t.cat.flood },
              { x: "76%", y: "30%", c: t.cat.road },
            ].map((p, i) => (
              <View key={i} style={[s.mapPin, { left: p.x as string, top: p.y as string, backgroundColor: p.c }]} />
            ))}
            {stage === "spot" && (
              <View style={s.crosshairWrap} pointerEvents="none">
                <View style={s.crosshairRing} />
                <View style={s.crosshairDot} />
              </View>
            )}

            {/* top bar */}
            <View style={s.topBar}>
              <Text style={s.topStep}>{stage === "spot" ? "STEP 1 OF 2" : "STEP 2 OF 2"}</Text>
              <Text style={s.topTitle}>{stage === "spot" ? "Pick the exact spot" : "Add details"}</Text>
            </View>

            {stage === "spot" && (
              <>
                <View style={s.coordPill}>
                  <Text style={s.coordText}>📍 25.0629° N, 77.3417° W · ±8 m</Text>
                </View>
                <View style={s.ctaWrap}>
                  <Pressable onPress={() => setStage("details")} style={s.cta} accessibilityRole="button">
                    <Text style={s.ctaText}>Use this spot</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          {/* details sheet */}
          {stage === "details" && (
            <Animated.View
              style={[
                s.sheet,
                { opacity: sheetUp, transform: [{ translateY: sheetUp.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] },
              ]}
            >
              <View style={s.sheetHandle} />
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 20 }}>
                <Text style={s.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {CATS.map((c) => {
                    const on = cat === c.k;
                    return (
                      <Pressable
                        key={c.k}
                        onPress={() => setCat(c.k)}
                        style={[s.chip, on && { backgroundColor: t.tide500, borderColor: t.tide500 }]}
                        accessibilityRole="button"
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: on ? t.abyss950 : c.c }} />
                        <Text style={[s.chipText, on && { color: t.abyss950 }]}>{c.l}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={s.fieldLabel}>Severity</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {SEV.map((s2) => {
                    const on = sev >= s2.n;
                    return (
                      <Pressable
                        key={s2.n}
                        onPress={() => setSev(s2.n)}
                        style={[s.seg, on ? { backgroundColor: t.sev[s2.n - 1], borderColor: "transparent" } : null]}
                        accessibilityRole="button"
                        accessibilityLabel={`${s2.l} — ${s2.hint}`}
                      >
                        {on && <Text style={{ fontSize: 11, fontWeight: "900", color: t.abyss950 }}>{s2.n}</Text>}
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[s.sevLabel, { color: t.sev[sev - 1] }]}>{SEV[sev - 1].l} — {SEV[sev - 1].hint}</Text>

                <Text style={s.fieldLabel}>What is happening?</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="“Water knee-deep on Bay St”"
                  placeholderTextColor={t.ink400}
                  style={s.input}
                />
                {title.trim().length > 0 && title.trim().length < 4 && (
                  <Text style={s.inlineErr}>At least 4 characters — it helps neighbours recognise the spot.</Text>
                )}

                <Pressable onPress={() => setAnon((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 9 }} accessibilityRole="checkbox">
                  <View style={[s.check, anon && { backgroundColor: t.tide500, borderColor: t.tide500 }]}>
                    {anon && <Text style={{ color: t.abyss950, fontSize: 11, fontWeight: "900" }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 13, color: t.ink200 }}>Post anonymously</Text>
                </Pressable>

                <Text style={s.honest}>🛡 Your pin is public immediately — that is how the map stays fast.</Text>

                <Pressable onPress={() => title.trim().length >= 4 && setStage("done")} style={[s.cta, { opacity: title.trim().length >= 4 ? 1 : 0.55 }]} accessibilityRole="button">
                  <Text style={s.ctaText}>Send to the wire</Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          )}

          {/* success */}
          {stage === "done" && (
            <View style={s.doneWrap}>
              <View style={s.doneCard}>
                <View style={s.doneIcon}><Text style={{ fontSize: 26 }}>✅</Text></View>
                <Text style={s.doneTitle}>Your pin is live</Text>
                <Text style={s.doneBody}>Neighbours can confirm it now — confirmations move a pin up the island’s attention. You earned the First report badge.</Text>
                <Pressable style={s.cta} onPress={() => { setStage("spot"); setTitle(""); }} accessibilityRole="button">
                  <Text style={s.ctaText}>Pin another spot</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
        <View style={s.homeIndicator} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: { minHeight: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#020609", padding: 20 },
  device: { width: 390, height: 844, borderRadius: 54, backgroundColor: t.abyss975, borderWidth: 3, borderColor: t.abyss700, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 40, shadowOffset: { width: 0, height: 24 }, elevation: 20 },
  homeIndicator: { position: "absolute", bottom: 8, left: "50%", marginLeft: -60, width: 120, height: 4, borderRadius: 4, backgroundColor: "rgba(234,246,244,0.35)" },
  screen: { flex: 1 },

  map: { flex: 1, overflow: "hidden" },
  mapGlow: { position: "absolute", inset: 0, backgroundColor: t.abyss800, opacity: 0.9 },
  mapPin: { position: "absolute", width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", opacity: 0.5 },
  crosshairWrap: { position: "absolute", left: "50%", top: "46%", alignItems: "center", justifyContent: "center" },
  crosshairRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: t.tide400, opacity: 0.8 },
  crosshairDot: { position: "absolute", width: 10, height: 10, borderRadius: 10, backgroundColor: t.tide400 },

  topBar: { position: "absolute", top: 54, left: 14, right: 14, backgroundColor: "rgba(14,38,55,0.8)", borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "rgba(120,220,214,0.16)" },
  topStep: { fontSize: 9.5, fontWeight: "800", letterSpacing: 1.4, color: t.tide300 },
  topTitle: { fontSize: 15, fontWeight: "800", color: t.ink100, marginTop: 2 },

  coordPill: { position: "absolute", bottom: 104, alignSelf: "center", backgroundColor: "rgba(5,13,22,0.85)", borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 36, justifyContent: "center", borderWidth: 1, borderColor: "rgba(120,220,214,0.16)" },
  coordText: { color: t.ink200, fontSize: 11.5, fontVariant: ["tabular-nums"] },
  ctaWrap: { position: "absolute", bottom: 34, left: 14, right: 14 },
  cta: { backgroundColor: t.tide500, borderRadius: radius.pill, minHeight: 48, alignItems: "center", justifyContent: "center", shadowColor: t.tide500, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  ctaText: { color: t.abyss950, fontSize: 15, fontWeight: "800" },

  sheet: { backgroundColor: t.abyss900, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: "rgba(120,220,214,0.16)", maxHeight: "72%" },
  sheetHandle: { alignSelf: "center", marginTop: 8, width: 40, height: 5, borderRadius: 5, backgroundColor: "rgba(110,151,160,0.5)" },
  fieldLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: t.ink400, textTransform: "uppercase" },

  chip: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 36, borderRadius: radius.pill, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(120,220,214,0.2)" },
  chipText: { fontSize: 11.5, fontWeight: "800", color: t.ink300 },

  seg: { flex: 1, height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: "rgba(120,220,214,0.2)", alignItems: "center", justifyContent: "center" },
  sevLabel: { fontSize: 12, fontWeight: "800" },

  input: { backgroundColor: t.abyss950, borderRadius: radius.sm, borderWidth: 1, borderColor: "rgba(120,220,214,0.16)", paddingHorizontal: 12, minHeight: 46, color: t.ink100, fontSize: 14 },
  inlineErr: { fontSize: 11, color: t.danger500, fontWeight: "700" },

  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "rgba(120,220,214,0.35)", alignItems: "center", justifyContent: "center" },
  honest: { fontSize: 11, color: t.ink400, lineHeight: 16 },

  doneWrap: { position: "absolute", inset: 0, backgroundColor: "rgba(3,8,15,0.82)", alignItems: "center", justifyContent: "center", padding: 20 },
  doneCard: { width: "100%", backgroundColor: t.abyss900, borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(120,220,214,0.16)", padding: 22, alignItems: "center", gap: 10 },
  doneIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(62,207,154,0.16)", alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 18, fontWeight: "800", color: t.ink100 },
  doneBody: { fontSize: 12.5, color: t.ink300, lineHeight: 18, textAlign: "center", marginBottom: 6 },
});
