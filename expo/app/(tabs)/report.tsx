import { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { api, errMsg, type Incident, type Place, type ReportAssist } from "../../src/api";
import { CATEGORIES, CATEGORY_KEYS, SEVERITY, inBahamas, type CategoryKey } from "../../src/geo";
import MapCanvas from "../../src/MapCanvas";
import type { LatLng } from "../../src/map-types";
import { useSession } from "../../src/session";
import { color, useTheme } from "../../src/theme";
import { Btn, Card, Field, Pill, t, useTopInset } from "../../src/ui";

const STEPS = ["What", "Where", "Details"];

export default function Report() {
  useTheme(); // screens repaint with the scheme
  const router = useRouter();
  const top = useTopInset();
  const { user } = useSession();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<CategoryKey>("flood");
  const [severity, setSeverity] = useState(2);
  const [pick, setPick] = useState<LatLng | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assist, setAssist] = useState<ReportAssist | null>(null);
  const [checking, setChecking] = useState(false);
  const [locating, setLocating] = useState(false);
  // One in-app explanation before the OS permission dialog (Apple HIG / Play policy:
  // prime the request with context or a cold denial sticks for good).
  const [locPrimerShown, setLocPrimerShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Incident | null>(null);

  // Look up the street for the pin so the report names a real place.
  useEffect(() => {
    if (!pick) return;
    let alive = true;
    setPlace(null);
    api
      .reverse(pick.lat, pick.lng)
      .then((p) => alive && setPlace(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pick?.lat, pick?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  async function useMyLocation() {
    setError(null);
    if (!locPrimerShown) {
      setLocPrimerShown(true);
      Alert.alert(
        "Use your location?",
        "NowBey uses your location once, only to place the report pin near you. It is never tracked in the background, and the published pin is deliberately blurred.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Continue", onPress: () => void useMyLocation() },
        ],
      );
      return;
    }
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setError("Allow location access, or tap the map to place the pin.");
        return;
      }
      // Balanced, not High: the server deliberately fuzzes the stored pin (location-privacy)
      // so GNSS precision is battery spent on accuracy that is then thrown away.
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (!inBahamas(p.lat, p.lng)) {
        setError("You do not seem to be in The Bahamas. Tap the map to place the pin instead.");
        return;
      }
      setPick(p);
      setFocus({ ...p, nonce: Date.now() });
    } catch {
      setError("Could not read your location. Tap the map to place the pin instead.");
    } finally {
      setLocating(false);
    }
  }

  /** Intake copilot: suggestions only — every apply button below is the reporter's choice. */
  async function checkAssist() {
    setChecking(true);
    setError(null);
    try {
      const res = await api.assistReport({
        title: title.trim(),
        details: details.trim(),
        photoNote: photoNote.trim(),
        category,
        severity,
        parish: place?.parish,
        lat: pick?.lat,
        lng: pick?.lng,
      });
      setAssist(res);
    } catch {
      setError("The check could not run just now. Publishing works without it.");
    } finally {
      setChecking(false);
    }
  }

  async function submit() {
    if (!pick) {
      setStep(1);
      setError("Place the pin first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.createIncident({
        title: title.trim(),
        details: details.trim(),
        category,
        severity,
        lat: pick.lat,
        lng: pick.lng,
        address: place?.address,
        street: place?.street,
        parish: place?.parish,
        photoNote: photoNote.trim(),
        anonymous,
      });
      setDone(res.incident);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDone(null);
    setStep(0);
    setPick(null);
    setPlace(null);
    setTitle("");
    setDetails("");
    setPhotoNote("");
    setAssist(null);
    setError(null);
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, padding: 20, paddingTop: top + 40, alignItems: "center" }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: color.tide, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: color.bg, fontSize: 36, fontWeight: "900" }}>✓</Text>
        </View>
        <Text style={[t.h1, { marginTop: 16 }]}>It is on the map</Text>
        <Text style={[t.muted, { marginTop: 8, textAlign: "center" }]}>Neighbours can now confirm it or mark it cleared.</Text>
        <Btn label="Watch this report" onPress={() => router.replace(`/incident/${done.id}`)} style={{ marginTop: 20, alignSelf: "stretch" }} />
        <Btn label="Report another spot" kind="ghost" onPress={reset} style={{ marginTop: 10, alignSelf: "stretch" }} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: top + 12, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      <Text style={t.h1}>Report a spot</Text>
      <View style={{ backgroundColor: color.conch, padding: 8, borderRadius: 8, marginTop: 8 }}>
        <Text style={{ color: color.bg, fontSize: 12, fontWeight: '900', textAlign: 'center' }}>
          🚨 For emergencies, call 919 / 911 — this app is not an emergency service.
        </Text>
      </View>
      <Text style={[t.subtle, { marginTop: 8 }]}>
        {user ? `Posting as @${user.handle}` : "Posting without an account. Sign in on the You tab to get credit."}
      </Text>

      <View style={{ flexDirection: "row", marginTop: 14 }}>
        {STEPS.map((label, i) => (
          <Pill key={label} label={`${i + 1} · ${label}`} active={step === i} onPress={() => setStep(i)} />
        ))}
      </View>

      {step === 0 ? (
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {CATEGORY_KEYS.map((k) => (
              <Pill key={k} label={CATEGORIES[k].label} tint={CATEGORIES[k].color} active={category === k} onPress={() => setCategory(k)} />
            ))}
          </View>
          <Text style={[t.subtle, { marginTop: 2 }]}>{CATEGORIES[category].blurb}</Text>
          <Text style={[t.label, { marginTop: 16 }]}>How bad is it?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
            {SEVERITY.map((label, i) => (
              <Pill key={label} label={label} tint={color.conch} active={severity === i + 1} onPress={() => setSeverity(i + 1)} />
            ))}
          </View>
          <Btn label="Next: put it on the map" onPress={() => setStep(1)} style={{ marginTop: 16 }} />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ marginTop: 8, gap: 12 }}>
          <View style={{ height: 340, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: color.line }}>
            <MapCanvas style={{ flex: 1 }} pick={pick} onPick={setPick} focus={focus} delta={0.05} />
          </View>
          <Btn label={locating ? "Finding you…" : "Use my location"} kind="ghost" busy={locating} onPress={useMyLocation} />
          <Card>
            <Text style={t.h3}>Where exactly?</Text>
            <Text style={[t.muted, { marginTop: 4 }]}>Tap the spot, then drag the pin onto the kerb, gate or pothole. Zoom in for the best accuracy.</Text>
            {pick ? (
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: color.tidePale, fontSize: 12 }}>
                  {pick.lat.toFixed(6)}, {pick.lng.toFixed(6)}
                </Text>
                <Text style={[t.h3, { marginTop: 4 }]}>{place?.street ?? "Finding the street…"}</Text>
                <Text style={t.subtle}>{[place?.address, place?.parish].filter(Boolean).join(" · ")}</Text>
              </View>
            ) : (
              <Text style={[t.muted, { marginTop: 8 }]}>No spot chosen yet.</Text>
            )}
          </Card>
          {error ? <Text style={t.error}>{error}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Back" kind="ghost" onPress={() => setStep(0)} style={{ flex: 1 }} />
            <Btn label="Next: write it up" disabled={!pick} onPress={() => setStep(2)} style={{ flex: 2 }} />
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ marginTop: 4 }}>
          <Field label="Headline" value={title} onChangeText={setTitle} placeholder="Knee-deep water across Bay Street" autoCapitalize="sentences" />
          <Field
            label="What neighbours should know"
            value={details}
            onChangeText={setDetails}
            placeholder="From the traffic light to the pharmacy. Small cars are turning back."
            multiline
            autoCapitalize="sentences"
          />
          <Field label="Photo description (optional)" value={photoNote} onChangeText={setPhotoNote} placeholder="Water up to the first step, facing east" autoCapitalize="sentences" />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
            <Text style={t.muted}>Post anonymously</Text>
            <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: color.tide, false: color.panel3 }} />
          </View>

          <Card style={{ marginTop: 14, borderColor: "#a78bfa55" }}>
            <Text style={t.h3}>✨ Check my report</Text>
            <Text style={[t.subtle, { marginTop: 2 }]}>Best category, clearer headline, and whether neighbours already reported this. You accept or ignore each idea.</Text>
            <Btn label={checking ? "Checking…" : assist ? "Check again" : "Check it"} kind="ghost" busy={checking} disabled={title.trim().length < 5} onPress={checkAssist} style={{ marginTop: 10 }} />
            {assist ? (
              <View style={{ marginTop: 10, gap: 8 }}>
                {assist.duplicates.map((d) => (
                  <View key={d.id} style={{ backgroundColor: d.strength === "exact" ? "#ff7a6b22" : "#ffffff10", borderRadius: 10, padding: 10 }}>
                    <Text style={[t.h3, { fontSize: 13 }]}>{d.strength === "exact" ? "Already on the map at this spot:" : "Sounds like one already on the map:"} {d.title}</Text>
                    <Text style={t.subtle}>Confirmed ×{d.confirmations}{d.distanceM !== null ? ` · ~${d.distanceM} m from your pin` : ""}. Same thing? Open it from the map and tap confirm instead — one strong pin beats two weak ones.</Text>
                  </View>
                ))}
                {assist.suggestion?.category && assist.suggestion.category !== category && CATEGORIES[assist.suggestion.category as CategoryKey] ? (
                  <View>
                    <Text style={t.muted}>This reads as {CATEGORIES[assist.suggestion.category as CategoryKey].label} ({assist.suggestion.confidence} confidence)</Text>
                    <Btn label={`Use ${CATEGORIES[assist.suggestion.category as CategoryKey].label}`} onPress={() => setCategory(assist.suggestion!.category as CategoryKey)} style={{ marginTop: 6 }} />
                  </View>
                ) : null}
                {assist.suggestion?.severity && assist.suggestion.severity !== severity ? (
                  <View>
                    <Text style={t.muted}>Severity looks more like {SEVERITY[assist.suggestion.severity - 1]} ({assist.suggestion.severity}/4)</Text>
                    <Btn label={`Set ${assist.suggestion.severity}/4`} onPress={() => setSeverity(assist.suggestion!.severity!)} style={{ marginTop: 6 }} />
                  </View>
                ) : null}
                {assist.suggestion?.headline && assist.suggestion.headline.trim() && assist.suggestion.headline.trim() !== title.trim() ? (
                  <View>
                    <Text style={t.muted}>Clearer headline: “{assist.suggestion.headline}”</Text>
                    <Btn label="Use this headline" onPress={() => setTitle(assist.suggestion!.headline)} style={{ marginTop: 6 }} />
                  </View>
                ) : null}
                {assist.place && pick && Math.abs(assist.place.lat - pick.lat) + Math.abs(assist.place.lng - pick.lng) > 0.002 ? (
                  <View>
                    <Text style={t.muted}>Your words name {assist.place.street}, {assist.place.parish} — not where the pin is.</Text>
                    <Btn
                      label="Move pin there"
                      onPress={() => {
                        setPick({ lat: assist.place!.lat, lng: assist.place!.lng });
                        setFocus({ lat: assist.place!.lat, lng: assist.place!.lng, nonce: Date.now() });
                        setStep(1);
                      }}
                      style={{ marginTop: 6 }}
                    />
                  </View>
                ) : null}
                {assist.suggestion?.missingInfo.length ? (
                  <View>
                    <Text style={[t.muted, { fontWeight: "700" }]}>Neighbours would ask:</Text>
                    {assist.suggestion.missingInfo.map((q) => (
                      <Text key={q} style={t.subtle}>• {q}</Text>
                    ))}
                  </View>
                ) : null}
                {!assist.ai && !assist.duplicates.length ? <Text style={t.subtle}>Nothing to suggest — no similar reports nearby. (AI wording help is not switched on for this server yet.)</Text> : null}
                {assist.ai && !assist.duplicates.length && !assist.suggestion?.missingInfo.length ? <Text style={[t.subtle, { color: color.tidePale }]}>✓ This reads clearly as-is. Good to publish.</Text> : null}
              </View>
            ) : null}
          </Card>

          {error ? <Text style={[t.error, { marginTop: 10 }]}>{error}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <Btn label="Move the pin" kind="ghost" onPress={() => setStep(1)} style={{ flex: 1 }} />
            <Btn label="Publish" busy={busy} disabled={!pick || title.trim().length < 5} onPress={submit} style={{ flex: 2 }} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
