import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { API_BASE } from "../src/api";
import { useSession } from "../src/session";
import { color } from "../src/theme";
import { Btn, t } from "../src/ui";

/**
 * Where the Google sign-in comes back to.
 *
 * The member taps "Sign in with Google" in the You tab, which opens the *system browser* (Google
 * refuses to run its sign-in inside an embedded web view, and rightly so — the address bar is how
 * someone checks they are really talking to Google). When it finishes, the website redirects to
 * `nowbey://auth?code=…` and Android hands that link to this screen.
 *
 * The code is single use, lasts five minutes, and is worth nothing without this device's attempt to
 * redeem it — so the worst case if the link leaks is that the sign-in fails.
 */

/** What the website can say when the handshake does not finish. */
const MESSAGES: Record<string, string> = {
  off: "Google sign-in is not switched on for NowBey yet. Sign in with your handle and password instead.",
  cancelled: "Google sign-in was cancelled.",
  state: "That sign-in took too long, or it started in another browser. Please try again.",
  exchange: "Google could not complete the sign-in. Please try again.",
  token: "Google's answer could not be trusted, so nothing was signed in.",
  unverified: "That Google address is not verified with Google, so it cannot open a NowBey account.",
  linked: "That address is already linked to a different Google account. Sign in with your password, then contact us.",
  suspended: "This account has been suspended. If you think that is a mistake, please contact NowBey.",
  slow: "Too many sign-in attempts just now. Please wait a few minutes.",
  setup: "Google sign-in is not fully set up on the server yet. Your handle and password still work.",
};

export default function GoogleReturn() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { signInWithGoogleCode } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(true);

  useEffect(() => {
    const code = typeof params.code === "string" ? params.code : "";
    const flag = typeof params.error === "string" ? params.error : "";
    if (flag) {
      setError(MESSAGES[flag] ?? "Google sign-in did not finish. Please try again.");
      setWorking(false);
      return;
    }
    if (!code) {
      setError("That sign-in link is missing its code. Please start again from the You tab.");
      setWorking(false);
      return;
    }
    let alive = true;
    void signInWithGoogleCode(code)
      .then(() => {
        if (alive) router.replace("/(tabs)/map");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Google sign-in did not finish. Please try again.");
        setWorking(false);
      });
    return () => {
      alive = false;
    };
  }, [params.code, params.error, signInWithGoogleCode]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: color.bg }}>
      {working ? (
        <>
          <ActivityIndicator color={color.tide} />
          <Text style={[t.muted, { marginTop: 14, textAlign: "center" }]}>Finishing your Google sign-in…</Text>
        </>
      ) : (
        <>
          <Text style={[t.h2, { textAlign: "center" }]}>Sign-in did not finish</Text>
          <Text style={[t.muted, { marginTop: 8, textAlign: "center" }]}>{error}</Text>
          <Btn label="Back to the You tab" onPress={() => router.replace("/(tabs)/you")} style={{ marginTop: 18 }} />
          <Btn
            label="Open the website instead"
            kind="ghost"
            onPress={() => void Linking.openURL(`${API_BASE}/login?mode=signin`).catch(() => undefined)}
            style={{ marginTop: 8 }}
          />
        </>
      )}
    </View>
  );
}
