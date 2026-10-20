import { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
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
import { color, setDeviceScheme, useTheme, loadThemeMode } from "../src/theme";

/** Pushes the phone's own Light/Dark setting into the theme store ("system" mode resolves against it). */
function DeviceThemeSync() {
  const scheme = useColorScheme();
  useEffect(() => {
    setDeviceScheme(scheme === "light" ? "light" : "dark");
  }, [scheme]);
  return null;
}

export default function RootLayout() {
  const [splash, setSplash] = useState(SPLASH_ENABLED);
  const [ready, setReady] = useState(false);
  const { scheme } = useTheme();
  useEffect(() => {
    installErrorReporting();
    void Promise.all([loadApiBase(), loadBlocked(), loadThemeMode()]).finally(() => setReady(true));
  }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <DeviceThemeSync />
        <BreadcrumbTracker />
        <PushSetup />
        <StatusBar style={scheme === "light" ? "dark" : "light"} />
        <View style={{ flex: 1, backgroundColor: color.bg }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
          {splash ? <Splash onDone={() => setSplash(false)} /> : null}
        </View>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
