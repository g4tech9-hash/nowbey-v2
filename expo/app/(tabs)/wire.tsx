/**
 * News Wire — rebuilt with Pulse Design System
 * FlashList + GridBackground + NewsWireCard + Skeleton + BottomSheet-ready
 */
import { useCallback, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { API_BASE, api, errMsg, type NewsItem } from "../../src/api";
import { categoryOf } from "../../src/geo";
import { color, useTheme } from "../../src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GridBackground } from "../../src/design-system/GridBackground";
import { NewsWireCard } from "../../src/design-system/NewsWireCard";
import { FlashFeed } from "../../src/design-system/FlashFeed";
import { FeedSkeleton } from "../../src/design-system/Skeleton";
import { Card } from "../../src/design-system/Card";
import { Button } from "../../src/design-system/Button";
import { Field } from "../../src/ui";

export default function Wire() {
  useTheme();
  const insets = useSafeAreaInsets();
  const top = insets.top;
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
      const interval = setInterval(load, 60000);
      return () => clearInterval(interval);
    }, [load]),
  );

  async function refreshStories() {
    setChecking(true);
    try {
      const r = await api.refreshNews();
      const n = (r as any).stats?.inserted ?? 0;
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

  const header = (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: color.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>News wire</Text>
          <Text style={{ color: color.subtle, fontSize: 12, marginTop: 2 }}>Bahamian outlets, placed on the map</Text>
        </View>
        <Button label="Refresh" onPress={refreshStories} busy={checking} size="sm" />
      </View>
      {error ? <Text style={{ color: color.conch, fontSize: 12.5 }}>{error}</Text> : null}
      <Card>
        <Text style={{ color: color.text, fontSize: 15, fontWeight: "700" }}>Got a link worth mapping?</Text>
        <Text style={{ color: color.muted, fontSize: 13, marginTop: 4 }}>Send the story and we will work out where it happened.</Text>
        <Field label="Link" value={url} onChangeText={setUrl} placeholder="https://…" keyboardType="url" />
        <Field label="Why it matters, and where" value={note} onChangeText={setNote} placeholder="Ferry cuts affect Bimini traffic" multiline autoCapitalize="sentences" />
        <Button label="Send to the desk" onPress={send} busy={sending} disabled={url.trim().length < 12} style={{ marginTop: 12 } as any} />
      </Card>
    </View>
  );

  if (loading && !items.length) {
    return (
      <GridBackground variant="full">
        <View style={{ flex: 1, padding: 16, paddingTop: top + 12 }}>
          {header}
          <FeedSkeleton count={3} />
        </View>
      </GridBackground>
    );
  }

  return (
    <GridBackground variant="full">
      <FlashFeed
        data={items}
        keyExtractor={(n: any) => n.id}
        contentPaddingTop={top + 12}
        header={header}
        error={error}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
        skeleton="wire"
        emptyTitle="No stories yet"
        emptyBody="Tap Refresh to bring in the latest headlines."
        renderItem={({ item }: any) => (
          <NewsWireCard
            id={item.id}
            title={item.title}
            summary={item.summary}
            category={item.category}
            sourceName={item.sourceName}
            parish={item.parish}
            lat={item.lat}
            lng={item.lng}
            url={item.url}
            publishedAt={item.publishedAt}
          />
        )}
      />
    </GridBackground>
  );
}
