import { isBlocked, useBlocked } from "../../src/Safety";
import { useCallback, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api, errMsg, type Incident, type NewsItem } from "../../src/api";
import { CATEGORIES, CATEGORY_KEYS, categoryOf, timeAgo, type CategoryKey } from "../../src/geo";
import MapCanvas from "../../src/MapCanvas";
import type { MapPinData } from "../../src/map-types";
import { color, sevColor } from "../../src/theme";
import { Btn, Card, Pill, t, useTopInset } from "../../src/ui";

/**
 * The map screen. On a phone the map used to take every pixel above a fixed 250pt panel, so the
 * pin list itself started below the fold. Now the map is sized deliberately (a share of the
 * screen, never more than 42% and never taller than 300pt) and the list sits directly under it,
 * with its own header, filters and a mode switch for anyone who wants the whole screen for one or
 * the other. Everything that is not the map is plain React Native, so a slow tile server can never
 * hide the list.
 */
const MODES: { key: MapMode; label: string }[] = [
  { key: "map", label: "Map" },
  { key: "split", label: "Both" },
  { key: "list", label: "List" },
];

type MapMode = "split" | "map" | "list";

export default function MapTab() {
  const router = useRouter();
  const top = useTopInset();
  const { height: screenHeight } = useWindowDimensions();
  const [rows, setRows] = useState<Incident[]>([]);
  const [wire, setWire] = useState<NewsItem[]>([]);
  const [cat, setCat] = useState<CategoryKey | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("split");
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [a, b] = await Promise.all([api.incidents({ status: "active", limit: 120 }), api.news(40)]);
      setRows(a.incidents);
      setWire(b.items.filter((n) => n.lat !== null && n.lng !== null));
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const blockedNow = useBlocked().join(",");
  const visible = useMemo(() => (cat ? rows.filter((r) => r.category === cat) : rows).filter((r) => !isBlocked(r.authorHandle)), [rows, cat, blockedNow]); // eslint-disable-line react-hooks/exhaustive-deps
  const pins: MapPinData[] = useMemo(
    () => [
      ...visible.map((r) => ({
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        color: categoryOf(r.category).color,
        title: r.title,
        subtitle: `${r.confirmations} confirmed · ${timeAgo(r.createdAt)}`,
      })),
      ...wire.map((n) => ({
        id: `w:${n.id}`,
        lat: n.lat as number,
        lng: n.lng as number,
        color: "#94a3b8",
        title: n.title,
        subtitle: n.sourceName,
      })),
    ],
    [visible, wire],
  );
  const current = rows.find((r) => r.id === selected) ?? null;

  // Island pulse: which categories are loudest right now (top 3 + the open total).
  const pulse = useMemo(() => {
    const counts = new Map<CategoryKey, number>();
    for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const max = top.length ? top[0][1] : 1;
    return { top, max, open: rows.length };
  }, [rows]);

  const select = (r: Incident) => {
    setSelected(r.id);
    setFocus({ lat: r.lat, lng: r.lng, nonce: Date.now() });
    // Tapping a pin that is not on screen is useless: make sure the map is showing.
    setMode((m) => (m === "list" ? "split" : m));
  };

  // A share of the screen, bounded at both ends: short screens keep the list usable,
  // tall screens do not get a map that pushes the list off the bottom.
  const mapHeight = mode === "map" ? Math.max(220, Math.round(screenHeight * 0.58)) : Math.max(150, Math.min(300, Math.round(screenHeight * 0.34)));

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {mode !== "list" ? (
        <View style={{ height: mapHeight + top, backgroundColor: color.panel2 }}>
          <View style={{ flex: 1, marginTop: top }}>
            <MapCanvas
              style={{ flex: 1 }}
              pins={pins}
              focus={focus}
              onPinPress={(id) => {
                if (id.startsWith("w:")) {
                  const story = wire.find((n) => `w:${n.id}` === id);
                  if (story) void Linking.openURL(story.url).catch(() => {});
                  return;
                }
                setSelected(id);
              }}
            />
          </View>
          <View pointerEvents="box-none" style={{ position: "absolute", top: top + 6, left: 0, right: 0 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
              <Pill label="All" active={cat === null} onPress={() => setCat(null)} />
              {CATEGORY_KEYS.map((k) => (
                <Pill key={k} label={CATEGORIES[k].label} tint={CATEGORIES[k].color} active={cat === k} onPress={() => setCat(cat === k ? null : k)} />
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}

      <View style={{ flex: 1, minHeight: 0, backgroundColor: color.panel, borderTopColor: color.line, borderTopWidth: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 10 }}>
          <Text style={[t.h3, { flex: 1 }]} numberOfLines={1}>
            {visible.length} open {visible.length === 1 ? "pin" : "pins"}
          </Text>
          <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 999, padding: 3 }}>
            {MODES.map((m) => (
              <Pressable key={m.key} onPress={() => setMode(m.key)} accessibilityRole="button" accessibilityState={{ selected: mode === m.key }} hitSlop={4}>
                <Text
                  style={{
                    color: mode === m.key ? color.bg : color.muted,
                    backgroundColor: mode === m.key ? color.tide : "transparent",
                    fontSize: 11,
                    fontWeight: "800",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pill label="All" active={cat === null} onPress={() => setCat(null)} />
            {CATEGORY_KEYS.map((k) => (
              <Pill key={k} label={CATEGORIES[k].label} tint={CATEGORIES[k].color} active={cat === k} onPress={() => setCat(cat === k ? null : k)} />
            ))}
          </ScrollView>
        </View>

        {/* Island pulse: the loudest categories right now, as a compact bento strip. */}
        {pulse.top.length ? (
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
            {pulse.top.slice(0, 3).map(([k, n]) => (
              <View
                key={k}
                style={{
                  flex: 1,
                  backgroundColor: color.panel2,
                  borderColor: color.line,
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: CATEGORIES[k].color }} />
                  <Text style={[t.subtle, { flex: 1, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 }]} numberOfLines={1}>
                    {CATEGORIES[k].label.toUpperCase()}
                  </Text>
                </View>
                <Text style={{ color: color.sand, fontSize: 19, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{n}</Text>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <View style={{ width: `${(n / pulse.max) * 100}%`, height: 4, borderRadius: 2, backgroundColor: CATEGORIES[k].color }} />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {error ? <Text style={[t.error, { paddingHorizontal: 12, paddingTop: 6 }]}>{error}</Text> : null}
        {current ? (
          <Card style={{ marginHorizontal: 12, marginTop: 8, padding: 10 }} accent={categoryOf(current.category).color}>
            <Text style={t.h3} numberOfLines={1}>
              {current.title}
            </Text>
            <Text style={t.subtle}>
              {current.street ?? "Unmapped"} · {timeAgo(current.createdAt)}
            </Text>
            <Btn label="Open the report" kind="ghost" onPress={() => router.push(`/incident/${current.id}`)} style={{ marginTop: 8, minHeight: 36, paddingVertical: 6 }} />
          </Card>
        ) : null}

        <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 12, paddingBottom: 28, gap: 6 }} nestedScrollEnabled>
          {visible.map((r) => {
            const sev = Math.min(Math.max(r.severity ?? 1, 1), 5);
            return (
            <Pressable
              key={r.id}
              onPress={() => select(r)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 60,
                padding: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: selected === r.id ? "rgba(46,230,208,0.45)" : "transparent",
                backgroundColor: selected === r.id ? "rgba(0,201,183,0.14)" : color.panel2,
              }}
            >
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: categoryOf(r.category).color }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: color.sand, fontSize: 14, fontWeight: "800", letterSpacing: -0.2 }} numberOfLines={1}>
                  {r.title}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <Text style={[t.subtle, { fontSize: 11, fontVariant: ["tabular-nums"] }]} numberOfLines={1}>
                    {r.street ?? "Unmapped"} · {timeAgo(r.createdAt)}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 2 }} accessibilityLabel={`Severity ${Math.min(Math.max(r.severity ?? 1, 1), 5)} of 5`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <View
                        key={i}
                        style={{
                          width: 10,
                          height: 3,
                          borderRadius: 2,
                          backgroundColor: i <= sev ? sevColor(r.severity) : "rgba(255,255,255,0.10)",
                        }}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={{ color: color.tidePale, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{r.confirmations}</Text>
            </Pressable>
            );
          })}
          {visible.length === 0 ? <Text style={t.muted}>No open pins match that filter.</Text> : null}
        </ScrollView>

        {mode === "list" ? (
          <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
            <Btn label="+ Pin a spot" onPress={() => router.push("/report")} />
          </View>
        ) : null}
      </View>

      {mode !== "list" ? (
        <Pressable
          onPress={() => router.push("/report")}
          accessibilityRole="button"
          accessibilityLabel="Pin a spot"
          style={{
            position: "absolute",
            right: 16,
            top: mapHeight + top - 24,
            backgroundColor: color.tide,
            borderRadius: 999,
            paddingHorizontal: 16,
            minHeight: 44,
            justifyContent: "center",
            shadowColor: color.tide,
            shadowOpacity: 0.45,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Text style={{ color: color.bg, fontSize: 13, fontWeight: "800" }}>+ Pin a spot</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
