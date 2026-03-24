import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmt(v: number) { return new Intl.NumberFormat("uz-UZ").format(v) + " so'm"; }

export default function WorkerPackagesScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("gethelp_token");
        const r = await fetch(`${BASE_URL}/worker-packages`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setPackages(d.packages || []); }
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
        <Text style={[styles.title, { color: C.text }]}>Usta paketlari</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : packages.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="hammer-outline" size={64} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Hozircha paketlar yo'q</Text>
          <Text style={[styles.emptyHint, { color: C.textMuted }]}>Do'kon egalari usta paketlarini qo'shadi</Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.icon, { backgroundColor: C.primary + "20" }]}>
                  <Ionicons name="hammer-outline" size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: C.text }]}>{item.name}</Text>
                  <Text style={[styles.shop, { color: C.textMuted }]}>{item.shop_name || "Do'kon"}</Text>
                </View>
                <Text style={[styles.price, { color: C.primary }]}>{fmt(item.price || 0)}</Text>
              </View>
              {item.description && <Text style={[styles.desc, { color: C.textSecondary }]}>{item.description}</Text>}
              {item.includes && (
                <View style={[styles.includes, { backgroundColor: C.surfaceSecondary }]}>
                  <Text style={[styles.includesTitle, { color: C.text }]}>Nima kiradi:</Text>
                  <Text style={[styles.includesText, { color: C.textMuted }]}>{item.includes}</Text>
                </View>
              )}
              <Pressable style={[styles.orderBtn, { backgroundColor: C.primary }]}>
                <Text style={styles.orderBtnText}>Buyurtma berish</Text>
              </Pressable>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 32 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  shop: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  price: { fontSize: 16, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  includes: { borderRadius: 10, padding: 10, gap: 4 },
  includesTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  includesText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  orderBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  orderBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
