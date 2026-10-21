/**
 * BottomSheet — native swipe-to-dismiss sheet for filters / map detail cards
 * Wraps @gorhom/bottom-sheet when available; falls back to a simple Modal sheet.
 *
 * Usage:
 * <FilterSheet snapPoints={["50%", "90%"]} onClose={...}>
 *   <FilterPill ... />
 * </FilterSheet>
 */
import React, { memo, useCallback, useRef, useMemo } from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, useTheme } from "../theme";
import { Button } from "./Button";

// Try to load Gorhom sheet
let GorhomSheet: any = null;
let GorhomBackdrop: any = null;
try {
  const lib = require("@gorhom/bottom-sheet");
  GorhomSheet = lib.BottomSheet;
  GorhomBackdrop = lib.BottomSheetBackdrop;
} catch {
  // fallback to Modal sheet below
}

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: string[];
  children: React.ReactNode;
};

// Fallback: centered modal sheet (no native dependency)
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
  useTheme();

  // If Gorhom is available, use it (better gestures, native feel)
  if (GorhomSheet) {
    const sheetRef = useRef<any>(null);
    const snap = useMemo(() => props.snapPoints ?? ["50%", "90%"], [props.snapPoints]);

    const handleClose = useCallback(() => {
      sheetRef.current?.close();
      props.onClose();
    }, [props]);

    const renderBackdrop = useCallback(
      (p: any) => <GorhomBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} pressBehavior="close" />,
      [],
    );

    if (!props.open) return null;
    return (
      <GorhomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snap}
        enablePanDownToClose
        onClose={props.onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: color.panel }}
        handleIndicatorStyle={{ backgroundColor: color.track, width: 36 }}
        style={{ zIndex: 50 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
          {props.title ? (
            <Text style={{ color: color.text, fontSize: 17, fontWeight: "800", marginBottom: 12 }}>{props.title}</Text>
          ) : null}
          {props.children}
        </View>
      </GorhomSheet>
    );
  }

  return <FallbackSheet {...props} />;
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
