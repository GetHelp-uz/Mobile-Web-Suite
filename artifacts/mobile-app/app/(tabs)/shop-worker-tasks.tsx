import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("uz-UZ") : "—"; }

const STATUS_COLOR: Record<string, string> = { pending: "#F59E0B", in_progress: "#3B82F6", completed: "#22C55E", cancelled: "#EF4444" };
const STATUS_LABEL: Record<string, string> = { pending: "Kutilmoqda", in_progress: "Bajarilmoqda", completed: "Bajarildi", cancelled: "Bekor" };
const PRIORITY_COLOR: Record<string, string> = { low: "#9CA3AF", medium: "#F59E0B", high: "#EF4444" };

export default function ShopWorkerTasksScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.shopId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const [tR, wR] = await Promise.all([
        fetch(`${BASE_URL}/worker-tasks/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/users/workers`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (tR.ok) { const d = await tR.json(); setTasks(d.tasks || []); }
      if (wR.ok) { const d = await wR.json(); setWorkers(d.workers || []); }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function save() {
    if (!form.title) return Alert.alert("Xatolik", "Topshiriq sarlavhasini kiriting");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/worker-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title, description: form.description, priority: form.priority, dueDate: form.dueDate || undefined, shopId: user?.shopId, workerId: form.assignedTo ? Number(form.assignedTo) : undefined }),
      });
      if (r.ok) { setModalOpen(false); setForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" }); load(); }
    } catch {}
    setSaving(false);
  }

  async function updateStatus(id: number, status: string) {
    const token = await AsyncStorage.getItem("gethelp_token");
    await fetch(`${BASE_URL}/worker-tasks/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Xodimlar topshiriqlari</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}><Ionicons name="add" size={24} color={C.primary} /></Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : tasks.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="clipboard-outline" size={64} color={C.textMuted} />
          <Text style={[styles.empty, { color: C.textMuted }]}>Topshiriqlar yo'q</Text>
          <Pressable onPress={() => setModalOpen(true)} style={[styles.addBtnFull, { backgroundColor: C.primary }]}>
            <Text style={styles.addBtnFullText}>Topshiriq qo'shish</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const sc = STATUS_COLOR[item.status] || C.textMuted;
            const pc = PRIORITY_COLOR[item.priority] || C.textMuted;
            return (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, borderLeftWidth: 4, borderLeftColor: pc }]}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, { color: C.text }]}>{item.title}</Text>
                    {item.assigned_to_name && <Text style={[styles.worker, { color: C.textMuted }]}>Ishchi: {item.assigned_to_name}</Text>}
                    {item.due_date && <Text style={[styles.due, { color: C.textMuted }]}>Muddat: {fmtDate(item.due_date)}</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: sc + "20" }]}>
                    <Text style={[styles.badgeText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status}</Text>
                  </View>
                </View>
                {item.description && <Text style={[styles.desc, { color: C.textSecondary }]} numberOfLines={2}>{item.description}</Text>}
                {item.status !== "completed" && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: 8 }}>
                    {item.status === "pending" && (
                      <Pressable onPress={() => updateStatus(item.id, "in_progress")} style={[styles.actionBtn, { backgroundColor: "#3B82F620" }]}>
                        <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>Boshlash</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => updateStatus(item.id, "completed")} style={[styles.actionBtn, { backgroundColor: "#22C55E20" }]}>
                      <Text style={[styles.actionBtnText, { color: "#22C55E" }]}>Bajarildi</Text>
                    </Pressable>
                  </ScrollView>
                )}
              </View>
            );
          }}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: C.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Yangi topshiriq</Text>
            <Pressable onPress={() => setModalOpen(false)}><Ionicons name="close" size={24} color={C.textMuted} /></Pressable>
          </View>
          <Text style={[styles.label, { color: C.textMuted }]}>Muhimlik</Text>
          <View style={styles.priorityRow}>
            {[["low", "Past"], ["medium", "O'rta"], ["high", "Yuqori"]].map(([v, l]) => (
              <Pressable key={v} onPress={() => setForm(p => ({ ...p, priority: v }))}
                style={[styles.priorityBtn, { borderColor: form.priority === v ? PRIORITY_COLOR[v] : C.border, backgroundColor: form.priority === v ? PRIORITY_COLOR[v] + "20" : "transparent" }]}>
                <Text style={[styles.priorityBtnText, { color: form.priority === v ? PRIORITY_COLOR[v] : C.textMuted }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { color: C.textMuted }]}>Ishchi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, flexDirection: "row" }}>
            <Pressable onPress={() => setForm(p => ({ ...p, assignedTo: "" }))}
              style={[styles.workerChip, { borderColor: !form.assignedTo ? C.primary : C.border, backgroundColor: !form.assignedTo ? C.primary + "15" : "transparent" }]}>
              <Text style={[styles.workerChipText, { color: !form.assignedTo ? C.primary : C.textMuted }]}>Tayinlanmagan</Text>
            </Pressable>
            {workers.map(w => (
              <Pressable key={w.id} onPress={() => setForm(p => ({ ...p, assignedTo: String(w.id) }))}
                style={[styles.workerChip, { borderColor: form.assignedTo === String(w.id) ? C.primary : C.border, backgroundColor: form.assignedTo === String(w.id) ? C.primary + "15" : "transparent" }]}>
                <Text style={[styles.workerChipText, { color: form.assignedTo === String(w.id) ? C.primary : C.textMuted }]}>{w.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {([["title", "Sarlavha *"], ["description", "Tavsif"], ["dueDate", "Muddat (YYYY-MM-DD)"]] as const).map(([k, label]) => (
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
  addBtnFull: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  addBtnFullText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  taskTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  worker: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  due: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  priorityRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  priorityBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  workerChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  workerChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
