import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ShopSuppliersScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", contactPerson: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.shopId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/suppliers/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setSuppliers(d.suppliers || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function save() {
    if (!form.name || !form.phone) return Alert.alert("Xatolik", "Nom va telefon kiritilishi shart");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, shopId: user?.shopId }),
      });
      if (r.ok) { setModalOpen(false); setForm({ name: "", phone: "", email: "", address: "", contactPerson: "", notes: "" }); load(); }
    } catch {}
    setSaving(false);
  }

  async function remove(id: number) {
    Alert.alert("O'chirish", "Ta'minotchini o'chirasizmi?", [
      { text: "Bekor", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: async () => {
        const token = await AsyncStorage.getItem("gethelp_token");
        await fetch(`${BASE_URL}/suppliers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        load();
      }},
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Ta'minotchilar</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}><Ionicons name="add" size={24} color={C.primary} /></Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : suppliers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={64} color={C.textMuted} />
          <Text style={[styles.empty, { color: C.textMuted }]}>Ta'minotchilar yo'q</Text>
          <Pressable onPress={() => setModalOpen(true)} style={[styles.addBtnFull, { backgroundColor: C.primary }]}>
            <Text style={styles.addBtnFullText}>Ta'minotchi qo'shish</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: C.primary }]}>
                  <Text style={styles.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: C.text }]}>{item.name}</Text>
                  {item.contact_person && <Text style={[styles.sub, { color: C.textMuted }]}>Aloqa: {item.contact_person}</Text>}
                </View>
                <Pressable onPress={() => remove(item.id)} style={[styles.delBtn, { backgroundColor: "#EF444415" }]}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
              <View style={styles.contacts}>
                {item.phone && <View style={styles.contactRow}><Ionicons name="call-outline" size={14} color={C.primary} /><Text style={[styles.contactText, { color: C.textMuted }]}>{item.phone}</Text></View>}
                {item.email && <View style={styles.contactRow}><Ionicons name="mail-outline" size={14} color={C.primary} /><Text style={[styles.contactText, { color: C.textMuted }]}>{item.email}</Text></View>}
                {item.address && <View style={styles.contactRow}><Ionicons name="location-outline" size={14} color={C.primary} /><Text style={[styles.contactText, { color: C.textMuted }]}>{item.address}</Text></View>}
              </View>
              {item.notes && <Text style={[styles.notes, { color: C.textSecondary }]}>{item.notes}</Text>}
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: C.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Yangi ta'minotchi</Text>
            <Pressable onPress={() => setModalOpen(false)}><Ionicons name="close" size={24} color={C.textMuted} /></Pressable>
          </View>
          {([["name", "Kompaniya nomi *"], ["phone", "Telefon *"], ["email", "Email"], ["contactPerson", "Aloqa shaxsi"], ["address", "Manzil"], ["notes", "Izoh"]] as const).map(([k, label]) => (
            <View key={k} style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
              <TextInput style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
                value={form[k as keyof typeof form]} onChangeText={t => setForm(p => ({ ...p, [k]: t }))}
                keyboardType={k === "phone" ? "phone-pad" : k === "email" ? "email-address" : "default"}
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
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  delBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  contacts: { gap: 4 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  notes: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
