import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ");
}

const STATUS_COLOR: Record<string, string> = {
  active: "#22C55E", completed: "#6366F1", paused: "#F59E0B", cancelled: "#EF4444",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Faol", completed: "Tugallangan", paused: "To'xtatilgan", cancelled: "Bekor qilingan",
};

export default function ProjectsScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", budget: "", location: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setItems(d.projects || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function create() {
    if (!form.name) return Alert.alert("Xatolik", "Loyiha nomini kiriting");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, budget: form.budget ? Number(form.budget) : undefined }),
      });
      if (r.ok) {
        setCreateOpen(false);
        setForm({ name: "", description: "", budget: "", location: "" });
        load();
      }
    } catch {}
    setSaving(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Loyihalar</Text>
        <Pressable onPress={() => setCreateOpen(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={C.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={64} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Hali loyihalar yo'q</Text>
          <Pressable onPress={() => setCreateOpen(true)} style={[styles.createBtn, { backgroundColor: C.primary }]}>
            <Text style={styles.createBtnText}>Loyiha yaratish</Text>
          </Pressable>
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
                <View style={styles.cardRow}>
                  <View style={[styles.iconWrap, { backgroundColor: C.primary + "20" }]}>
                    <Ionicons name="folder-outline" size={22} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]}>{item.name}</Text>
                    {item.location && <Text style={[styles.sub, { color: C.textMuted }]}>{item.location}</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.badgeText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status}</Text>
                  </View>
                </View>
                {item.description && (
                  <Text style={[styles.desc, { color: C.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                )}
                <View style={styles.metaRow}>
                  {item.budget && <Text style={[styles.meta, { color: C.textMuted }]}>Byudjet: {new Intl.NumberFormat("uz-UZ").format(item.budget)} so'm</Text>}
                  <Text style={[styles.meta, { color: C.textMuted }]}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: C.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Yangi loyiha</Text>
            <Pressable onPress={() => setCreateOpen(false)}>
              <Ionicons name="close" size={24} color={C.textMuted} />
            </Pressable>
          </View>
          {(["name:Loyiha nomi *", "description:Tavsif", "location:Manzil", "budget:Byudjet (so'm)"] as const).map(f => {
            const [key, label] = f.split(":") as [keyof typeof form, string];
            return (
              <View key={key} style={{ marginBottom: 14 }}>
                <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { color: C.text, backgroundColor: C.surface, borderColor: C.border }]}
                  value={form[key]}
                  onChangeText={t => setForm(p => ({ ...p, [key]: t }))}
                  keyboardType={key === "budget" ? "numeric" : "default"}
                  multiline={key === "description"}
                  numberOfLines={key === "description" ? 3 : 1}
                  placeholder={label}
                  placeholderTextColor={C.textMuted}
                />
              </View>
            );
          })}
          <Pressable onPress={create} disabled={saving} style={[styles.saveBtn, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}>
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
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular", marginTop: 8 },
  createBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 42, height: 42, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
