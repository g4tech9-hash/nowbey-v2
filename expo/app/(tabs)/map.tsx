import { isBlocked, useBlocked } from "../../src/Safety";
import { useCallback, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api, errMsg, type Incident, type NewsItem } from "../../src/api";
import { CATEGORIES, CATEGORY_KEYS, categoryOf, timeAgo, type CategoryKey } from "../../src/geo";
import MapCanvas from "../../src/MapCanvas";
import type { MapPinData } from "../../src/map-types";
import { color } from "../../src/theme";
import { Btn, Card, Pill, t, useTopInset } from "../../src/ui";

export default function MapTab() {
  const router = useRouter();
  const top = useTopInset();
  const [rows, setRows] = useState<Incident[]>([]);
  const [wire, setWire] = useState<NewsItem[]>([]);
  const [cat, setCat] = useState<CategoryKey | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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

  const select = (r: Incident) => {
    setSelected(r.id);
    setFocus({ lat: r.lat, lng: r.lng, nonce: Date.now() });
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1 }}>
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
        <View pointerEvents="box-none" style={{ position: "absolute", top: top + 8, left: 0, right: 0 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
            <Pill label="All" active={cat === null} onPress={() => setCat(null)} />
            {CATEGORY_KEYS.map((k) => (
              <Pill key={k} label={CATEGORIES[k].label} tint={CATEGORIES[k].color} active={cat === k} onPress={() => setCat(cat === k ? null : k)} />
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={{ height: 250, backgroundColor: color.panel, borderTopColor: color.line, borderTopWidth: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 10 }}>
          <Text style={t.h3}>{visible.length} open {visible.length === 1 ? "pin" : "pins"}</Text>
          <Btn label="+ Pin a spot" onPress={() => router.push("/report")} style={{ paddingVertical: 6, minHeight: 34 }} />
        </View>
        {error ? <Text style={[t.error, { paddingHorizontal: 14, paddingTop: 6 }]}>{error}</Text> : null}
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
        <ScrollView contentContainerStyle={{ padding: 12, gap: 6 }}>
          {visible.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => select(r)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 10,
                borderRadius: 12,
                backgroundColor: selected === r.id ? "rgba(0,201,183,0.14)" : "rgba(255,255,255,0.04)",
              }}
            >
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: categoryOf(r.category).color }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: color.sand, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                  {r.title}
                </Text>
                <Text style={t.subtle} numberOfLines={1}>
                  {r.street ?? "Unmapped"} · {timeAgo(r.createdAt)}
                </Text>
              </View>
              <Text style={{ color: color.tidePale, fontSize: 11, fontWeight: "700" }}>{r.confirmations}</Text>
            </Pressable>
          ))}
          {visible.length === 0 ? <Text style={t.muted}>No open pins match that filter.</Text> : null}
        </ScrollView>
      </View>
    </View>
  );
}
