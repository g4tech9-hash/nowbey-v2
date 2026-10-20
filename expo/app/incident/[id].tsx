import { ReportBlock } from "../../src/Safety";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api, errMsg, type Incident, type Update } from "../../src/api";
import { categoryOf, timeAgo } from "../../src/geo";
import MapCanvas from "../../src/MapCanvas";
import { Conversation } from "../../src/Engage";
import { color, useTheme } from "../../src/theme";
import { BadgeMark, Btn, Card, CategoryBadge, Pill, t, useTopInset } from "../../src/ui";

const LABELS: Record<string, string> = {
  confirm: "Confirmed still there",
  photo: "Saw it too",
  note: "Left a note",
  clear: "Marked cleared",
  escalate: "Said it is getting worse",
};

export default function IncidentScreen() {
  useTheme(); // screens repaint with the scheme
  const router = useRouter();
  const top = useTopInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const r = await api.incident(String(id));
      setIncident(r.incident);
      setUpdates(r.updates);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function act(kind: "confirm" | "photo" | "clear" | "escalate") {
    if (!id) return;
    setBusy(true);
    try {
      const r = await api.updateIncident(String(id), kind);
      if (r.message) Alert.alert("Thanks", r.message);
      await load();
    } catch (e) {
      Alert.alert("Could not update", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityRole="button" style={{ paddingVertical: 8 }}>
      <Text style={{ color: color.tideLight, fontWeight: "700" }}>‹ Back</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={color.tideLight} />
      </View>
    );
  }
  if (error || !incident) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, padding: 20, paddingTop: top + 12 }}>
        {back}
        <Text style={[t.h2, { marginTop: 8 }]}>Could not open this report</Text>
        <Text style={[t.muted, { marginTop: 6 }]}>{error ?? "It may have been removed."}</Text>
      </View>
    );
  }

  const meta = categoryOf(incident.category);
  const open = incident.status === "active";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ paddingTop: top + 8, paddingBottom: 48 }} automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {back}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <CategoryBadge category={incident.category} severity={incident.severity} />
          <Text style={[t.subtle, { color: open ? color.conchLight : color.muted }]}>{open ? "Open" : incident.status}</Text>
          <Text style={t.subtle}>{timeAgo(incident.createdAt)}</Text>
        </View>
        <Text style={t.h1}>{incident.title}</Text>
        {incident.details ? <Text style={t.body}>{incident.details}</Text> : null}
        {incident.photoNote ? <Text style={[t.muted, { borderLeftWidth: 3, borderLeftColor: meta.color, paddingLeft: 10 }]}>Photo note: {incident.photoNote}</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={t.subtle}>
            @{incident.authorHandle ?? "someone"} · {incident.confirmations} confirmed
          </Text>
          <BadgeMark kind={incident.authorBadge} />
        </View>
        <ReportBlock kind="incident" id={incident.id} authorHandle={incident.authorHandle} />
      </View>

      <View style={{ height: 260, marginTop: 14 }}>
        <MapCanvas
          style={{ flex: 1 }}
          center={{ lat: incident.lat, lng: incident.lng }}
          delta={0.004}
          pins={[{ id: incident.id, lat: incident.lat, lng: incident.lng, color: meta.color, title: incident.title }]}
        />
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <Card>
          <Text style={t.h3}>Is it still going on?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
            <Pill label={`Still there · ${incident.confirmations}`} tint={color.tideLight} onPress={() => void act("confirm")} disabled={busy} />
            <Pill label="Saw it too" onPress={() => void act("photo")} disabled={busy} />
            {open ? <Pill label="Cleared up" onPress={() => void act("clear")} disabled={busy} /> : null}
            {open ? <Pill label="Getting worse" tint={color.conch} onPress={() => void act("escalate")} disabled={busy} /> : null}
          </View>
        </Card>

        <Card>
          <Text style={t.h3}>The pin</Text>
          <Text style={{ color: color.tidePale, fontSize: 12, marginTop: 4 }}>
            {incident.lat.toFixed(6)}, {incident.lng.toFixed(6)}
          </Text>
          <Text style={[t.muted, { marginTop: 2 }]}>{[incident.street, incident.parish].filter(Boolean).join(" · ") || "No matched street"}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Btn
              label="Directions"
              kind="ghost"
              style={{ flex: 1 }}
              onPress={() => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${incident.lat},${incident.lng}`).catch(() => {})}
            />
            <Btn
              label="Street level"
              kind="ghost"
              style={{ flex: 1 }}
              onPress={() => void Linking.openURL(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${incident.lat},${incident.lng}`).catch(() => {})}
            />
          </View>
        </Card>

        <Card>
          <Text style={t.h3}>Timeline</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {[...updates, { id: 0, kind: "filed", note: null, authorHandle: incident.authorHandle, createdAt: incident.createdAt }].map((u) => (
              <View key={u.id} style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color, marginTop: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: color.sand, fontSize: 13, fontWeight: "700" }}>{u.kind === "filed" ? "Report filed" : (LABELS[u.kind] ?? u.kind)}</Text>
                  {u.note ? <Text style={t.muted}>{u.note}</Text> : null}
                  <Text style={t.subtle}>
                    @{u.authorHandle ?? "someone"} · {timeAgo(u.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Conversation type="incident" id={String(id)} />
      </View>
    </ScrollView>
  );
}
