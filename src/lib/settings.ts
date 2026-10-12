import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { DEFAULT_MODE, DEFAULT_THEME, isModeKey, isThemeKey, type ModeKey, type ThemeKey } from "@/lib/themes";

export type SiteSettings = {
  /** The look in use right now. */
  theme: ThemeKey;
  /** The default brightness for visitors who have not picked one. */
  mode: ModeKey;
  /** Whether the opening splash screen shows. It only ever shows in the Island look. */
  splash: boolean;
  /** What the admin chose for the splash, even while the Classic look hides it. */
  splashPref: boolean;
  /** true when NOWBEY_THEME in the server settings is forcing the look. */
  themeLocked: boolean;
  /** true when NOWBEY_MODE in the server settings is forcing the brightness. */
  modeLocked: boolean;
  /** true when NOWBEY_SPLASH in the server settings is forcing the splash. */
  splashLocked: boolean;
};

type Cache = { at: number; rows: Record<string, string> } | null;
// Kept on globalThis because Next bundles pages and API routes separately. A plain module variable would give
// each its own copy, and saving a setting in the admin route would not refresh what the pages see.
const holder = globalThis as typeof globalThis & { __nowbeySettings?: { value: Cache } };
const store = (holder.__nowbeySettings ??= { value: null });

async function readRows(): Promise<Record<string, string>> {
  if (store.value && Date.now() - store.value.at < 5000) return store.value.rows;
  try {
    const rows = await db.select().from(siteSettings);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    store.value = { at: Date.now(), rows: map };
    return map;
  } catch {
    // The database being briefly unreachable should never take the whole site down.
    return store.value?.rows ?? {};
  }
}

/**
 * Order of precedence: the server setting (NOWBEY_THEME / NOWBEY_SPLASH) wins, then what an admin saved
 * on the Appearance page, then the built-in default. The server setting is the emergency way back to
 * the original look if the admin pages are ever out of reach.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await readRows();

  const envTheme = process.env.NOWBEY_THEME?.trim().toLowerCase();
  const themeLocked = isThemeKey(envTheme);
  const theme: ThemeKey = isThemeKey(envTheme) ? envTheme : isThemeKey(rows.theme) ? rows.theme : DEFAULT_THEME;

  const envMode = process.env.NOWBEY_MODE?.trim().toLowerCase();
  const modeLocked = isModeKey(envMode);
  const mode: ModeKey = isModeKey(envMode) ? envMode : isModeKey(rows.mode) ? rows.mode : DEFAULT_MODE;

  const envSplash = process.env.NOWBEY_SPLASH?.trim().toLowerCase();
  const splashLocked = envSplash === "on" || envSplash === "off";
  const splashPref = splashLocked ? envSplash === "on" : rows.splash !== "off";

  return { theme, mode, splash: theme === "island" && splashPref, splashPref, themeLocked, modeLocked, splashLocked };
}

export async function saveSetting(key: "theme" | "mode" | "splash", value: string, by: string) {
  await db
    .insert(siteSettings)
    .values({ key, value, updatedBy: by })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedBy: by, updatedAt: new Date() } });
  store.value = null;
}
