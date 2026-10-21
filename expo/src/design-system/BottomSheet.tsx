/**
 * BottomSheet — native swipe-to-dismiss sheet for filters / map detail cards
 *
 * Backed by @gorhom/bottom-sheet (installed) on iOS/Android: real pan gestures,
 * spring snapping to 50%/90%, backdrop press-to-close, keyboard avoidance.
 * On web we keep the Modal fallback — react-native-web has no native gesture
 * handler, so Gorhom's pan resizes instead of tracking the finger, and the
 * web build is the parity reference we measure the native UI against.
 *
 * Usage:
 * <BottomSheet open={open} onClose={close} title="Filters" snapPoints={["50%", "90%"]}>
 *   <FilterPill ... />
 * </BottomSheet>
 */
import React, { memo, useCallback, useMemo, useRef } from "react";
import { Platform, View, Text, Pressable, Modal, ScrollView, StyleSheet, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, useTheme } from "../theme";
import { Button } from "./Button";

// Resolved once at module load — branch can never flip mid-session, so the
// hook order below stays stable (rules of hooks).
const Gorhom: any = (() => {
  try {
    return require("@gorhom/bottom-sheet");
  } catch {
    return null;
  }
})();

const HAS_GORHOM = !!Gorhom?.BottomSheet && Platform.OS !== "web";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: string[];
  children: React.ReactNode;
};

// ── Native: Gorhom sheet ────────────────────────────────────────────────────
function GorhomSheet({ open, onClose, title, snapPoints, children }: Props) {
  useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<any>(null);
  const snap = useMemo(() => snapPoints ?? ["50%", "90%"], [snapPoints]);

  const renderBackdrop = useCallback(
    (p: any) => <Gorhom.BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} pressBehavior="close" />,
    [],
  );

  if (!open) return null;

  const ScrollComp = Gorhom.BottomSheetScrollView ?? ScrollView;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Gorhom.BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snap}
        enablePanDownToClose
        onClose={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: color.panel }}
        handleIndicatorStyle={{ backgroundColor: color.track, width: 36 }}
        // Keep the composer usable while the keyboard is up.
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <ScrollComp
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}
        >
          {title ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ color: color.text, fontSize: 17, fontWeight: "800" }}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4, minHeight: 44, justifyContent: "center" }}>
                <Text style={{ color: color.tideLight, fontSize: 14, fontWeight: "700" }}>Done</Text>
              </Pressable>
            </View>
          ) : null}
          {children}
        </ScrollComp>
      </Gorhom.BottomSheet>
    </View>
  );
}

// ── Web / no-dep fallback: centered modal sheet ─────────────────────────────
function FallbackSheet({ open, onClose, title, children }: Props) {
  useTheme();
  const insets = useSafeAreaInsets();
  if (!open) return null;
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: color.panel,
            borderTopLeftRadius: radius.xl2,
            borderTopRightRadius: radius.xl2,
            maxHeight: "85%",
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderColor: color.line,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 16,
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: "center", paddingBottom: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: color.track }} />
          </View>
          {title ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ color: color.text, fontSize: 17, fontWeight: "800" }}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4 }}>
                <Text style={{ color: color.tideLight, fontSize: 14, fontWeight: "700" }}>Done</Text>
              </Pressable>
            </View>
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BottomSheetInner(props: Props) {
  // Component identity is fixed for the session → hooks stay in order.
  return HAS_GORHOM ? <GorhomSheet {...props} /> : <FallbackSheet {...props} />;
}

export const BottomSheet = memo(BottomSheetInner);

/**
 * FilterBottomSheet — opinionated sheet for the pill filter overlays
 * Shows status + category + island filters in a sheet, with Apply/Clear
 */
export function FilterBottomSheet({
  open,
  onClose,
  onApply,
  onClear,
  children,
  title = "Filters",
}: {
  open: boolean;
  onClose: () => void;
  onApply?: () => void;
  onClear?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  useTheme();
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <View style={{ gap: 16, paddingBottom: 16 }}>
        {children}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          {onClear ? <Button label="Clear" kind="ghost" onPress={onClear} style={{ flex: 1 } as any} /> : null}
          {onApply ? <Button label="Apply" onPress={onApply} style={{ flex: 1 } as any} /> : null}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Gorhom positions itself absolutely inside its parent, so the parent has to
  // be the full screen; box-none lets taps fall through to the map/feed below.
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 20,
  } as ViewStyle,
});
