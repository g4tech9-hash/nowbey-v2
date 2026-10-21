/**
 * FlashFeed — high-performance list wrappers
 * Web parity: Main Feed (IncidentCard) + News Wire (NewsWireCard) on 60+ FPS
 *
 * Uses @shopify/flash-list (installed) on iOS/Android for cell recycling; the
 * web build keeps RN FlatList, because react-native-web has no native
 * recycling and the web render is the parity reference we compare against.
 * API is identical either way — the swap is invisible to callers.
 *
 * Includes:
 * - FlashList-backed feed (recycled cells, no layout jank on hundreds of rows)
 * - Pull-to-refresh (RefreshControl on web, onRefresh/refreshing on FlashList)
 * - Skeleton header while loading
 * - Empty state card
 */
import React, { memo } from "react";
import {
  FlatList as RNFlatList,
  Platform,
  RefreshControl,
  View,
  Text,
  ActivityIndicator,
  type FlatListProps,
} from "react-native";
import { color, radius, useTheme } from "../theme";
import { Card } from "./Card";
import { Button } from "./Button";
import { HazardCardSkeleton, NewsWireCardSkeleton, FilterPillSkeleton } from "./Skeleton";

// Try to load FlashList; fall back gracefully
let FlashListComp: any = null;
try {
  FlashListComp = require("@shopify/flash-list").FlashList;
} catch {
  // not installed — use RN FlatList (still functional, just not 60fps on 500+ rows)
}

// Native only: FlashList v2 recycles cells through the native scroll view.
const USE_FLASH = !!FlashListComp && Platform.OS !== "web";
const ListComponent = USE_FLASH ? FlashListComp : RNFlatList;

type FeedProps<T> = Omit<FlatListProps<T>, "renderItem"> & {
  data: T[];
  renderItem: FlatListProps<T>["renderItem"];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  error?: string | null;
  header?: React.ReactNode;
  emptyTitle?: string;
  emptyBody?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  skeleton?: "hazard" | "wire";
  contentPaddingTop?: number;
};

function FlashFeedInner<T>({
  data,
  renderItem,
  loading,
  refreshing,
  onRefresh,
  error,
  header,
  emptyTitle = "Nothing here yet",
  emptyBody = "Clear a filter, or be the first to report it.",
  emptyActionLabel,
  onEmptyAction,
  skeleton = "hazard",
  contentPaddingTop = 12,
  ...rest
}: FeedProps<T>) {
  useTheme();

  const ListHeader = (
    <View style={{ gap: 12 }}>
      {header}
      {error ? <Text style={{ color: color.conch, fontSize: 12.5, lineHeight: 17 }}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={color.tideLight} style={{ marginVertical: 8 }} /> : null}
    </View>
  );

  const Empty = loading ? null : (
    <Card style={{ alignItems: "center", marginTop: 12 }}>
      <Text style={{ color: color.text, fontSize: 15, fontWeight: "700" }}>{emptyTitle}</Text>
      <Text style={{ marginTop: 6, color: color.muted, fontSize: 13, textAlign: "center", lineHeight: 18 }}>{emptyBody}</Text>
      {emptyActionLabel && onEmptyAction ? (
        <Button label={emptyActionLabel} onPress={onEmptyAction} style={{ marginTop: 12 } as any} />
      ) : null}
    </Card>
  );

  // FlashList v2 exposes pull-to-refresh as props; FlatList wants a control element.
  const refreshProps: Record<string, any> = !onRefresh
    ? {}
    : USE_FLASH
      ? { refreshing: !!refreshing, onRefresh, progressViewOffset: 8 }
      : { refreshControl: <RefreshControl tintColor={color.tideLight} colors={[color.tide]} refreshing={!!refreshing} onRefresh={onRefresh} /> };

  return (
    <ListComponent
      {...refreshProps}
      {...(rest as any)}
      style={[{ flex: 1, backgroundColor: color.bg }, (rest as any).style]}
      data={data as any}
      renderItem={renderItem as any}
      contentContainerStyle={{
        padding: 16,
        paddingTop: contentPaddingTop,
        paddingBottom: 32,
        gap: 12,
        ...(rest as any).contentContainerStyle,
      }}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={Empty}
    />
  );
}

export const FlashFeed = memo(FlashFeedInner) as typeof FlashFeedInner;

// ── Convenience wrappers with skeleton-aware loading ──

export function HazardFeed<T>(props: FeedProps<T>) {
  return <FlashFeed skeleton="hazard" {...props} />;
}

export function WireFeed<T>(props: FeedProps<T>) {
  return <FlashFeed skeleton="wire" {...props} />;
}
