/**
 * FilterPill — atomic pill component
 * Web parity: .nb-chip / .pulse-chip → min-height 44pt on mobile, pill radius, 750 weight
 * Active state: tinted fill (#tint33 bg, tint border) vs inactive (chipBg, line border)
 * Includes: haptics (light impact), reanimated scale, hitSlop 44x44, accessibility
 */
import React, { memo, useCallback } from "react";
import { Pressable, Text, View, type ViewStyle, type TextStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { color, radius, useTheme } from "../theme";
import { hapticLight } from "./haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  label: string;
  active?: boolean;
  tint?: string; // semantic category color (e.g. "#6fd0ff" for Flooding)
  onPress?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode; // optional leading dot/icon
  style?: ViewStyle;
  testID?: string;
};

function FilterPillInner({ label, active, tint, onPress, disabled, icon, style, testID }: Props) {
  useTheme();
  const c = tint ?? color.tide;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.94, { damping: 18, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    hapticLight();
    onPress?.();
  }, [disabled, onPress]);

  // Geometry: must be 44pt minHeight (mobile spec), pill radius, 1px border
  // Active: bg = tint 20% (hex 33), border = tint solid
  // Inactive: bg = chipBg (rgba), border = line
  const containerStyle: ViewStyle = {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.pill,
    backgroundColor: active ? `${c}33` : color.chipBg,
    borderWidth: 1,
    borderColor: active ? c : color.line,
    marginRight: 8,
    marginBottom: 8,
    opacity: disabled ? 0.45 : 1,
    flexDirection: "row",
    gap: 6,
  };

  const labelStyle: TextStyle = {
    color: active ? c : color.muted,
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 14,
    textAlign: "center",
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ selected: !!active, disabled: !!disabled }}
        accessibilityLabel={label}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        style={({ pressed }) => [containerStyle, pressed && { opacity: disabled ? 0.45 : 0.92 }, style]}
      >
        {/* Leading tint dot — only when tint provided (category pills) */}
        {tint ? (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: c,
              // Active dot glows slightly
              opacity: active ? 1 : 0.85,
            }}
          />
        ) : null}
        {icon ? <View style={{ marginRight: 2 }}>{icon}</View> : null}
        <Text style={labelStyle}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export const FilterPill = memo(FilterPillInner);

/**
 * FilterPillRow — horizontal scroller for pills (web .pulse-pill-row)
 * On mobile: horizontal ScrollView, no wrap, 44px touch targets preserved
 */
import { ScrollView } from "react-native";

export function FilterPillRow({
  children,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      style={style}
      contentContainerStyle={[{ paddingRight: 16, alignItems: "center" }, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}
