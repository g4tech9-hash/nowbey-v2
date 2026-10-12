import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { categoryOf } from "./geo";
import { color, radius } from "./theme";
import type { Badge } from "./api";

export function useTopInset() {
  return useSafeAreaInsets().top;
}

export const t = StyleSheet.create({
  h1: { color: color.sand, fontSize: 26, fontWeight: "800", lineHeight: 30 },
  h2: { color: color.sand, fontSize: 18, fontWeight: "800" },
  h3: { color: color.sand, fontSize: 15, fontWeight: "700" },
  body: { color: color.text, fontSize: 14, lineHeight: 20 },
  muted: { color: color.muted, fontSize: 13, lineHeight: 18 },
  subtle: { color: color.subtle, fontSize: 12 },
  label: { color: color.tideLight, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  error: { color: color.conchLight, fontSize: 12.5, lineHeight: 17 },
  ok: { color: color.tidePale, fontSize: 12.5, lineHeight: 17 },
});

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return (
    <View
      style={[
        {
          backgroundColor: "rgba(16,57,76,0.45)",
          borderColor: color.line,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: 14,
        },
        accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Btn({
  label,
  onPress,
  kind = "primary",
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "ghost" | "light";
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === "primary" ? color.tide : kind === "light" ? color.sand : "rgba(255,255,255,0.07)";
  const fg = kind === "ghost" ? color.sand : color.bg;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }: any) => [
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingVertical: 12,
          paddingHorizontal: 18,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          borderWidth: kind === "ghost" ? 1 : 0,
          borderColor: color.line,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "800", fontSize: 14 }}>{label}</Text>}
    </Pressable>
  );
}

export function Pill({
  label,
  active,
  tint,
  onPress,
  disabled,
}: {
  label: string;
  active?: boolean;
  tint?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const c = tint ?? color.tideLight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: radius.pill,
        backgroundColor: active ? `${c}33` : "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: active ? c : "transparent",
        marginRight: 6,
        marginBottom: 6,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ color: active ? c : color.muted, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...rest }: { label: string } & TextInputProps) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={t.label}>{label}</Text>
      <TextInput
        placeholderTextColor={color.subtle}
        autoCapitalize="none"
        {...rest}
        style={[
          {
            marginTop: 5,
            backgroundColor: "rgba(3,18,27,0.7)",
            borderColor: color.line,
            borderWidth: 1,
            borderRadius: radius.md,
            color: color.sand,
            paddingHorizontal: 12,
            paddingVertical: 11,
            fontSize: 15,
            minHeight: rest.multiline ? 96 : 46,
            textAlignVertical: rest.multiline ? "top" : "center",
          },
          style,
        ]}
      />
    </View>
  );
}

export function CategoryBadge({ category, severity }: { category: string; severity?: number }) {
  const meta = categoryOf(category);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ backgroundColor: `${meta.color}26`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }}>
        <Text style={{ color: meta.color, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>{meta.label.toUpperCase()}</Text>
      </View>
      {severity ? (
        <View style={{ flexDirection: "row", gap: 2 }} accessibilityLabel={`Severity ${severity} of 4`}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: 4, height: 12, borderRadius: 2, backgroundColor: i <= severity ? meta.color : "rgba(255,255,255,0.14)" }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function BadgeMark({ kind }: { kind?: Badge }) {
  if (!kind) return null;
  const desk = kind === "desk";
  const tint = desk ? color.tidePale : color.conchLight;
  return (
    <View style={{ backgroundColor: `${tint}2a`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill }}>
      <Text style={{ color: tint, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>
        {desk ? "✓ NOWBEY DESK" : "✓ VERIFIED REPORTER"}
      </Text>
    </View>
  );
}

