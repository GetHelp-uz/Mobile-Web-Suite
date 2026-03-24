import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function BranchesScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", managerName: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.shopId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/branches/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setItems(d.branches || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function openCreate() { setEditing(null); setForm({ name: "", address: "", phone: "", managerName: "" }); setModalOpen(true); }
  function openEdit(b: any) { setEditing(b); setForm({ name: b.name, address: b.address || "", phone: b.phone || "", managerName: b.manager_name || "" }); setModalOpen(true); }

  async function save() {
    if (!form.name) return Alert.alert("Xatolik", "Filial nomini kiriting");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const body = { name: form.name, address: form.address, phone: form.phone, managerName: form.managerName, shopId: user?.shopId };
      const r = editing
        ? await fetch(`${BASE_URL}/branches/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
        : await fetch(`${BASE_URL}/branches`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (r.ok) { setModalOpen(false); load(); }
    } catch {}
    setSaving(false);
  }

  async function remove(id: number) {
    Alert.alert("O'chirish", "Filialni o'chirishni tasdiqlaysizmi?", [
      { text: "Bekor", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: async () => {
        const token = await AsyncStorage.getItem("gethelp_token");
        await fetch(`${BASE_URL}/branches/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        load();
      }},
    ]);
  }

  async function setMain(id: number) {
    const token = await AsyncStorage.getItem("gethelp_token");
    await fetch(`${BASE_URL}/branches/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ isMain: true }) });
    load();
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Filiallar</Text>
        <Pressable onPress={openCreate} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={C.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="business-outline" size={64} color={C.textMuted} />
          <Text style={[styles.empty, { color: C.textMuted }]}>Hali filiallar yo'q</Text>
          <Pressable onPress={openCreate} style={[styles.createBtn, { backgroundColor: C.primary }]}>
            <Text style={styles.createBtnText}>Filial qo'shish</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: item.is_main ? C.primary : C.border, borderWidth: item.is_main ? 2 : 1 }]}>
              <View style={styles.cardRow}>
                <View style={[styles.icon, { backgroundColor: item.is_main ? C.primary + "20" : C.surfaceSecondary }]}>
                  <Ionicons name="business-outline" size={22} color={item.is_main ? C.primary : C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: C.text }]}>{item.name}</Text>
                    {item.is_main && <View style={[styles.mainBadge, { backgroundColor: C.primary }]}><Text style={styles.mainBadgeText}>Asosiy</Text></View>}
                  </View>
                  {item.address && <Text style={[styles.sub, { color: C.textMuted }]}>{item.address}</Text>}
                  {item.phone && <Text style={[styles.sub, { color: C.textMuted }]}>{item.phone}</Text>}
                  {item.manager_name && <Text style={[styles.sub, { color: C.textMuted }]}>Menejer: {item.manager_name}</Text>}
                </View>
              </View>
              <View style={styles.actions}>
                {!item.is_main && <Pressable onPress={() => setMain(item.id)} style={[styles.actionBtn, { borderColor: C.primary }]}><Text style={[styles.actionBtnText, { color: C.primary }]}>Asosiy qilish</Text></Pressable>}
                <Pressable onPress={() => openEdit(item)} style={[styles.actionBtn, { borderColor: C.border }]}><Text style={[styles.actionBtnText, { color: C.text }]}>Tahrirlash</Text></Pressable>
                <Pressable onPress={() => remove(item.id)} style={[styles.actionBtn, { borderColor: "#EF4444" }]}><Text style={[styles.actionBtnText, { color: "#EF4444" }]}>O'chirish</Text></Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: C.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{editing ? "Filialni tahrirlash" : "Yangi filial"}</Text>
            <Pressable onPress={() => setModalOpen(false)}><Ionicons name="close" size={24} color={C.textMuted} /></Pressable>
          </View>
          {([["name", "Filial nomi *"], ["address", "Manzil"], ["phone", "Telefon"], ["managerName", "Menejer ismi"]] as const).map(([k, label]) => (
            <View key={k} style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
              <TextInput style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
                value={form[k as keyof typeof form]} onChangeText={t => setForm(p => ({ ...p, [k]: t }))}
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
  createBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  createBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  card: { borderRadius: 16, padding: 14, gap: 12 },
  cardRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  mainBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  mainBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
