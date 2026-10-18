import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import { currentMessage, retryAll, subscribe, snapshot } from "./outbox";
import { color } from "./theme";

/**
 * The queue, made visible.
 *
 * A silent retry queue is indistinguishable from a lost report, so this sits above the feed whenever something
 * is waiting or has given up. It says what happened to the words and offers the only useful action. It is not
 * an error banner: a queued report is a healthy state, and it is styled as information until it fails.
 */
export function OutboxBanner() {
  // Subscribes to the queue so the banner appears the moment a report is queued, without a polling timer.
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const message = currentMessage();
  if (!message) return null;

  const failed = /could not send/.test(message);

  return (
    <Pressable
      onPress={() => {
        void retryAll();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${message} Tap to try again.`}
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: failed ? color.danger500 : color.line,
        backgroundColor: failed ? "rgba(255,125,142,0.10)" : "rgba(46,230,208,0.08)",
        padding: 12,
        marginTop: 4,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ color: failed ? color.danger500 : color.tideLight, fontSize: 16, fontWeight: "900" }}>
          {failed ? "!" : "↑"}
        </Text>
        <Text style={{ color: color.text, fontSize: 13, flex: 1, lineHeight: 18 }}>{message}</Text>
        <Text style={{ color: color.tidePale, fontSize: 12, fontWeight: "800" }}>Send now</Text>
      </View>
    </Pressable>
  );
}
