import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { api, errMsg, type CommentNode, type Engagement, type ReactionKind, type TargetType } from "./api";
import { FLAG_REASONS, REACTIONS, REACTION_KEYS, timeAgo } from "./geo";
import { blockUser, isBlocked, useBlocked } from "./Safety";
import { useSession } from "./session";
import { color, radius, useTheme } from "./theme";
import { BadgeMark, Btn, Card, Pill, t } from "./ui";

const COMMENT_MAX = 500;

type Thread = { comments: CommentNode[]; total: number; truncated: boolean; engagement: Engagement; open: boolean };

/** Reactions and comments for a pin or a post. Everything is done here, in the app. */
export function Conversation({ type, id }: { type: TargetType; id: string }) {
  useTheme(); // repaint with the scheme
  const { user } = useSession();
  useBlocked();
  const [data, setData] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reactError, setReactError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api.comments(type, id));
    } catch (e) {
      setError(errMsg(e));
    }
  }, [type, id]);

  useEffect(() => {
    void load();
  }, [load, user?.handle]);

  async function react(kind: ReactionKind) {
    if (!data) return;
    if (!user) {
      Alert.alert("Sign in to react", "Open the You tab to sign in or create an account.");
      return;
    }
    if (busy) return;
    const before = data.engagement;
    const next: ReactionKind | null = before.mine === kind ? null : kind;
    const counts = { ...before.counts };
    if (before.mine) counts[before.mine] = Math.max(0, (counts[before.mine] ?? 0) - 1);
    if (next) counts[next] = (counts[next] ?? 0) + 1;
    const total = Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0);
    setData({ ...data, engagement: { ...before, counts, total, mine: next } });
    setBusy(true);
    setReactError(null);
    try {
      const res = await api.react(type, id, next);
      setData((cur) => (cur ? { ...cur, engagement: { ...cur.engagement, counts: res.counts, total: res.total, mine: res.mine } } : cur));
    } catch (e) {
      setData((cur) => (cur ? { ...cur, engagement: before } : cur));
      setReactError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <Card>
        <Text style={t.error}>{error}</Text>
        <Btn label="Try again" kind="ghost" onPress={() => void load()} style={{ marginTop: 10 }} />
      </Card>
    );
  }
  if (!data) {
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator color={color.tideLight} />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Text style={t.h3}>What do you think?</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 }}>
          {REACTION_KEYS.map((k) => {
            const on = data.engagement.mine === k;
            const n = data.engagement.counts[k] ?? 0;
            return (
              <Pressable
                key={k}
                onPress={() => void react(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${REACTIONS[k].label}${n ? `, ${n}` : ""}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 40,
                  paddingHorizontal: 13,
                  borderRadius: radius.pill,
                  backgroundColor: on ? "rgba(0,201,183,0.25)" : "rgba(255,255,255,0.08)",
                  borderWidth: 1,
                  borderColor: on ? color.tide : "transparent",
                }}
              >
                <Text style={{ fontSize: 17 }}>{REACTIONS[k].emoji}</Text>
                {n > 0 ? <Text style={{ color: on ? color.tidePale : color.muted, fontWeight: "800", fontSize: 13 }}>{n}</Text> : null}
              </Pressable>
            );
          })}
        </View>
        {reactError ? <Text style={[t.error, { marginTop: 8 }]}>{reactError}</Text> : null}
      </Card>

      <Card>
        <Text style={t.h3}>
          {data.total} {data.total === 1 ? "comment" : "comments"}
        </Text>
        {data.open ? (
          <View style={{ marginTop: 6 }}>
            <Composer type={type} id={id} onDone={load} />
          </View>
        ) : (
          <Text style={[t.muted, { marginTop: 6 }]}>Comments are closed on this one.</Text>
        )}
        <View style={{ marginTop: 12, gap: 10 }}>
          {data.comments.filter((c) => !isBlocked(c.authorHandle)).map((c) => (
            <CommentRow key={c.id} c={c} type={type} id={id} open={data.open} onChange={load} />
          ))}
          {data.comments.length === 0 ? <Text style={t.muted}>No comments yet. Be the first.</Text> : null}
        </View>
        {data.truncated ? <Text style={[t.subtle, { marginTop: 8 }]}>Showing the 200 most recent conversations. Older ones are not shown.</Text> : null}
      </Card>
    </View>
  );
}

function Composer({ type, id, parentId, initial = "", onDone, onCancel }: { type: TargetType; id: string; parentId?: number; initial?: string; onDone: () => void | Promise<void>; onCancel?: () => void }) {
  useTheme(); // repaint with the scheme
  const { user } = useSession();
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <Text style={t.muted}>Open the You tab to sign in, then join the conversation.</Text>;
  }

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await api.addComment(type, id, body.trim(), parentId);
      setBody("");
      onCancel?.();
      await onDone();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <TextInput
        value={body}
        onChangeText={setBody}
        maxLength={COMMENT_MAX}
        multiline
        placeholder={parentId ? "Write a reply…" : "Add a comment, a tip or a question…"}
        placeholderTextColor={color.subtle}
        accessibilityLabel={parentId ? "Write a reply" : "Add a comment"}
        style={{
          minHeight: parentId ? 64 : 84,
          textAlignVertical: "top",
          backgroundColor: "rgba(3,18,27,0.7)",
          borderColor: color.line,
          borderWidth: 1,
          borderRadius: radius.md,
          color: color.sand,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 15,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
        <Btn label={parentId ? "Reply" : "Post comment"} busy={busy} disabled={body.trim().length < 1} onPress={() => void send()} style={{ paddingVertical: 8, minHeight: 38 }} />
        {onCancel ? <Btn label="Cancel" kind="ghost" onPress={onCancel} style={{ paddingVertical: 8, minHeight: 38 }} /> : null}
        <Text style={[t.subtle, { marginLeft: "auto" }]}>
          {body.length}/{COMMENT_MAX}
        </Text>
      </View>
      {error ? <Text style={[t.error, { marginTop: 6 }]}>{error}</Text> : null}
    </View>
  );
}

function CommentRow({ c, type, id, open, onChange, nested = false }: { c: CommentNode; type: TargetType; id: string; open: boolean; onChange: () => void | Promise<void>; nested?: boolean }) {
  useTheme(); // repaint with the scheme
  const { user } = useSession();
  const [panel, setPanel] = useState<"reply" | "report" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function remove() {
    try {
      await api.deleteComment(c.id);
      await onChange();
    } catch (e) {
      Alert.alert("Could not delete", errMsg(e));
    }
  }

  async function report(reason: string) {
    try {
      const r = await api.flagComment(c.id, reason);
      setPanel(null);
      setNote(r.already ? "You have already reported this. Thank you." : "Thank you. Our team will take a look.");
    } catch (e) {
      setNote(errMsg(e));
    }
  }

  const tool = { color: color.muted, fontSize: 12, fontWeight: "800" as const };
  return (
    <View style={nested ? { paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: "rgba(255,255,255,0.12)" } : undefined}>
      {c.placeholder ? (
        <Text style={[t.subtle, { fontStyle: "italic" }]}>{c.status === "hidden" ? "This comment was hidden by a moderator." : "This comment was deleted."}</Text>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ color: color.sand, fontWeight: "800", fontSize: 13 }}>@{c.authorHandle}</Text>
            <BadgeMark kind={c.badge} />
            <Text style={t.subtle}>{timeAgo(c.createdAt)}</Text>
          </View>
          <Text style={[t.body, { marginTop: 3 }]}>{c.body}</Text>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
            {open ? (
              <Pressable onPress={() => setPanel(panel === "reply" ? null : "reply")} hitSlop={8} accessibilityRole="button">
                <Text style={tool}>Reply</Text>
              </Pressable>
            ) : null}
            {!c.mine ? (
              <Pressable onPress={() => setPanel(panel === "report" ? null : "report")} hitSlop={8} accessibilityRole="button">
                <Text style={tool}>Report</Text>
              </Pressable>
            ) : null}
            {!c.mine ? (
              <Pressable
                onPress={() =>
                  Alert.alert(`Block @${c.authorHandle}?`, "You will no longer see their reports, posts or comments. You can unblock them in the You tab.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Block", style: "destructive", onPress: () => void blockUser(c.authorHandle) },
                  ])
                }
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={tool}>Block</Text>
              </Pressable>
            ) : null}
            {c.mine ? (
              <Pressable
                onPress={() => Alert.alert("Delete this comment?", undefined, [{ text: "Keep it", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void remove() }])}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={[tool, { color: color.conchLight }]}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
          {panel === "reply" ? (
            <View style={{ marginTop: 8 }}>
              <Composer type={type} id={id} parentId={c.id} initial={`@${c.authorHandle} `} onDone={onChange} onCancel={() => setPanel(null)} />
            </View>
          ) : null}
          {panel === "report" ? (
            <View style={{ marginTop: 8 }}>
              <Text style={t.subtle}>What is wrong with this comment?</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                {Object.entries(FLAG_REASONS).map(([key, label]) => (
                  <Pill key={key} label={label} onPress={() => void report(key)} />
                ))}
              </View>
            </View>
          ) : null}
          {note ? <Text style={[t.ok, { marginTop: 6 }]}>{note}</Text> : null}
        </>
      )}
      {c.replies.length ? (
        <View style={{ marginTop: 10, gap: 10 }}>
          {c.replies.filter((r) => !isBlocked(r.authorHandle)).map((r) => (
            <CommentRow key={r.id} c={r} type={type} id={id} open={open} onChange={onChange} nested />
          ))}
        </View>
      ) : null}
    </View>
  );
}
