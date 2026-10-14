import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadApiBase } from "../src/api";
import { loadBlocked } from "../src/Safety";
import { SPLASH_ENABLED } from "../src/brand";
import { SessionProvider } from "../src/session";
import { useSession } from "../src/session";
import { ensurePushRegistered, watchPushTaps } from "../src/push";

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
    void Promise.all([loadApiBase(), loadBlocked()]).finally(() => setReady(true));
  }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  return (
    <SafeAreaProvider>
      <SessionProvider>
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
