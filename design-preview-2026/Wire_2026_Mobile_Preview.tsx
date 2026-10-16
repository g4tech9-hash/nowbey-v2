/* ============================================================================
 * Wire_2026_Mobile_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" News Wire for Expo — the synced companion to
 * Wire_2026_Web_Preview.tsx. Drop-in candidate for expo/app/(tabs)/wire.tsx
 * AFTER approval.
 *
 * Mobile adaptations: pull-to-refresh spinner (PROD: RefreshControl), feed
 * cards with category accent rails, source filter rail, pinned/unpinned
 * honesty states, thumb-zone nav with Wire active. Core RN only.
 * ========================================================================== */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar as MockStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

/* -------------------------------------------------------------------------- */
/* Dark tokens — mirrors nowbey-2026-tokens.css                               */
/* -------------------------------------------------------------------------- */
const t = {
  abyss975: "#03080f", abyss950: "#050d16", abyss900: "#081522", abyss850: "#0b1d2e",
  abyss800: "#0e2637", abyss700: "#143349",
  tide500: "#00c9b7", tide400: "#2ee6d0", tide300: "#74f3e3",
  conch500: "#ff7a6b", sun500: "#ffc531",
  ink100: "#eaf6f4", ink200: "#b9d4d2", ink300: "#8fb9b6", ink400: "#6e97a0",
  ok500: "#3ecf9a",
  cat: {
    storm: "#fbbf24", power: "#facc15", water: "#22d3ee", event: "#f472b6",
    road: "#f97316", notice: "#94a3b8",
  } as const,
};

const radius = { xs: 8, sm: 10, md: 14, lg: 20, pill: 999 };

const NEWS = [
  { id: "n1", title: "Coastal flood watch issued for New Providence as squall lines stall offshore", source: "NEMA", host: "nema.gov.bs", cat: "storm" as const, mins: 24, parish: "New Providence", pinned: true, ai: "NEMA raised a coastal flood watch until 8pm. Expect washover on northern shore roads.", reacts: 34, comments: 12 },
  { id: "n2", title: "BPL restores power to 4,000 homes in eastern district after substation fault", source: "BPL", host: "bpl.com.bs", cat: "power" as const, mins: 58, parish: "New Providence", pinned: true, ai: null, reacts: 21, comments: 8 },
  { id: "n3", title: "Ministry of Health: boil notice remains for Blue Lagoon until further testing", source: "ZNS", host: "znsbahamas.com", cat: "water" as const, mins: 132, parish: "New Providence", pinned: true, ai: "A main break forced a precautionary boil notice; the notice lifts only after two clear tests.", reacts: 17, comments: 5 },
  { id: "n4", title: "Regatta qualifiers postponed to Sunday as organizers monitor sea state", source: "The Tribune", host: "tribune242.com", cat: "event" as const, mins: 205, parish: null, pinned: false, ai: null, reacts: 9, comments: 3 },
  { id: "n5", title: "Traffic advisory: lane closures on JFK Drive through Friday for resurfacing", source: "BTC", host: "bahamas.gov.bs", cat: "road" as const, mins: 320, parish: "New Providence", pinned: true, ai: null, reacts: 6, comments: 2 },
];

const ago = (m: number) => (m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`);

/* -------------------------------------------------------------------------- */
/* Feed card                                                                   */
/* -------------------------------------------------------------------------- */
function NewsCard({ item, newest }: { item: (typeof NEWS)[number]; newest: boolean }) {
  const c = t.cat[item.cat];
  const [liked, setLiked] = useState(false);
  return (
    <View style={[s.card, { borderLeftColor: c, borderLeftWidth: 3 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: c }} />
        <Text style={[s.catLabel, { color: c }]}>{item.cat.toUpperCase()}</Text>
        <Text style={s.meta}>{item.source} · {ago(item.mins)} ago</Text>
        {newest && <View style={s.newestChip}><Text style={s.newestText}>NEWEST</Text></View>}
      </View>
      <Text style={s.title} numberOfLines={3}>{item.title}</Text>
      {item.ai && (
        <View style={s.aiBox}>
          <Text style={s.aiTag}>✨ AI BRIEF</Text>
          <Text style={s.aiText}>{item.ai}</Text>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {item.parish ? (
          <View style={s.parishChip}><Text style={s.parishText}>📍 {item.parish}</Text></View>
        ) : (
          <View style={s.unpinnedChip}><Text style={s.unpinnedText}>no place named — unpinned</Text></View>
        )}
        <Text style={s.readLink}>Read at {item.host} ↗</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: "rgba(120,220,214,0.12)" }}>
        <Pressable onPress={() => setLiked((v) => !v)} hitSlop={8} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={{ fontSize: 13 }}>{liked ? "👍" : "👍🏻"}</Text>
          <Text style={[s.engage, liked && { color: t.tide300, fontWeight: "800" }]}>{item.reacts + (liked ? 1 : 0)}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={{ fontSize: 13 }}>💬</Text>
          <Text style={s.engage}>{item.comments}</Text>
        </View>
        <Text style={[s.meta, { marginLeft: "auto" }]}>{ago(item.mins)}</Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* The screen                                                                 */
/* -------------------------------------------------------------------------- */
export default function Wire2026MobilePreview() {
  const [filter, setFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!refreshing) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    spin.setValue(0);
    loop.start();
    const done = setTimeout(() => { loop.stop(); setRefreshing(false); }, 1800);
    return () => { clearTimeout(done); loop.stop(); };
  }, [refreshing, spin]);

  const rows = filter ? NEWS.filter((n) => n.cat === filter) : NEWS;

  return (
    <View style={s.stage}>
      <View style={s.device}>
        <MockStatusBar barStyle="light-content" />
        <View style={s.screen}>
          {/* header */}
          <View style={s.header}>
            <View>
              <Text style={s.kicker}>NEWS WIRE</Text>
              <Text style={s.h1}>The wire, on the map</Text>
            </View>
            <View style={s.livePill}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>38</Text>
            </View>
          </View>

          {/* source/category filter rail */}
          <View style={s.filterRail}>
            {[null, "storm", "power", "water", "event", "road"].map((k) => {
              const on = filter === k;
              const color = k ? t.cat[k as keyof typeof t.cat] : t.tide500;
              return (
                <Pressable
                  key={k ?? "all"}
                  onPress={() => setFilter(k)}
                  style={[s.chip, on && { backgroundColor: t.tide500, borderColor: t.tide500 }]}
                  accessibilityRole="button"
                >
                  {k && <View style={{ width: 7, height: 7, borderRadius: 7, backgroundColor: on ? t.abyss950 : color }} />}
                  <Text style={[s.chipText, on && { color: t.abyss950 }]}>{k ? k.toUpperCase() : "ALL · 5"}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* feed */}
          <FlatList
            data={rows}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 16, gap: 10 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} tintColor={t.tide400} colors={[t.tide500]} />
            }
            renderItem={({ item, index }) => <NewsCard item={item} newest={index === 0 && !filter} />}
            ListFooterComponent={
              <Pressable style={s.moreBtn} accessibilityRole="button">
                <Text style={s.moreText}>Load older stories</Text>
              </Pressable>
            }
          />

          {/* bottom nav — Wire active */}
          <View style={s.nav}>
            {[
              { g: "◉", l: "Map" }, { g: "≋", l: "Wire" }, { g: "+", l: "Report" }, { g: "◔", l: "Alerts" }, { g: "☺", l: "You" },
            ].map((tb, i) => {
              const on = i === 1;
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

          {refreshing && (
            <View style={s.refreshToast}>
              <Animated.Text style={{ color: t.tide300, fontSize: 13, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>⟳</Animated.Text>
              <Text style={s.refreshText}>Checking feeds…</Text>
            </View>
          )}
        </View>
        <View style={s.homeIndicator} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */
const s = StyleSheet.create({
  stage: { minHeight: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#020609", padding: 20 },
  device: { width: 390, height: 844, borderRadius: 54, backgroundColor: t.abyss950, borderWidth: 3, borderColor: t.abyss700, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 40, shadowOffset: { width: 0, height: 24 }, elevation: 20 },
  homeIndicator: { position: "absolute", bottom: 8, left: "50%", marginLeft: -60, width: 120, height: 4, borderRadius: 4, backgroundColor: "rgba(234,246,244,0.35)" },
  screen: { flex: 1 },

  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.6, color: t.tide300, textTransform: "uppercase" },
  h1: { fontSize: 21, fontWeight: "800", color: t.ink100, marginTop: 2 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.abyss800, borderRadius: radius.pill, paddingHorizontal: 10, minHeight: 34, borderWidth: 1, borderColor: "rgba(120,220,214,0.16)" },
  liveDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: t.ok500 },
  liveText: { color: t.ink100, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },

  filterRail: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingBottom: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 34, borderRadius: radius.pill, paddingHorizontal: 11, backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(120,220,214,0.2)" },
  chipText: { fontSize: 10.5, fontWeight: "800", color: t.ink300 },

  card: { backgroundColor: t.abyss900, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(120,220,214,0.14)", padding: 12, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  catLabel: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.6 },
  meta: { fontSize: 10.5, color: t.ink400, fontVariant: ["tabular-nums"] },
  newestChip: { marginLeft: "auto", backgroundColor: "rgba(0,201,183,0.18)", borderRadius: radius.pill, paddingHorizontal: 7, minHeight: 18, justifyContent: "center" },
  newestText: { fontSize: 8.5, fontWeight: "800", color: t.tide300, letterSpacing: 0.5 },
  title: { fontSize: 13.5, fontWeight: "800", color: t.ink100, lineHeight: 19, marginTop: 7 },
  aiBox: { marginTop: 8, backgroundColor: "rgba(0,201,183,0.08)", borderWidth: 1, borderColor: "rgba(46,230,208,0.25)", borderRadius: radius.sm, padding: 9 },
  aiTag: { fontSize: 8.5, fontWeight: "800", color: t.tide300, letterSpacing: 0.6 },
  aiText: { fontSize: 11.5, color: t.ink200, lineHeight: 16, marginTop: 4 },
  parishChip: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radius.pill, paddingHorizontal: 8, minHeight: 22, justifyContent: "center" },
  parishText: { fontSize: 10, fontWeight: "700", color: t.ink200 },
  unpinnedChip: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: radius.pill, paddingHorizontal: 8, minHeight: 22, justifyContent: "center" },
  unpinnedText: { fontSize: 10, color: t.ink400 },
  readLink: { fontSize: 10, fontWeight: "800", color: t.tide300, marginLeft: "auto" },
  engage: { fontSize: 11, fontWeight: "700", color: t.ink300, fontVariant: ["tabular-nums"] },
  moreBtn: { alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(120,220,214,0.14)", marginTop: 2 },
  moreText: { fontSize: 12, fontWeight: "800", color: t.ink300 },

  nav: { flexDirection: "row", backgroundColor: "rgba(8,21,34,0.94)", borderTopWidth: 1, borderColor: "rgba(120,220,214,0.14)", paddingTop: 7, paddingBottom: 26, paddingHorizontal: 6 },
  navItem: { flex: 1, alignItems: "center", gap: 3, minHeight: 52 },
  navGlyph: { width: 44, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  navCta: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.tide500, marginTop: -18, borderWidth: 3, borderColor: t.abyss900, shadowColor: t.tide500, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  navLabel: { fontSize: 10, fontWeight: "700", color: t.ink400 },

  refreshToast: { position: "absolute", top: 108, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(14,38,55,0.92)", borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 36, borderWidth: 1, borderColor: "rgba(120,220,214,0.2)" },
  refreshText: { color: t.ink100, fontSize: 12, fontWeight: "700" },
});
