import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmt(v: number) { return new Intl.NumberFormat("uz-UZ").format(v) + " so'm"; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("uz-UZ"); }

const STATUS_COLOR: Record<string, string> = { pending: "#F59E0B", resolved: "#22C55E", rejected: "#EF4444" };
const STATUS_LABEL: Record<string, string> = { pending: "Kutilmoqda", resolved: "Hal qilindi", rejected: "Rad etildi" };

export default function DamageReportsScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!user?.shopId) return;
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("gethelp_token");
        const r = await fetch(`${BASE_URL}/damage-reports/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setItems(d.reports || []); }
      } catch {}
      setLoading(false);
    })();
  }, []));

  async function resolve(id: number) {
    const token = await AsyncStorage.getItem("gethelp_token");
    await fetch(`${BASE_URL}/damage-reports/${id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ resolvedNote: "Mobil ilova orqali hal qilindi" }) });
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "resolved" } : i));
  }

  const pending = items.filter(i => i.status === "pending").length;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Zararlar hisoboti</Text>
        {pending > 0 && <View style={[styles.badge, { backgroundColor: "#EF4444" }]}><Text style={styles.badgeNum}>{pending}</Text></View>}
        {pending === 0 && <View style={{ width: 36 }} />}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-checkmark-outline" size={64} color="#22C55E" />
          <Text style={[styles.empty, { color: C.textMuted }]}>Zararlar yo'q</Text>
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
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: item.status === "pending" ? "#F59E0B" : C.border, borderWidth: item.status === "pending" ? 1.5 : 1 }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.icon, { backgroundColor: sc + "20" }]}>
                    <Ionicons name="warning-outline" size={22} color={sc} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]}>{item.tool_name || "Asbob"}</Text>
                    <Text style={[styles.renter, { color: C.textMuted }]}>Ijara oluvchi: {item.customer_name || "—"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.statusText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status}</Text>
                  </View>
                </View>
                {item.description && <Text style={[styles.desc, { color: C.textSecondary }]}>{item.description}</Text>}
                <View style={styles.meta}>
                  {item.damage_cost && <Text style={[styles.cost, { color: "#EF4444" }]}>Zarar: {fmt(item.damage_cost)}</Text>}
                  <Text style={[styles.date, { color: C.textMuted }]}>{fmtDate(item.created_at || item.reported_at)}</Text>
                </View>
                {item.status === "pending" && (
                  <Pressable onPress={() => resolve(item.id)} style={[styles.resolveBtn, { backgroundColor: "#22C55E" }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.resolveBtnText}>Hal qilindi deb belgilash</Text>
                  </Pressable>
                )}
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
  badge: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  badgeNum: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  empty: { fontSize: 16, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, padding: 14, gap: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  renter: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  cost: { fontSize: 14, fontFamily: "Inter_700Bold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  resolveBtn: { flexDirection: "row", gap: 6, paddingVertical: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resolveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
