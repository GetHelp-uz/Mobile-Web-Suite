import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmtDate(d: string) { return new Date(d).toLocaleDateString("uz-UZ"); }

const STATUS_COLOR: Record<string, string> = { pending: "#F59E0B", signed: "#22C55E", rejected: "#EF4444", expired: "#9CA3AF" };
const STATUS_LABEL: Record<string, string> = { pending: "Imzo kutilmoqda", signed: "Imzolangan", rejected: "Rad etildi", expired: "Muddati o'tgan" };
const STATUS_ICON: Record<string, any> = { pending: "time-outline", signed: "checkmark-circle-outline", rejected: "close-circle-outline", expired: "alert-circle-outline" };

export default function ESignScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("gethelp_token");
        const r = await fetch(`${BASE_URL}/e-sign/my`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setDocs(d.documents || []); }
      } catch {}
      setLoading(false);
    })();
  }, []));

  async function sign(id: number) {
    const token = await AsyncStorage.getItem("gethelp_token");
    const r = await fetch(`${BASE_URL}/e-sign/${id}/sign`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ signedAt: new Date().toISOString() }) });
    if (r.ok) setDocs(prev => prev.map(d => d.id === id ? { ...d, status: "signed" } : d));
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Elektron imzo</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : docs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color={C.textMuted} />
          <Text style={[styles.empty, { color: C.textMuted }]}>Hujjatlar yo'q</Text>
          <Text style={[styles.emptyHint, { color: C.textMuted }]}>Ijara shartnomasi tuzilganda bu yerda ko'rinadi</Text>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const sc = STATUS_COLOR[item.status] || C.textMuted;
            const ic = STATUS_ICON[item.status] || "document-outline";
            return (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: item.status === "pending" ? "#F59E0B" : C.border, borderWidth: item.status === "pending" ? 1.5 : 1 }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.icon, { backgroundColor: sc + "20" }]}>
                    <Ionicons name={ic} size={22} color={sc} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]}>{item.title || "Ijara shartnomasi"}</Text>
                    <Text style={[styles.meta, { color: C.textMuted }]}>{item.shop_name || "Do'kon"} • {fmtDate(item.created_at)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.badgeText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status}</Text>
                  </View>
                </View>
                {item.description && <Text style={[styles.desc, { color: C.textSecondary }]}>{item.description}</Text>}
                {item.expires_at && <Text style={[styles.expiry, { color: C.textMuted }]}>Amal qilish muddati: {fmtDate(item.expires_at)}</Text>}
                {item.status === "pending" && (
                  <View style={styles.actions}>
                    <Pressable onPress={() => sign(item.id)} style={[styles.signBtn, { backgroundColor: "#22C55E" }]}>
                      <Ionicons name="pencil-outline" size={16} color="#fff" />
                      <Text style={styles.signBtnText}>Imzolash</Text>
                    </Pressable>
                  </View>
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
  empty: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 16, padding: 14, gap: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  expiry: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10 },
  signBtn: { flex: 1, flexDirection: "row", gap: 6, paddingVertical: 11, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  signBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
