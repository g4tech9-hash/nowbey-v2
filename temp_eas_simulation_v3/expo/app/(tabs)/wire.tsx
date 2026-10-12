import { useCallback, useState } from "react";
import { Alert, FlatList, Linking, Pressable, RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { API_BASE, api, errMsg, type NewsItem } from "../../src/api";
import { categoryOf, timeAgo } from "../../src/geo";
import { color } from "../../src/theme";
import { Btn, Card, CategoryBadge, Field, t, useTopInset } from "../../src/ui";

export default function Wire() {
  const top = useTopInset();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await api.news(40);
      setItems(d.items);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refreshStories() {
    setChecking(true);
    try {
      const r = await api.refreshNews();
      const n = r.stats.inserted ?? 0;
      Alert.alert("Wire updated", n ? `${n} new ${n === 1 ? "story" : "stories"} added.` : "You are all caught up.");
      await load();
    } catch (e) {
      Alert.alert("Could not update", errMsg(e));
    } finally {
      setChecking(false);
    }
  }

  async function send() {
    setSending(true);
    try {
      await api.submitLink(url.trim(), note.trim());
      setUrl("");
      setNote("");
      Alert.alert("Thanks", "A NowBey editor will look at your link before it appears on the wire.");
      await load();
    } catch (e) {
      Alert.alert("Could not file that link", errMsg(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: color.bg }}
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: 16, paddingTop: top + 12, paddingBottom: 32, gap: 10 }}
      refreshControl={
        <RefreshControl
          tintColor={color.tideLight}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={t.h1}>News wire</Text>
              <Text style={t.subtle}>Bahamian outlets, placed on the map</Text>
            </View>
            <Btn label="Refresh" onPress={refreshStories} busy={checking} style={{ paddingVertical: 8, minHeight: 38 }} />
          </View>
          {error ? <Text style={t.error}>{error}</Text> : null}
          <Card>
            <Text style={t.h3}>Got a link worth mapping?</Text>
            <Text style={[t.muted, { marginTop: 4 }]}>Send the story and we will work out where it happened.</Text>
            <Field label="Link" value={url} onChangeText={setUrl} placeholder="https://…" keyboardType="url" />
            <Field label="Why it matters, and where" value={note} onChangeText={setNote} placeholder="Ferry cuts affect Bimini traffic" multiline autoCapitalize="sentences" />
            <Btn label="Send to the desk" onPress={send} busy={sending} disabled={url.trim().length < 12} style={{ marginTop: 12 }} />
          </Card>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => void Linking.openURL(item.url).catch(() => {})} accessibilityRole="link">
          <Card accent={categoryOf(item.category).color}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <CategoryBadge category={item.category} />
              <Text style={t.subtle}>{timeAgo(item.publishedAt)}</Text>
            </View>
            <Text style={[t.h3, { marginTop: 8 }]} numberOfLines={3}>
              {item.title}
            </Text>
            {item.summary ? (
              <Text style={[t.muted, { marginTop: 4 }]} numberOfLines={2}>
                {item.summary}
              </Text>
            ) : null}
            <Text style={[t.subtle, { marginTop: 8 }]}>
              {item.sourceName}
              {item.parish ? ` · ${item.parish}` : ""}
              {item.lat !== null ? " · on the map" : ""}
            </Text>
            <Pressable onPress={() => void Linking.openURL(`${API_BASE}/wire/${item.id}`).catch(() => {})} hitSlop={8} accessibilityRole="link" style={{ marginTop: 8, alignSelf: "flex-start" }}>
              <Text style={{ color: color.tideLight, fontWeight: "800", fontSize: 12.5 }}>React and comment ›</Text>
            </Pressable>
          </Card>
        </Pressable>
      )}
      ListEmptyComponent={
        loading ? null : (
          <Card style={{ alignItems: "center" }}>
            <Text style={t.h3}>No stories yet</Text>
            <Text style={[t.muted, { marginTop: 6, textAlign: "center" }]}>Tap Refresh to bring in the latest headlines.</Text>
          </Card>
        )
      }
    />
  );
}
