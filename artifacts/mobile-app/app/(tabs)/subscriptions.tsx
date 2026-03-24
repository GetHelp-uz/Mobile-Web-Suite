import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator, FlatList, Pressable,
  StyleSheet, Text, View, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("uz-UZ").format(v) + " so'm";
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ");
}

const STATUS_COLOR: Record<string, string> = {
  active: "#22C55E", expired: "#EF4444", pending: "#F59E0B",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Faol", expired: "Tugagan", pending: "Kutilmoqda",
};

export default function SubscriptionsScreen() {
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
        const r = await fetch(`${BASE_URL}/subscriptions/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const d = await r.json();
          setItems(d.subscriptions || []);
        }
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
        <Text style={[styles.title, { color: C.text }]}>Obunalar</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="card-outline" size={64} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Faol obunalar yo'q</Text>
          <Text style={[styles.emptySubText, { color: C.textMuted }]}>Obuna orqali asboblarni chegirma narxda ijaraga oling</Text>
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
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: C.primary + "20" }]}>
                    <Ionicons name="star-outline" size={22} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: C.text }]}>{item.plan_name || item.tariff_name || "Standart"}</Text>
                    <Text style={[styles.planPrice, { color: C.primary }]}>{formatCurrency(item.price || 0)} / oy</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.statusText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status}</Text>
                  </View>
                </View>
                <View style={[styles.sep, { backgroundColor: C.border }]} />
                <View style={styles.row}>
                  <Text style={[styles.meta, { color: C.textMuted }]}>Boshlanish: {formatDate(item.started_at || item.created_at)}</Text>
                  {item.expires_at && (
                    <Text style={[styles.meta, { color: C.textMuted }]}>Tugash: {formatDate(item.expires_at)}</Text>
                  )}
                </View>
                {item.features && (
                  <Text style={[styles.features, { color: C.textSecondary }]}>{item.features}</Text>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 32 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  planName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planPrice: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sep: { height: 1 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  features: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
