/**
 * Haptics — thin wrapper over expo-haptics with graceful fallback
 * All interactive elements call these; if expo-haptics is unavailable (web/CI), they no-op.
 */
let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch {
  // not installed or on web — silent no-op
}

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    /* haptics never break the UI */
  }
}

export function hapticLight() {
  if (!Haptics?.impactAsync) return;
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  if (!Haptics?.impactAsync) return;
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticHeavy() {
  if (!Haptics?.impactAsync) return;
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

export function hapticSuccess() {
  if (!Haptics?.notificationAsync) return;
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticWarning() {
  if (!Haptics?.notificationAsync) return;
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function hapticSelection() {
  if (!Haptics?.selectionAsync) return;
  safe(() => Haptics.selectionAsync());
}
