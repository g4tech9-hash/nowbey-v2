/**
 * FilterSheet — the exhaustive filter and sort controls, in a swipe-dismissable
 * sheet instead of sprawled across the feed.
 *
 * Everything the chip soup used to show is here, and more: all 13 alert types,
 * all 18 islands (the old header silently truncated to 12) with a search field,
 * and sort, which the feed never had at all.
 *
 * Wrapping is correct *in here* — this is a bounded list the user opened on
 * purpose. It was only wrong at the top of a scrolling feed.
 */
import React, { memo, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space, useTheme } from "../theme";
import { CATEGORIES, CATEGORY_KEYS, PARISHES, type CategoryKey } from "../geo";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { FilterPill } from "./FilterPill";
import { hapticLight } from "./haptics";

export type FeedSort = "recent" | "severity" | "confirmations";

export const SORTS: { key: FeedSort; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "severity", label: "Most severe" },
  { key: "confirmations", label: "Most confirmed" },
];

const TARGET = 44;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text
          style={{
            color: color.subtle,
            fontSize: 11.5,
            fontWeight: "800",
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          {title}
        </Text>
        {hint ? <Text style={{ color: color.subtle, fontSize: 11, fontWeight: "600" }}>{hint}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>{children}</View>
    </View>
  );
}

export const FilterSheet = memo(function FilterSheet({
  open,
  onClose,
  cat,
  onCat,
  island,
  onIsland,
  sort,
  onSort,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  cat: CategoryKey | null;
  onCat: (c: CategoryKey | null) => void;
  island: string | null;
  onIsland: (p: string | null) => void;
  sort: FeedSort;
  onSort: (s: FeedSort) => void;
  resultCount: number;
}) {
  useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");

  const islands = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? PARISHES.filter((p) => p.toLowerCase().includes(needle)) : PARISHES;
  }, [q]);

  const activeCount = (cat ? 1 : 0) + (island ? 1 : 0) + (sort !== "recent" ? 1 : 0);

  const clearAll = () => {
    hapticLight();
    onCat(null);
    onIsland(null);
    onSort("recent");
    setQ("");
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Filter & sort" snapPoints={["62%", "92%"]}>
      <View style={{ gap: space.xl, paddingBottom: space.md }}>
        <Section title="Sort">
          {SORTS.map((s) => (
            <FilterPill
              key={s.key}
              label={s.label}
              active={sort === s.key}
              onPress={() => {
                hapticLight();
                onSort(s.key);
              }}
            />
          ))}
        </Section>

        <Section title="Alert type" hint={cat ? "1 selected" : "All types"}>
          <FilterPill label="Everything" active={cat === null} onPress={() => onCat(null)} />
          {CATEGORY_KEYS.map((k) => (
            <FilterPill
              key={k}
              label={CATEGORIES[k].label}
              tint={CATEGORIES[k].color}
              active={cat === k}
              onPress={() => {
                hapticLight();
                onCat(cat === k ? null : k);
              }}
            />
          ))}
        </Section>

        <Section title="Island" hint={q.trim() ? `${islands.length} match` : `${PARISHES.length} islands`}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search islands…"
            placeholderTextColor={color.subtle}
            accessibilityLabel="Search islands"
            style={{
              width: "100%",
              minHeight: TARGET,
              backgroundColor: color.inputBg,
              borderColor: color.line,
              borderWidth: 1,
              borderRadius: radius.md,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: color.text,
              fontSize: 14,
            }}
          />
          <FilterPill label="Every island" active={island === null} onPress={() => onIsland(null)} />
          {islands.map((p) => (
            <FilterPill
              key={p}
              label={p}
              active={island === p}
              onPress={() => {
                hapticLight();
                onIsland(island === p ? null : p);
              }}
            />
          ))}
          {islands.length === 0 ? (
            <Text style={{ color: color.subtle, fontSize: 12, paddingVertical: 8 }}>No island matches “{q}”.</Text>
          ) : null}
        </Section>

        <View style={{ flexDirection: "row", gap: space.sm, paddingTop: space.sm }}>
          <Button
            label={activeCount ? `Clear ${activeCount}` : "Clear"}
            kind="ghost"
            onPress={clearAll}
            style={{ flex: 1 } as any}
          />
          <Button label={`Show ${resultCount} alerts`} onPress={onClose} style={{ flex: 2 } as any} />
        </View>

        <View style={{ height: insets.bottom }} />
      </View>
    </BottomSheet>
  );
});
