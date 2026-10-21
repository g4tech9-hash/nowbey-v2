/**
 * SafeScreen — wraps content with SafeArea + GridBackground + status bar
 * Handles iOS Dynamic Island / notch + Android navigation bar
 * Use for every top-level screen so UI never overlaps hardware.
 */
import React from "react";
import { View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, color } from "../theme";
import { GridBackground } from "./GridBackground";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  grid?: "full" | "subtle" | "none";
  noPadding?: boolean;
};

export function SafeScreen({ children, style, grid = "full", noPadding }: Props) {
  useTheme();
  const insets = useSafeAreaInsets();
  return (
    <GridBackground variant={grid} style={{ flex: 1 }}>
      <View
        style={[
          {
            flex: 1,
            paddingTop: noPadding ? 0 : insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
          style,
        ]}
      >
        {children}
      </View>
    </GridBackground>
  );
}

export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  return insets.top;
}
