import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmtDate(d: string) { return new Date(d).toLocaleDateString("uz-UZ"); }

export default function PromoCodesScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ code: "", discountType: "percent", discountValue: "", maxUses: "", expiresAt: "", minOrderAmount: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.shopId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/promo-codes/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setItems(d.promoCodes || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function save() {
    if (!form.code || !form.discountValue) return Alert.alert("Xatolik", "Kod va chegirma kiritilishi shart");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/promo-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: form.code.toUpperCase(), discountType: form.discountType, discountValue: Number(form.discountValue), maxUses: form.maxUses ? Number(form.maxUses) : null, expiresAt: form.expiresAt || null, minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null, shopId: user?.shopId }),
      });
      if (r.ok) { setModalOpen(false); setForm({ code: "", discountType: "percent", discountValue: "", maxUses: "", expiresAt: "", minOrderAmount: "" }); load(); }
    } catch {}
    setSaving(false);
  }

  async function toggle(id: number, isActive: boolean) {
    const token = await AsyncStorage.getItem("gethelp_token");
    await fetch(`${BASE_URL}/promo-codes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ isActive: !isActive }) });
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_active: !isActive } : i));
  }

  async function remove(id: number) {
    Alert.alert("O'chirish", "Promo kodni o'chirasizmi?", [
      { text: "Bekor", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: async () => {
        const token = await AsyncStorage.getItem("gethelp_token");
        await fetch(`${BASE_URL}/promo-codes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        load();
      }},
    ]);
  }

  function genCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    setForm(p => ({ ...p, code: Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("") }));
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Promo kodlar</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}><Ionicons name="add" size={24} color={C.primary} /></Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="ticket-outline" size={64} color={C.textMuted} />
          <Text style={[styles.empty, { color: C.textMuted }]}>Promo kodlar yo'q</Text>
          <Pressable onPress={() => setModalOpen(true)} style={[styles.addBtnFull, { backgroundColor: C.primary }]}>
            <Text style={styles.addBtnFullText}>Promo kod yaratish</Text>
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
              <View style={styles.cardTop}>
                <View style={[styles.codeBox, { backgroundColor: C.primary + "15", borderColor: C.primary }]}>
                  <Text style={[styles.code, { color: C.primary }]}>{item.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.discount, { color: C.text }]}>
                    {item.discount_type === "percent" ? `${item.discount_value}% chegirma` : `${new Intl.NumberFormat("uz-UZ").format(item.discount_value)} so'm chegirma`}
                  </Text>
                  <Text style={[styles.meta, { color: C.textMuted }]}>
                    Ishlatilgan: {item.used_count || 0}/{item.max_uses || "∞"}
                  </Text>
                </View>
                <View style={[styles.activeDot, { backgroundColor: item.is_active ? "#22C55E" : "#9CA3AF" }]} />
              </View>
              {item.expires_at && <Text style={[styles.expiry, { color: C.textMuted }]}>Muddati: {fmtDate(item.expires_at)}</Text>}
              <View style={styles.actions}>
                <Pressable onPress={() => toggle(item.id, item.is_active)} style={[styles.actBtn, { backgroundColor: item.is_active ? "#F59E0B20" : "#22C55E20" }]}>
                  <Text style={[styles.actText, { color: item.is_active ? "#F59E0B" : "#22C55E" }]}>{item.is_active ? "O'chirish" : "Yoqish"}</Text>
                </Pressable>
                <Pressable onPress={() => remove(item.id)} style={[styles.actBtn, { backgroundColor: "#EF444420" }]}>
                  <Text style={[styles.actText, { color: "#EF4444" }]}>O'chirish</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: C.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Yangi promo kod</Text>
            <Pressable onPress={() => setModalOpen(false)}><Ionicons name="close" size={24} color={C.textMuted} /></Pressable>
          </View>
          <Text style={[styles.label, { color: C.textMuted }]}>Kod</Text>
          <View style={styles.codeInputRow}>
            <TextInput style={[styles.codeInput, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
              value={form.code} onChangeText={t => setForm(p => ({ ...p, code: t.toUpperCase() }))}
              placeholder="GETHELP2024" placeholderTextColor={C.textMuted} autoCapitalize="characters" />
            <Pressable onPress={genCode} style={[styles.genBtn, { backgroundColor: C.surfaceSecondary }]}>
              <Ionicons name="shuffle" size={20} color={C.primary} />
            </Pressable>
          </View>
          <Text style={[styles.label, { color: C.textMuted, marginTop: 14 }]}>Chegirma turi</Text>
          <View style={styles.typeRow}>
            {[["percent", "Foiz (%)"], ["fixed", "Miqdor (so'm)"]].map(([v, l]) => (
              <Pressable key={v} onPress={() => setForm(p => ({ ...p, discountType: v }))}
                style={[styles.typeBtn, { borderColor: form.discountType === v ? C.primary : C.border, backgroundColor: form.discountType === v ? C.primary + "15" : "transparent" }]}>
                <Text style={[styles.typeBtnText, { color: form.discountType === v ? C.primary : C.textMuted }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          {([["discountValue", "Chegirma miqdori *"], ["maxUses", "Maksimal foydalanish"], ["minOrderAmount", "Minimal buyurtma (so'm)"], ["expiresAt", "Muddati (YYYY-MM-DD)"]] as const).map(([k, label]) => (
            <View key={k} style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
              <TextInput style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
                value={form[k as keyof typeof form]} onChangeText={t => setForm(p => ({ ...p, [k]: t }))}
                keyboardType={k === "expiresAt" ? "default" : "numeric"} placeholder={label} placeholderTextColor={C.textMuted} />
            </View>
          ))}
          <Pressable onPress={save} disabled={saving} style={[styles.saveBtn, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}>
            <Text style={styles.saveBtnText}>{saving ? "Saqlanmoqda..." : "Yaratish"}</Text>
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
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  codeBox: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderStyle: "dashed" },
  code: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 1 },
  discount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  expiry: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 8 },
  actBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  actText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  codeInputRow: { flexDirection: "row", gap: 8 },
  codeInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  genBtn: { width: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
