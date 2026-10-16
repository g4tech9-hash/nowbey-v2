/* ============================================================================
 * Profile_Social_Mobile_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Island Record" — the member profile in the remediated Light Mode,
 * token-synced with Profile_Social_Web_Preview.tsx and Theme_LightMode_Fix.css.
 * Drop-in candidate for expo/app/(tabs)/you.tsx (self) and a new
 * expo/app/u/[handle].tsx (public) AFTER approval.
 *
 * Gesture & motion notes (core RN only, so it reviews anywhere):
 *  - swipeable tabs via PanResponder (PROD: react-native-gesture-handler is
 *    already installed — swap for Gesture.Pan())
 *  - collapsing cover on scroll via Animated scroll interpolation
 *  - badge detail bottom sheet with spring rise + drag-to-dismiss
 *  - spring press scale on every control (PROD: expo-haptics Light)
 * ========================================================================== */
import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar as MockStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

/* -------------------------------------------------------------------------- */
/* Light tokens — mirrors Theme_LightMode_Fix.css (AAA-audited values)        */
/* -------------------------------------------------------------------------- */
const t = {
  void0: "#edf2f5", base: "#f7fafb", surface: "#ffffff", tile: "#fbfdfe",
  raised: "#e9f0f3", popover: "#dce7ec", line: "#7b96a1",
  ink100: "#0a1a24", ink200: "#2a3e45", ink300: "#38505a", ink400: "#3a4e57",
  tideText: "#00635a", tide: "#00897b", tideSoft: "rgba(0,137,123,0.12)",
  conchText: "#c2413c", conchSoft: "rgba(214,69,80,0.12)",
  okText: "#065c43", okSoft: "rgba(11,138,100,0.14)",
  warnText: "#6e4e00", warnSoft: "rgba(168,124,0,0.14)",
  sev: ["#0b8a64", "#a87c00", "#c2410c", "#d64550", "#a10e33"] as const,
  cat: {
    flood: "#38bdf8", storm: "#fbbf24", power: "#facc15", water: "#22d3ee",
    crime: "#fb7185", road: "#f97316", marine: "#2dd4bf", fire: "#ef4444",
    health: "#a78bfa", trash: "#84cc16", event: "#f472b6", notice: "#94a3b8",
    accident: "#ef4444",
  } as const,
};

const radius = { xs: 8, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
const easeSpring = Easing.bezier(0.34, 1.56, 0.64, 1);
const SCREEN_W = 390;

/* -------------------------------------------------------------------------- */
/* Mock record — PROD: src/lib/profile.ts (reportRecord, liveBadges,          */
/* alertIslandCount) + incidents.confirmations                                */
/* -------------------------------------------------------------------------- */
const M = {
  handle: "sasha.b", name: "Sasha Bethel", initials: "SB",
  island: "New Providence", since: "March 2024", tier: "Island Guardian",
  reports: 47, confirmations: 312, islands: 3, weeks: 96, ratio: 6.6,
};
const TABS = ["Activity", "Badges", "About"] as const;

const TIMELINE = [
  { id: "a1", kind: "report" as const, title: "Lines down after squall", cat: "power" as const, sev: 5 as const, mins: 128, status: "open" as const, confirms: 41 },
  { id: "a2", kind: "confirm" as const, title: "Knee-deep water on Bay Street", n: 12, mins: 372 },
  { id: "a3", kind: "report" as const, title: "Boil notice — Blue Lagoon", cat: "water" as const, sev: 3 as const, mins: 1520, status: "resolved" as const, confirms: 31 },
  { id: "a4", kind: "badge" as const, badge: "Storm-season watcher", mins: 4300 },
];

const BADGES = [
  { name: "First report", desc: "Filed your first pin on the map", earned: true },
  { name: "Storm-season watcher", desc: "10 storm or flood reports in one season", earned: true },
  { name: "Island guardian", desc: "Alerts live on 3 islands", earned: true },
  { name: "Verified reporter", desc: "Checked by a person at NowBey", earned: true },
  { name: "Century reporter", desc: "100 reports filed", earned: false, progress: "47 / 100" },
  { name: "Neighbour anchor", desc: "500 confirmations received", earned: false, progress: "312 / 500" },
];

const ago = (m: number) => (m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`);

/* -------------------------------------------------------------------------- */
/* Micro-primitives (same language as the web preview)                        */
/* -------------------------------------------------------------------------- */
function PressPill({ children, onPress, style, accent }: { children: React.ReactNode; onPress?: () => void; style?: object; accent?: boolean }) {
  const s = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => {
        // PROD: Haptics.impactAsync(Light)
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
            borderRadius: radius.pill, paddingHorizontal: 16, minHeight: 44,
            backgroundColor: accent ? t.tideText : t.raised,
            borderWidth: accent ? 0 : 1, borderColor: "rgba(16,42,58,0.12)",
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

function SevMeter({ sev }: { sev: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }} accessibilityLabel={`Severity ${sev} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ width: 12, height: 4, borderRadius: 4, backgroundColor: i <= sev ? t.sev[sev - 1] : "rgba(16,42,58,0.14)" }} />
      ))}
    </View>
  );
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <View style={[s.tile, accent && { borderColor: "rgba(0,99,90,0.4)" }]}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={[s.tileNum, accent && { color: t.tideText }]}>{value}</Text>
      <Text style={s.tileSub}>{sub}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge detail bottom sheet — spring rise + drag-to-dismiss                  */
/* -------------------------------------------------------------------------- */
function BadgeSheet({ badge, onClose }: { badge: (typeof BADGES)[number]; onClose: () => void }) {
  const y = useRef(new Animated.Value(300)).current;
  useEffectOnce(() => {
    Animated.spring(y, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();
  });
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
      onPanResponderMove: (_, g) => { if (g.dy > 0) y.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          Animated.timing(y, { toValue: 320, duration: 180, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(onClose);
        } else {
          Animated.spring(y, { toValue: 0, friction: 6, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={s.sheetScrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
      <Animated.View style={[s.sheet, { transform: [{ translateY: y }] }]} {...pan.panHandlers}>
        <View style={s.sheetHandle} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          <View style={[s.badgeIcon, badge.earned && { backgroundColor: t.tideSoft }]}>
            <Text style={{ fontSize: 18 }}>{badge.earned ? "🏅" : "🔒"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetTitle}>{badge.name}</Text>
            <Text style={s.sheetMeta}>{badge.earned ? "Earned by contributing" : "Locked"}</Text>
          </View>
        </View>
        <Text style={s.sheetBody}>{badge.desc}</Text>
        {badge.progress && <Text style={s.sheetProgress}>{badge.progress}</Text>}
        <Text style={s.sheetHint}>Drag down or tap outside to close</Text>
      </Animated.View>
    </View>
  );
}

function useEffectOnce(fn: () => void) {
  const done = useRef(false);
  if (!done.current) { done.current = true; fn(); }
}

/* -------------------------------------------------------------------------- */
/* The screen                                                                 */
/* -------------------------------------------------------------------------- */
export default function ProfileSocial2026MobilePreview() {
  const [tab, setTab] = useState(0);
  const [sheetBadge, setSheetBadge] = useState<(typeof BADGES)[number] | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const coverH = scrollY.interpolate({ inputRange: [0, 120], outputRange: [108, 64], extrapolateClamp: true });
  const avatarS = scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0.72], extrapolateClamp: true });

  /* swipeable tabs */
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dy) < 40,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) setTab((v) => Math.min(v + 1, TABS.length - 1));
        else if (g.dx > 60) setTab((v) => Math.max(v - 1, 0));
      },
    }),
  ).current;

  return (
    <View style={s.stage}>
      <View style={s.device}>
        <MockStatusBar barStyle="dark-content" />
        <View style={s.screen}>
          {/* ---- collapsing cover ---- */}
          <Animated.View style={[s.cover, { height: coverH }]}>
            <View style={s.coverInner} />
            <Animated.View style={[s.avatar, { transform: [{ scale: avatarS }] }]}>
              <Text style={s.avatarText}>{M.initials}</Text>
            </Animated.View>
          </Animated.View>

          {/* ---- identity ---- */}
          <View style={s.identity}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={s.name}>{M.name}</Text>
              <Text style={{ fontSize: 11 }}>✅</Text>
            </View>
            <Text style={s.handle}>@{M.handle} · 🏝 {M.island} · since {M.since}</Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
              <View style={s.pillTide}><Text style={s.pillTideText}>🏅 {M.tier}</Text></View>
              <View style={s.pillConch}><Text style={s.pillConchText}>Verified reporter</Text></View>
            </View>
          </View>

          {/* ---- bento impact rail ---- */}
          <View style={s.bento}>
            <StatTile label="Reports" value={String(M.reports)} sub="all time" />
            <StatTile label="Confirms" value={String(M.confirmations)} sub="received" accent />
            <StatTile label="Islands" value={String(M.islands)} sub="on alert" />
            <StatTile label="Weeks" value={String(M.weeks)} sub="active" />
          </View>

          {/* ---- trust ratio ---- */}
          <View style={s.trust}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={s.trustLabel}>Trust ratio</Text>
              <Text style={s.trustValue}>{M.ratio} <Text style={s.trustUnit}>confirms/report</Text></Text>
            </View>
            <View style={s.trustTrack}>
              <View style={[s.trustFill, { width: `${(M.ratio / 10) * 100}%` }]} />
            </View>
            <Text style={s.trustHint}>Accuracy, not popularity — every report was checked by neighbours.</Text>
          </View>

          {/* ---- swipeable tabs ---- */}
          <View style={s.tabBar} {...swipe.panHandlers}>
            {TABS.map((lbl, i) => (
              <Pressable key={lbl} onPress={() => setTab(i)} style={[s.tab, tab === i && s.tabOn]} accessibilityRole="tab">
                <Text style={[s.tabText, tab === i && s.tabTextOn]}>{lbl}</Text>
              </Pressable>
            ))}
          </View>

          <Animated.ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 12, paddingBottom: 16, gap: 8 }}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          >
            {tab === 0 &&
              TIMELINE.map((e) => (
                <View key={e.id} style={s.card}>
                  <View style={s.cardDot}>
                    {e.kind === "report" && <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: t.cat[e.cat] }} />}
                    {e.kind === "confirm" && <Text style={{ color: t.okText, fontWeight: "800" }}>✓</Text>}
                    {e.kind === "badge" && <Text style={{ color: t.conchText, fontWeight: "800" }}>🛡</Text>}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {e.kind === "report" && (
                      <>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={s.cardTitle}>Filed a report</Text>
                          <View style={[s.statusChip, e.status === "open" ? { backgroundColor: t.warnSoft } : { backgroundColor: t.okSoft }]}>
                            <Text style={[s.statusText, { color: e.status === "open" ? t.warnText : t.okText }]}>{e.status}</Text>
                          </View>
                        </View>
                        <Text style={s.cardBody}>{e.title}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 }}>
                          <SevMeter sev={e.sev} />
                          <Text style={s.mono}>{ago(e.mins)}</Text>
                          <Text style={[s.mono, { color: t.okText }]}>✓ {e.confirms}</Text>
                        </View>
                      </>
                    )}
                    {e.kind === "confirm" && (
                      <>
                        <Text style={s.cardTitle}>Received {e.n} confirmations</Text>
                        <Text style={s.cardBody}>on “{e.title}”</Text>
                        <Text style={[s.mono, { marginTop: 4 }]}>{ago(e.mins)} ago</Text>
                      </>
                    )}
                    {e.kind === "badge" && (
                      <>
                        <Text style={s.cardTitle}>Earned “{e.badge}”</Text>
                        <Text style={[s.mono, { marginTop: 4 }]}>{ago(e.mins)} ago</Text>
                      </>
                    )}
                  </View>
                </View>
              ))}

            {tab === 1 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {BADGES.map((b) => (
                  <Pressable
                    key={b.name}
                    onPress={() => setSheetBadge(b)}
                    style={[s.badgeCard, b.earned ? { borderColor: "rgba(0,137,123,0.45)", backgroundColor: "rgba(0,137,123,0.06)" } : { borderStyle: "dashed" }]}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontSize: 20 }}>{b.earned ? "🏅" : "🔒"}</Text>
                    <Text style={s.badgeName}>{b.name}</Text>
                    <Text style={s.badgeDesc} numberOfLines={2}>{b.desc}</Text>
                    {b.progress && <Text style={s.badgeProg}>{b.progress}</Text>}
                  </Pressable>
                ))}
              </View>
            )}

            {tab === 2 && (
              <View style={{ gap: 8 }}>
                <View style={s.card}>
                  <Text style={s.cardTitle}>About @{M.handle}</Text>
                  <Text style={s.cardBody}>
                    East St resident. I report what I see on my walk to work — flooding first, power second. Confirm what you can; that is how the map stays honest.
                  </Text>
                </View>
                <View style={s.card}>
                  <Text style={s.cardTitle}>Coverage fingerprint</Text>
                  {[{ k: "flood", n: 14 }, { k: "power", n: 11 }, { k: "storm", n: 9 }, { k: "road", n: 6 }, { k: "marine", n: 4 }, { k: "accident", n: 3 }].map((c) => (
                    <View key={c.k} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: t.cat[c.k as keyof typeof t.cat] }} />
                      <Text style={s.covLabel}>{c.k}</Text>
                      <View style={s.covTrack}>
                        <View style={[s.covFill, { width: `${(c.n / 14) * 100}%`, backgroundColor: t.cat[c.k as keyof typeof t.cat] }]} />
                      </View>
                      <Text style={s.mono}>{c.n}</Text>
                    </View>
                  ))}
                </View>
                <View style={[s.card, { borderColor: "rgba(168,124,0,0.35)", backgroundColor: t.warnSoft }]}>
                  <Text style={s.cardTitle}>Honest by design</Text>
                  <Text style={s.cardBody}>Anonymous reports are never listed by name — not even here. Counts still include them.</Text>
                </View>
              </View>
            )}
          </Animated.ScrollView>

          {/* ---- thumb-zone primary action ---- */}
          <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
            <PressPill accent onPress={() => setTab(0)}>
              <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>Endorse a neighbour’s report</Text>
            </PressPill>
          </View>

          {/* ---- bottom nav (profile active) ---- */}
          <View style={s.nav}>
            {[
              { g: "◉", l: "Map" }, { g: "≋", l: "Wire" }, { g: "+", l: "Report" }, { g: "◔", l: "Alerts" }, { g: "☺", l: "You" },
            ].map((tb, i) => {
              const on = i === 4;
              return (
                <Pressable key={tb.l} style={s.navItem} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <View style={[s.navGlyph, on && { backgroundColor: t.tideSoft }, tb.l === "Report" && s.navCta]}>
                    <Text style={{ color: tb.l === "Report" ? "#ffffff" : on ? t.tideText : t.ink400, fontSize: tb.l === "Report" ? 22 : 16, fontWeight: "800", lineHeight: tb.l === "Report" ? 24 : 18 }}>{tb.g}</Text>
                  </View>
                  <Text style={[s.navLabel, on && { color: t.tideText, fontWeight: "800" }]}>{tb.l}</Text>
                </Pressable>
              );
            })}
          </View>

          {sheetBadge && <BadgeSheet badge={sheetBadge} onClose={() => setSheetBadge(null)} />}
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
  stage: { minHeight: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#dce7ec", padding: 20 },
  device: { width: SCREEN_W, height: 844, borderRadius: 54, backgroundColor: t.base, borderWidth: 3, borderColor: t.line, overflow: "hidden", shadowColor: "#102a3a", shadowOpacity: 0.25, shadowRadius: 40, shadowOffset: { width: 0, height: 24 }, elevation: 20 },
  homeIndicator: { position: "absolute", bottom: 8, left: "50%", marginLeft: -60, width: 120, height: 4, borderRadius: 4, backgroundColor: "rgba(10,26,36,0.3)" },
  screen: { flex: 1 },

  cover: { backgroundColor: t.raised, overflow: "hidden", justifyContent: "flex-end" },
  coverInner: { position: "absolute", inset: 0, backgroundColor: t.raised, borderRadius: 0 },
  avatar: { position: "absolute", bottom: -26, left: 16, width: 76, height: 76, borderRadius: 20, backgroundColor: t.tide, borderWidth: 3, borderColor: t.surface, alignItems: "center", justifyContent: "center", shadowColor: "#102a3a", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  avatarText: { color: "#ffffff", fontSize: 24, fontWeight: "800" },

  identity: { paddingTop: 34, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: t.surface },
  name: { fontSize: 20, fontWeight: "800", color: t.ink100 },
  handle: { fontSize: 12, color: t.tideText, fontFamily: "monospace", marginTop: 2 },
  pillTide: { backgroundColor: t.tideSoft, borderRadius: radius.pill, paddingHorizontal: 10, minHeight: 26, justifyContent: "center" },
  pillTideText: { fontSize: 11, fontWeight: "800", color: t.tideText },
  pillConch: { backgroundColor: t.conchSoft, borderRadius: radius.pill, paddingHorizontal: 10, minHeight: 26, justifyContent: "center" },
  pillConchText: { fontSize: 11, fontWeight: "800", color: t.conchText },

  bento: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: t.surface },
  tile: { width: (SCREEN_W - 24 - 24 - 8) / 2, backgroundColor: t.tile, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(16,42,58,0.09)", padding: 10, gap: 2 },
  tileLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: t.ink400 },
  tileNum: { fontSize: 24, fontWeight: "800", color: t.ink100, fontVariant: ["tabular-nums"] },
  tileSub: { fontSize: 10, color: t.ink300 },

  trust: { margin: 12, backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(16,42,58,0.09)", padding: 12 },
  trustLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: t.ink400 },
  trustValue: { fontSize: 16, fontWeight: "800", color: t.tideText, fontVariant: ["tabular-nums"] },
  trustUnit: { fontSize: 10, fontWeight: "700", color: t.ink400 },
  trustTrack: { height: 8, borderRadius: 8, backgroundColor: t.popover, marginTop: 8, overflow: "hidden" },
  trustFill: { height: 8, borderRadius: 8, backgroundColor: t.tide },
  trustHint: { fontSize: 10, color: t.ink300, marginTop: 6, lineHeight: 14 },

  tabBar: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: t.surface },
  tab: { flex: 1, minHeight: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: t.raised },
  tabOn: { backgroundColor: t.tideText },
  tabText: { fontSize: 12.5, fontWeight: "700", color: t.ink300 },
  tabTextOn: { color: "#ffffff", fontWeight: "800" },

  card: { flexDirection: "row", gap: 10, backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(16,42,58,0.09)", padding: 12, shadowColor: "#102a3a", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: t.raised, alignItems: "center", justifyContent: "center", marginTop: 2 },
  cardTitle: { fontSize: 13.5, fontWeight: "800", color: t.ink100 },
  cardBody: { fontSize: 12, color: t.ink200, marginTop: 2, lineHeight: 17 },
  statusChip: { borderRadius: radius.pill, paddingHorizontal: 8, minHeight: 20, justifyContent: "center" },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  mono: { fontSize: 10.5, color: t.ink400, fontVariant: ["tabular-nums"] },

  badgeCard: { width: (SCREEN_W - 24 - 24 - 16) / 3, backgroundColor: t.tile, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(16,42,58,0.09)", padding: 10, gap: 4 },
  badgeName: { fontSize: 11.5, fontWeight: "800", color: t.ink100 },
  badgeDesc: { fontSize: 9.5, color: t.ink300, lineHeight: 13 },
  badgeProg: { fontSize: 10, fontWeight: "800", color: t.tideText, fontVariant: ["tabular-nums"] },

  covLabel: { width: 62, fontSize: 11, fontWeight: "700", color: t.ink200, textTransform: "capitalize" },
  covTrack: { flex: 1, height: 6, borderRadius: 6, backgroundColor: t.popover, overflow: "hidden" },
  covFill: { height: 6, borderRadius: 6 },

  nav: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.96)", borderTopWidth: 1, borderColor: "rgba(16,42,58,0.1)", paddingTop: 7, paddingBottom: 26, paddingHorizontal: 6 },
  navItem: { flex: 1, alignItems: "center", gap: 3, minHeight: 52 },
  navGlyph: { width: 44, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  navCta: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.tideText, marginTop: -18, borderWidth: 3, borderColor: t.surface, shadowColor: t.tideText, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  navLabel: { fontSize: 10, fontWeight: "700", color: t.ink400 },

  sheetScrim: { position: "absolute", inset: 0, backgroundColor: "rgba(10,26,36,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: t.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 18, paddingBottom: 34 },
  sheetHandle: { alignSelf: "center", width: 40, height: 5, borderRadius: 5, backgroundColor: "rgba(16,42,58,0.2)" },
  badgeIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: t.popover, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: t.ink100 },
  sheetMeta: { fontSize: 11, fontWeight: "700", color: t.tideText, marginTop: 1 },
  sheetBody: { fontSize: 13, color: t.ink200, lineHeight: 19, marginTop: 12 },
  sheetProgress: { fontSize: 13, fontWeight: "800", color: t.tideText, marginTop: 8, fontVariant: ["tabular-nums"] },
  sheetHint: { fontSize: 10.5, color: t.ink400, marginTop: 14, textAlign: "center" },
});
