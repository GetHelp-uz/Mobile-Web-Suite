import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmtDate(d: string) { return new Date(d).toLocaleString("uz-UZ"); }

const TEMPLATES = [
  { title: "Ijara eslatmasi", text: "Hurmatli mijoz, asbobingizni qaytarish muddati yaqinlashdi. Iltimos, {date} gacha qaytaring." },
  { title: "Tayyor bildirishnoma", text: "Buyurtmangiz tayyor! Do'konimizga kelib olishingiz mumkin yoki yetkazib berish uchun bog'laning." },
  { title: "Chegirma taklifi", text: "Maxsus taklif! Keyingi ijarangizda {discount}% chegirma oling. Faqat {date} gacha." },
  { title: "Xush kelibsiz", text: "GetHelp.uz ga xush kelibsiz! Bizning xizmatlardan foydalaning va qurilish asboblarini qulay ijaraga oling." },
];

export default function SmsCenterScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ recipient: "", message: "", recipientType: "all" });
  const [sending, setSending] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!user?.shopId) return;
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("gethelp_token");
        const r = await fetch(`${BASE_URL}/sms/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setMessages(d.messages || []); }
      } catch {}
      setLoading(false);
    })();
  }, []));

  async function send() {
    if (!form.message) return Alert.alert("Xatolik", "Xabar matnini kiriting");
    setSending(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shopId: user?.shopId, message: form.message, recipient: form.recipient || undefined, recipientType: form.recipientType }),
      });
      if (r.ok) {
        Alert.alert("Yuborildi!", "SMS muvaffaqiyatli yuborildi");
        setModalOpen(false);
        setForm({ recipient: "", message: "", recipientType: "all" });
      } else {
        Alert.alert("Xatolik", "SMS yuborishda muammo yuz berdi");
      }
    } catch {}
    setSending(false);
  }

  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.status === "sent" || m.status === "delivered").length,
    failed: messages.filter(m => m.status === "failed").length,
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>SMS Markaz</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}><Ionicons name="add" size={24} color={C.primary} /></Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ListHeaderComponent={() => (
            <View>
              <View style={styles.statsRow}>
                {[["Jami", stats.total, C.text], ["Yuborildi", stats.sent, "#22C55E"], ["Xato", stats.failed, "#EF4444"]].map(([l, v, c], i) => (
                  <View key={i} style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Text style={[styles.statVal, { color: c as string }]}>{v as number}</Text>
                    <Text style={[styles.statLabel, { color: C.textMuted }]}>{l}</Text>
                  </View>
                ))}
              </View>
              <Pressable onPress={() => setModalOpen(true)} style={[styles.sendBtn, { backgroundColor: C.primary }]}>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.sendBtnText}>SMS yuborish</Text>
              </Pressable>
              {messages.length > 0 && <Text style={[styles.sec, { color: C.text }]}>Yuborilgan xabarlar</Text>}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={[styles.center, { marginTop: 20 }]}>
              <Text style={[styles.empty, { color: C.textMuted }]}>Hali SMS yuborilmagan</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const statusColor = item.status === "delivered" || item.status === "sent" ? "#22C55E" : item.status === "failed" ? "#EF4444" : "#F59E0B";
            return (
              <View style={[styles.msgCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.msgRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recipient, { color: C.text }]}>{item.recipient_type === "all" ? "Barcha mijozlar" : item.recipient || "Noaniq"}</Text>
                    <Text style={[styles.msgDate, { color: C.textMuted }]}>{fmtDate(item.created_at)}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                </View>
                <Text style={[styles.msgText, { color: C.textSecondary }]} numberOfLines={2}>{item.message}</Text>
                {item.sent_count !== undefined && (
                  <Text style={[styles.sentCount, { color: C.textMuted }]}>{item.sent_count} ta raqamga yuborildi</Text>
                )}
              </View>
            );
          }}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: C.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>SMS yuborish</Text>
            <Pressable onPress={() => setModalOpen(false)}><Ionicons name="close" size={24} color={C.textMuted} /></Pressable>
          </View>
          <Text style={[styles.label, { color: C.textMuted }]}>Kimga</Text>
          <View style={styles.recRow}>
            {[["all", "Barchaga"], ["active", "Faol mijozlar"], ["custom", "Maxsus raqam"]].map(([v, l]) => (
              <Pressable key={v} onPress={() => setForm(p => ({ ...p, recipientType: v }))}
                style={[styles.recBtn, { borderColor: form.recipientType === v ? C.primary : C.border, backgroundColor: form.recipientType === v ? C.primary + "15" : "transparent" }]}>
                <Text style={[styles.recBtnText, { color: form.recipientType === v ? C.primary : C.textMuted }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          {form.recipientType === "custom" && (
            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: C.textMuted }]}>Telefon raqam</Text>
              <TextInput style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
                value={form.recipient} onChangeText={t => setForm(p => ({ ...p, recipient: t }))}
                keyboardType="phone-pad" placeholder="+998901234567" placeholderTextColor={C.textMuted} />
            </View>
          )}
          <Text style={[styles.label, { color: C.textMuted }]}>Shablonlar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, flexDirection: "row" }}>
            {TEMPLATES.map((t, i) => (
              <Pressable key={i} onPress={() => setForm(p => ({ ...p, message: t.text }))}
                style={[styles.tmplBtn, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]}>
                <Text style={[styles.tmplText, { color: C.text }]}>{t.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[styles.label, { color: C.textMuted }]}>Xabar matni *</Text>
          <TextInput style={[styles.msgInput, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
            value={form.message} onChangeText={t => setForm(p => ({ ...p, message: t }))}
            placeholder="Xabar matnini kiriting..." placeholderTextColor={C.textMuted} multiline numberOfLines={5} textAlignVertical="top" />
          <Text style={[styles.charCount, { color: C.textMuted }]}>{form.message.length} / 160 belgi</Text>
          <Pressable onPress={send} disabled={sending} style={[styles.saveBtn, { backgroundColor: C.primary, opacity: sending ? 0.7 : 1 }]}>
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>{sending ? "Yuborilmoqda..." : "Yuborish"}</Text>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  empty: { fontSize: 15, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  statVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  sendBtn: { flexDirection: "row", gap: 8, paddingVertical: 13, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  sendBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  sec: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  msgCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  msgRow: { flexDirection: "row", alignItems: "center" },
  recipient: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  msgDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  msgText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sentCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  recRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  recBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  recBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  tmplBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tmplText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  msgInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 120, marginBottom: 4 },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginBottom: 16 },
  saveBtn: { flexDirection: "row", gap: 8, paddingVertical: 15, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
