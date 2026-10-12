import { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api, errMsg, type GasBoard } from "../../src/api";
import { PARISHES, timeAgo } from "../../src/geo";
import { useSession } from "../../src/session";
import { color } from "../../src/theme";
import { Btn, Card, Field, t, useTopInset } from "../../src/ui";

const money = (c: number) => `B$${(c / 100).toFixed(2)}`;
const FUELS = ["regular", "premium", "diesel"] as const;

export default function Gas() {
  const top = useTopInset();
  const { user } = useSession();
  const [board, setBoard] = useState<GasBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [station, setStation] = useState("");
  const [parish, setParish] = useState<string>("New Providence");
  const [fuel, setFuel] = useState<(typeof FUELS)[number]>("regular");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setBoard(await api.gas());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  async function send() {
    setBusy(true);
    try {
      await api.reportGas({ station: station.trim(), parish, fuel, price: price.trim() });
      setPrice("");
      Alert.alert("Thanks", "Your price is on the board.");
      await load();
    } catch (e) {
      Alert.alert("Could not save that price", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Btn key={label} label={label} kind={on ? "primary" : "ghost"} onPress={onPress} style={{ marginRight: 6, marginTop: 6 }} />
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: color.bg }}
      data={board?.stations ?? []}
      keyExtractor={(s) => `${s.station}${s.parish}${s.fuel}`}
      contentContainerStyle={{ padding: 16, paddingTop: top + 12, paddingBottom: 32, gap: 10 }}
      refreshControl={<RefreshControl tintColor={color.tideLight} refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View>
            <Text style={t.h1}>Gas prices</Text>
            <Text style={t.subtle}>Reported by members in the last two weeks, B$ per gallon</Text>
          </View>
          {error ? <Text style={{ color: "#ff8a80" }}>{error}</Text> : null}
          {(board?.stats ?? []).map((s) => (
            <Card key={s.fuel}>
              <Text style={t.label}>{s.fuel.toUpperCase()}</Text>
              <Text style={t.h1}>{s.averageCents ? `${money(s.averageCents)} average` : "No reports yet"}</Text>
              <Text style={t.muted}>{s.cheapest ? `Cheapest: ${money(s.cheapest.priceCents)} at ${s.cheapest.station}, ${s.cheapest.parish}` : "Be the first to report one."}</Text>
              {board?.official?.[s.fuel] ? <Text style={t.subtle}>Government price: {money(board.official[s.fuel]!)}</Text> : null}
            </Card>
          ))}
          <Card>
            <Text style={t.h2}>Report a price</Text>
            {user ? (
              <View>
                <Field label="Station" value={station} onChangeText={setStation} placeholder="Shell, Prince George Wharf" autoCapitalize="words" />
                <Text style={[t.label, { marginTop: 10 }]}>Fuel</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{FUELS.map((f) => chip(f, fuel === f, () => setFuel(f)))}</View>
                <Text style={[t.label, { marginTop: 10 }]}>Island</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{PARISHES.map((p) => chip(p, parish === p, () => setParish(p)))}</View>
                <Field label="Price per gallon (B$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="5.49" />
                <Btn label="Report price" busy={busy} disabled={station.trim().length < 2 || !price.trim()} onPress={send} style={{ marginTop: 12 }} />
              </View>
            ) : (
              <Text style={t.muted}>Sign in on the You tab to report a price. Anyone can read them.</Text>
            )}
          </Card>
          <Text style={t.h2}>Station prices, cheapest first</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={t.h2}>{item.station}</Text>
              <Text style={t.subtle}>{item.parish} · {item.fuel} · {timeAgo(item.reportedAt)}</Text>
            </View>
            <Text style={[t.h1, { color: color.tideLight }]}>{money(item.priceCents)}</Text>
          </View>
        </Card>
      )}
      ListEmptyComponent={<Text style={t.muted}>No prices yet.</Text>}
    />
  );
}
