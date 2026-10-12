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
