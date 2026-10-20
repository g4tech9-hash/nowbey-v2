import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { loadApiBase } from "../src/api";
import { addBreadcrumb, installErrorReporting } from "../src/errorReporting";
import { loadBlocked } from "../src/Safety";
import { SPLASH_ENABLED } from "../src/brand";
import { SessionProvider } from "../src/session";
import { useSession } from "../src/session";
import { ensurePushRegistered, watchPushTaps } from "../src/push";
import { installUpdateOnLaunch } from "../src/updates";

/** Screen changes become breadcrumbs, so an app crash report shows where the person had been. */
function BreadcrumbTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) addBreadcrumb("navigation", pathname);
  }, [pathname]);
  return null;
}

function PushSetup() {
  const { user, loading } = useSession();
  useEffect(() => {
    if (loading || !user) return;
    void ensurePushRegistered();
    return watchPushTaps();
  }, [loading, user]);
  return null;
}
import { Splash } from "../src/Splash";
import { color } from "../src/theme";

export default function RootLayout() {
  const [splash, setSplash] = useState(SPLASH_ENABLED);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    installErrorReporting();
    void Promise.all([loadApiBase(), loadBlocked()]).finally(() => setReady(true));
  }, []);
  // Only once the splash has gone: an OTA reload mid-animation looks like a broken splash rather
  // than a successful update, and the person never learns the fix arrived. With the splash off
  // (EXPO_PUBLIC_NOWBEY_SPLASH=off, or the classic theme) there is nothing to wait for.
  useEffect(() => {
    if (ready && !SPLASH_ENABLED) void installUpdateOnLaunch();
  }, [ready]);
  const splashDone = useCallback(() => {
    setSplash(false);
    void installUpdateOnLaunch();
  }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <BreadcrumbTracker />
        <PushSetup />
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: color.bg }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
          {splash ? <Splash onDone={splashDone} /> : null}
        </View>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
