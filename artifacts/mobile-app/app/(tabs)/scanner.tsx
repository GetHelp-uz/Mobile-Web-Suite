import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, Tool } from "@/lib/api";

type ScanMode = "start" | "return";

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

const PAYMENT_METHODS = [
  { key: "cash", label: "Naqd" },
  { key: "click", label: "Click" },
  { key: "payme", label: "Payme" },
  { key: "paynet", label: "Paynet" },
] as const;

interface CustomerInfo {
  id: number;
  name: string;
  phone: string;
  role: string;
}

export default function ScannerScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [mode, setMode] = useState<ScanMode>("start");
  const [qrInput, setQrInput] = useState("");
  const [scannedTool, setScannedTool] = useState<Tool | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Start rental fields
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);
  const [daysCount, setDaysCount] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<"click" | "payme" | "paynet" | "cash">("cash");

  // Return rental fields
  const [damageNote, setDamageNote] = useState("");
  const [damageCost, setDamageCost] = useState("");

  const lookupToolMutation = useMutation({
    mutationFn: (qr: string) => api.tools.scanQr(qr),
    onSuccess: (tool) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScannedTool(tool);
      setCustomerInfo(null);
      setCustomerPhone("");
      setDaysCount("1");
      setPaymentMethod("cash");
      setDamageNote("");
      setDamageCost("");
      setShowModal(true);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Asbob topilmadi", err.message || "QR kod noto'g'ri");
    },
  });

  async function lookupCustomer() {
    if (!customerPhone.trim()) return;
    setLookingUpCustomer(true);
    try {
      const result = await api.users.lookup(customerPhone.trim());
      setCustomerInfo(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Mijoz topilmadi", err.message || "Bu raqam bilan mijoz yo'q");
      setCustomerInfo(null);
    } finally {
      setLookingUpCustomer(false);
    }
  }

  const startRentalMutation = useMutation({
    mutationFn: () => {
      const resolvedCustomerId = customerInfo?.id ?? user!.id;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Number(daysCount || 1));
      return api.rentals.startByQr({
        qrCode: qrInput,
        customerId: resolvedCustomerId,
        dueDate: dueDate.toISOString(),
        paymentMethod,
      });
    },
    onSuccess: (rental) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowModal(false);
      setQrInput("");
      setScannedTool(null);
      Alert.alert("Muvaffaqiyat", `Ijara #${rental.id} boshlandi!`);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Xato", err.message);
    },
  });

  const returnMutation = useMutation({
    mutationFn: () => api.rentals.returnByQr({
      qrCode: qrInput,
      damageNote: damageNote || undefined,
      damageCost: damageCost ? Number(damageCost) : undefined,
    }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowModal(false);
      setQrInput("");
      setScannedTool(null);
      setDamageNote("");
      setDamageCost("");
      Alert.alert("Muvaffaqiyat", "Asbob muvaffaqiyatli qaytarildi!");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Xato", err.message);
    },
  });

  const days = Number(daysCount || 1);

  return (
    <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>QR Skaner</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            Asbob QR kodini kiriting
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={[styles.modeToggle, { backgroundColor: C.surfaceSecondary }]}>
          {(["start", "return"] as ScanMode[]).map((m) => (
            <Pressable
              key={m}
              style={[styles.modeBtn, mode === m && { backgroundColor: C.primary }]}
              onPress={() => {
                setMode(m);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons
                name={m === "start" ? "play-circle-outline" : "arrow-undo-circle-outline"}
                size={16}
                color={mode === m ? "#fff" : C.textSecondary}
              />
              <Text style={[styles.modeBtnText, { color: mode === m ? "#fff" : C.textSecondary }]}>
                {m === "start" ? "Ijara boshlash" : "Asbob qaytarish"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* QR box */}
        <View style={[styles.qrBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.qrIconBox, { backgroundColor: mode === "start" ? C.primary + "15" : Colors.light.success + "15" }]}>
            <Ionicons
              name="qr-code-outline"
              size={72}
              color={mode === "start" ? C.primary : Colors.light.success}
            />
          </View>
          <Text style={[styles.qrHint, { color: C.textSecondary }]}>
            {mode === "start"
              ? "Ijaraga berish uchun asbob QR kodini kiriting"
              : "Qaytarish uchun asbob QR kodini kiriting"}
          </Text>
        </View>

        {/* Input card */}
        <View style={[styles.inputCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Asbob QR kodi</Text>
          <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
            <Ionicons name="barcode-outline" size={20} color={C.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: C.text }]}
              value={qrInput}
              onChangeText={setQrInput}
              placeholder="QR-DREL-001"
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => qrInput && lookupToolMutation.mutate(qrInput)}
            />
            {qrInput.length > 0 && (
              <Pressable onPress={() => setQrInput("")}>
                <Ionicons name="close-circle" size={18} color={C.textMuted} />
              </Pressable>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.searchBtn,
              { backgroundColor: mode === "start" ? C.primary : Colors.light.success, opacity: pressed || lookupToolMutation.isPending || !qrInput ? 0.75 : 1 },
            ]}
            onPress={() => lookupToolMutation.mutate(qrInput)}
            disabled={lookupToolMutation.isPending || !qrInput}
          >
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={styles.searchBtnText}>
              {lookupToolMutation.isPending ? "Qidirilmoqda..." : "Asbobni topish"}
            </Text>
          </Pressable>
        </View>

        {/* Demo QR codes */}
        <View style={[styles.demoCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.demoCardHeader}>
            <Ionicons name="information-circle-outline" size={16} color={C.textMuted} />
            <Text style={[styles.demoCardTitle, { color: C.textSecondary }]}>Demo QR kodlar</Text>
          </View>
          <View style={styles.demoGrid}>
            {[
              { qr: "QR-DREL-001", label: "Drel (bo'sh)" },
              { qr: "QR-BORG-001", label: "Bolgarka (bo'sh)" },
              { qr: "QR-SHUR-001", label: "Shurpayor (bo'sh)" },
              { qr: "QR-PERF-001", label: "Perforator (bo'sh)" },
              { qr: "QR-DREL-003", label: "Drel (ijarada)" },
            ].map((item) => (
              <Pressable
                key={item.qr}
                style={[styles.demoChip, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}
                onPress={() => {
                  setQrInput(item.qr);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.demoChipCode, { color: C.primary }]}>{item.qr}</Text>
                <Text style={[styles.demoChipLabel, { color: C.textMuted }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Scanned tool modal */}
      <Modal
        visible={showModal && scannedTool !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        {scannedTool && (
          <View style={[styles.modalRoot, { backgroundColor: C.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: C.text }]}>
                  {mode === "start" ? "Ijara boshlash" : "Asbobni qaytarish"}
                </Text>
                <Pressable onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={C.textSecondary} />
                </Pressable>
              </View>

              {/* Tool info */}
              <View style={[styles.toolInfo, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={[styles.toolInfoIcon, { backgroundColor: C.surfaceSecondary }]}>
                  <Ionicons name="construct-outline" size={28} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toolInfoName, { color: C.text }]}>{scannedTool.name}</Text>
                  <Text style={[styles.toolInfoCat, { color: C.textMuted }]}>{scannedTool.category}</Text>
                  <View style={styles.toolInfoPriceRow}>
                    <Text style={[styles.toolInfoPrice, { color: C.primary }]}>{formatPrice(scannedTool.pricePerDay)}/kun</Text>
                    <View style={[
                      styles.statusChip,
                      { backgroundColor: scannedTool.status === "available" ? "#DCFCE7" : "#FEF9C3" },
                    ]}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: scannedTool.status === "available" ? "#16A34A" : "#CA8A04" }}>
                        {scannedTool.status === "available" ? "Bo'sh" : scannedTool.status === "rented" ? "Ijarada" : "Ta'mirda"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* START RENTAL FORM */}
              {mode === "start" && (
                <>
                  {/* Customer lookup */}
                  <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Text style={[styles.sectionTitle, { color: C.text }]}>Mijoz ma'lumoti</Text>

                    {customerInfo ? (
                      <View style={[styles.customerFound, { backgroundColor: Colors.light.success + "15", borderColor: Colors.light.success + "40" }]}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.customerName, { color: C.text }]}>{customerInfo.name}</Text>
                          <Text style={[styles.customerPhone, { color: C.textSecondary }]}>{customerInfo.phone}</Text>
                        </View>
                        <Pressable onPress={() => { setCustomerInfo(null); setCustomerPhone(""); }}>
                          <Ionicons name="close-circle" size={20} color={C.textMuted} />
                        </Pressable>
                      </View>
                    ) : (
                      <View>
                        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Mijoz telefon raqami</Text>
                        <View style={styles.lookupRow}>
                          <View style={[styles.lookupInput, { backgroundColor: C.inputBg, borderColor: C.border, flex: 1 }]}>
                            <Ionicons name="call-outline" size={16} color={C.textMuted} style={{ marginRight: 6 }} />
                            <TextInput
                              style={[styles.input, { color: C.text }]}
                              value={customerPhone}
                              onChangeText={setCustomerPhone}
                              placeholder="998XXXXXXXXX"
                              placeholderTextColor={C.textMuted}
                              keyboardType="phone-pad"
                            />
                          </View>
                          <Pressable
                            style={[styles.lookupBtn, { backgroundColor: C.primary, opacity: lookingUpCustomer || !customerPhone ? 0.7 : 1 }]}
                            onPress={lookupCustomer}
                            disabled={lookingUpCustomer || !customerPhone}
                          >
                            <Text style={styles.lookupBtnText}>{lookingUpCustomer ? "..." : "Topish"}</Text>
                          </Pressable>
                        </View>
                        <Text style={[styles.fieldHint, { color: C.textMuted }]}>
                          Demo: 998903333333 (Mijoz) yoki bo'sh qoldiring
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Rental details */}
                  <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Text style={[styles.sectionTitle, { color: C.text }]}>Ijara shartlari</Text>

                    <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Muddat (kun)</Text>
                    <View style={[styles.daysRow]}>
                      {[1, 2, 3, 5, 7, 14].map(d => (
                        <Pressable
                          key={d}
                          style={[styles.dayChip, { backgroundColor: days === d ? C.primary : C.surfaceSecondary, borderColor: days === d ? C.primary : C.border }]}
                          onPress={() => { setDaysCount(String(d)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                          <Text style={[styles.dayChipText, { color: days === d ? "#fff" : C.textSecondary }]}>{d}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      style={[styles.daysInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                      value={daysCount}
                      onChangeText={setDaysCount}
                      keyboardType="number-pad"
                      placeholder="Kun soni"
                      placeholderTextColor={C.textMuted}
                    />

                    <Text style={[styles.fieldLabel, { color: C.textSecondary, marginTop: 16 }]}>To'lov usuli</Text>
                    <View style={styles.payRow}>
                      {PAYMENT_METHODS.map(pm => (
                        <Pressable
                          key={pm.key}
                          style={[styles.payChip, {
                            backgroundColor: paymentMethod === pm.key ? C.primary : C.surfaceSecondary,
                            borderColor: paymentMethod === pm.key ? C.primary : C.border,
                          }]}
                          onPress={() => { setPaymentMethod(pm.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                          <Text style={[styles.payChipText, { color: paymentMethod === pm.key ? "#fff" : C.textSecondary }]}>{pm.label}</Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={[styles.summaryBox, { backgroundColor: C.surfaceSecondary }]}>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.sumLabel, { color: C.textSecondary }]}>{days} kun × {formatPrice(scannedTool.pricePerDay)}</Text>
                        <Text style={[styles.sumVal, { color: C.text }]}>{formatPrice(scannedTool.pricePerDay * days)}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.sumLabel, { color: C.textSecondary }]}>Depozit</Text>
                        <Text style={[styles.sumVal, { color: C.text }]}>{formatPrice(scannedTool.depositAmount)}</Text>
                      </View>
                      <View style={[styles.summaryDivider, { backgroundColor: C.border }]} />
                      <View style={styles.summaryRow}>
                        <Text style={[styles.sumTotalLabel, { color: C.text }]}>Jami to'lov</Text>
                        <Text style={[styles.sumTotalVal, { color: C.primary }]}>
                          {formatPrice(scannedTool.pricePerDay * days + scannedTool.depositAmount)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: C.primary, opacity: pressed || startRentalMutation.isPending ? 0.85 : 1 },
                    ]}
                    onPress={() => startRentalMutation.mutate()}
                    disabled={startRentalMutation.isPending || scannedTool.status !== "available"}
                  >
                    <Ionicons name="play-circle" size={22} color="#fff" />
                    <Text style={styles.actionBtnText}>
                      {startRentalMutation.isPending
                        ? "Saqlanmoqda..."
                        : scannedTool.status !== "available"
                          ? "Asbob band"
                          : "Ijarani boshlash"}
                    </Text>
                  </Pressable>
                </>
              )}

              {/* RETURN RENTAL FORM */}
              {mode === "return" && (
                <>
                  <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Text style={[styles.sectionTitle, { color: C.text }]}>Qaytarish ma'lumoti</Text>

                    <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Shikast bormI? (ixtiyoriy)</Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                      value={damageNote}
                      onChangeText={setDamageNote}
                      placeholder="Shikast haqida izoh..."
                      placeholderTextColor={C.textMuted}
                      multiline
                      numberOfLines={3}
                    />

                    <Text style={[styles.fieldLabel, { color: C.textSecondary, marginTop: 14 }]}>Shikast summasi (so'm)</Text>
                    <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                      <Ionicons name="cash-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.input, { color: C.text }]}
                        value={damageCost}
                        onChangeText={setDamageCost}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={C.textMuted}
                      />
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: Colors.light.success, opacity: pressed || returnMutation.isPending ? 0.85 : 1 },
                    ]}
                    onPress={() => returnMutation.mutate()}
                    disabled={returnMutation.isPending}
                  >
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.actionBtnText}>
                      {returnMutation.isPending ? "Saqlanmoqda..." : "Asbobni qaytarish"}
                    </Text>
                  </Pressable>
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modeToggle: { flexDirection: "row", marginHorizontal: 20, marginVertical: 14, borderRadius: 14, padding: 4 },
  modeBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  modeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  qrBox: { marginHorizontal: 20, marginBottom: 14, borderRadius: 20, padding: 28, alignItems: "center", borderWidth: 1, gap: 12 },
  qrIconBox: { width: 110, height: 110, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  qrHint: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  inputCard: { marginHorizontal: 20, marginBottom: 14, borderRadius: 18, padding: 18, borderWidth: 1, gap: 10 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  searchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  searchBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  demoCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  demoCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  demoCardTitle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  demoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  demoChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  demoChipCode: { fontSize: 11, fontFamily: "Inter_700Bold" },
  demoChipLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  // Modal
  modalRoot: { flex: 1, paddingHorizontal: 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  toolInfo: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  toolInfoIcon: { width: 54, height: 54, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  toolInfoName: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 3 },
  toolInfoCat: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 5 },
  toolInfoPriceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolInfoPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  section: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12, gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  fieldHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  customerFound: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  customerName: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  customerPhone: { fontSize: 13, fontFamily: "Inter_400Regular" },
  lookupRow: { flexDirection: "row", gap: 8 },
  lookupInput: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  lookupBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, justifyContent: "center" },
  lookupBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  dayChip: { width: 44, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  dayChipText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  daysInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  payRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  payChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  payChipText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  summaryBox: { borderRadius: 12, padding: 14, gap: 8, marginTop: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sumLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sumVal: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryDivider: { height: 1 },
  sumTotalLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sumTotalVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  textArea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16, marginBottom: 12 },
  actionBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
