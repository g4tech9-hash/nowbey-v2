import { useEffect, useState } from "react";
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
import { initOutbox } from "../src/outbox";

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
    // Flush anything queued on the last run, and again whenever the app comes back to the foreground.
    const stopOutbox = initOutbox();
    void Promise.all([loadApiBase(), loadBlocked()]).finally(() => setReady(true));
    return stopOutbox;
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
          {splash ? <Splash onDone={() => setSplash(false)} /> : null}
        </View>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
