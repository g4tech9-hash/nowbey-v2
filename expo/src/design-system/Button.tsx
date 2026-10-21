/**
 * Button — Pulse button system
 * Web parity: .nb-btn / .pulse-btn → min-height 44/46, pill radius, spring scale
 * Variants: primary (teal glow), ghost, secondary, danger, sm
 */
import React, { memo, useCallback } from "react";
import { Pressable, Text, ActivityIndicator, type ViewStyle, type TextStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { color, radius, useTheme } from "../theme";
import { hapticLight } from "./haptics";

type Kind = "primary" | "ghost" | "secondary" | "danger" | "outline";
type Size = "default" | "sm";

type Props = {
  label: string;
  onPress: () => void;
  kind?: Kind;
  size?: Size;
  disabled?: boolean;
  busy?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
};

function ButtonInner({
  label,
  onPress,
  kind = "primary",
  size = "default",
  disabled,
  busy,
  icon,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: Props) {
  useTheme();
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    if (disabled || busy) return;
    hapticLight();
    onPress();
  }, [disabled, busy, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPrimary = kind === "primary";
  const isGhost = kind === "ghost";
  const isDanger = kind === "danger";

  const containerStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: size === "sm" ? 36 : isPrimary ? 46 : 44,
    paddingHorizontal: size === "sm" ? 14 : isPrimary ? 20 : 16,
    paddingVertical: size === "sm" ? 6 : 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: isPrimary ? "transparent" : isDanger ? "rgba(255,127,107,0.45)" : color.line,
    backgroundColor: isPrimary ? color.tide : isGhost ? "transparent" : isDanger ? "rgba(255,127,107,0.16)" : color.panel3,
    opacity: disabled ? 0.4 : 1,
  };

  const primaryShadow: ViewStyle | null = isPrimary
    ? {
        shadowColor: color.tide,
        shadowOpacity: 0.4,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }
    : null;

  const labelStyle: TextStyle = {
    color: isPrimary ? color.bg : isDanger ? color.conch : isGhost ? color.muted : color.text,
    fontSize: size === "sm" ? 12.5 : 14,
    fontWeight: isPrimary ? "800" : "700",
    letterSpacing: -0.2,
    textAlign: "center",
    ...(textStyle ?? {}),
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled, busy: !!busy }}
        onPress={handlePress}
        onPressIn={() => (scale.value = withSpring(0.94, { damping: 18, stiffness: 320 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 18, stiffness: 320 }))}
        disabled={disabled || busy}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={({ pressed }) => [containerStyle, primaryShadow, pressed && !disabled ? { opacity: 0.88 } : null, style]}
      >
        {busy ? (
          <ActivityIndicator
            size="small"
            color={isPrimary ? color.bg : isDanger ? color.conch : color.text}
          />
        ) : (
          <>
            {icon}
            <Text style={labelStyle}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export const Button = memo(ButtonInner);
export const Btn = Button; // alias for migration

// Preset shorthands matching web utility classes
export const PrimaryButton = (p: Omit<Props, "kind">) => <Button kind="primary" {...p} />;
export const GhostButton = (p: Omit<Props, "kind">) => <Button kind="ghost" {...p} />;
export const SecondaryButton = (p: Omit<Props, "kind">) => <Button kind="secondary" {...p} />;
