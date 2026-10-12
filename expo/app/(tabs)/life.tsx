import { isBlocked, useBlocked } from "../../src/Safety";
import { useCallback, useState } from "react";
import { Alert, FlatList, Image, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { API_BASE, api, errMsg, type LifePost } from "../../src/api";
import { LIFE_KINDS, REACTIONS, timeAgo, topReactions } from "../../src/geo";
import { useSession } from "../../src/session";
import { color } from "../../src/theme";
import { sanitizeArticleContent } from "../../src/lib/sanitize";

const kindOf = (k: string) => LIFE_KINDS[k] ?? LIFE_KINDS.tip;

export default function Life() {
  const router = useRouter();
  const top = useTopInset();
  const { user } = useSession();
  useBlocked();
  const [posts, setPosts] = useState<LifePost[]>([]);
  const [kind, setKind] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "loved">("new");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await api.life({ kind: kind ?? undefined, sort, limit: 20 });
      setPosts(d.posts);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [kind, sort]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** A quick tap on the heart is a like. The full set of reactions is on the post. */
  async function quickLike(p: LifePost) {
    if (!user) {
      Alert.alert("Sign in to react", "Open the You tab to sign in or create an account.");
      return;
    }
    const next = p.myReaction === "like" ? null : "like";
    const patch = (fn: (x: LifePost) => LifePost) => setPosts((cur) => cur.map((x) => (x.id === p.id ? fn(x) : x)));
    const counts = { ...p.reactions };
    if (p.myReaction) counts[p.myReaction] = Math.max(0, (counts[p.myReaction] ?? 0) - 1);
    if (next) counts[next] = (counts[next] ?? 0) + 1;
    patch((x) => ({ ...x, myReaction: next, reactions: counts, likeCount: Object.values(counts).reduce<number>((s, n) => s + (n ?? 0), 0) }));
    try {
      const r = await api.react("post", p.id, next);
      patch((x) => ({ ...x, myReaction: r.mine, reactions: r.counts, likeCount: r.total }));
    } catch (e) {
      patch(() => p);
      Alert.alert("Could not update", errMsg(e));
    }
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: color.bg }}
      data={posts.filter((p) => !isBlocked(p.authorHandle))}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 16, paddingTop: top + 12, paddingBottom: 32, gap: 12 }}
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
            <View style={{ flexShrink: 1 }}>
              <Text style={t.h1}>Island Life</Text>
              <Text style={t.subtle}>Where the islands eat, celebrate and unwind</Text>
            </View>
            <Btn label="Share" onPress={() => void Linking.openURL(`${API_BASE}/life/new`).catch(() => {})} style={{ paddingVertical: 8, minHeight: 38 }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pill label="Everything" active={kind === null} onPress={() => setKind(null)} />
            {Object.entries(LIFE_KINDS).map(([key, k]) => (
              <Pill key={key} label={k.label} tint={k.color} active={kind === key} onPress={() => setKind(kind === key ? null : key)} />
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row" }}>
            <Pill label="Newest" active={sort === "new"} onPress={() => setSort("new")} />
            <Pill label="Most loved" active={sort === "loved"} onPress={() => setSort("loved")} />
          </View>
          {error ? <Text style={t.error}>{error}</Text> : null}
          <Text style={t.subtle}>Tap a post to react and comment. To write a post or add photos, the app opens the website.</Text>
        </View>
      }
      renderItem={({ item: p }) => {
        const k = kindOf(p.kind);
        const top3 = topReactions(p.reactions);
        return (
          <Pressable onPress={() => router.push(`/post/${p.id}`)} accessibilityRole="button" accessibilityLabel={p.title}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {p.firstPhotoId ? (
                <Image
                  source={{ uri: `${API_BASE}/api/photos/${p.firstPhotoId}?size=thumb` }}
                  style={{ width: "100%", aspectRatio: 1.6, backgroundColor: color.panel2 }}
                  resizeMode="cover"
                  accessibilityLabel={`Photo from ${p.placeName ?? p.title}`}
                />
              ) : null}
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <View style={{ backgroundColor: `${k.color}26`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                    <Text style={{ color: k.color, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.6 }}>{k.label.toUpperCase()}</Text>
                  </View>
                  {p.parish ? <Text style={t.subtle}>{p.parish}</Text> : null}
                  <Text style={[t.subtle, { marginLeft: "auto" }]}>{timeAgo(p.createdAt)}</Text>
                </View>
                {p.placeName ? (
                  <Text style={{ color: color.sand, fontSize: 13, fontWeight: "700", marginTop: 8 }}>
                    {p.placeName}
                    {p.rating ? <Text style={{ color: color.sun }}>{`  ${"★".repeat(p.rating)}${"☆".repeat(5 - p.rating)}`}</Text> : null}
                    {p.priceLevel ? <Text style={{ color: color.tidePale }}>{`  ${"$".repeat(p.priceLevel)}`}</Text> : null}
                  </Text>
                ) : null}
                <Text style={[t.h3, { marginTop: 4 }]}>{p.title}</Text>
                <Text style={[t.muted, { marginTop: 4 }]} numberOfLines={3}>
                  {sanitizeArticleContent(p.body)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <Text style={t.subtle}>@{p.authorHandle}</Text>
                  <BadgeMark kind={p.authorBadge} />
                  <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 10 }}>
                    {p.likeCount > 0 ? (
                      <Text style={t.subtle}>
                        {top3.map((r) => REACTIONS[r].emoji).join("")} {p.likeCount}
                      </Text>
                    ) : null}
                    <Text style={t.subtle}>
                      {p.commentCount} {p.commentCount === 1 ? "comment" : "comments"}
                    </Text>
                    <Pressable
                      onPress={() => void quickLike(p)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: p.myReaction === "like" }}
                      accessibilityLabel={p.myReaction === "like" ? "Remove your like" : "Like this post"}
                      hitSlop={8}
                      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: p.myReaction ? "rgba(0,201,183,0.2)" : "rgba(255,255,255,0.08)" }}
                    >
                      <Text style={{ fontSize: 15 }}>{p.myReaction ? REACTIONS[p.myReaction].emoji : "👍"}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        loading ? null : (
          <Card style={{ alignItems: "center" }}>
            <Text style={t.h3}>Nothing here yet</Text>
            <Text style={[t.muted, { marginTop: 6, textAlign: "center" }]}>Be the first to share a favourite spot or how an event went.</Text>
            <Btn label="Share an experience" onPress={() => void Linking.openURL(`${API_BASE}/life/new`).catch(() => {})} style={{ marginTop: 12 }} />
          </Card>
        )
      }
    />
  );
}

