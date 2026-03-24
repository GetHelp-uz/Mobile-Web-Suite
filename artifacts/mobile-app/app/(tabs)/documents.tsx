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

const DOC_TYPES = [
  { value: "contract", label: "Shartnoma", icon: "document-text-outline" as const },
  { value: "invoice", label: "Hisob-faktura", icon: "receipt-outline" as const },
  { value: "act", label: "Dalolatnoma", icon: "clipboard-outline" as const },
  { value: "other", label: "Boshqa", icon: "document-outline" as const },
];

const STATUS_COLOR: Record<string, string> = { active: "#22C55E", draft: "#9CA3AF", archived: "#F59E0B" };
const STATUS_LABEL: Record<string, string> = { active: "Faol", draft: "Qoralama", archived: "Arxivlangan" };

export default function DocumentsScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", docType: "contract", description: "", relatedOrderId: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const url = user?.shopId ? `${BASE_URL}/documents/shop/${user.shopId}` : `${BASE_URL}/documents/my`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setDocs(d.documents || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function save() {
    if (!form.title) return Alert.alert("Xatolik", "Hujjat nomini kiriting");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, shopId: user?.shopId, relatedOrderId: form.relatedOrderId ? Number(form.relatedOrderId) : undefined }),
      });
      if (r.ok) { setModalOpen(false); setForm({ title: "", docType: "contract", description: "", relatedOrderId: "" }); load(); }
    } catch {}
    setSaving(false);
  }

  async function remove(id: number) {
    Alert.alert("O'chirish", "Hujjatni o'chirasizmi?", [
      { text: "Bekor", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: async () => {
        const token = await AsyncStorage.getItem("gethelp_token");
        await fetch(`${BASE_URL}/documents/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        load();
      }},
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Hujjatlar</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}><Ionicons name="add" size={24} color={C.primary} /></Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : docs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={64} color={C.textMuted} />
          <Text style={[styles.empty, { color: C.textMuted }]}>Hujjatlar yo'q</Text>
          <Pressable onPress={() => setModalOpen(true)} style={[styles.addBtnFull, { backgroundColor: C.primary }]}>
            <Text style={styles.addBtnFullText}>Hujjat qo'shish</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const dt = DOC_TYPES.find(t => t.value === item.doc_type) || DOC_TYPES[3];
            const sc = STATUS_COLOR[item.status] || C.textMuted;
            return (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.docIcon, { backgroundColor: C.primary + "15" }]}>
                    <Ionicons name={dt.icon} size={22} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]}>{item.title}</Text>
                    <Text style={[styles.type, { color: C.textMuted }]}>{dt.label} • {fmtDate(item.created_at)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.badgeText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status}</Text>
                  </View>
                </View>
                {item.description && <Text style={[styles.desc, { color: C.textSecondary }]} numberOfLines={2}>{item.description}</Text>}
                <View style={styles.actions}>
                  <Pressable style={[styles.actBtn, { backgroundColor: C.surfaceSecondary }]}>
                    <Ionicons name="download-outline" size={14} color={C.primary} />
                    <Text style={[styles.actBtnText, { color: C.primary }]}>Yuklab olish</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(item.id)} style={[styles.actBtn, { backgroundColor: "#EF444415" }]}>
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    <Text style={[styles.actBtnText, { color: "#EF4444" }]}>O'chirish</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: C.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Yangi hujjat</Text>
            <Pressable onPress={() => setModalOpen(false)}><Ionicons name="close" size={24} color={C.textMuted} /></Pressable>
          </View>
          <Text style={[styles.label, { color: C.textMuted }]}>Hujjat turi</Text>
          <View style={styles.typeRow}>
            {DOC_TYPES.map(t => (
              <Pressable key={t.value} onPress={() => setForm(p => ({ ...p, docType: t.value }))}
                style={[styles.typeBtn, { borderColor: form.docType === t.value ? C.primary : C.border, backgroundColor: form.docType === t.value ? C.primary + "15" : "transparent" }]}>
                <Ionicons name={t.icon} size={16} color={form.docType === t.value ? C.primary : C.textMuted} />
                <Text style={[styles.typeBtnText, { color: form.docType === t.value ? C.primary : C.textMuted }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          {([["title", "Hujjat nomi *"], ["description", "Tavsif"], ["relatedOrderId", "Buyurtma ID si"]] as const).map(([k, label]) => (
            <View key={k} style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
              <TextInput style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
                value={form[k as keyof typeof form]} onChangeText={t => setForm(p => ({ ...p, [k]: t }))}
                keyboardType={k === "relatedOrderId" ? "numeric" : "default"} placeholder={label} placeholderTextColor={C.textMuted} />
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
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  docIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  type: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 8 },
  actBtn: { flex: 1, flexDirection: "row", gap: 5, paddingVertical: 9, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
