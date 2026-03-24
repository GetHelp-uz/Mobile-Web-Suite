import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, Tool } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

const CATEGORIES = ["Drel", "Bolgarka", "Shurpayor", "Perforator", "Arra", "O'lchov", "Payvandlash", "Silliqlash", "Kompressor", "Narvon", "Boshqa"];
const FILTER_CATEGORIES = ["Barchasi", ...CATEGORIES];
const STATUSES = [
  { key: undefined, label: "Barchasi" },
  { key: "available", label: "Bo'sh" },
  { key: "rented", label: "Ijarada" },
  { key: "maintenance", label: "Ta'mirda" },
];
const STATUS_OPTIONS = [
  { key: "available", label: "Bo'sh", color: "#16A34A" },
  { key: "rented", label: "Ijarada", color: "#CA8A04" },
  { key: "maintenance", label: "Ta'mirda", color: "#DC2626" },
];

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

type StatusKey = "available" | "rented" | "maintenance";
const STATUS_CONFIG: Record<StatusKey, { bg: string; text: string; label: string }> = {
  available: { bg: "#DCFCE7", text: "#16A34A", label: "Bo'sh" },
  rented: { bg: "#FEF9C3", text: "#CA8A04", label: "Ijarada" },
  maintenance: { bg: "#FEE2E2", text: "#DC2626", label: "Ta'mirda" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as StatusKey] || { bg: "#F1F5F9", text: "#64748B", label: status };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

function ToolRow({ tool, isOwner, onEdit, onQR }: {
  tool: Tool;
  isOwner: boolean;
  onEdit: (tool: Tool) => void;
  onQR: (tool: Tool) => void;
}) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.95 : 1 }]}
      onPress={() => {
        router.push({ pathname: "/tool/[id]", params: { id: String(tool.id) } });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <View style={[styles.rowIcon, { backgroundColor: C.surfaceSecondary }]}>
        <MaterialCommunityIcons name="tools" size={22} color={C.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>{tool.name}</Text>
        <Text style={[styles.rowCategory, { color: C.textMuted }]}>{tool.category}</Text>
        <Text style={[styles.rowPrice, { color: C.primary }]}>{formatPrice(tool.pricePerDay)}/kun</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <StatusBadge status={tool.status} />
        {isOwner ? (
          <View style={{ flexDirection: "row", gap: 4 }}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: C.surfaceSecondary }]}
              onPress={(e) => { e.stopPropagation?.(); onQR(tool); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons name="qr-code-outline" size={15} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: C.surfaceSecondary }]}
              onPress={(e) => { e.stopPropagation?.(); onEdit(tool); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            >
              <Ionicons name="create-outline" size={15} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        )}
      </View>
    </Pressable>
  );
}

const EMPTY_FORM = {
  name: "", category: "", description: "",
  pricePerDay: "", pricePerHour: "", depositAmount: "",
};

function AddToolModal({ visible, onClose, shopId }: { visible: boolean; onClose: () => void; shopId: number }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showCatPicker, setShowCatPicker] = useState(false);

  const createTool = useMutation({
    mutationFn: () => api.tools.create({
      shopId,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || undefined,
      pricePerDay: Number(form.pricePerDay),
      pricePerHour: form.pricePerHour ? Number(form.pricePerHour) : undefined,
      depositAmount: Number(form.depositAmount),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools-admin"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setForm(EMPTY_FORM);
      onClose();
    },
    onError: (err: Error) => Alert.alert("Xatolik", err.message || "Asbob qo'shilmadi"),
  });

  function handleSubmit() {
    if (!form.name.trim()) return Alert.alert("Xatolik", "Asbob nomini kiriting");
    if (!form.category) return Alert.alert("Xatolik", "Kategoriyani tanlang");
    if (!form.pricePerDay || isNaN(Number(form.pricePerDay))) return Alert.alert("Xatolik", "Kunlik narxni kiriting");
    if (!form.depositAmount || isNaN(Number(form.depositAmount))) return Alert.alert("Xatolik", "Depozit miqdorini kiriting");
    createTool.mutate();
  }

  function handleClose() { setForm(EMPTY_FORM); onClose(); }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.modalRoot, { backgroundColor: C.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.modalCancelBtn}>
              <Text style={[styles.modalCancelText, { color: C.textSecondary }]}>Bekor</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: C.text }]}>Yangi asbob</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={createTool.isPending}
              style={[styles.modalSaveBtn, { backgroundColor: C.primary, opacity: createTool.isPending ? 0.6 : 1 }]}>
              {createTool.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.modalSaveText}>Saqlash</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Asbob nomi *</Text>
              <TextInput style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Masalan: Makita Drel 18V" placeholderTextColor={C.textMuted} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Kategoriya *</Text>
              <TouchableOpacity style={[styles.fieldInput, styles.fieldSelect, { backgroundColor: C.inputBg, borderColor: C.border }]}
                onPress={() => setShowCatPicker(p => !p)}>
                <Text style={[{ color: form.category ? C.text : C.textMuted, flex: 1, fontSize: 15 }]}>
                  {form.category || "Kategoriya tanlang"}
                </Text>
                <Ionicons name={showCatPicker ? "chevron-up" : "chevron-down"} size={18} color={C.textMuted} />
              </TouchableOpacity>
              {showCatPicker && (
                <View style={[styles.catList, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat}
                      style={[styles.catItem, { borderBottomColor: C.border, backgroundColor: form.category === cat ? C.primary + "15" : "transparent" }]}
                      onPress={() => { setForm(f => ({ ...f, category: cat })); setShowCatPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <Text style={[styles.catItemText, { color: form.category === cat ? C.primary : C.text, fontFamily: form.category === cat ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{cat}</Text>
                      {form.category === cat && <Ionicons name="checkmark" size={18} color={C.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Tavsif (ixtiyoriy)</Text>
              <TextInput style={[styles.fieldInput, styles.fieldTextarea, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="Asbob haqida qisqacha..." placeholderTextColor={C.textMuted}
                multiline numberOfLines={3} textAlignVertical="top" />
            </View>
            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Kunlik narx *</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                  value={form.pricePerDay} onChangeText={v => setForm(f => ({ ...f, pricePerDay: v.replace(/\D/g, "") }))}
                  placeholder="50000" placeholderTextColor={C.textMuted} keyboardType="number-pad" />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Soatlik narx</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                  value={form.pricePerHour} onChangeText={v => setForm(f => ({ ...f, pricePerHour: v.replace(/\D/g, "") }))}
                  placeholder="7000" placeholderTextColor={C.textMuted} keyboardType="number-pad" />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Depozit (so'm) *</Text>
              <TextInput style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                value={form.depositAmount} onChangeText={v => setForm(f => ({ ...f, depositAmount: v.replace(/\D/g, "") }))}
                placeholder="200000" placeholderTextColor={C.textMuted} keyboardType="number-pad" />
            </View>
            {form.name && form.category && form.pricePerDay ? (
              <View style={[styles.previewCard, { backgroundColor: C.primary + "15", borderColor: C.primary + "33" }]}>
                <MaterialCommunityIcons name="tools" size={28} color={C.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.previewName, { color: C.text }]}>{form.name}</Text>
                  <Text style={[styles.previewCat, { color: C.textSecondary }]}>{form.category}</Text>
                  <Text style={[styles.previewPrice, { color: C.primary }]}>{Number(form.pricePerDay).toLocaleString("uz-UZ")} so'm/kun</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EditToolModal({ tool, visible, onClose }: { tool: Tool | null; visible: boolean; onClose: () => void }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", pricePerDay: "", depositAmount: "", status: "available", category: "" });
  const [showCatPicker, setShowCatPicker] = useState(false);

  React.useEffect(() => {
    if (tool) {
      setForm({
        name: tool.name,
        description: tool.description || "",
        pricePerDay: String(tool.pricePerDay),
        depositAmount: String(tool.depositAmount),
        status: tool.status,
        category: tool.category,
      });
    }
  }, [tool]);

  const updateTool = useMutation({
    mutationFn: async () => {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/api/tools/${tool!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim() || undefined,
          pricePerDay: Number(form.pricePerDay),
          depositAmount: Number(form.depositAmount),
          status: form.status,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Xatolik");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools-admin"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: Error) => Alert.alert("Xatolik", e.message),
  });

  const deleteTool = useMutation({
    mutationFn: async () => {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/api/tools/${tool!.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json()).error || "Xatolik");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools-admin"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: Error) => Alert.alert("Xatolik", e.message),
  });

  function confirmDelete() {
    Alert.alert(
      "Asbobni o'chirish",
      `"${tool?.name}" asbobini o'chirib tashlansinmi? Bu amalni qaytarib bo'lmaydi.`,
      [
        { text: "Bekor qilish", style: "cancel" },
        { text: "O'chirish", style: "destructive", onPress: () => deleteTool.mutate() },
      ]
    );
  }

  if (!tool) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.modalRoot, { backgroundColor: C.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.modalCancelBtn}>
              <Text style={[styles.modalCancelText, { color: C.textSecondary }]}>Bekor</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: C.text }]}>Tahrirlash</Text>
            <TouchableOpacity onPress={() => updateTool.mutate()} disabled={updateTool.isPending}
              style={[styles.modalSaveBtn, { backgroundColor: C.primary, opacity: updateTool.isPending ? 0.6 : 1 }]}>
              {updateTool.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.modalSaveText}>Saqlash</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Asbob nomi</Text>
              <TextInput style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholderTextColor={C.textMuted} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Kategoriya</Text>
              <TouchableOpacity style={[styles.fieldInput, styles.fieldSelect, { backgroundColor: C.inputBg, borderColor: C.border }]}
                onPress={() => setShowCatPicker(p => !p)}>
                <Text style={[{ color: form.category ? C.text : C.textMuted, flex: 1, fontSize: 15 }]}>{form.category || "Tanlang"}</Text>
                <Ionicons name={showCatPicker ? "chevron-up" : "chevron-down"} size={18} color={C.textMuted} />
              </TouchableOpacity>
              {showCatPicker && (
                <View style={[styles.catList, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat}
                      style={[styles.catItem, { borderBottomColor: C.border, backgroundColor: form.category === cat ? C.primary + "15" : "transparent" }]}
                      onPress={() => { setForm(f => ({ ...f, category: cat })); setShowCatPicker(false); }}>
                      <Text style={[styles.catItemText, { color: form.category === cat ? C.primary : C.text }]}>{cat}</Text>
                      {form.category === cat && <Ionicons name="checkmark" size={18} color={C.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Holat</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {STATUS_OPTIONS.map(s => (
                  <TouchableOpacity key={s.key}
                    style={[styles.statusChip, { borderColor: form.status === s.key ? s.color : C.border, backgroundColor: form.status === s.key ? s.color + "18" : C.surfaceSecondary }]}
                    onPress={() => { setForm(f => ({ ...f, status: s.key })); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Text style={[styles.statusChipText, { color: form.status === s.key ? s.color : C.textSecondary }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Tavsif</Text>
              <TextInput style={[styles.fieldInput, styles.fieldTextarea, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))}
                multiline numberOfLines={3} textAlignVertical="top" placeholderTextColor={C.textMuted} />
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Kunlik narx</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                  value={form.pricePerDay} onChangeText={v => setForm(f => ({ ...f, pricePerDay: v.replace(/\D/g, "") }))}
                  keyboardType="number-pad" placeholderTextColor={C.textMuted} />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Depozit</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                  value={form.depositAmount} onChangeText={v => setForm(f => ({ ...f, depositAmount: v.replace(/\D/g, "") }))}
                  keyboardType="number-pad" placeholderTextColor={C.textMuted} />
              </View>
            </View>

            <TouchableOpacity onPress={confirmDelete} disabled={deleteTool.isPending}
              style={[styles.deleteBtn, { borderColor: "#DC2626", opacity: deleteTool.isPending ? 0.5 : 1 }]}>
              {deleteTool.isPending
                ? <ActivityIndicator size="small" color="#DC2626" />
                : <>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>Asbobni o'chirish</Text>
                </>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function QRModal({ tool, visible, onClose }: { tool: Tool | null; visible: boolean; onClose: () => void }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [qrData, setQrData] = useState<string | null>(null);

  React.useEffect(() => {
    if (tool && visible) {
      AsyncStorage.getItem("gethelp_token").then(token => {
        fetch(`${BASE_URL}/api/tools/${tool.id}/qr`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => setQrData(d.qrCode || tool.qrCode))
          .catch(() => setQrData(tool.qrCode));
      });
    }
  }, [tool, visible]);

  if (!tool) return null;

  const qrImageUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}`
    : null;

  async function handleShare() {
    try {
      await Share.share({
        message: `GetHelp.uz — ${tool!.name}\nKunlik: ${formatPrice(tool!.pricePerDay)}\nQR: ${qrData || tool!.qrCode}`,
        title: tool!.name,
      });
    } catch {}
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: C.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
          <View style={{ width: 70 }} />
          <Text style={[styles.modalTitle, { color: C.text }]}>QR Kod</Text>
          <TouchableOpacity onPress={onClose} style={[styles.modalCancelBtn, { alignItems: "flex-end" }]}>
            <Text style={[styles.modalCancelText, { color: C.primary }]}>Yopish</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ alignItems: "center", padding: 24, gap: 20 }}>
          <View style={[styles.qrCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.qrToolName, { color: C.text }]}>{tool.name}</Text>
            <Text style={[styles.qrToolCat, { color: C.textMuted }]}>{tool.category}</Text>
            {qrImageUrl ? (
              <Image source={{ uri: qrImageUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <ActivityIndicator color={C.primary} style={{ height: 200, width: 200 }} />
            )}
            <View style={styles.qrPriceRow}>
              <View style={styles.qrPriceItem}>
                <Text style={[styles.qrPriceLabel, { color: C.textMuted }]}>Kunlik</Text>
                <Text style={[styles.qrPriceValue, { color: C.primary }]}>{formatPrice(tool.pricePerDay)}</Text>
              </View>
              <View style={[styles.qrPriceDivider, { backgroundColor: C.border }]} />
              <View style={styles.qrPriceItem}>
                <Text style={[styles.qrPriceLabel, { color: C.textMuted }]}>Depozit</Text>
                <Text style={[styles.qrPriceValue, { color: C.text }]}>{formatPrice(tool.depositAmount)}</Text>
              </View>
            </View>
            <Text style={[styles.qrCode, { color: C.textMuted }]}>ID: {tool.id} · {qrData?.slice(0, 12)}...</Text>
          </View>

          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: C.primary }]} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>Ulashish</Text>
          </TouchableOpacity>

          <View style={[styles.qrInfoBox, { backgroundColor: C.primary + "12", borderColor: C.primary + "30" }]}>
            <Ionicons name="information-circle-outline" size={16} color={C.primary} />
            <Text style={[styles.qrInfoText, { color: C.primary }]}>
              Mijoz bu QR kodni skaner qilib asbob ma'lumotlarini ko'rishi va ijaraga olishi mumkin
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ToolsScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [editTool, setEditTool] = useState<Tool | null>(null);
  const [qrTool, setQrTool] = useState<Tool | null>(null);

  const isShopOwner = user?.role === "shop_owner" || user?.role === "super_admin";
  const shopId = user?.shopId;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tools-admin", category, statusFilter, shopId],
    queryFn: () => api.tools.list({ category, status: statusFilter, shopId, limit: 50 }),
  });

  const filtered = data?.tools?.filter(t =>
    search.length === 0 ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const stats = {
    total: data?.tools?.length || 0,
    available: data?.tools?.filter(t => t.status === "available").length || 0,
    rented: data?.tools?.filter(t => t.status === "rented").length || 0,
    maintenance: data?.tools?.filter(t => t.status === "maintenance").length || 0,
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.title, { color: C.text }]}>Asboblar</Text>
          <Text style={[styles.count, { color: C.textMuted }]}>{stats.total} ta asbob</Text>
        </View>
        {isShopOwner && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: C.primary }]}
            onPress={() => { setAddOpen(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.addBtnText}>Qo'shish</Text>
          </TouchableOpacity>
        )}
      </View>

      {isShopOwner && stats.total > 0 && (
        <View style={styles.statsRow}>
          {[
            { label: "Bo'sh", value: stats.available, color: "#16A34A" },
            { label: "Ijarada", value: stats.rented, color: "#CA8A04" },
            { label: "Ta'mirda", value: stats.maintenance, color: "#DC2626" },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.searchRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
        <Ionicons name="search-outline" size={18} color={C.textMuted} />
        <TextInput style={[styles.searchInput, { color: C.text }]}
          value={search} onChangeText={setSearch}
          placeholder="Asbob izlash..." placeholderTextColor={C.textMuted} />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </Pressable>
        )}
      </View>

      <FlatList horizontal showsHorizontalScrollIndicator={false}
        data={STATUSES} keyExtractor={i => String(i.key)}
        contentContainerStyle={styles.statusFilters}
        renderItem={({ item }) => (
          <Pressable style={[styles.filterChip, { backgroundColor: statusFilter === item.key ? C.primary : C.surfaceSecondary, borderColor: statusFilter === item.key ? C.primary : C.border }]}
            onPress={() => { setStatusFilter(item.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <Text style={[styles.filterChipText, { color: statusFilter === item.key ? "#fff" : C.textSecondary }]}>{item.label}</Text>
          </Pressable>
        )} />

      <FlatList horizontal showsHorizontalScrollIndicator={false}
        data={FILTER_CATEGORIES} keyExtractor={i => i}
        contentContainerStyle={styles.catFilters}
        renderItem={({ item }) => (
          <Pressable style={[styles.catChip, { borderBottomWidth: (category ?? "Barchasi") === item ? 2 : 0, borderBottomColor: C.primary }]}
            onPress={() => { setCategory(item === "Barchasi" ? undefined : item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <Text style={[styles.catChipText, { color: (category ?? "Barchasi") === item ? C.primary : C.textSecondary, fontFamily: (category ?? "Barchasi") === item ? "Inter_700Bold" : "Inter_400Regular" }]}>{item}</Text>
          </Pressable>
        )} />

      {isLoading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="toolbox-outline" size={52} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Asbob topilmadi</Text>
          {isShopOwner && (
            <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: C.primary }]} onPress={() => setAddOpen(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Birinchi asbobni qo'shing</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList data={filtered} keyExtractor={t => String(t.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => (
            <ToolRow
              tool={item}
              isOwner={isShopOwner}
              onEdit={t => setEditTool(t)}
              onQR={t => setQrTool(t)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />} />
      )}

      {isShopOwner && shopId && (
        <AddToolModal visible={addOpen} onClose={() => setAddOpen(false)} shopId={shopId} />
      )}
      <EditToolModal tool={editTool} visible={!!editTool} onClose={() => setEditTool(null)} />
      <QRModal tool={qrTool} visible={!!qrTool} onClose={() => setQrTool(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  count: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24 },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  statusFilters: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  catFilters: { paddingHorizontal: 16, gap: 4, marginBottom: 10 },
  catChip: { paddingHorizontal: 10, paddingVertical: 8 },
  catChipText: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, borderWidth: 1 },
  rowIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  rowName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  rowCategory: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 3 },
  rowPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyAddBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalCancelBtn: { paddingVertical: 4, paddingHorizontal: 2, width: 70 },
  modalCancelText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  modalSaveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, minWidth: 80, alignItems: "center" },
  modalSaveText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalBody: { paddingHorizontal: 20, paddingTop: 20, gap: 16, paddingBottom: 40 },
  fieldGroup: { gap: 6 },
  fieldRow: { flexDirection: "row", gap: 12 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fieldInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  fieldSelect: { flexDirection: "row", alignItems: "center" },
  fieldTextarea: { minHeight: 80 },
  catList: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 4 },
  catItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  catItemText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  statusChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  statusChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  deleteBtnText: { color: "#DC2626", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  previewCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  previewName: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  previewCat: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  previewPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  qrCard: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  qrToolName: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  qrToolCat: { fontSize: 13, fontFamily: "Inter_400Regular" },
  qrImage: { width: 220, height: 220, marginVertical: 12 },
  qrPriceRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qrPriceItem: { alignItems: "center", gap: 2 },
  qrPriceDivider: { width: 1, height: 32 },
  qrPriceLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  qrPriceValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  qrCode: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  shareBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  qrInfoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginHorizontal: 4 },
  qrInfoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
