import { Ionicons, Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmt(v: number) { return new Intl.NumberFormat("uz-UZ").format(v) + " so'm"; }

const STATUS_COLOR: Record<string, string> = { active: "#22C55E", rented: "#F59E0B", inactive: "#9CA3AF" };
const STATUS_LABEL: Record<string, string> = { active: "Mavjud", rented: "Ijarada", inactive: "Nofaol" };

export default function PeerListingsScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "mine">("browse");

  async function load(t = tab) {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const url = t === "mine" ? `${BASE_URL}/peer-listings/my` : `${BASE_URL}/peer-listings`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setItems(d.listings || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function switchTab(t: "browse" | "mine") { setTab(t); load(t); }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Peer Ijaralar</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        {(["browse", "mine"] as const).map(t => (
          <Pressable key={t} onPress={() => switchTab(t)}
            style={[styles.tabBtn, tab === t && { borderBottomColor: C.primary, borderBottomWidth: 2 }]}>
            <Text style={[styles.tabText, { color: tab === t ? C.primary : C.textMuted }]}>
              {t === "browse" ? "Barcha e'lonlar" : "Mening e'lonlarim"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="swap-horizontal-outline" size={64} color={C.textMuted} />
          <Text style={[styles.empty, { color: C.textMuted }]}>
            {tab === "browse" ? "Hali e'lonlar yo'q" : "Siz hali e'lon qo'shmagansiz"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const sc = STATUS_COLOR[item.status] || C.textMuted;
            return (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.row}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.img} />
                  ) : (
                    <View style={[styles.img, { backgroundColor: C.surfaceSecondary, justifyContent: "center", alignItems: "center" }]}>
                      <Ionicons name="construct-outline" size={24} color={C.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{item.title || item.tool_name}</Text>
                    <Text style={[styles.price, { color: C.primary }]}>{fmt(item.price_per_day || 0)} / kun</Text>
                    {item.location && <Text style={[styles.loc, { color: C.textMuted }]}><Feather name="map-pin" size={11} /> {item.location}</Text>}
                    {item.owner_name && <Text style={[styles.loc, { color: C.textMuted }]}><Ionicons name="person-outline" size={11} /> {item.owner_name}</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.badgeText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status}</Text>
                  </View>
                </View>
                {item.description && <Text style={[styles.desc, { color: C.textSecondary }]} numberOfLines={2}>{item.description}</Text>}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  empty: { fontSize: 15, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  img: { width: 64, height: 64, borderRadius: 10 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  price: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  loc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
