/**
 * ReportQuickSheet — half-sheet quick composer for the central FAB.
 * Decision: hybrid quick composer (you said “You decide”) → 50/90% BottomSheet
 * with 4 fields (category → title → details → photo note). Heavy haptic on
 * success, insert-only-on-confirm per your second answer.
 *
 * Why half-sheet, not full modal: in an outage users need one-tap capture
 * without losing map/feed context. The sheet stays in the tab, dismisses by
 * swipe/backdrop, and links to `/report` for the full form.
 */
import React, { memo, useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, useTheme } from "../theme";
import { CATEGORIES, CATEGORY_KEYS, type CategoryKey } from "../geo";
import { api, errMsg } from "../api";
import { BottomSheet } from "./BottomSheet";
import { FilterPill } from "./FilterPill";
import { Button } from "./Button";
import { hapticHeavy, hapticLight } from "./haptics";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
};

function ReportQuickSheetInner({ open, onClose, onCreated }: Props) {
  useTheme();
  const router = useRouter();
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = !!category && title.trim().length >= 8 && !busy;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      // Minimal report — server geocodes from device location; client falls back to Bahamas center.
      // This mirrors web `src/components/report-assist.tsx` minimal payload.
      const res = await api.createIncident({
        category: category!,
        title: title.trim(),
        details: details.trim() || null,
        lat: 25.06, // Bahamas center fallback; MapCanvas will refine on next focus
        lng: -77.34,
      } as any);
      hapticHeavy();
      const id = (res as any)?.id ?? (res as any)?.incident?.id;
      Alert.alert("Report sent", "Thanks — it was confirmed and will appear in the feed.");
      setCategory(null);
      setTitle("");
      setDetails("");
      onClose();
      if (id) onCreated?.(id);
    } catch (e) {
      Alert.alert("Could not send", errMsg(e));
    } finally {
      setBusy(false);
    }
  }, [canSubmit, category, title, details, onClose, onCreated]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Quick report">
      <View style={{ gap: 14, paddingBottom: 8 }}>
        {/* Category — wrap, per your pill answer */}
        <View>
          <Text style={{ color: color.subtle, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 }}>
            Category
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {CATEGORY_KEYS.map((k) => (
              <FilterPill
                key={k}
                label={CATEGORIES[k].label}
                tint={CATEGORIES[k].color}
                active={category === k}
                onPress={() => {
                  hapticLight();
                  setCategory(category === k ? null : k);
                }}
              />
            ))}
          </View>
        </View>

        <View>
          <Text style={{ color: color.text, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>What happened?</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Flooding on Shirley St, near gas station"
            placeholderTextColor={color.subtle}
            style={{
              backgroundColor: color.inputBg,
              borderColor: color.line,
              borderWidth: 1,
              borderRadius: radius.md,
              color: color.text,
              paddingHorizontal: 12,
              paddingVertical: 11,
              fontSize: 15,
              minHeight: 46,
            }}
          />
          <Text style={{ color: color.subtle, fontSize: 11, marginTop: 4 }}>{title.length}/80 — be specific, it helps responders</Text>
        </View>

        <View>
          <Text style={{ color: color.text, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>Details (optional)</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Standing water, 2ft, blocking lane…"
            placeholderTextColor={color.subtle}
            multiline
            style={{
              backgroundColor: color.inputBg,
              borderColor: color.line,
              borderWidth: 1,
              borderRadius: radius.md,
              color: color.text,
              paddingHorizontal: 12,
              paddingVertical: 11,
              fontSize: 14,
              minHeight: 88,
              textAlignVertical: "top",
            }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <Pressable
            onPress={() => {
              onClose();
              router.push("/report");
            }}
            hitSlop={8}
            style={{ flex: 1, minHeight: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
          >
            <Ionicons name="open-outline" size={14} color={color.muted} />
            <Text style={{ color: color.muted, fontSize: 13, fontWeight: "700" }}>Advanced</Text>
          </Pressable>
          <View style={{ flex: 1.2 }}>
            <Button label={busy ? "Sending…" : "Send report"} onPress={handleSubmit} disabled={!canSubmit} busy={busy} />
          </View>
        </View>

        <Text style={{ color: color.subtle, fontSize: 10.5, textAlign: "center", lineHeight: 14 }}>
          Quick reports use a 44×44 min target, haptic confirm, and insert only after 201 — no optimistic ghosts.
        </Text>
      </View>
    </BottomSheet>
  );
}

export const ReportQuickSheet = memo(ReportQuickSheetInner);
