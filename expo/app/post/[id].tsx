import { ReportBlock } from "../../src/Safety";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE, api, errMsg, type LifePost } from "../../src/api";
import { LIFE_KINDS, timeAgo } from "../../src/geo";
import { Conversation } from "../../src/Engage";
import { color } from "../../src/theme";
import { BadgeMark, Btn, Card, t, useTopInset } from "../../src/ui";

type Photo = { id: string; width: number; height: number };

export default function PostScreen() {
  const router = useRouter();
  const top = useTopInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<LifePost | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const r = await api.lifePost(String(id));
      setPost(r.post);
      setPhotos(r.photos);
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
  if (error || !post) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, padding: 20, paddingTop: top + 12 }}>
        {back}
        <Text style={[t.h2, { marginTop: 8 }]}>Could not open this post</Text>
        <Text style={[t.muted, { marginTop: 6 }]}>{error ?? "It may have been removed."}</Text>
      </View>
    );
  }

  const kind = LIFE_KINDS[post.kind] ?? LIFE_KINDS.tip;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ paddingTop: top + 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {back}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <View style={{ backgroundColor: `${kind.color}26`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ color: kind.color, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.6 }}>{kind.label.toUpperCase()}</Text>
          </View>
          {post.parish ? <Text style={t.subtle}>{post.parish}</Text> : null}
          <Text style={t.subtle}>{timeAgo(post.createdAt)}</Text>
        </View>
        {post.placeName ? (
          <Text style={{ color: color.sand, fontSize: 14, fontWeight: "700" }}>
            {post.placeName}
            {post.rating ? <Text style={{ color: color.sun }}>{`  ${"★".repeat(post.rating)}${"☆".repeat(5 - post.rating)}`}</Text> : null}
            {post.priceLevel ? <Text style={{ color: color.tidePale }}>{`  ${"$".repeat(post.priceLevel)}`}</Text> : null}
          </Text>
        ) : null}
        <Text style={t.h1}>{post.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={t.subtle}>@{post.authorHandle}</Text>
          <BadgeMark kind={post.authorBadge} />
        </View>
        <ReportBlock kind="post" id={post.id} authorHandle={post.authorHandle} />
      </View>

      {photos.length ? (
        <View style={{ marginTop: 14, gap: 8, paddingHorizontal: 16 }}>
          {photos.map((p, i) => (
            <Image
              key={p.id}
              source={{ uri: `${API_BASE}/api/photos/${p.id}` }}
              style={{ width: "100%", aspectRatio: Math.min(1.8, Math.max(0.75, p.width / p.height)), borderRadius: 16, backgroundColor: color.panel2 }}
              resizeMode="cover"
              accessibilityLabel={`Photo ${i + 1} from ${post.placeName ?? post.title}`}
            />
          ))}
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 16, marginTop: 14, gap: 14 }}>
        <Text style={t.body}>{post.body}</Text>
        <Conversation type="post" id={post.id} />
        <Card>
          <Text style={t.muted}>To add photos or write your own post, use the website.</Text>
          <Btn label="Open on the website" kind="ghost" onPress={() => void Linking.openURL(`${API_BASE}/life/${post.id}`).catch(() => {})} style={{ marginTop: 10 }} />
        </Card>
      </View>
    </ScrollView>
  );
}
