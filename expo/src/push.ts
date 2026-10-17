import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { API_BASE } from "./api";
import { getToken } from "./storage";
import { getPushToken, setPushToken } from "./storage";

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
 * What the phone can actually do. This is the honest answer to "are push alerts on?":
 *  - "on"          this device is registered with the server
 *  - "off"         the phone supports push and the person has not switched it on
 *  - "denied"      Android notifications are blocked for NowBey in the phone's settings
 *  - "unsupported" not a phone (emulator/web) — push needs a real device
 *  - "signedout"   no signed-in member, and a device token belongs to a member
 */
export type PushState = "on" | "off" | "denied" | "unsupported" | "signedout";

function supported(): boolean {
  return (Platform.OS === "android" || Platform.OS === "ios") && Device.isDevice;
}

async function permission(): Promise<"granted" | "denied" | "undetermined"> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

async function currentToken(): Promise<string | null> {
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data || null;
}

/** Never throws. Reports what this phone can do right now. */
export async function pushState(): Promise<PushState> {
  try {
    if (!supported()) return "unsupported";
    if (!(await getToken())) return "signedout";
    if ((await permission()) === "granted") return (await getPushToken()) ? "on" : "off";
    return (await permission()) === "denied" ? "denied" : "off";
  } catch {
    return "unsupported";
  }
}

/**
 * Turns push on for this device: ask permission, get an Expo push token, hand it to the server.
 * Returns the state afterwards, so the caller can show exactly what happened.
 */
export async function enablePush(): Promise<PushState> {
  try {
    if (!supported()) return "unsupported";
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "General",
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    if (Platform.OS === "ios") {
      await Notifications.setNotificationCategoryAsync("default", []);
    }
    const asked = await Notifications.requestPermissionsAsync();
    if (asked.status !== "granted") return asked.status === "denied" ? "denied" : "off";

    const auth = await getToken();
    if (!auth) return "signedout";

    const token = await currentToken();
    if (!token) return "off";

    const res = await fetch(`${API_BASE}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}`, "x-nowbey-client": "native" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return "off";
    await setPushToken(token);
    return "on";
  } catch {
    return "off";
  }
}

/**
 * Turns push off for this device: tell the server to forget the token first, then drop it here.
 * If the server cannot be reached the token is kept, so nothing is silently left delivering.
 */
export async function disablePush(): Promise<PushState> {
  try {
    const token = await getPushToken();
    const auth = await getToken();
    if (token && auth) {
      await fetch(`${API_BASE}/api/push/unregister`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}`, "x-nowbey-client": "native" },
        body: JSON.stringify({ token }),
      }).catch(() => undefined);
    }
    await setPushToken(null);
    return "off";
  } catch {
    return "off";
  }
}

/**
 * Signs this device out of push. Called when the member signs out, so the next person to use
 * the phone does not keep receiving the last member's alerts.
 */
export async function releasePushOnSignOut(): Promise<void> {
  try {
    const token = await getPushToken();
    const auth = await getToken();
    if (!token) return;
    if (auth) {
      await fetch(`${API_BASE}/api/push/unregister`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}`, "x-nowbey-client": "native" },
        body: JSON.stringify({ token }),
      }).catch(() => undefined);
    }
    await setPushToken(null);
  } catch {
    /* signing out locally still wins */
  }
}

/**
 * Keeps a device that is already switched on fresh (tokens rotate). It never asks for permission:
 * that prompt belongs to the "Turn on push alerts" button in the You tab.
 * Returns "ok" when the server accepted the token, otherwise the reason it did nothing.
 */
export async function ensurePushRegistered(): Promise<"ok" | "skipped" | "failed"> {
  try {
    if (!supported()) return "skipped";
    if ((await permission()) !== "granted") return "skipped";
    const auth = await getToken();
    if (!auth) return "skipped";
    const token = await currentToken();
    if (!token) return "failed";
    const res = await fetch(`${API_BASE}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}`, "x-nowbey-client": "native" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) await setPushToken(token);
    return res.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

/** The screen a notification points at, when it carries one. */
function pathOf(data: unknown): string | null {
  const path = (data as { path?: unknown } | undefined)?.path;
  return typeof path === "string" && path.startsWith("/") ? path : null;
}

/**
 * Opens the screen named in a notification when it is tapped — including the tap that launched
 * the app from cold, which the running-app listener alone would miss.
 */
export function watchPushTaps(): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    const path = pathOf(response?.notification.request.content.data);
    if (path) (router.push as (p: string) => void)(path);
  };
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  void Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) open(response);
    })
    .catch(() => undefined);
  return () => sub.remove();
}
