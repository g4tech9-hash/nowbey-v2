import { useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, Text, View } from "react-native";
import { API_BASE, api, changeApiBase, errMsg } from "../../src/api";
import { CATEGORIES, CATEGORY_KEYS, PARISHES, TIER_NAMES, type CategoryKey } from "../../src/geo";
import { unblockUser, useBlocked } from "../../src/Safety";
import { useSession } from "../../src/session";
import { color } from "../../src/theme";
import { BadgeMark, Btn, Card, Field, Pill, t, useTopInset } from "../../src/ui";

const DEFAULT_CATS: CategoryKey[] = ["flood", "storm", "power", "water", "fire"];

function planLine(status: string | null, renewsAt: string | null): string {
  const when = renewsAt ? new Date(renewsAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null;
  if (status === "comp") return "A complimentary plan from NowBey. Nothing to pay.";
  if (status === "sandbox") return "Demo plan. You are not being charged.";
  if (status === "past_due") return "There was a problem with your last payment, so your plan may end soon.";
  if (status === "canceling") return when ? `Cancelled. Your plan runs until ${when}.` : "Cancelled. Your plan ends soon.";
  return when ? `Renews on ${when}.` : "Active.";
}

export default function You() {
  const top = useTopInset();
  const { user, loading, signIn, signUp, signOut } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={color.tideLight} />
      </View>
    );
  }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ padding: 16, paddingTop: top + 12, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
      {user ? <Account /> : <SignIn onSignIn={signIn} onSignUp={signUp} />}
      {user ? <Btn label="Sign out" kind="ghost" onPress={() => void signOut()} /> : null}
      <ServerBox />
    </ScrollView>
  );
}

function SignIn({
  onSignIn,
  onSignUp,
}: {
  onSignIn: (handle: string, password: string) => Promise<void>;
  onSignUp: (body: { handle: string; email: string; password: string; displayName?: string; parish?: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [parish, setParish] = useState("New Providence");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const h = handle.trim().toLowerCase().replace(/^@/, "");
      const pw = password.trim(); // keyboards sometimes add a stray space at the end
      if (mode === "signin") await onSignIn(h, pw);
      else {
        if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim())) throw new Error("Enter a valid email address. It is how we help you if you forget your password.");
        if (pw.length < 8) throw new Error("Use at least 8 characters for your password.");
        await onSignUp({ handle: h, email: email.trim(), password: pw, displayName: name.trim() || undefined, parish });
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Text style={t.h1}>Your account</Text>
      <Text style={[t.muted, { marginTop: 4 }]}>You can read and report without one. An account puts your handle on your reports and brings your plan to your phone.</Text>
      <View style={{ flexDirection: "row", marginTop: 14 }}>
        <Pill label="Sign in" active={mode === "signin"} onPress={() => setMode("signin")} />
        <Pill label="Create account" active={mode === "signup"} onPress={() => setMode("signup")} />
      </View>
      <Card>
        <Field label={mode === "signin" ? "Handle or email" : "Handle"} value={handle} onChangeText={setHandle} autoCorrect={false} spellCheck={false} placeholder={mode === "signin" ? "your_handle or you@example.com" : "your_handle"} />
        {mode === "signup" ? <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoComplete="email" /> : null}
        {mode === "signup" ? <Field label="Shown as" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" /> : null}
        {mode === "signup" ? (
          <View style={{ marginTop: 12 }}>
            <Text style={t.label}>Home island</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              {PARISHES.slice(0, 12).map((p) => (
                <Pill key={p} label={p} active={parish === p} onPress={() => setParish(p)} />
              ))}
            </ScrollView>
          </View>
        ) : null}
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCorrect={false} spellCheck={false} autoComplete="password" placeholder="At least 8 characters" />
        {mode === "signup" ? (
          <View style={{ marginTop: 12 }}>
            <Pill label={agreed ? "I agree to the Terms and Privacy Policy" : "Tap to agree to the Terms and Privacy Policy"} active={agreed} onPress={() => setAgreed(!agreed)} />
            <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
              <Text style={[t.subtle, { textDecorationLine: "underline" }]} onPress={() => void Linking.openURL(`${API_BASE}/terms`).catch(() => {})}>
                Read the Terms
              </Text>
              <Text style={[t.subtle, { textDecorationLine: "underline" }]} onPress={() => void Linking.openURL(`${API_BASE}/privacy`).catch(() => {})}>
                Read the Privacy Policy
              </Text>
            </View>
            <Text style={[t.subtle, { marginTop: 6 }]}>No abusive or unlawful posts. You can report content and block people. NowBey is not an emergency service: call 919 or 911.</Text>
          </View>
        ) : null}
        {error ? <Text style={[t.error, { marginTop: 10 }]}>{error}</Text> : null}
        <Btn label={mode === "signin" ? "Sign in" : "Create account"} busy={busy} disabled={mode === "signup" && !agreed} onPress={go} style={{ marginTop: 14 }} />
        {mode === "signin" ? (
          <Btn label="Forgot your password?" kind="ghost" onPress={() => void Linking.openURL(`${API_BASE}/forgot-password`).catch(() => {})} style={{ marginTop: 8 }} />
        ) : null}
      </Card>
    </View>
  );
}

function Account() {
  const { user } = useSession();
  const [email, setEmail] = useState("");
  const [islands, setIslands] = useState<string[]>([user?.parish ?? "New Providence"]);
  const [cats, setCats] = useState<CategoryKey[]>(DEFAULT_CATS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!user) return null;
  const paid = user.plan.tier !== null;

  const toggleIsland = (p: string) => {
    if (!paid) return setIslands([p]);
    setIslands(islands.includes(p) ? (islands.length > 1 ? islands.filter((v) => v !== p) : islands) : [...islands, p]);
  };

  async function subscribe() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.subscribeAlert({ target: email.trim(), parishes: islands, categories: cats });
      setMsg(
        r.mail === "sent"
          ? { ok: true, text: `Check ${email.trim()} for a confirmation email and tap the link to switch alerts on.` }
          : { ok: false, text: "Saved, but we could not send the confirmation email just now. Please try again later." },
      );
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={t.subtle}>@{user.handle}</Text>
        <Text style={t.h1}>{user.displayName}</Text>
        {user.verified ? (
          <View style={{ marginTop: 6, alignSelf: "flex-start" }}>
            <BadgeMark kind="verified" />
          </View>
        ) : null}
      </View>

      {user.email && user.emailVerified === false ? (
        <Card>
          <Text style={t.h3}>Confirm your email</Text>
          <Text style={[t.muted, { marginTop: 4 }]}>We sent a link to {user.email}. Confirming it lets us help you back in if you forget your password.</Text>
          <Btn label="Account settings on the website" kind="ghost" onPress={() => void Linking.openURL(`${API_BASE}/you/settings`).catch(() => {})} style={{ marginTop: 10 }} />
        </Card>
      ) : null}

      <Card>
        <Text style={t.h3}>Your plan</Text>
        {user.plan.tier ? (
          <>
            <Text style={{ color: color.sun, fontSize: 16, fontWeight: "800", marginTop: 6 }}>
              {TIER_NAMES[user.plan.tier]} · {user.plan.interval === "year" ? "yearly" : "monthly"}
            </Text>
            <Text style={[t.muted, { marginTop: 4 }]}>{planLine(user.plan.status, user.plan.renewsAt)}</Text>
          </>
        ) : (
          <Text style={[t.muted, { marginTop: 6 }]}>Free plan, with house ads.</Text>
        )}
      </Card>

      <Card>
        <Text style={t.h3}>Email alerts</Text>
        <Text style={[t.muted, { marginTop: 4 }]}>
          We email you when a matching report is filed. {paid ? "Pick as many islands as you like." : "The free plan covers one island."}
        </Text>
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoComplete="email" />
        <Text style={[t.label, { marginTop: 12 }]}>{paid ? "Islands" : "Your island"}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
          {PARISHES.map((p) => (
            <Pill key={p} label={p} active={islands.includes(p)} onPress={() => toggleIsland(p)} />
          ))}
        </View>
        <Text style={[t.label, { marginTop: 8 }]}>Kinds of report</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
          {CATEGORY_KEYS.map((k) => (
            <Pill
              key={k}
              label={CATEGORIES[k].label}
              tint={CATEGORIES[k].color}
              active={cats.includes(k)}
              onPress={() => setCats(cats.includes(k) ? cats.filter((v) => v !== k) : [...cats, k])}
            />
          ))}
        </View>
        <Text style={t.subtle}>Leave everything unselected to hear about every report.</Text>
        {msg ? <Text style={[msg.ok ? t.ok : t.error, { marginTop: 10 }]}>{msg.text}</Text> : null}
        <Btn label="Send me a confirmation email" busy={busy} disabled={!email.includes("@")} onPress={subscribe} style={{ marginTop: 12 }} />
      </Card>

      <BlockedList />
      <Btn label="Account settings on the website" kind="ghost" onPress={() => void Linking.openURL(`${API_BASE}/you/settings`).catch(() => {})} />
      <DeleteAccount />
      {user.isStaff ? <Btn label="Open the admin area on the website" kind="ghost" onPress={() => void Linking.openURL(`${API_BASE}/admin`).catch(() => {})} /> : null}
    </View>
  );
}

function ServerBox() {
  const { refresh } = useSession();
  const [value, setValue] = useState(API_BASE);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setNote(null);
    try {
      await changeApiBase(value);
      setValue(API_BASE);
      await api.incidents({ limit: 1 });
      setNote("Connected.");
      await refresh();
    } catch (e) {
      setNote(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text style={t.h2}>Server address</Text>
      <Text style={[t.muted, { marginBottom: 8 }]}>Where the NowBey website runs, for example https://your-site.example or http://192.168.1.20:3000.</Text>
      <Field label="Address" value={value} onChangeText={setValue} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://your-site.example" />
      <Btn label="Save and test" onPress={() => void save()} busy={busy} />
      {note ? <Text style={[t.subtle, { marginTop: 8 }]}>{note}</Text> : null}
    </Card>
  );
}

function BlockedList() {
  const list = useBlocked();
  if (!list.length) return null;
  return (
    <Card>
      <Text style={t.h3}>Blocked people</Text>
      <Text style={[t.muted, { marginTop: 4 }]}>You do not see their reports, posts or comments.</Text>
      <View style={{ marginTop: 8, gap: 8 }}>
        {list.map((h) => (
          <View key={h} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={t.body}>@{h}</Text>
            <Btn label="Unblock" kind="ghost" onPress={() => void unblockUser(h)} style={{ paddingVertical: 6, minHeight: 34 }} />
          </View>
        ))}
      </View>
    </Card>
  );
}

function DeleteAccount() {
  const { signOut } = useSession();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    Alert.alert("Delete your account?", "This cannot be undone. Your comments, posts and alert settings are deleted. Your reports stay for neighbours, with your name removed.", [
      { text: "Keep my account", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void run() },
    ]);
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount(password);
      await signOut();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <Btn label="Delete my account" kind="ghost" onPress={() => setOpen(true)} />;
  return (
    <Card>
      <Text style={t.h3}>Delete my account</Text>
      <Text style={[t.muted, { marginTop: 4 }]}>Enter your password to confirm. If you have a paid plan, cancel it first in the store or website you bought it from.</Text>
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {error ? <Text style={[t.error, { marginTop: 10 }]}>{error}</Text> : null}
      <Btn label="Delete my account" busy={busy} disabled={password.length < 1} onPress={confirm} style={{ marginTop: 12 }} />
      <Btn label="Cancel" kind="ghost" onPress={() => setOpen(false)} style={{ marginTop: 8 }} />
    </Card>
  );
}
