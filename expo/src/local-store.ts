import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { chunkKey, fromChunks, manifestKey, toChunks } from "./chunk";

/**
 * A tiny key/value store for things that are too big for one SecureStore entry: the report draft and the send
 * queue. The token and other small secrets stay on `storage.ts` — this file is for content.
 *
 * On the web build it uses localStorage, matching `storage.ts`, so the same code runs in Expo web.
 */

async function readRaw(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeRaw(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return;
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      return;
    }
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    /* Storage failing is not worth crashing a report over. The caller keeps its in-memory copy. */
  }
}

export async function readLarge(key: string): Promise<string | null> {
  const count = Number(await readRaw(manifestKey(key)));
  if (!Number.isFinite(count) || count <= 0) return null;

  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await readRaw(chunkKey(key, i));
    // A missing chunk means a torn write: better to report "nothing saved" than to hand back half a report.
    if (part === null) return null;
    parts.push(part);
  }
  return fromChunks(parts);
}

export async function writeLarge(key: string, value: string | null): Promise<void> {
  const previous = Number(await readRaw(manifestKey(key)));
  const parts = value === null ? [] : toChunks(value);

  // Write the pieces first, the manifest last: a crash mid-write leaves the old manifest pointing at a
  // mixture of old and new pieces, so drop it before the first write instead.
  await writeRaw(manifestKey(key), null);
  for (let i = 0; i < parts.length; i += 1) await writeRaw(chunkKey(key, i), parts[i]);
  if (parts.length > 0) await writeRaw(manifestKey(key), String(parts.length));

  // Clear pieces left over from a longer previous value.
  if (Number.isFinite(previous)) {
    for (let i = parts.length; i < previous; i += 1) await writeRaw(chunkKey(key, i), null);
  }
}

export async function readJson<T>(key: string): Promise<T | null> {
  const raw = await readLarge(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await writeLarge(key, value === null ? null : JSON.stringify(value));
}
