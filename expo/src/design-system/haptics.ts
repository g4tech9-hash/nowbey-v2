/**
 * Haptics — thin wrapper over expo-haptics (installed as a real dependency).
 *
 * Every interactive element calls these:
 *  - light   → filter pills, switches, chip toggles
 *  - medium  → tab presses, FAB open
 *  - heavy   → report submitted / destructive confirm
 *  - success / warning → server round-trips
 *  - selection → scroll-wheel style pickers
 *
 * On web, expo-haptics degrades to navigator.vibrate (and the iOS switch
 * trick), so the same calls stay meaningful in a mobile browser. Every call is
 * wrapped so a device without a Taptic engine can never break the UI.
 */
import * as Haptics from "expo-haptics";

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    /* haptics never break the UI */
  }
}

export function hapticLight() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticHeavy() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

export function hapticSuccess() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticWarning() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function hapticSelection() {
  safe(() => Haptics.selectionAsync());
}
