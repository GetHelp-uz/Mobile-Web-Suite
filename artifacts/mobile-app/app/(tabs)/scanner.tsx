import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, Tool } from "@/lib/api";

type ScanMode = "start" | "return";

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
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
  const [damageNote, setDamageNote] = useState("");
  const [damageCost, setDamageCost] = useState("");
  const [daysCount, setDaysCount] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<"click" | "payme" | "paynet" | "cash">("cash");

  const lookupMutation = useMutation({
    mutationFn: (qr: string) => api.tools.scanQr(qr),
    onSuccess: (tool) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScannedTool(tool);
      setShowModal(true);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Topilmadi", err.message || "QR kod noto'g'ri");
    },
  });

  const startRentalMutation = useMutation({
    mutationFn: () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Number(daysCount || 1));
      return api.rentals.startByQr({
        qrCode: qrInput,
        customerId: user!.id,
        dueDate: dueDate.toISOString(),
        paymentMethod,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowModal(false);
      setQrInput("");
      setScannedTool(null);
      Alert.alert("Muvaffaqiyat", "Ijara boshlandi!");
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
      Alert.alert("Muvaffaqiyat", "Asbob qaytarildi!");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Xato", err.message);
    },
  });

  const PAYMENT_METHODS = [
    { key: "cash", label: "Naqd" },
    { key: "click", label: "Click" },
    { key: "payme", label: "Payme" },
    { key: "paynet", label: "Paynet" },
  ] as const;

  return (
    <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>QR Skaner</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            Asbob kodini kiriting
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={[styles.modeToggle, { backgroundColor: C.surfaceSecondary }]}>
          {(["start", "return"] as ScanMode[]).map((m) => (
            <Pressable
              key={m}
              style={[styles.modeBtn, mode === m && { backgroundColor: C.primary }]}
              onPress={() => { setMode(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={[styles.modeBtnText, { color: mode === m ? "#fff" : C.textSecondary }]}>
                {m === "start" ? "Ijara boshlash" : "Asbob qaytarish"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* QR box */}
        <View style={[styles.qrBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.qrIconContainer, { backgroundColor: C.surfaceSecondary }]}>
            <Ionicons name="qr-code-outline" size={64} color={C.primary} />
          </View>
          <Text style={[styles.qrHint, { color: C.textSecondary }]}>
            QR kodni quyida kiriting
          </Text>
        </View>

        {/* Manual input */}
        <View style={[styles.inputCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.inputLabel, { color: C.textSecondary }]}>QR Kod</Text>
          <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
            <Ionicons name="barcode-outline" size={20} color={C.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: C.text }]}
              value={qrInput}
              onChangeText={setQrInput}
              placeholder="abc123001"
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {qrInput.length > 0 && (
              <Pressable onPress={() => setQrInput("")}>
                <Ionicons name="close-circle" size={18} color={C.textMuted} />
              </Pressable>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.scanBtn, { backgroundColor: C.primary, opacity: pressed || lookupMutation.isPending ? 0.85 : 1 }]}
            onPress={() => lookupMutation.mutate(qrInput)}
            disabled={lookupMutation.isPending || !qrInput}
          >
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={styles.scanBtnText}>
              {lookupMutation.isPending ? "Qidirilmoqda..." : "Asbobni topish"}
            </Text>
          </Pressable>
        </View>

        {/* Demo QR codes */}
        <View style={[styles.demoSection, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.demoTitle, { color: C.textSecondary }]}>Demo QR kodlar:</Text>
          <View style={styles.demoChips}>
            {["QR-DREL-001", "QR-BORG-001", "QR-SHUR-001", "QR-PERF-001"].map(qr => (
              <Pressable
                key={qr}
                style={[styles.demoChip, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}
                onPress={() => { setQrInput(qr); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[styles.demoChipText, { color: C.primary }]}>{qr}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal for scanned tool */}
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

              <View style={[styles.toolInfoCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.toolInfoName, { color: C.text }]}>{scannedTool.name}</Text>
                <Text style={[styles.toolInfoCategory, { color: C.textMuted }]}>{scannedTool.category}</Text>
                <View style={styles.toolInfoRow}>
                  <View style={styles.toolInfoItem}>
                    <Text style={[styles.toolInfoLabel, { color: C.textMuted }]}>Narxi/kun</Text>
                    <Text style={[styles.toolInfoValue, { color: C.primary }]}>{formatPrice(scannedTool.pricePerDay)}</Text>
                  </View>
                  <View style={styles.toolInfoItem}>
                    <Text style={[styles.toolInfoLabel, { color: C.textMuted }]}>Depozit</Text>
                    <Text style={[styles.toolInfoValue, { color: C.text }]}>{formatPrice(scannedTool.depositAmount)}</Text>
                  </View>
                </View>
                <View style={[styles.statusRow, { backgroundColor: scannedTool.status === "available" ? "#DCFCE7" : "#FEF9C3" }]}>
                  <Ionicons
                    name={scannedTool.status === "available" ? "checkmark-circle" : "time"}
                    size={16}
                    color={scannedTool.status === "available" ? "#16A34A" : "#CA8A04"}
                  />
                  <Text style={{ color: scannedTool.status === "available" ? "#16A34A" : "#CA8A04", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    {scannedTool.status === "available" ? "Bo'sh" : scannedTool.status === "rented" ? "Ijarada" : "Ta'mirda"}
                  </Text>
                </View>
              </View>

              {mode === "start" && (
                <>
                  <View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Text style={[styles.formLabel, { color: C.textSecondary }]}>Ijara muddati (kun)</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                      value={daysCount}
                      onChangeText={setDaysCount}
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={C.textMuted}
                    />

                    <Text style={[styles.formLabel, { color: C.textSecondary, marginTop: 14 }]}>To'lov usuli</Text>
                    <View style={styles.paymentRow}>
                      {PAYMENT_METHODS.map(pm => (
                        <Pressable
                          key={pm.key}
                          style={[styles.paymentChip, {
                            backgroundColor: paymentMethod === pm.key ? C.primary : C.surfaceSecondary,
                            borderColor: paymentMethod === pm.key ? C.primary : C.border,
                          }]}
                          onPress={() => { setPaymentMethod(pm.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        >
                          <Text style={[styles.paymentChipText, { color: paymentMethod === pm.key ? "#fff" : C.textSecondary }]}>
                            {pm.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={[styles.totalBox, { backgroundColor: C.surfaceSecondary }]}>
                      <Text style={[styles.totalLabel, { color: C.textSecondary }]}>Jami to'lov:</Text>
                      <Text style={[styles.totalAmount, { color: C.primary }]}>
                        {formatPrice(scannedTool.pricePerDay * Number(daysCount || 1) + scannedTool.depositAmount)}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, { backgroundColor: C.primary, opacity: pressed || startRentalMutation.isPending ? 0.85 : 1 }]}
                    onPress={() => startRentalMutation.mutate()}
                    disabled={startRentalMutation.isPending || scannedTool.status !== "available"}
                  >
                    <Ionicons name="play-circle" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>
                      {startRentalMutation.isPending ? "Saqlanmoqda..." : scannedTool.status !== "available" ? "Asbob band" : "Ijarani boshlash"}
                    </Text>
                  </Pressable>
                </>
              )}

              {mode === "return" && (
                <>
                  <View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Text style={[styles.formLabel, { color: C.textSecondary }]}>Shikast mavjudmi?</Text>
                    <TextInput
                      style={[styles.formInput, styles.formTextArea, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                      value={damageNote}
                      onChangeText={setDamageNote}
                      placeholder="Shikast haqida izoh (ixtiyoriy)"
                      placeholderTextColor={C.textMuted}
                      multiline
                      numberOfLines={3}
                    />
                    <Text style={[styles.formLabel, { color: C.textSecondary, marginTop: 14 }]}>Shikast summasi (so'm)</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                      value={damageCost}
                      onChangeText={setDamageCost}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={C.textMuted}
                    />
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.light.success, opacity: pressed || returnMutation.isPending ? 0.85 : 1 }]}
                    onPress={() => returnMutation.mutate()}
                    disabled={returnMutation.isPending}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
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
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modeToggle: {
    flexDirection: "row", marginHorizontal: 20, marginVertical: 16,
    borderRadius: 14, padding: 4,
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  modeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  qrBox: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 20, padding: 32,
    alignItems: "center", borderWidth: 1, gap: 12,
  },
  qrIconContainer: { width: 100, height: 100, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  qrHint: { fontSize: 14, fontFamily: "Inter_400Regular" },
  inputCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 18, padding: 20, borderWidth: 1, gap: 12 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 14, gap: 8 },
  scanBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  demoSection: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  demoTitle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  demoChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  demoChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  demoChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // Modal
  modalRoot: { flex: 1, paddingHorizontal: 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  toolInfoCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 16, gap: 8 },
  toolInfoName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  toolInfoCategory: { fontSize: 13, fontFamily: "Inter_400Regular" },
  toolInfoRow: { flexDirection: "row", gap: 20, marginTop: 4 },
  toolInfoItem: { gap: 2 },
  toolInfoLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  toolInfoValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignSelf: "flex-start" },
  formCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 16 },
  formLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  formInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  formTextArea: { minHeight: 80, textAlignVertical: "top" },
  paymentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paymentChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  paymentChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  totalBox: { marginTop: 14, borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  totalAmount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 16, paddingVertical: 16, gap: 10, marginBottom: 16 },
  actionBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
