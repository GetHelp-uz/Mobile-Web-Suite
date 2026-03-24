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

const TYPES = [
  { value: "daily", label: "Kunlik" },
  { value: "hourly", label: "Soatlik" },
  { value: "weekly", label: "Haftalik" },
  { value: "monthly", label: "Oylik" },
];

export default function PricingScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "daily", price: "", description: "", discountPercent: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.shopId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/pricing/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setItems(d.pricingRules || d.pricing || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function save() {
    if (!form.name || !form.price) return Alert.alert("Xatolik", "Nom va narxni kiriting");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, price: Number(form.price), discountPercent: form.discountPercent ? Number(form.discountPercent) : 0, shopId: user?.shopId }),
      });
      if (r.ok) { setModalOpen(false); setForm({ name: "", type: "daily", price: "", description: "", discountPercent: "" }); load(); }
    } catch {}
    setSaving(false);
  }

  async function toggle(id: number, isActive: boolean) {
    const token = await AsyncStorage.getItem("gethelp_token");
    await fetch(`${BASE_URL}/pricing/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ isActive: !isActive }) });
    load();
  }

  async function remove(id: number) {
    Alert.alert("O'chirish", "Narxlash qoidasini o'chirasizmi?", [
      { text: "Bekor", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: async () => {
        const token = await AsyncStorage.getItem("gethelp_token");
        await fetch(`${BASE_URL}/pricing/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        load();
      }},
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Narxlash</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={C.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="pricetag-outline" size={64} color={C.textMuted} />
          <Text style={[styles.empty, { color: C.textMuted }]}>Narxlash qoidalari yo'q</Text>
          <Pressable onPress={() => setModalOpen(true)} style={[styles.addBtnFull, { backgroundColor: C.primary }]}>
            <Text style={styles.addBtnFullText}>Narx qo'shish</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: item.is_active ? C.primary : C.border, borderWidth: item.is_active ? 1.5 : 1 }]}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: C.text }]}>{item.name}</Text>
                  <Text style={[styles.type, { color: C.textMuted }]}>{TYPES.find(t => t.value === item.type)?.label || item.type}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={[styles.price, { color: C.primary }]}>{fmt(item.price || 0)}</Text>
                  {item.discount_percent > 0 && <Text style={[styles.discount, { color: "#22C55E" }]}>-{item.discount_percent}%</Text>}
                </View>
              </View>
              {item.description && <Text style={[styles.desc, { color: C.textMuted }]}>{item.description}</Text>}
              <View style={styles.actions}>
                <Pressable onPress={() => toggle(item.id, item.is_active)}
                  style={[styles.actBtn, { backgroundColor: item.is_active ? "#22C55E20" : C.surfaceSecondary }]}>
                  <Text style={[styles.actBtnText, { color: item.is_active ? "#22C55E" : C.textMuted }]}>{item.is_active ? "Faol" : "Nofaol"}</Text>
                </Pressable>
                <Pressable onPress={() => remove(item.id)} style={[styles.actBtn, { backgroundColor: "#EF444420" }]}>
                  <Text style={[styles.actBtnText, { color: "#EF4444" }]}>O'chirish</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: C.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Narx qo'shish</Text>
            <Pressable onPress={() => setModalOpen(false)}><Ionicons name="close" size={24} color={C.textMuted} /></Pressable>
          </View>
          <Text style={[styles.label, { color: C.textMuted }]}>Turi</Text>
          <View style={styles.typeRow}>
            {TYPES.map(t => (
              <Pressable key={t.value} onPress={() => setForm(p => ({ ...p, type: t.value }))}
                style={[styles.typeBtn, { borderColor: form.type === t.value ? C.primary : C.border, backgroundColor: form.type === t.value ? C.primary + "15" : "transparent" }]}>
                <Text style={[styles.typeBtnText, { color: form.type === t.value ? C.primary : C.textMuted }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          {([["name", "Nomi *"], ["price", "Narx (so'm) *"], ["discountPercent", "Chegirma (%)"], ["description", "Tavsif"]] as const).map(([k, label]) => (
            <View key={k} style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
              <TextInput style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
                value={form[k as keyof typeof form]} onChangeText={t => setForm(p => ({ ...p, [k]: t }))}
                keyboardType={k === "price" || k === "discountPercent" ? "numeric" : "default"}
                placeholder={label} placeholderTextColor={C.textMuted} />
            </View>
          ))}
          <Pressable onPress={save} disabled={saving} style={[styles.saveBtn, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}>
            <Text style={styles.saveBtnText}>{saving ? "Saqlanmoqda..." : "Saqlash"}</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "flex-end" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  empty: { fontSize: 16, fontFamily: "Inter_400Regular" },
  addBtnFull: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  addBtnFullText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  card: { borderRadius: 14, padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  type: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  right: { alignItems: "flex-end" },
  price: { fontSize: 16, fontFamily: "Inter_700Bold" },
  discount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 8 },
  actBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  actBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
