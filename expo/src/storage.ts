import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "nowbey_token";
const SERVER_KEY = "nowbey_server";
const BLOCKED_KEY = "nowbey_blocked";

/** The sign-in token lives in the phone's secure storage (or localStorage on the web). */
export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") return;
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}

/** The website address the person typed into the app (kept so they only enter it once). */
export async function getServer(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return typeof localStorage === "undefined" ? null : localStorage.getItem(SERVER_KEY);
    return await SecureStore.getItemAsync(SERVER_KEY);
  } catch {
    return null;
  }
}

export async function setServer(url: string | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return;
      if (url) localStorage.setItem(SERVER_KEY, url);
      else localStorage.removeItem(SERVER_KEY);
      return;
    }
    if (url) await SecureStore.setItemAsync(SERVER_KEY, url);
    else await SecureStore.deleteItemAsync(SERVER_KEY);
  } catch {
    /* not saving is harmless */
  }
}

const PUSH_KEY = "nowbey_push_token";
const THEME_KEY = "nowbey_theme_mode";

/**
 * The Expo push token this device registered with the server, so the app can (a) show whether
 * push is on and (b) hand the token back when it is switched off or the member signs out.
 * A push token is not a credential: it only lets a server send to this device.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return typeof localStorage === "undefined" ? null : localStorage.getItem(PUSH_KEY);
    return await SecureStore.getItemAsync(PUSH_KEY);
  } catch {
    return null;
  }
}

export async function setPushToken(token: string | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return;
      if (token) localStorage.setItem(PUSH_KEY, token);
      else localStorage.removeItem(PUSH_KEY);
      return;
    }
    if (token) await SecureStore.setItemAsync(PUSH_KEY, token);
    else await SecureStore.deleteItemAsync(PUSH_KEY);
  } catch {
    /* not saving is harmless */
  }
}

/** Handles this person has blocked, kept on the phone. */
export async function getBlocked(): Promise<string[]> {
  try {
    const raw = Platform.OS === "web" ? (typeof localStorage === "undefined" ? null : localStorage.getItem(BLOCKED_KEY)) : await SecureStore.getItemAsync(BLOCKED_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function setBlocked(list: string[]): Promise<void> {
  try {
    const raw = JSON.stringify(list);
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(BLOCKED_KEY, raw);
      return;
    }
    await SecureStore.setItemAsync(BLOCKED_KEY, raw);
  } catch {
    /* not saving is harmless */
  }
}

/** The saved appearance ("dark" | "light" | "system"), kept so the app opens in the chosen theme. */
export async function getThemeMode(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return typeof localStorage === "undefined" ? null : localStorage.getItem(THEME_KEY);
    return await SecureStore.getItemAsync(THEME_KEY);
  } catch {
    return null;
  }
}

export async function setThemeMode(mode: string | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return;
      if (mode) localStorage.setItem(THEME_KEY, mode);
      else localStorage.removeItem(THEME_KEY);
      return;
    }
    if (mode) await SecureStore.setItemAsync(THEME_KEY, mode);
    else await SecureStore.deleteItemAsync(THEME_KEY);
  } catch {
    /* not saving is harmless */
  }
}
