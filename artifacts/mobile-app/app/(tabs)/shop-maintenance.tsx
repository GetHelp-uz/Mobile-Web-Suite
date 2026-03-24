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
function fmtDate(d: string) { return new Date(d).toLocaleDateString("uz-UZ"); }

const TYPE_LABEL: Record<string, string> = { inspection: "Tekshirish", repair: "Ta'mirlash", cleaning: "Tozalash", replacement: "Almashtirish", other: "Boshqa" };
const STATUS_COLOR: Record<string, string> = { scheduled: "#3B82F6", in_progress: "#F59E0B", completed: "#22C55E", cancelled: "#EF4444" };
const STATUS_LABEL: Record<string, string> = { scheduled: "Rejalashtirilgan", in_progress: "Jarayonda", completed: "Bajarildi", cancelled: "Bekor" };

export default function ShopMaintenanceScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ toolId: "", eventType: "inspection", title: "", description: "", cost: "", performedBy: "" });
  const [tools, setToolsList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.shopId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const [evR, toolR] = await Promise.all([
        fetch(`${BASE_URL}/tools/events/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/tools?shopId=${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (evR.ok) { const d = await evR.json(); setItems(d.events || []); }
      if (toolR.ok) { const d = await toolR.json(); setToolsList(d.tools || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function save() {
    if (!form.title || !form.toolId) return Alert.alert("Xatolik", "Asbob va sarlavha kiriting");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/tools/${form.toolId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventType: form.eventType, title: form.title, description: form.description, cost: form.cost ? Number(form.cost) : undefined, performedBy: form.performedBy }),
      });
      if (r.ok) { setModalOpen(false); setForm({ toolId: "", eventType: "inspection", title: "", description: "", cost: "", performedBy: "" }); load(); }
    } catch {}
    setSaving(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Ta'mirlash</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}><Ionicons name="add" size={24} color={C.primary} /></Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="construct-outline" size={64} color={C.textMuted} />
          <Text style={[styles.empty, { color: C.textMuted }]}>Ta'mirlash yozuvlari yo'q</Text>
          <Pressable onPress={() => setModalOpen(true)} style={[styles.addBtnFull, { backgroundColor: C.primary }]}>
            <Text style={styles.addBtnFullText}>Yozuv qo'shish</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const sc = STATUS_COLOR[item.status] || C.primary;
            return (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.icon, { backgroundColor: C.primary + "20" }]}>
                    <Ionicons name="construct-outline" size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]}>{item.title}</Text>
                    <Text style={[styles.sub, { color: C.textMuted }]}>{TYPE_LABEL[item.event_type] || item.event_type} • {item.tool_name}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.badgeText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status || "—"}</Text>
                  </View>
                </View>
                {item.description && <Text style={[styles.desc, { color: C.textSecondary }]}>{item.description}</Text>}
                <View style={styles.metaRow}>
                  {item.cost && <Text style={[styles.cost, { color: "#EF4444" }]}>Xarajat: {fmt(item.cost)}</Text>}
                  {item.performed_by && <Text style={[styles.meta, { color: C.textMuted }]}>Usta: {item.performed_by}</Text>}
                  <Text style={[styles.meta, { color: C.textMuted }]}>{fmtDate(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: C.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Ta'mirlash yozuvi</Text>
            <Pressable onPress={() => setModalOpen(false)}><Ionicons name="close" size={24} color={C.textMuted} /></Pressable>
          </View>
          <Text style={[styles.label, { color: C.textMuted }]}>Asbob *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, flexDirection: "row" }}>
            {tools.map(t => (
              <Pressable key={t.id} onPress={() => setForm(p => ({ ...p, toolId: String(t.id) }))}
                style={[styles.toolChip, { borderColor: form.toolId === String(t.id) ? C.primary : C.border, backgroundColor: form.toolId === String(t.id) ? C.primary + "15" : "transparent" }]}>
                <Text style={[styles.toolChipText, { color: form.toolId === String(t.id) ? C.primary : C.textMuted }]}>{t.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[styles.label, { color: C.textMuted }]}>Tur</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, flexDirection: "row" }}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => (
              <Pressable key={v} onPress={() => setForm(p => ({ ...p, eventType: v }))}
                style={[styles.toolChip, { borderColor: form.eventType === v ? C.primary : C.border, backgroundColor: form.eventType === v ? C.primary + "15" : "transparent" }]}>
                <Text style={[styles.toolChipText, { color: form.eventType === v ? C.primary : C.textMuted }]}>{l}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {([["title", "Sarlavha *"], ["description", "Tavsif"], ["performedBy", "Ustaning ismi"], ["cost", "Xarajat (so'm)"]] as const).map(([k, label]) => (
            <View key={k} style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
              <TextInput style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
                value={form[k as keyof typeof form]} onChangeText={t => setForm(p => ({ ...p, [k]: t }))}
                keyboardType={k === "cost" ? "numeric" : "default"} placeholder={label} placeholderTextColor={C.textMuted} />
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
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cost: { fontSize: 13, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  toolChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  toolChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
