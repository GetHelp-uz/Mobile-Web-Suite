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

const BENEFITS = [
  { icon: "pricetag-outline" as const, title: "Korporativ chegirmalar", desc: "30% gacha chegirma" },
  { icon: "document-text-outline" as const, title: "Kontrakt asosida", desc: "Oylik hisob-kitob" },
  { icon: "people-outline" as const, title: "Menejer yordami", desc: "Shaxsiy menejering" },
  { icon: "car-outline" as const, title: "Bepul yetkazib berish", desc: "Buyurtmangizga" },
];

export default function B2BScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("gethelp_token");
        const r = await fetch(`${BASE_URL}/b2b/orders`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setOrders(d.orders || []); }
      } catch {}
      setLoading(false);
    })();
  }, []));

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>B2B Portal</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ListHeaderComponent={() => (
            <View>
              <View style={[styles.banner, { backgroundColor: C.primary }]}>
                <Ionicons name="business-outline" size={32} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>Biznes uchun maxsus</Text>
                  <Text style={styles.bannerSub}>Korporativ mijozlar uchun qulay shartlar</Text>
                </View>
              </View>
              <Text style={[styles.sec, { color: C.text }]}>Imtiyozlar</Text>
              <View style={styles.benefits}>
                {BENEFITS.map((b, i) => (
                  <View key={i} style={[styles.benefitCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Ionicons name={b.icon} size={22} color={C.primary} />
                    <Text style={[styles.benefitTitle, { color: C.text }]}>{b.title}</Text>
                    <Text style={[styles.benefitDesc, { color: C.textMuted }]}>{b.desc}</Text>
                  </View>
                ))}
              </View>
              <Pressable style={[styles.applyBtn, { backgroundColor: C.primary }]}>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.applyBtnText}>B2B so'rov yuborish</Text>
              </Pressable>
              {orders.length > 0 && <Text style={[styles.sec, { color: C.text }]}>Mening buyurtmalarim</Text>}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: C.textMuted }]}>Hali buyurtmalar yo'q</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={[styles.orderCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.orderRow}>
                <Text style={[styles.orderId, { color: C.text }]}>#{item.id} — {item.company_name || "Korporativ buyurtma"}</Text>
                <View style={[styles.badge, { backgroundColor: C.primary + "20" }]}>
                  <Text style={[styles.badgeText, { color: C.primary }]}>{item.status || "Yangi"}</Text>
                </View>
              </View>
              <Text style={[styles.orderMeta, { color: C.textMuted }]}>Sana: {fmtDate(item.created_at)}</Text>
              {item.total_amount && <Text style={[styles.orderAmount, { color: C.primary }]}>Summa: {fmt(item.total_amount)}</Text>}
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
  banner: { borderRadius: 18, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  bannerTitle: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  bannerSub: { color: "#ffffff99", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  sec: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  benefits: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  benefitCard: { width: "47%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  benefitTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  benefitDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  applyBtn: { flexDirection: "row", gap: 8, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  applyBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyBox: { alignItems: "center", paddingVertical: 20 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  orderCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  orderMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  orderAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
