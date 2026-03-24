import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmtDate(d: string) { return new Date(d).toLocaleDateString("uz-UZ"); }

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name={i <= Math.round(rating) ? "star" : "star-outline"} size={size} color="#F59E0B" />
      ))}
    </View>
  );
}

export default function ShopRatingsScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [ratings, setRatings] = useState<any[]>([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!user?.shopId) return;
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("gethelp_token");
        const r = await fetch(`${BASE_URL}/ratings/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setRatings(d.ratings || []); setSummary({ average: d.average || 0, count: d.count || 0 }); }
      } catch {}
      setLoading(false);
    })();
  }, []));

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Baholar va sharhlar</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={ratings}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ListHeaderComponent={() => (
            <View style={[styles.summary, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.avgNum, { color: C.text }]}>{summary.average.toFixed(1)}</Text>
              <Stars rating={summary.average} size={24} />
              <Text style={[styles.reviewCount, { color: C.textMuted }]}>{summary.count} ta sharh</Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Ionicons name="star-outline" size={64} color={C.textMuted} />
              <Text style={[styles.empty, { color: C.textMuted }]}>Hali sharhlar yo'q</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: C.primary }]}>
                  <Text style={styles.avatarText}>{(item.customer_name || "?")[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.customerName, { color: C.text }]}>{item.customer_name || "Mijoz"}</Text>
                  <Text style={[styles.toolName, { color: C.textMuted }]}>{item.tool_name || "Asbob"}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Stars rating={item.rating} />
                  <Text style={[styles.date, { color: C.textMuted }]}>{fmtDate(item.created_at)}</Text>
                </View>
              </View>
              {item.comment && <Text style={[styles.comment, { color: C.textSecondary }]}>{item.comment}</Text>}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, minHeight: 200 },
  empty: { fontSize: 16, fontFamily: "Inter_400Regular" },
  summary: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginBottom: 16 },
  avgNum: { fontSize: 48, fontFamily: "Inter_700Bold" },
  reviewCount: { fontSize: 14, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  customerName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  toolName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  comment: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
