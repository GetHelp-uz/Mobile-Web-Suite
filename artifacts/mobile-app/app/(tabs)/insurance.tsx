import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmt(v: number) { return new Intl.NumberFormat("uz-UZ").format(v) + " so'm"; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("uz-UZ"); }

const STATUS_COLOR: Record<string, string> = { active: "#22C55E", expired: "#EF4444", pending: "#F59E0B" };
const STATUS_LABEL: Record<string, string> = { active: "Faol", expired: "Tugagan", pending: "Ko'rib chiqilmoqda" };

export default function InsuranceScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("gethelp_token");
        const r = await fetch(`${BASE_URL}/insurance/my`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setItems(d.policies || []); }
      } catch {}
      setLoading(false);
    })();
  }, []));

  const plans = [
    { name: "Asosiy himoya", price: 15000, desc: "Kuniga 15 000 so'm, asbob zarar ko'rganda 80% qoplanadi", icon: "shield-outline" as const },
    { name: "To'liq himoya", price: 30000, desc: "Kuniga 30 000 so'm, barcha zararlar 100% qoplanadi", icon: "shield-checkmark-outline" as const },
    { name: "Premium", price: 50000, desc: "Kuniga 50 000 so'm, o'g'irlik va yo'qolish ham qoplanadi", icon: "shield-half-outline" as const },
  ];

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Sug'urta</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={[{ type: "plans" }, ...(items.map(i => ({ type: "policy", data: i })))]}
          keyExtractor={(_, idx) => String(idx)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ListHeaderComponent={() => (
            <View>
              <Text style={[styles.sec, { color: C.text }]}>Sug'urta rejalari</Text>
              {plans.map((p, i) => (
                <View key={i} style={[styles.planCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={[styles.planIcon, { backgroundColor: "#22C55E20" }]}>
                    <Ionicons name={p.icon} size={24} color="#22C55E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: C.text }]}>{p.name}</Text>
                    <Text style={[styles.planDesc, { color: C.textMuted }]}>{p.desc}</Text>
                    <Text style={[styles.planPrice, { color: C.primary }]}>{fmt(p.price)} / kun</Text>
                  </View>
                </View>
              ))}
              {items.length > 0 && <Text style={[styles.sec, { color: C.text, marginTop: 16 }]}>Mening sug'urtalarim</Text>}
            </View>
          )}
          renderItem={({ item }: { item: any }) => {
            if (item.type !== "policy") return null;
            const d = item.data;
            const sc = STATUS_COLOR[d.status] || C.textMuted;
            return (
              <View style={[styles.policyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.policyRow}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#22C55E" />
                  <Text style={[styles.policyName, { color: C.text }]}>{d.plan_name || "Sug'urta"}</Text>
                  <View style={[styles.badge, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.badgeText, { color: sc }]}>{STATUS_LABEL[d.status] || d.status}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: C.textMuted }]}>Boshlanish: {fmtDate(d.started_at || d.created_at)}</Text>
                  {d.expires_at && <Text style={[styles.meta, { color: C.textMuted }]}>Tugash: {fmtDate(d.expires_at)}</Text>}
                </View>
                {d.coverage_amount && <Text style={[styles.coverage, { color: C.primary }]}>Qoplash summasi: {fmt(d.coverage_amount)}</Text>}
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyPolicy}>
              <Text style={[styles.emptyText, { color: C.textMuted }]}>Hali faol sug'urtalar yo'q</Text>
              <Text style={[styles.emptyHint, { color: C.textMuted }]}>Ijara buyurtma berayotganda sug'urta qo'shing</Text>
            </View>
          )}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sec: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  planCard: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12, alignItems: "flex-start" },
  planIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  planName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  planPrice: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4 },
  policyCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 8 },
  policyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  policyName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  coverage: { fontSize: 13, fontFamily: "Inter_700Bold" },
  emptyPolicy: { alignItems: "center", gap: 6, paddingVertical: 20 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
