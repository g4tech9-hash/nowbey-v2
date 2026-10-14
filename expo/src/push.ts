import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { API_BASE } from "./api";
import { getToken } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL = "default";

/**
 * Registers this Android device for push. Returns "ok" only when the token
 * reached the backend; "skipped" when push cannot run here (web, simulator,
 * permission denied, signed out); "failed" on errors. Never throws.
 */
export async function ensurePushRegistered(): Promise<"ok" | "skipped" | "failed"> {
  try {
    if (Platform.OS !== "android" || !Device.isDevice) return "skipped";
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "General",
      importance: Notifications.AndroidImportance.MAX,
    });
    const { status: existing } = await Notifications.getPermissionsAsync();
    const status = existing === "granted" ? existing : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return "skipped";
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token) return "failed";
    const auth = await getToken();
    if (!auth) return "skipped";
    const res = await fetch(`${API_BASE}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` },
      body: JSON.stringify({ token }),
    });
    return res.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

/** Opens the screen named in the notification's data payload on tap. */
export function watchPushTaps(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const path = (r.notification.request.content.data as { path?: unknown } | undefined)?.path;
    if (typeof path === "string" && path.startsWith("/")) {
      (router.push as (p: string) => void)(path);
    }
  });
  return () => sub.remove();
}
