import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmt(v: number) { return new Intl.NumberFormat("uz-UZ").format(v) + " so'm"; }

const STATUS_COLOR: Record<string, string> = { available: "#22C55E", rented: "#F59E0B", maintenance: "#3B82F6", lost: "#EF4444" };
const STATUS_LABEL: Record<string, string> = { available: "Mavjud", rented: "Ijarada", maintenance: "Ta'mirda", lost: "Yo'qolgan" };

export default function InventoryScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [updateModal, setUpdateModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [newStock, setNewStock] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.shopId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/tools?shopId=${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setTools(d.tools || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = tools.filter(t => {
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: tools.length,
    available: tools.filter(t => t.status === "available").length,
    rented: tools.filter(t => t.status === "rented").length,
    maintenance: tools.filter(t => t.status === "maintenance").length,
  };

  async function updateStock() {
    if (!selectedTool || !newStock) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      await fetch(`${BASE_URL}/tools/${selectedTool.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stock: Number(newStock) }),
      });
      setUpdateModal(false);
      load();
    } catch {}
    setSaving(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Inventarizatsiya</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.searchBox, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={[styles.searchInput, { backgroundColor: C.surfaceSecondary }]}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput style={[styles.searchText, { color: C.text }]} value={search} onChangeText={setSearch}
            placeholder="Asbob qidirish..." placeholderTextColor={C.textMuted} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { backgroundColor: C.surface }]} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8, flexDirection: "row" }}>
        {[["all", "Barchasi"], ["available", "Mavjud"], ["rented", "Ijarada"], ["maintenance", "Ta'mirda"]].map(([v, l]) => (
          <Pressable key={v} onPress={() => setFilterStatus(v)}
            style={[styles.filterBtn, { backgroundColor: filterStatus === v ? C.primary : C.surfaceSecondary, borderColor: filterStatus === v ? C.primary : C.border }]}>
            <Text style={[styles.filterBtnText, { color: filterStatus === v ? "#fff" : C.textMuted }]}>{l}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ListHeaderComponent={() => (
            <View style={styles.statsRow}>
              {[["Jami", stats.total, C.text], ["Mavjud", stats.available, "#22C55E"], ["Ijarada", stats.rented, "#F59E0B"], ["Ta'mirda", stats.maintenance, "#3B82F6"]].map(([l, v, c], i) => (
                <View key={i} style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Text style={[styles.statVal, { color: c as string }]}>{v as number}</Text>
                  <Text style={[styles.statLabel, { color: C.textMuted }]}>{l}</Text>
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Text style={[styles.empty, { color: C.textMuted }]}>Asboblar topilmadi</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const sc = STATUS_COLOR[item.status] || C.textMuted;
            return (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]}>{item.name}</Text>
                    <Text style={[styles.cat, { color: C.textMuted }]}>{item.category}</Text>
                    <Text style={[styles.price, { color: C.primary }]}>{fmt(item.pricePerDay || item.price_per_day || 0)}/kun</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={[styles.statusBadge, { backgroundColor: sc + "20" }]}>
                      <Text style={[styles.statusText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status}</Text>
                    </View>
                    {item.stock !== undefined && (
                      <View style={styles.stockRow}>
                        <Text style={[styles.stockLabel, { color: C.textMuted }]}>Soni:</Text>
                        <Text style={[styles.stockVal, { color: C.text }]}>{item.stock}</Text>
                        <Pressable onPress={() => { setSelectedTool(item); setNewStock(String(item.stock || 1)); setUpdateModal(true); }}
                          style={[styles.editStockBtn, { backgroundColor: C.surfaceSecondary }]}>
                          <Ionicons name="pencil" size={12} color={C.primary} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={updateModal} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.updateModal, { backgroundColor: C.surface }]}>
            <Text style={[styles.updateTitle, { color: C.text }]}>Miqdorni yangilash</Text>
            <Text style={[styles.updateName, { color: C.textMuted }]}>{selectedTool?.name}</Text>
            <TextInput style={[styles.updateInput, { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
              value={newStock} onChangeText={setNewStock} keyboardType="numeric" placeholder="Miqdor" placeholderTextColor={C.textMuted} />
            <View style={styles.updateBtns}>
              <Pressable onPress={() => setUpdateModal(false)} style={[styles.cancelBtn, { borderColor: C.border }]}>
                <Text style={[styles.cancelBtnText, { color: C.text }]}>Bekor</Text>
              </Pressable>
              <Pressable onPress={updateStock} disabled={saving} style={[styles.confirmBtn, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}>
                <Text style={styles.confirmBtnText}>{saving ? "..." : "Saqlash"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold" },
  searchBox: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchInput: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  filterScroll: { maxHeight: 52 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 200 },
  empty: { fontSize: 15, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center" },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cat: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  price: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  stockRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stockLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stockVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  editStockBtn: { width: 22, height: 22, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  overlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "center", alignItems: "center" },
  updateModal: { borderRadius: 20, padding: 24, width: "80%", gap: 12 },
  updateTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  updateName: { fontSize: 14, fontFamily: "Inter_400Regular" },
  updateInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  updateBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
