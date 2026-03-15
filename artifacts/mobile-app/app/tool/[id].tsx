import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

const PAYMENT_METHODS = [
  { key: "cash", label: "Naqd pul" },
  { key: "click", label: "Click" },
  { key: "payme", label: "Payme" },
  { key: "paynet", label: "Paynet" },
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  "Drel": "drill",
  "Bolgarka": "angle-grinder",
  "Shurpayor": "screwdriver",
  "Perforator": "hammer",
  "Arra": "saw-blade",
  "O'lchov": "ruler",
  "Payvandlash": "gas-cylinder",
  "Silliqlash": "buffer",
  "Kompressor": "air-filter",
  "Narvon": "ladder",
};

export default function ToolDetailScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [showRentModal, setShowRentModal] = useState(false);
  const [daysCount, setDaysCount] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<"click" | "payme" | "paynet" | "cash">("cash");

  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool", id],
    queryFn: () => api.tools.get(Number(id)),
    enabled: !!id,
  });

  const rentMutation = useMutation({
    mutationFn: () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Number(daysCount || 1));
      return api.rentals.startByQr({
        qrCode: tool!.qrCode,
        customerId: user!.id,
        dueDate: dueDate.toISOString(),
        paymentMethod,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowRentModal(false);
      Alert.alert("Muvaffaqiyat", "Ijara muvaffaqiyatli boshlandi!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Xato", err.message);
    },
  });

  const statusConfig = {
    available: { bg: "#DCFCE7", text: "#16A34A", label: "Bo'sh — ijaraga olish mumkin" },
    rented: { bg: "#FEF9C3", text: "#CA8A04", label: "Ijarada" },
    maintenance: { bg: "#F1F5F9", text: "#64748B", label: "Ta'mirda" },
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: C.background, paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  if (!tool) return null;

  const status = statusConfig[tool.status as keyof typeof statusConfig];
  const canRent = user?.role === "customer" && tool.status === "available";
  const days = Number(daysCount || 1);
  const totalCost = tool.pricePerDay * days + tool.depositAmount;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: C.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>Asbob ma'lumotlari</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.toolIconHero, { backgroundColor: C.surfaceSecondary }]}>
            <MaterialCommunityIcons name="tools" size={52} color={C.primary} />
          </View>
          <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
            <Ionicons name={tool.status === "available" ? "checkmark-circle" : "time"} size={16} color={status.text} />
            <Text style={[styles.statusBannerText, { color: status.text }]}>{status.label}</Text>
          </View>
          <Text style={[styles.toolNameLg, { color: C.text }]}>{tool.name}</Text>
          <Text style={[styles.toolCategoryLg, { color: C.textMuted }]}>{tool.category}</Text>
          {tool.description && (
            <Text style={[styles.toolDesc, { color: C.textSecondary }]}>{tool.description}</Text>
          )}
        </View>

        {/* Pricing */}
        <View style={[styles.priceCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Narxlar</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={[styles.priceLabel, { color: C.textMuted }]}>Kunlik ijara</Text>
              <Text style={[styles.priceValue, { color: C.primary }]}>{formatPrice(tool.pricePerDay)}</Text>
            </View>
            <View style={[styles.priceDivider, { backgroundColor: C.border }]} />
            <View style={styles.priceItem}>
              <Text style={[styles.priceLabel, { color: C.textMuted }]}>Depozit</Text>
              <Text style={[styles.priceValue, { color: C.text }]}>{formatPrice(tool.depositAmount)}</Text>
            </View>
          </View>
        </View>

        {/* QR code info */}
        <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Texnik ma'lumot</Text>
          <View style={styles.infoRow}>
            <Ionicons name="qr-code-outline" size={16} color={C.textMuted} />
            <Text style={[styles.infoLabel, { color: C.textSecondary }]}>QR Kod:</Text>
            <Text style={[styles.infoValue, { color: C.text }]}>{tool.qrCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="hash" size={16} color={C.textMuted} />
            <Text style={[styles.infoLabel, { color: C.textSecondary }]}>ID:</Text>
            <Text style={[styles.infoValue, { color: C.text }]}>#{tool.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={C.textMuted} />
            <Text style={[styles.infoLabel, { color: C.textSecondary }]}>Do'kon:</Text>
            <Text style={[styles.infoValue, { color: C.text }]}>{tool.shopName || `Do'kon #${tool.shopId}`}</Text>
          </View>
        </View>
      </ScrollView>

      {/* CTA button */}
      {canRent && (
        <View style={[styles.ctaBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            style={({ pressed }) => [styles.ctaBtn, { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 }]}
            onPress={() => { setShowRentModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          >
            <Ionicons name="cart-outline" size={20} color="#fff" />
            <Text style={styles.ctaBtnText}>Ijaraga olish</Text>
          </Pressable>
        </View>
      )}

      {/* Rent modal */}
      <Modal visible={showRentModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRentModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: C.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Ijaraga olish</Text>
              <Pressable onPress={() => setShowRentModal(false)}>
                <Ionicons name="close" size={24} color={C.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.toolNameModal, { color: C.text }]}>{tool.name}</Text>

            <View style={[styles.formSection, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.formLabel, { color: C.textSecondary }]}>Ijara muddati (kun)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                value={daysCount}
                onChangeText={setDaysCount}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.formLabel, { color: C.textSecondary, marginTop: 16 }]}>To'lov usuli</Text>
              <View style={styles.paymentGrid}>
                {PAYMENT_METHODS.map(pm => (
                  <Pressable
                    key={pm.key}
                    style={[styles.payChip, {
                      backgroundColor: paymentMethod === pm.key ? C.primary : C.surfaceSecondary,
                      borderColor: paymentMethod === pm.key ? C.primary : C.border,
                    }]}
                    onPress={() => { setPaymentMethod(pm.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.payChipText, { color: paymentMethod === pm.key ? "#fff" : C.textSecondary }]}>
                      {pm.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.summaryBox, { backgroundColor: C.surfaceSecondary }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>{days} kun × {formatPrice(tool.pricePerDay)}</Text>
                  <Text style={[styles.summaryVal, { color: C.text }]}>{formatPrice(tool.pricePerDay * days)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>Depozit</Text>
                  <Text style={[styles.summaryVal, { color: C.text }]}>{formatPrice(tool.depositAmount)}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: C.border }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryTotal, { color: C.text }]}>Jami</Text>
                  <Text style={[styles.summaryTotalVal, { color: C.primary }]}>{formatPrice(totalCost)}</Text>
                </View>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.confirmBtn, { backgroundColor: C.primary, opacity: pressed || rentMutation.isPending ? 0.85 : 1 }]}
              onPress={() => rentMutation.mutate()}
              disabled={rentMutation.isPending}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>
                {rentMutation.isPending ? "Saqlanmoqda..." : "Ijarani tasdiqlash"}
              </Text>
            </Pressable>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  heroCard: { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: "center", gap: 10 },
  toolIconHero: { width: 100, height: 100, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  statusBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  toolNameLg: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  toolCategoryLg: { fontSize: 14, fontFamily: "Inter_400Regular" },
  toolDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  priceCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 14 },
  priceRow: { flexDirection: "row", alignItems: "center" },
  priceItem: { flex: 1, alignItems: "center" },
  priceDivider: { width: 1, height: 40 },
  priceLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6 },
  priceValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  infoCard: { borderRadius: 16, padding: 18, borderWidth: 1, gap: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  infoValue: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  ctaBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16 },
  ctaBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  // Modal
  modalRoot: { flex: 1, paddingHorizontal: 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  toolNameModal: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 16 },
  formSection: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 16 },
  formLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  formInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_400Regular" },
  paymentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  payChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  payChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  summaryBox: { marginTop: 16, borderRadius: 12, padding: 14, gap: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryVal: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryDivider: { height: 1 },
  summaryTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  summaryTotalVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16, marginBottom: 16 },
  confirmBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
