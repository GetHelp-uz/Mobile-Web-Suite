import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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

const CATEGORIES = ["Drel", "Bolgarka", "Shurpayor", "Perforator", "Arra", "O'lchov", "Payvandlash", "Silliqlash", "Kompressor", "Narvon", "Boshqa"];
const FILTER_CATEGORIES = ["Barchasi", ...CATEGORIES];
const STATUSES = [
  { key: undefined, label: "Barchasi" },
  { key: "available", label: "Bo'sh" },
  { key: "rented", label: "Ijarada" },
  { key: "maintenance", label: "Ta'mirda" },
];

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    available: { bg: "#DCFCE7", text: "#16A34A", label: "Bo'sh" },
    rented: { bg: "#FEF9C3", text: "#CA8A04", label: "Ijarada" },
    maintenance: { bg: "#FEE2E2", text: "#DC2626", label: "Ta'mirda" },
  }[status as keyof typeof config] || { bg: "#F1F5F9", text: "#64748B", label: status };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

function ToolRow({ tool }: { tool: Tool }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.9 : 1 }]}
      onPress={() => { router.push({ pathname: "/tool/[id]", params: { id: String(tool.id) } }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </View>
    </Pressable>
  );
}

const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  pricePerDay: "",
  pricePerHour: "",
  depositAmount: "",
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
    onError: (err: Error) => {
      Alert.alert("Xatolik", err.message || "Asbob qo'shilmadi");
    },
  });

  function handleSubmit() {
    if (!form.name.trim()) return Alert.alert("Xatolik", "Asbob nomini kiriting");
    if (!form.category) return Alert.alert("Xatolik", "Kategoriyani tanlang");
    if (!form.pricePerDay || isNaN(Number(form.pricePerDay))) return Alert.alert("Xatolik", "Kunlik narxni kiriting");
    if (!form.depositAmount || isNaN(Number(form.depositAmount))) return Alert.alert("Xatolik", "Depozit miqdorini kiriting");
    createTool.mutate();
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.modalRoot, { backgroundColor: C.background, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.modalCancelBtn}>
              <Text style={[styles.modalCancelText, { color: C.textSecondary }]}>Bekor</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: C.text }]}>Yangi asbob</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={createTool.isPending}
              style={[styles.modalSaveBtn, { backgroundColor: C.primary, opacity: createTool.isPending ? 0.6 : 1 }]}
            >
              {createTool.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.modalSaveText}>Saqlash</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Nom */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Asbob nomi *</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Masalan: Makita Drel 18V"
                placeholderTextColor={C.textMuted}
              />
            </View>

            {/* Kategoriya */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Kategoriya *</Text>
              <TouchableOpacity
                style={[styles.fieldInput, styles.fieldSelect, { backgroundColor: C.inputBg, borderColor: C.border }]}
                onPress={() => setShowCatPicker(p => !p)}
              >
                <Text style={[{ color: form.category ? C.text : C.textMuted, flex: 1, fontSize: 15 }]}>
                  {form.category || "Kategoriya tanlang"}
                </Text>
                <Ionicons name={showCatPicker ? "chevron-up" : "chevron-down"} size={18} color={C.textMuted} />
              </TouchableOpacity>

              {showCatPicker && (
                <View style={[styles.catList, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catItem, { borderBottomColor: C.border, backgroundColor: form.category === cat ? C.primary + "15" : "transparent" }]}
                      onPress={() => { setForm(f => ({ ...f, category: cat })); setShowCatPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    >
                      <Text style={[styles.catItemText, { color: form.category === cat ? C.primary : C.text, fontFamily: form.category === cat ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{cat}</Text>
                      {form.category === cat && <Ionicons name="checkmark" size={18} color={C.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Tavsif */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Tavsif (ixtiyoriy)</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextarea, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="Asbob haqida qisqacha ma'lumot..."
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Narxlar */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Kunlik narx (so'm) *</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                  value={form.pricePerDay}
                  onChangeText={v => setForm(f => ({ ...f, pricePerDay: v.replace(/\D/g, "") }))}
                  placeholder="50000"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Soatlik narx</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                  value={form.pricePerHour}
                  onChangeText={v => setForm(f => ({ ...f, pricePerHour: v.replace(/\D/g, "") }))}
                  placeholder="7000"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Depozit */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Depozit (so'm) *</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                value={form.depositAmount}
                onChangeText={v => setForm(f => ({ ...f, depositAmount: v.replace(/\D/g, "") }))}
                placeholder="200000"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
              />
            </View>

            {/* Xulosa */}
            {form.name && form.category && form.pricePerDay ? (
              <View style={[styles.previewCard, { backgroundColor: C.primaryLight, borderColor: C.primary + "33" }]}>
                <MaterialCommunityIcons name="tools" size={28} color={C.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.previewName, { color: C.text }]}>{form.name}</Text>
                  <Text style={[styles.previewCat, { color: C.textSecondary }]}>{form.category}</Text>
                  {form.pricePerDay ? (
                    <Text style={[styles.previewPrice, { color: C.primary }]}>
                      {Number(form.pricePerDay).toLocaleString("uz-UZ")} so'm/kun
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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

  const isShopOwner = user?.role === "shop_owner";
  const shopId = user?.role === "shop_owner" ? user.shopId : undefined;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tools-admin", category, statusFilter, shopId],
    queryFn: () => api.tools.list({ category, status: statusFilter, shopId, limit: 50 }),
  });

  const filtered = data?.tools?.filter(t =>
    search.length === 0 ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.title, { color: C.text }]}>Asboblar</Text>
          <Text style={[styles.count, { color: C.textMuted }]}>{data?.total || 0} ta asbob</Text>
        </View>
        {isShopOwner && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: C.primary }]}
            onPress={() => { setAddOpen(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.addBtnText}>Qo'shish</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
        <Ionicons name="search-outline" size={18} color={C.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Asbob izlash..."
          placeholderTextColor={C.textMuted}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Status filter */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={STATUSES}
        keyExtractor={i => String(i.key)}
        contentContainerStyle={styles.statusFilters}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.filterChip, { backgroundColor: statusFilter === item.key ? C.primary : C.surfaceSecondary, borderColor: statusFilter === item.key ? C.primary : C.border }]}
            onPress={() => { setStatusFilter(item.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.filterChipText, { color: statusFilter === item.key ? "#fff" : C.textSecondary }]}>{item.label}</Text>
          </Pressable>
        )}
      />

      {/* Category filter */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={FILTER_CATEGORIES}
        keyExtractor={i => i}
        contentContainerStyle={styles.catFilters}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.catChip, { borderBottomWidth: (category ?? "Barchasi") === item ? 2 : 0, borderBottomColor: C.primary }]}
            onPress={() => { setCategory(item === "Barchasi" ? undefined : item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.catChipText, { color: (category ?? "Barchasi") === item ? C.primary : C.textSecondary, fontFamily: (category ?? "Barchasi") === item ? "Inter_700Bold" : "Inter_400Regular" }]}>{item}</Text>
          </Pressable>
        )}
      />

      {isLoading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="toolbox-outline" size={52} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Asbob topilmadi</Text>
          {isShopOwner && (
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: C.primary }]}
              onPress={() => setAddOpen(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Birinchi asbobni qo'shing</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => String(t.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => <ToolRow tool={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {isShopOwner && shopId && (
        <AddToolModal
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          shopId={shopId}
        />
      )}
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyAddBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // Modal
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalCancelBtn: { paddingVertical: 4, paddingHorizontal: 2 },
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
  previewCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  previewName: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  previewCat: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  previewPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
