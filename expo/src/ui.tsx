import { useState, type ReactNode } from "react";
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
import { color, radius, sevColor } from "./theme";
import type { Badge } from "./api";

export { color };

export function useTopInset() {
  return useSafeAreaInsets().top;
}

export const t = StyleSheet.create({
  // 2026 "Tideglass" type scale: fluid steps, tight display tracking, tabular
  // numerals anywhere a number changes (counts, times, coordinates).
  h1: { color: color.sand, fontSize: 30, fontWeight: "800", lineHeight: 34, letterSpacing: -0.8 },
  h2: { color: color.sand, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  h3: { color: color.sand, fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  body: { color: color.text, fontSize: 15, lineHeight: 22 },
  muted: { color: color.muted, fontSize: 14, lineHeight: 20 },
  subtle: { color: color.subtle, fontSize: 12, fontVariant: ["tabular-nums"] },
  label: { color: color.tideLight, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  error: { color: color.danger500, fontSize: 12.5, lineHeight: 17 },
  ok: { color: color.ok500, fontSize: 12.5, lineHeight: 17 },
});

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return (
    <View
      style={[
        {
          // Solid data surface: numbers and headlines stay legible over anything.
          backgroundColor: color.panel2,
          borderColor: color.line,
          borderWidth: 1,
          borderRadius: radius.xl2,
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
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
        kind === "primary"
          ? {
              shadowColor: color.tide,
              shadowOpacity: 0.4,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }
          : null,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text maxFontSizeMultiplier={1.4} style={{ color: fg, fontWeight: "800", fontSize: 14 }}>
          {label}
        </Text>
      )}
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
        paddingHorizontal: 13,
        paddingVertical: 10,
        minHeight: 44,
        justifyContent: "center",
        borderRadius: radius.pill,
        backgroundColor: active ? `${c}33` : "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: active ? c : "transparent",
        marginRight: 6,
        marginBottom: 6,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {tint ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} /> : null}
        <Text maxFontSizeMultiplier={1.4} style={{ color: active ? c : color.muted, fontSize: 12.5, fontWeight: "700" }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function Field({ label, style, ...rest }: { label: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={t.label}>{label}</Text>
      <TextInput
        accessibilityLabel={rest.accessibilityLabel ?? label}
        placeholderTextColor={color.subtle}
        autoCapitalize="none"
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
        style={[
          {
            marginTop: 5,
            backgroundColor: "rgba(3,18,27,0.7)",
            borderColor: focused ? color.tide400 : color.line,
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
      <View
        accessible
        accessibilityLabel={`Category: ${meta.label}`}
        style={{ backgroundColor: `${meta.color}26`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }}
      >
        <Text maxFontSizeMultiplier={1.3} style={{ color: meta.color, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6 }}>
          {meta.label.toUpperCase()}
        </Text>
      </View>
      {severity ? (
        <View style={{ flexDirection: "row", gap: 2 }} accessibilityLabel={`Severity ${Math.min(Math.max(severity, 1), 5)} of 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= Math.min(Math.max(severity, 1), 5) ? sevColor(severity) : "rgba(255,255,255,0.12)",
              }}
            />
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
      <Text style={{ color: tint, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.5 }}>
        {desk ? "✓ NOWBEY DESK" : "✓ VERIFIED REPORTER"}
      </Text>
    </View>
  );
}

