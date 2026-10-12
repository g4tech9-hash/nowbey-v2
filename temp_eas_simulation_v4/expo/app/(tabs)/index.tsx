import { isBlocked, useBlocked } from "../../src/Safety";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, FlatList, ImageBackground, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api, errMsg, type Incident } from "../../src/api";
import { CATEGORIES, CATEGORY_KEYS, PARISHES, categoryOf, timeAgo, type CategoryKey } from "../../src/geo";
import { BRAND, THEME } from "../../src/brand";
import { color } from "../../src/theme";
import { BadgeMark, Btn, CategoryBadge, Card, Pill, t, useTopInset } from "../../src/ui";

const SCENE = require("../../assets/splash-scene.jpg");

/** In the Island look the header sits on a photo. In Classic it is plain. */
function Banner({ children }: { children: ReactNode }) {
  if (THEME !== "island") return <>{children}</>;
  return (
    <ImageBackground source={SCENE} resizeMode="cover" style={{ borderRadius: 20, overflow: "hidden" }}>
      <View style={{ backgroundColor: "rgba(3,18,27,0.58)", padding: 16 }}>{children}</View>
    </ImageBackground>
  );
}

const STATUSES: { key: string; label: string }[] = [
  { key: "active", label: "Open" },
  { key: "all", label: "All" },
  { key: "resolved", label: "Resolved" },
];

export default function Feed() {
  const router = useRouter();
  const top = useTopInset();
  const [rows, setRows] = useState<Incident[]>([]);
  const [status, setStatus] = useState("active");
  const [island, setIsland] = useState<string | null>(null);
  const [cat, setCat] = useState<CategoryKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await api.incidents({ status, parish: island ?? undefined, limit: 60 });
      setRows(d.incidents);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, island]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useBlocked();
  const shown = (cat ? rows.filter((r) => r.category === cat) : rows).filter((r) => !isBlocked(r.authorHandle));

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: color.bg }}
      data={shown}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 16, paddingTop: top + 12, paddingBottom: 32, gap: 12 }}
      refreshControl={
        <RefreshControl
          tintColor={color.tideLight}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Banner>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={t.h1}>
                Now<Text style={{ color: color.tideLight }}>Bey</Text>
              </Text>
              <Text style={[t.subtle, THEME === "island" && { color: "#ffd98a", fontWeight: "700", letterSpacing: 1.2 }]}>{BRAND.tagline}</Text>
            </View>
            <Btn label="+ Report" onPress={() => router.push("/report")} style={{ paddingVertical: 8, minHeight: 38 }} />
          </View>
          </Banner>

          <View style={{ flexDirection: "row" }}>
            {STATUSES.map((s) => (
              <Pill key={s.key} label={s.label} active={status === s.key} onPress={() => setStatus(s.key)} />
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pill label="Everything" active={cat === null} onPress={() => setCat(null)} />
            {CATEGORY_KEYS.map((k) => (
              <Pill key={k} label={CATEGORIES[k].label} tint={CATEGORIES[k].color} active={cat === k} onPress={() => setCat(cat === k ? null : k)} />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pill label="Every island" active={island === null} onPress={() => setIsland(null)} />
            {PARISHES.slice(0, 12).map((p) => (
              <Pill key={p} label={p} active={island === p} onPress={() => setIsland(island === p ? null : p)} />
            ))}
          </ScrollView>

          {error ? <Text style={t.error}>{error}</Text> : null}
          {loading ? <ActivityIndicator color={color.tideLight} /> : null}
        </View>
      }
      renderItem={({ item }) => {
        const meta = categoryOf(item.category);
        return (
          <Pressable onPress={() => router.push(`/incident/${item.id}`)} accessibilityRole="button">
            <Card accent={meta.color}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <CategoryBadge category={item.category} severity={item.severity} />
                <Text style={t.subtle}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={[t.h3, { marginTop: 8 }]}>{item.title}</Text>
              {item.details ? (
                <Text style={[t.muted, { marginTop: 4 }]} numberOfLines={2}>
                  {item.details}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                <Text style={{ color: color.muted, fontSize: 12, flexShrink: 1 }}>
                  {item.street ?? "Unmapped spot"}
                  {item.parish ? ` · ${item.parish}` : ""}
                </Text>
                <Text style={{ color: color.tidePale, fontSize: 12, fontWeight: "700" }}>{item.confirmations} confirmed</Text>
                <BadgeMark kind={item.authorBadge} />
              </View>
            </Card>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        loading ? null : (
          <Card style={{ alignItems: "center" }}>
            <Text style={t.h3}>Nothing here yet</Text>
            <Text style={[t.muted, { marginTop: 6, textAlign: "center" }]}>
              Clear a filter, or be the first to report it. The pin takes about twenty seconds.
            </Text>
            <Btn label="Report a spot" onPress={() => router.push("/report")} style={{ marginTop: 12 }} />
          </Card>
        )
      }
    />
  );
}
