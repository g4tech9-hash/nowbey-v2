import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { api, errMsg } from "./api";
import { FLAG_REASONS } from "./geo";
import { getBlocked, setBlocked } from "./storage";
import { color, useTheme } from "./theme";
import { Pill, t } from "./ui";

/** People this phone's owner has blocked. Their reports, posts and comments are hidden everywhere in the app. */
let blocked = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export async function loadBlocked(): Promise<void> {
  blocked = new Set((await getBlocked()).map((h) => h.toLowerCase()));
  emit();
}

export const isBlocked = (handle?: string | null): boolean => Boolean(handle) && blocked.has(String(handle).toLowerCase());

export async function blockUser(handle: string): Promise<void> {
  blocked = new Set(blocked).add(handle.toLowerCase());
  emit();
  await setBlocked([...blocked]);
}

export async function unblockUser(handle: string): Promise<void> {
  const next = new Set(blocked);
  next.delete(handle.toLowerCase());
  blocked = next;
  emit();
  await setBlocked([...blocked]);
}

/** Re-renders the screen whenever someone is blocked or unblocked; returns the current list. */
export function useBlocked(): string[] {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return [...blocked].sort();
}

/** Report and Block for a report (pin) or an Island Life post. Comments have their own row in Engage.tsx. */
export function ReportBlock({ kind, id, authorHandle }: { kind: "incident" | "post"; id: string; authorHandle?: string | null }) {
  useTheme(); // repaint with the scheme
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const tool = { color: color.muted, fontSize: 12, fontWeight: "800" as const };

  async function send(reason: string) {
    try {
      if (kind === "post") await api.flagPost(id, reason);
      else await api.flagIncident(id, reason);
      setOpen(false);
      setNote("Thank you. Our team will take a look.");
    } catch (e) {
      setNote(errMsg(e));
    }
  }

  function block() {
    if (!authorHandle) return;
    Alert.alert(`Block @${authorHandle}?`, "You will no longer see their reports, posts or comments. You can unblock them in the You tab.", [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: () => void blockUser(authorHandle) },
    ]);
  }

  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: "row", gap: 18 }}>
        <Pressable onPress={() => setOpen(!open)} hitSlop={8} accessibilityRole="button">
          <Text style={tool}>Report this {kind === "post" ? "post" : "report"}</Text>
        </Pressable>
        {authorHandle ? (
          <Pressable onPress={block} hitSlop={8} accessibilityRole="button">
            <Text style={tool}>Block @{authorHandle}</Text>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <View style={{ marginTop: 8 }}>
          <Text style={t.subtle}>What is wrong with it?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
            {Object.entries(FLAG_REASONS).map(([key, label]) => (
              <Pill key={key} label={label} onPress={() => void send(key)} />
            ))}
          </View>
        </View>
      ) : null}
      {note ? <Text style={[t.ok, { marginTop: 6 }]}>{note}</Text> : null}
    </View>
  );
}
