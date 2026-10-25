/**
 * FilterBar — one row of quick filters plus the pinned "Filter & Sort" control.
 *
 * Replaces the old "chip soup": three wrapped pill rows (status + 13 alert
 * types + 12 islands) cost ~544pt on a 390×844 phone, about 84% of the
 * viewport, so the first alert card started below the fold. This bar costs a
 * fixed 44pt and never grows: the exhaustive lists live in <FilterSheet/>.
 *
 * Layout rule: the scroller flexes, the Filter button is pinned outside it, so
 * the primary action is always reachable no matter how long the segments get.
 */
import React, { memo } from "react";
import { Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space, useTheme } from "../theme";
import { hapticLight } from "./haptics";

export type FilterSegment<T extends string> = { key: T; label: string };

const TARGET = 44; // HIG / Material 3 minimum touch target

function Segment<T extends string>({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  useTheme();
  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onPress();
      }}
      hitSlop={{ top: 8, bottom: 8 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={{
        minHeight: TARGET,
        minWidth: TARGET,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? `${color.tide}33` : color.chipBg,
        borderWidth: 1,
        borderColor: active ? color.tide : color.line,
      }}
    >
      <Text
        style={{
          color: active ? color.tideLight : color.muted,
          fontSize: 13.5,
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The one control that opens the sheet. Badge = number of non-default filters. */
function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  useTheme();
  const active = count > 0;
  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onPress();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8 }}
      accessibilityRole="button"
      accessibilityLabel={active ? `Filter and sort, ${count} active` : "Filter and sort"}
      style={{
        minHeight: TARGET,
        minWidth: TARGET,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        backgroundColor: active ? `${color.tide}26` : color.panel2,
        borderWidth: 1,
        borderColor: active ? color.tide : color.line,
      }}
    >
      <Ionicons name="options-outline" size={15} color={active ? color.tideLight : color.muted} />
      <Text style={{ color: active ? color.tideLight : color.muted, fontSize: 13, fontWeight: "700" }}>Filter</Text>
      {active ? (
        <View
          style={{
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 5,
            backgroundColor: color.tide,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: color.bg, fontSize: 11, fontWeight: "800", lineHeight: 14 }}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export const FilterBar = memo(function FilterBar<T extends string>({
  segments,
  value,
  onChange,
  activeCount,
  onOpenFilters,
  summary,
  style,
}: {
  segments: FilterSegment<T>[];
  value: T;
  onChange: (key: T) => void;
  activeCount: number;
  onOpenFilters: () => void;
  summary?: string;
  style?: ViewStyle;
}) {
  useTheme();
  return (
    <View style={[{ gap: space.sm }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ gap: space.sm, paddingRight: space.sm, alignItems: "center" }}
        >
          {segments.map((s) => (
            <Segment key={s.key} label={s.label} active={s.key === value} onPress={() => onChange(s.key)} />
          ))}
        </ScrollView>
        <FilterButton count={activeCount} onPress={onOpenFilters} />
      </View>
      {summary ? (
        <Text style={{ color: color.subtle, fontSize: 12, fontWeight: "600" }} numberOfLines={1}>
          {summary}
        </Text>
      ) : null}
    </View>
  );
});
