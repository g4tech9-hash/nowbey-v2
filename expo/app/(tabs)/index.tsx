/**
 * NowBey Pulse — Feed (Now rebuilt with Pulse Design System)
 * 1:1 parity with web IncidentCard + FilterPillRow + GridBackground
 * Performance: FlashList (60fps @ 500 rows) + skeleton loaders + reanimated
 */
import { useCallback, useState } from "react";
import { View, Text, RefreshControl, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, errMsg, type Incident } from "../../src/api";
import { CATEGORIES, CATEGORY_KEYS, PARISHES, categoryOf, type CategoryKey } from "../../src/geo";
import { BRAND, THEME } from "../../src/brand";
import { color, radius, useTheme } from "../../src/theme";
import { useBlocked, isBlocked } from "../../src/Safety";

// — New Pulse DS (rebuild, not theme) —
import { GridBackground } from "../../src/design-system/GridBackground";
import { FilterPill, FilterPillRow } from "../../src/design-system/FilterPill";
import { HazardCard } from "../../src/design-system/HazardCard";
import { FlashFeed } from "../../src/design-system/FlashFeed";
import { FeedSkeleton } from "../../src/design-system/Skeleton";
import { BottomSheet } from "../../src/design-system/BottomSheet";
import { Button } from "../../src/design-system/Button";
import { hapticLight } from "../../src/design-system/haptics";
import { timeAgo } from "../../src/geo";
import { ImageBackground } from "react-native";

const SCENE = require("../../assets/splash-scene.jpg");

function Banner({ children }: { children: React.ReactNode }) {
  if (THEME !== "island") return <>{children}</>;
  return (
    <ImageBackground source={SCENE} resizeMode="cover" style={{ borderRadius: radius.card, overflow: "hidden" }}>
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
  useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = insets.top;

  const [rows, setRows] = useState<Incident[]>([]);
  const [status, setStatus] = useState("active");
  const [island, setIsland] = useState<string | null>(null);
  const [cat, setCat] = useState<CategoryKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
      const interval = setInterval(load, 60000);
      return () => clearInterval(interval);
    }, [load]),
  );

  useBlocked();
  const shown = (cat ? rows.filter((r) => r.category === cat) : rows).filter((r) => !isBlocked(r.authorHandle));

  // Header component — built from atoms, not inline styles
  const header = (
    <View style={{ gap: 12 }}>
      <Banner>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: "#fff0d9", fontSize: 24, fontWeight: "800", letterSpacing: -0.6 }}>
              Now<Text style={{ color: color.tideLight }}>Bey</Text>
            </Text>
            <Text style={{ color: THEME === "island" ? "#ffd98a" : color.tideLight, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
              {BRAND.tagline}
            </Text>
          </View>
          <Button label="+ Report" onPress={() => router.push("/report")} size="sm" />
        </View>
      </Banner>

      {/* Status pills — keep scroll so Filter stays reachable */}
      <FilterPillRow>
        {STATUSES.map((s) => (
          <FilterPill key={s.key} label={s.label} active={status === s.key} onPress={() => { hapticLight(); setStatus(s.key); }} />
        ))}
        <FilterPill label="Filter" icon={<Ionicons name="options-outline" size={14} color={color.muted} />} onPress={() => setSheetOpen(true)} />
      </FilterPillRow>

      {/* Category pills — Q2 choice: wrap on mobile so all hazards visible without pan */}
      <FilterPillRow wrap>
        <FilterPill label="Everything" active={cat === null} onPress={() => setCat(null)} />
        {CATEGORY_KEYS.map((k) => (
          <FilterPill
            key={k}
            label={CATEGORIES[k].label}
            tint={CATEGORIES[k].color}
            active={cat === k}
            onPress={() => setCat(cat === k ? null : k)}
          />
        ))}
      </FilterPillRow>

      {/* Island pills — wrap too */}
      <FilterPillRow wrap>
        <FilterPill label="Every island" active={island === null} onPress={() => setIsland(null)} />
        {PARISHES.slice(0, 12).map((p) => (
          <FilterPill key={p} label={p} active={island === p} onPress={() => setIsland(island === p ? null : p)} />
        ))}
      </FilterPillRow>

      {error ? <Text style={{ color: color.conch, fontSize: 12.5 }}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={color.tideLight} style={{ marginVertical: 4 }} /> : null}
    </View>
  );

  // Loading skeleton (shape-matched, not a spinner)
  if (loading && !rows.length) {
    return (
      <GridBackground variant="full">
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={{ padding: 16, paddingTop: top + 8, gap: 12 }}>
            {header}
            <FeedSkeleton count={3} />
          </View>
        </SafeAreaView>
      </GridBackground>
    );
  }

  return (
    <GridBackground variant="full">
      <FlashFeed
        data={shown}
        keyExtractor={(r: any) => r.id}
        contentPaddingTop={top + 12}
        header={header}
        error={error}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
        emptyTitle="Nothing here yet"
        emptyBody="Clear a filter, or be the first to report it. The pin takes about twenty seconds."
        emptyActionLabel="Report a spot"
        onEmptyAction={() => router.push("/report")}
        renderItem={({ item }: any) => (
          <HazardCard
            id={item.id}
            title={item.title}
            details={item.details}
            category={item.category}
            severity={item.severity}
            street={item.street}
            parish={item.parish}
            lat={item.lat}
            lng={item.lng}
            accuracyMeters={item.accuracyMeters}
            confirmations={item.confirmations}
            sightings={item.sightings}
            authorHandle={item.authorHandle}
            authorBadge={item.authorBadge}
            createdAt={item.createdAt}
            onPress={() => router.push(`/incident/${item.id}`)}
            onMapPress={() => router.push(`/map?focus=${item.id}`)}
          />
        )}
      />

      {/* Filter bottom sheet — native swipe-to-dismiss */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
        <View style={{ gap: 16, paddingBottom: 12 }}>
          <View>
            <Text style={{ color: color.text, fontSize: 13, fontWeight: "700", marginBottom: 8 }}>Status</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <FilterPill key={s.key} label={s.label} active={status === s.key} onPress={() => setStatus(s.key)} />
              ))}
            </View>
          </View>
          <View>
            <Text style={{ color: color.text, fontSize: 13, fontWeight: "700", marginBottom: 8 }}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <FilterPill label="Everything" active={cat === null} onPress={() => setCat(null)} />
              {CATEGORY_KEYS.map((k) => (
                <FilterPill key={k} label={CATEGORIES[k].label} tint={CATEGORIES[k].color} active={cat === k} onPress={() => setCat(cat === k ? null : k)} />
              ))}
            </View>
          </View>
          <View>
            <Text style={{ color: color.text, fontSize: 13, fontWeight: "700", marginBottom: 8 }}>Island</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <FilterPill label="Every island" active={island === null} onPress={() => setIsland(null)} />
              {PARISHES.slice(0, 12).map((p) => (
                <FilterPill key={p} label={p} active={island === p} onPress={() => setIsland(island === p ? null : p)} />
              ))}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Button label="Clear" kind="ghost" onPress={() => { setCat(null); setIsland(null); setStatus("active"); setSheetOpen(false); }} style={{ flex: 1 } as any} />
            <Button label="Apply" onPress={() => setSheetOpen(false)} style={{ flex: 1 } as any} />
          </View>
        </View>
      </BottomSheet>
    </GridBackground>
  );
}
