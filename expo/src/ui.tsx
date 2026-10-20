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
import { color, radius, sevColor, getScheme, useTheme, THEMES, type Palette, type Scheme } from "./theme";
import type { Badge } from "./api";

export { color, useTheme };

export function useTopInset() {
  return useSafeAreaInsets().top;
}

function buildT(p: Palette) {
  // 2026 "Tideglass" type scale: fluid steps, tight display tracking, tabular
  // numerals anywhere a number changes (counts, times, coordinates).
  return StyleSheet.create({
    h1: { color: p.sand, fontSize: 30, fontWeight: "800", lineHeight: 34, letterSpacing: -0.8 },
    h2: { color: p.sand, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
    h3: { color: p.sand, fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
    body: { color: p.text, fontSize: 15, lineHeight: 22 },
    muted: { color: p.muted, fontSize: 14, lineHeight: 20 },
    subtle: { color: p.subtle, fontSize: 12, fontVariant: ["tabular-nums"] },
    label: { color: p.tideLight, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
    error: { color: p.danger500, fontSize: 12.5, lineHeight: 17 },
    ok: { color: p.ok500, fontSize: 12.5, lineHeight: 17 },
  });
}

type TShape = ReturnType<typeof buildT>;
const tCache: Partial<Record<Scheme, TShape>> = {};
const tFor = (scheme: Scheme): TShape => (tCache[scheme] ??= buildT(THEMES[scheme]));

/** Live type styles — resolve against the current scheme at read time, like `color`. */
export const t: TShape = new Proxy({} as TShape, {
  get: (_target, key: string) => tFor(getScheme())[key as keyof TShape],
});

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  useTheme(); // repaint with the scheme
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
  useTheme(); // repaint with the scheme
  const bg = kind === "primary" ? color.tide : kind === "light" ? color.sand : color.ghostBg;
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
          // Web .nb-btn is 44px; .nb-btn-primary is 46px (components.css).
          minHeight: kind === "primary" ? 46 : 44,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          borderWidth: kind === "ghost" ? 1 : 0,
          borderColor: color.line,
          transform: [{ scale: pressed && !disabled ? 0.92 : 1 }], // web .nb-btn:active
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
  useTheme(); // repaint with the scheme
  // Geometry mirrors the web .nb-chip (src/styles/pulse/components.css): 44px
  // touch target on mobile, 1px border, pill radius, xs/750 label.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={({ pressed }: { pressed: boolean }) => ({
        paddingHorizontal: 13,
        paddingVertical: 7,
        minHeight: 44,
        justifyContent: "center",
        borderRadius: radius.pill,
        backgroundColor: active ? `${c}33` : color.chipBg,
        borderWidth: 1,
        borderColor: active ? c : color.line,
        marginRight: 6,
        marginBottom: 6,
        opacity: disabled ? 0.45 : 1,
        transform: [{ scale: pressed && !disabled ? 0.94 : 1 }], // web .nb-chip:active
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {tint ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} /> : null}
        <Text style={{ color: active ? c : color.muted, fontSize: 12, fontWeight: "700" }}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function Field({ label, style, ...rest }: { label: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  useTheme(); // repaint with the scheme
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={t.label}>{label}</Text>
      <TextInput
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
            backgroundColor: color.inputBg,
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
  useTheme(); // repaint with the scheme (category hues and sev dots are per-theme)
  const meta = categoryOf(category);
  // One 4-level scale. A stored 5 is retired data (the web maps it to "Not
  // rated"), so it shows no dots rather than inventing a fifth step.
  const level = severity && severity >= 1 && severity <= 4 ? severity : null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ backgroundColor: `${meta.color}26`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }}>
        <Text style={{ color: meta.color, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6 }}>{meta.label.toUpperCase()}</Text>
      </View>
      {level ? (
        <View style={{ flexDirection: "row", gap: 2 }} accessibilityLabel={`Severity ${level} of 4`}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= level ? sevColor(level) : color.track,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function BadgeMark({ kind }: { kind?: Badge }) {
  useTheme(); // repaint with the scheme (must run before any early return)
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

