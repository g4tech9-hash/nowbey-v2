import Constants from "expo-constants";
import { addBreadcrumb, reportAppError } from "./errorReporting";

/*
 * OTA updates (expo-updates), and the honest answer to "did the update land?".
 *
 * Three facts decide whether an update can ever reach a phone, and none of them is in this file:
 *   * `app.json` → `extra.eas.projectId` + `updates.url` — where updates are fetched from. Both are
 *     one fact with `owner` and move together (`docs/EAS_ACCOUNT_RELINK.md`); while they are null
 *     the project is not linked and `enabled` below is false.
 *   * `eas.json` → `build.<profile>.channel` — which branch this install listens to. A build with no
 *     channel never asks for anything, so `eas update` succeeds and nothing ever arrives.
 *   * `app.json` → `runtimeVersion.policy: appVersion` — an update is only offered to a build whose
 *     runtime version matches, which is what keeps a native-only change from being pushed OTA.
 *
 * `checkAutomatically` is ON_ERROR_RECOVERY, not the ON_LOAD default: this app draws its own splash
 * (src/Splash.tsx) over the root view, so a native reload on load lands mid-animation and an
 * otherwise successful update looks like a broken splash. Reloads here happen in one place,
 * `installUpdateOnLaunch`, which the root layout calls only after the splash has finished.
 *
 * Nothing in this module may crash the app it is updating: expo-updates has no native side in Expo
 * Go, in a dev build or on web, and every entry point answers instead of throwing.
 */

/** The parts of expo-updates this app uses. Narrowed by hand so the import can stay optional. */
type UpdatesModule = {
  isEnabled?: boolean;
  channel?: string | null;
  runtimeVersion?: string | null;
  updateId?: string | null;
  isEmbeddedLaunch?: boolean;
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean; id?: string | null; manifest?: unknown }>;
  fetchUpdateAsync: () => Promise<{ isNew: boolean; manifest?: unknown }>;
  reloadAsync: () => Promise<void>;
};

/**
 * The id of the update currently running, and whether it is the one inside the binary.
 * `Updates.updateId` is the current source; `Constants.manifest2` is the fallback that works on
 * older expo-updates, and both are null in Expo Go / a dev build. Deliberately not
 * `Updates.useUpdateInfo()` — that is a React hook, and this module is read from plain functions.
 */
function runningUpdate(): { id: string | null; embedded: boolean } {
  const manifestId = (Constants.manifest2 as { id?: unknown } | null | undefined)?.id;
  const id = typeof manifestId === "string" ? manifestId : null;
  return { id, embedded: !id };
}

let modPromise: Promise<UpdatesModule | null> | null = null;

/**
 * Whether this build has somewhere real to fetch updates from.
 *
 * `isEnabled` on its own is not enough. It mirrors the manifest's ENABLED flag, which config-plugins
 * computes as `(updates.url ?? null) !== null` — so a literal `"url": null` in app.json, which
 * @expo/config resolves to `{}`, produces `ENABLED="true"` alongside
 * `EXPO_UPDATE_URL="[object Object]"` (verified by running `expo prebuild` and reading the manifest).
 * Such a build reports OTA as live and can never receive an update, so the URL is checked too before
 * this module tells the You tab that updates work here.
 */
function hasUsableUpdateUrl(): boolean {
  const url = (Constants.expoConfig?.updates as { url?: unknown } | undefined)?.url;
  return typeof url === "string" && /^https?:\/\/\S+$/.test(url.trim());
}

/**
 * The updates module, or null when OTA is not live for this build — Expo Go, a dev build, web, or an
 * unlinked `app.json`. Resolved once; a failed resolution is remembered so a phone with no signal
 * does not retry the dynamic import on every render.
 */
function updates(): Promise<UpdatesModule | null> {
  if (!modPromise) {
    modPromise = import("expo-updates")
      .then((m) => {
        const mod = m as unknown as UpdatesModule;
        return mod?.isEnabled && hasUsableUpdateUrl() ? mod : null;
      })
      .catch(() => null);
  }
  return modPromise;
}

/** What a build is running, in the form the You tab shows and an OTA test reads. */
export type UpdateFacts = {
  /** OTA can run at all: a release build, a linked project, a channel. */
  enabled: boolean;
  /** The runtime version an update must be published for to reach this build. */
  runtimeVersion: string | null;
  /** The branch this install listens to, when the build was made with one. */
  channel: string | null;
  /** The update currently running: its id, or "embedded" for the bundle inside the APK/IPA. */
  updateId: string | null;
  /** True while the build is running the JS that shipped inside it, i.e. no update has applied. */
  embedded: boolean;
  /** Native version the update was published for — proves OTA moved JS only, never the binary. */
  publishedFor: string | null;
  /** The installed binary's own version, which no OTA update can change. */
  nativeAppVersion: string | null;
};

const channelFromConfig = (): string | null => {
  const headers = (Constants.expoConfig?.updates as { requestHeaders?: Record<string, string> } | undefined)?.requestHeaders;
  const name = headers?.["expo-channel-name"];
  return typeof name === "string" && name.trim() ? name.trim() : null;
};

/**
 * The runtime version this build answers to, resolved the way @expo/config-plugins resolves it at
 * build time. `Constants.expoConfig.runtimeVersion` is the *raw* config value, and this app pins the
 * `appVersion` policy — so it is the object `{ policy: "appVersion" }`, not a version string.
 *
 * Only `appVersion` is resolvable from JS; `nativeVersion` needs the generated versionCode,
 * `sdkVersion` needs the SDK table and `fingerprint` is computed during the build. Those answer null
 * rather than a guess, because a wrong runtime version on screen sends whoever is debugging an OTA
 * failure to the wrong `eas update --runtime-version` entirely. The native module's own
 * `runtimeVersion` is authoritative and is preferred whenever OTA is live.
 */
function runtimeVersionFromConfig(): string | null {
  const raw = Constants.expoConfig?.runtimeVersion as string | { policy?: string } | null | undefined;
  if (typeof raw === "string") return raw.trim() || null;
  if (raw?.policy === "appVersion") {
    const version = Constants.expoConfig?.android?.version ?? Constants.expoConfig?.version;
    return typeof version === "string" && version.trim() ? version.trim() : null;
  }
  return null;
}

/** Never throws. Reads what this build is running, with or without the native module. */
export async function updateFacts(): Promise<UpdateFacts> {
  const nativeAppVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null;
  const offline: UpdateFacts = {
    enabled: false,
    runtimeVersion: runtimeVersionFromConfig(),
    channel: channelFromConfig(),
    updateId: null,
    embedded: true,
    publishedFor: null,
    nativeAppVersion,
  };
  try {
    const mod = await updates();
    if (!mod) return offline;
    const running = runningUpdate();
    let publishedFor: string | null = null;
    try {
      // Only a check can tell us the runtime version an update was published for, and asking is free
      // on a build that is already up to date — but it must never be the reason this read fails.
      const check = await mod.checkForUpdateAsync();
      const fromManifest = (check?.manifest as { metadata?: { runtimeVersion?: unknown } } | undefined)?.metadata?.runtimeVersion;
      publishedFor = typeof fromManifest === "string" ? fromManifest : null;
    } catch {
      publishedFor = null;
    }
    return {
      enabled: true,
      runtimeVersion: mod.runtimeVersion ?? runtimeVersionFromConfig(),
      channel: mod.channel ?? channelFromConfig(),
      updateId: mod.updateId ?? running.id,
      embedded: mod.isEmbeddedLaunch ?? running.embedded,
      publishedFor,
      nativeAppVersion,
    };
  } catch {
    return offline;
  }
}

/** What a manual check ended in. "unavailable" means OTA cannot run on this build, not "up to date". */
export type CheckOutcome =
  | { outcome: "uptodate"; updateId: string | null }
  | { outcome: "applied"; updateId: string | null }
  | { outcome: "unavailable" }
  | { outcome: "failed"; message: string };

const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e ?? "unknown error"));

/**
 * Ask, download and restart into the new bundle in one step. This is the "Check for update" button:
 * an OTA test wants the update running now, not on the next launch. `reloadAsync` does not return,
 * so the promise settles only when there was nothing to apply or something went wrong.
 */
export async function checkAndApplyUpdate(): Promise<CheckOutcome> {
  try {
    const mod = await updates();
    if (!mod) return { outcome: "unavailable" };
    const check = await mod.checkForUpdateAsync();
    if (!check?.isAvailable) {
      return { outcome: "uptodate", updateId: mod.updateId ?? runningUpdate().id };
    }
    addBreadcrumb("ota", `update available ${check.id ?? "(no id)"}`);
    await mod.fetchUpdateAsync();
    await mod.reloadAsync();
    return { outcome: "applied", updateId: check.id ?? null };
  } catch (e) {
    // A failed check is worth a log entry: silent OTA failure is the hardest thing to diagnose.
    reportAppError("client", `OTA check failed: ${reason(e)}`);
    return { outcome: "failed", message: reason(e) };
  }
}

/**
 * Download an update in the background and restart into it only when it is fully on the device.
 * Called from the root layout once the splash has finished — never before, or the reload lands
 * mid-animation. Silent by design: a person who opens the app twice gets the fix without a prompt.
 */
export async function installUpdateOnLaunch(): Promise<CheckOutcome> {
  try {
    const mod = await updates();
    if (!mod) return { outcome: "unavailable" };
    const check = await mod.checkForUpdateAsync();
    if (!check?.isAvailable) return { outcome: "uptodate", updateId: null };
    const fetched = await mod.fetchUpdateAsync();
    if (!fetched?.isNew) return { outcome: "uptodate", updateId: check.id ?? null };
    addBreadcrumb("ota", `applying ${check.id ?? "(no id)"}`);
    await mod.reloadAsync();
    return { outcome: "applied", updateId: check.id ?? null };
  } catch (e) {
    reportAppError("client", `OTA install failed: ${reason(e)}`);
    return { outcome: "failed", message: reason(e) };
  }
}
