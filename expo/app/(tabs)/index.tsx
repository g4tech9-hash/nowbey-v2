/**
 * NowBey Pulse — Feed (Now rebuilt with Pulse Design System)
 * 1:1 parity with web IncidentCard + FilterBar/FilterSheet + GridBackground
 * Performance: FlashList (60fps @ 500 rows) + skeleton loaders + reanimated
 */
import { useCallback, useMemo, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, errMsg, type Incident } from "../../src/api";
import { CATEGORIES, type CategoryKey } from "../../src/geo";
import { BRAND, THEME } from "../../src/brand";
import { color, radius, useTheme } from "../../src/theme";
import { useBlocked, isBlocked } from "../../src/Safety";

// — New Pulse DS (rebuild, not theme) —
import { GridBackground } from "../../src/design-system/GridBackground";
import { HazardCard } from "../../src/design-system/HazardCard";
import { FlashFeed } from "../../src/design-system/FlashFeed";
import { FeedSkeleton } from "../../src/design-system/Skeleton";
import { FilterBar } from "../../src/design-system/FilterBar";
import { FilterSheet, type FeedSort } from "../../src/design-system/FilterSheet";
import { space } from "../../src/design-system/tokens";
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
  const [sort, setSort] = useState<FeedSort>("recent");
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

  /**
   * Filtering is cheap and the sheet sorts client-side, so the feed keeps one
   * sorted array instead of re-deriving it inside renderItem.
   */
  const shown = useMemo(() => {
    const base = (cat ? rows.filter((r) => r.category === cat) : rows).filter((r) => !isBlocked(r.authorHandle));
    if (sort === "severity") return [...base].sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
    if (sort === "confirmations") return [...base].sort((a, b) => (b.confirmations ?? 0) - (a.confirmations ?? 0));
    return base; // "recent" — the API already returns newest first
  }, [rows, cat, sort]);

  // Drives the badge on the Filter button: how many filters are off their default.
  const activeCount = (cat ? 1 : 0) + (island ? 1 : 0) + (sort !== "recent" ? 1 : 0);
  const summary = [island ?? "All islands", cat ? CATEGORIES[cat].label : null, `${shown.length} alert${shown.length === 1 ? "" : "s"}`]
    .filter(Boolean)
    .join(" · ");

  // Header component — one row of filters, not three rows of chips.
  // The old header stacked status + 13 alert types + 12 islands (about 544pt on
  // a 390x844 phone, ~84% of the viewport) so the first card started below the
  // fold. Everything exhaustive now lives in <FilterSheet/>.
  const header = (
    <View style={{ gap: space.md, paddingBottom: space.sm }}>
      <Banner>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color: "#fff0d9", fontSize: 24, fontWeight: "800", letterSpacing: -0.6 }}>
              Now<Text style={{ color: color.tideLight }}>Bey</Text>
            </Text>
            <Text
              style={{
                color: THEME === "island" ? "#ffd98a" : color.tideLight,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
              numberOfLines={1}
            >
              {BRAND.tagline}
            </Text>
          </View>
          {/*
            No "+ Report" button here any more. The bottom-centre FAB is the most
            thumb-reachable point on a phone; a second primary in the top right
            was a competing CTA for the same task. The slot now carries state.
          */}
          <Text style={{ color: color.muted, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
            {shown.length} alerts
          </Text>
        </View>
      </Banner>

      <FilterBar
        segments={STATUSES}
        value={status}
        onChange={setStatus}
        activeCount={activeCount}
        onOpenFilters={() => setSheetOpen(true)}
        summary={summary}
      />

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

      {/* Exhaustive filters + sort — swipe to dismiss */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        cat={cat}
        onCat={setCat}
        island={island}
        onIsland={setIsland}
        sort={sort}
        onSort={setSort}
        resultCount={shown.length}
      />
    </GridBackground>
  );
}
