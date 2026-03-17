import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

type ModalStep = "verify_choice" | "photos" | "details" | "confirm";
type VerifyType = "passport" | "deposit";

export default function ToolDetailScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [showRentModal, setShowRentModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("verify_choice");
  const [verifyType, setVerifyType] = useState<VerifyType | null>(null);
  const [daysCount, setDaysCount] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<"click" | "payme" | "paynet" | "cash">("cash");

  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);

  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool", id],
    queryFn: () => api.tools.get(Number(id)),
    enabled: !!id,
  });

  function openRentModal() {
    setModalStep("verify_choice");
    setVerifyType(null);
    setDaysCount("1");
    setPaymentMethod("cash");
    setIdFront(null);
    setIdBack(null);
    setSelfie(null);
    setShowRentModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function pickPhoto(setter: (uri: string) => void) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== "granted") {
        Alert.alert("Ruxsat kerak", "Rasm olish uchun kamera ruxsatini bering");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setter(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.6,
      base64: true,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setter(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  const rentMutation = useMutation({
    mutationFn: () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Number(daysCount || 1));
      return api.rentals.create({
        toolId: tool!.id,
        customerId: user!.id,
        dueDate: dueDate.toISOString(),
        paymentMethod,
        rentalDays: Number(daysCount || 1),
        verificationType: verifyType || "deposit",
        idFrontUrl: idFront || undefined,
        idBackUrl: idBack || undefined,
        selfieUrl: selfie || undefined,
      } as any);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowRentModal(false);
      const msg = verifyType === "passport"
        ? "Ijara so'rovi yuborildi! Do'kon egasi hujjatlaringizni ko'rib tasdiqlanishini kuting."
        : "Ijara muvaffaqiyatli boshlandi!";
      Alert.alert("Muvaffaqiyat", msg, [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Xato", err.message || "Ijara boshlanmadi");
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

  const photosReady = verifyType === "deposit" || (idFront && idBack && selfie);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
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

      {canRent && (
        <View style={[styles.ctaBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            style={({ pressed }) => [styles.ctaBtn, { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 }]}
            onPress={openRentModal}
          >
            <Ionicons name="cart-outline" size={20} color="#fff" />
            <Text style={styles.ctaBtnText}>Ijaraga olish</Text>
          </Pressable>
        </View>
      )}

      {/* ===== RENT MODAL ===== */}
      <Modal visible={showRentModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRentModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: C.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

          {/* Modal header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: C.text }]}>Ijaraga olish</Text>
              <Text style={[styles.modalSub, { color: C.textSecondary }]}>{tool.name}</Text>
            </View>
            <Pressable onPress={() => setShowRentModal(false)} style={[styles.closeBtn, { backgroundColor: C.surfaceSecondary }]}>
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </Pressable>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {(["verify_choice", "photos", "details"] as ModalStep[]).map((s, i) => {
              const steps: ModalStep[] = verifyType === "deposit"
                ? ["verify_choice", "details"]
                : ["verify_choice", "photos", "details"];
              const currentIndex = steps.indexOf(modalStep);
              const stepIndex = verifyType === "deposit" ? [0, 1][i < 1 ? 0 : 1] : i;
              const isActive = verifyType === "deposit"
                ? (modalStep === "verify_choice" && i === 0) || (modalStep === "details" && i >= 1)
                : (modalStep === "verify_choice" && i === 0) || (modalStep === "photos" && i === 1) || (modalStep === "details" && i === 2);
              const isDone = verifyType === "deposit"
                ? (modalStep === "details" && i === 0)
                : (modalStep === "photos" && i === 0) || (modalStep === "details" && i <= 1);
              if (verifyType === "deposit" && i === 1) return null;
              return (
                <React.Fragment key={s}>
                  <View style={[styles.stepDot, {
                    backgroundColor: isDone ? "#12B76A" : isActive ? C.primary : C.border,
                    width: isActive ? 28 : 10,
                  }]} />
                  {i < 2 && <View style={[styles.stepLine, { backgroundColor: isDone ? "#12B76A" : C.border }]} />}
                </React.Fragment>
              );
            })}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ===== STEP 1: TASDIQLASH USULINI TANLASH ===== */}
            {modalStep === "verify_choice" && (
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: C.text }]}>Tasdiqlash usuli</Text>
                <Text style={[styles.stepDesc, { color: C.textSecondary }]}>
                  Ijaraga olish uchun o'zingizni tasdiqlang
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.verifyCard,
                    {
                      borderColor: verifyType === "passport" ? C.primary : C.border,
                      backgroundColor: verifyType === "passport" ? C.primary + "10" : C.surface,
                      opacity: pressed ? 0.9 : 1,
                    }
                  ]}
                  onPress={() => { setVerifyType("passport"); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.verifyIcon, { backgroundColor: C.primary + "15" }]}>
                    <Ionicons name="card-outline" size={28} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.verifyTitle, { color: C.text }]}>ID-karta / Pasport</Text>
                    <Text style={[styles.verifySub, { color: C.textSecondary }]}>
                      Oldi, orqa rasm va selfi yuklang. Do'kon egasi tasdiqlaydi.
                    </Text>
                  </View>
                  <View style={[styles.radioCircle, {
                    borderColor: verifyType === "passport" ? C.primary : C.border,
                    backgroundColor: verifyType === "passport" ? C.primary : "transparent",
                  }]}>
                    {verifyType === "passport" && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.verifyCard,
                    {
                      borderColor: verifyType === "deposit" ? "#12B76A" : C.border,
                      backgroundColor: verifyType === "deposit" ? "#12B76A10" : C.surface,
                      opacity: pressed ? 0.9 : 1,
                    }
                  ]}
                  onPress={() => { setVerifyType("deposit"); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.verifyIcon, { backgroundColor: "#12B76A15" }]}>
                    <Ionicons name="cash-outline" size={28} color="#12B76A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.verifyTitle, { color: C.text }]}>Depozit bilan</Text>
                    <Text style={[styles.verifySub, { color: C.textSecondary }]}>
                      Hujjat kerak emas. Depozit: {formatPrice(tool.depositAmount)}
                    </Text>
                  </View>
                  <View style={[styles.radioCircle, {
                    borderColor: verifyType === "deposit" ? "#12B76A" : C.border,
                    backgroundColor: verifyType === "deposit" ? "#12B76A" : "transparent",
                  }]}>
                    {verifyType === "deposit" && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.nextBtn, { backgroundColor: verifyType ? C.primary : C.border }]}
                  onPress={() => {
                    if (!verifyType) { Alert.alert("Xato", "Tasdiqlash usulini tanlang"); return; }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setModalStep(verifyType === "passport" ? "photos" : "details");
                  }}
                  disabled={!verifyType}
                >
                  <Text style={styles.nextBtnText}>Davom etish</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* ===== STEP 2: HUJJAT RASMLARI (PASPORT) ===== */}
            {modalStep === "photos" && (
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: C.text }]}>Hujjat rasmlari</Text>
                <Text style={[styles.stepDesc, { color: C.textSecondary }]}>
                  ID-karta yoki pasportingizning oldi, orqa rasmi va selfingizni yuklang
                </Text>

                <PhotoPicker
                  label="ID/Pasport — old tomon"
                  icon="card-outline"
                  value={idFront}
                  onPick={() => pickPhoto(setIdFront)}
                  C={C}
                />
                <PhotoPicker
                  label="ID/Pasport — orqa tomon"
                  icon="card-outline"
                  value={idBack}
                  onPick={() => pickPhoto(setIdBack)}
                  C={C}
                />
                <PhotoPicker
                  label="Selfie (yuzingiz ko'rinsin)"
                  icon="camera-outline"
                  value={selfie}
                  onPick={async () => {
                    const cam = await ImagePicker.requestCameraPermissionsAsync();
                    if (cam.status !== "granted") {
                      Alert.alert("Ruxsat kerak", "Selfi uchun kamera ruxsatini bering");
                      return;
                    }
                    const result = await ImagePicker.launchCameraAsync({
                      mediaTypes: "images",
                      quality: 0.6,
                      base64: true,
                      cameraType: ImagePicker.CameraType.front,
                    });
                    if (!result.canceled && result.assets[0]) {
                      setSelfie(`data:image/jpeg;base64,${result.assets[0].base64}`);
                    }
                  }}
                  C={C}
                />

                <View style={[styles.infoBox, { backgroundColor: C.primary + "12", borderColor: C.primary + "30" }]}>
                  <Ionicons name="information-circle-outline" size={18} color={C.primary} />
                  <Text style={[styles.infoBoxText, { color: C.primary }]}>
                    Hujjatlar do'kon egasiga yuboriladi va 1-2 soat ichida tasdiqlanadi
                  </Text>
                </View>

                <View style={styles.twoButtons}>
                  <Pressable
                    style={[styles.backBtnSmall, { borderColor: C.border }]}
                    onPress={() => setModalStep("verify_choice")}
                  >
                    <Ionicons name="arrow-back" size={16} color={C.textSecondary} />
                    <Text style={[styles.backBtnText, { color: C.textSecondary }]}>Orqaga</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.nextBtnHalf, { backgroundColor: idFront && idBack && selfie ? C.primary : C.border }]}
                    onPress={() => {
                      if (!idFront || !idBack || !selfie) {
                        Alert.alert("Xato", "Barcha 3 ta rasmni yuklang");
                        return;
                      }
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setModalStep("details");
                    }}
                    disabled={!idFront || !idBack || !selfie}
                  >
                    <Text style={styles.nextBtnText}>Davom etish</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </Pressable>
                </View>
              </View>
            )}

            {/* ===== STEP 3: IJARA MUDDATI VA TO'LOV ===== */}
            {modalStep === "details" && (
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: C.text }]}>Ijara tafsilotlari</Text>

                <View style={[styles.formSection, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Text style={[styles.formLabel, { color: C.textSecondary }]}>Ijara muddati (kun)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                    value={daysCount}
                    onChangeText={v => setDaysCount(v.replace(/\D/g, ""))}
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
                        onPress={() => {
                          setPaymentMethod(pm.key);
                          if (pm.key === "cash") setVerifyType("passport");
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={[styles.payChipText, { color: paymentMethod === pm.key ? "#fff" : C.textSecondary }]}>
                          {pm.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {paymentMethod === "cash" && (
                    <View>
                      <View style={[styles.infoBox, {
                        backgroundColor: photosReady ? "#ECFDF5" : "#FFF1F2",
                        borderColor: photosReady ? "#6EE7B7" : "#FECDD3",
                        marginBottom: 0,
                      }]}>
                        <Ionicons
                          name={photosReady ? "checkmark-circle" : "alert-circle"}
                          size={18}
                          color={photosReady ? "#059669" : "#E11D48"}
                        />
                        <Text style={[styles.infoBoxText, { color: photosReady ? "#059669" : "#E11D48" }]}>
                          {photosReady
                            ? "Hujjatlar yuklangan — naqd to'lovga tayyor"
                            : "Naqd to'lov uchun ID-karta yoki pasport rasmlari majburiy!"}
                        </Text>
                      </View>
                      {!photosReady && (
                        <Pressable
                          style={[styles.uploadDocBtn, { borderColor: "#E11D48" }]}
                          onPress={() => { setVerifyType("passport"); setModalStep("photos"); }}
                        >
                          <Ionicons name="camera-outline" size={18} color="#E11D48" />
                          <Text style={[styles.uploadDocBtnText, { color: "#E11D48" }]}>Hujjat rasmlarini yuklash</Text>
                          <Ionicons name="arrow-forward" size={16} color="#E11D48" />
                        </Pressable>
                      )}
                    </View>
                  )}

                  <View style={[styles.summaryBox, { backgroundColor: C.surfaceSecondary }]}>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>{days} kun x {formatPrice(tool.pricePerDay)}</Text>
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

                  {verifyType === "passport" && (
                    <View style={[styles.infoBox, { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" }]}>
                      <Ionicons name="time-outline" size={16} color="#EA580C" />
                      <Text style={[styles.infoBoxText, { color: "#EA580C" }]}>
                        Hujjatlar tekshirilgandan so'ng ijara faollashadi
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.twoButtons}>
                  <Pressable
                    style={[styles.backBtnSmall, { borderColor: C.border }]}
                    onPress={() => setModalStep(verifyType === "passport" ? "photos" : "verify_choice")}
                  >
                    <Ionicons name="arrow-back" size={16} color={C.textSecondary} />
                    <Text style={[styles.backBtnText, { color: C.textSecondary }]}>Orqaga</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.nextBtnHalf, {
                      backgroundColor: (rentMutation.isPending || (paymentMethod === "cash" && !photosReady)) ? C.border : C.primary,
                    }]}
                    onPress={() => {
                      if (paymentMethod === "cash" && !photosReady) {
                        Alert.alert("Hujjat kerak", "Naqd to'lov uchun ID-karta yoki pasport rasmlarini yuklang");
                        setModalStep("photos");
                        return;
                      }
                      rentMutation.mutate();
                    }}
                    disabled={rentMutation.isPending || (paymentMethod === "cash" && !photosReady)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.nextBtnText}>
                      {rentMutation.isPending ? "Yuklanmoqda..." : "Tasdiqlash"}
                    </Text>
                  </Pressable>
                </View>
                <View style={{ height: 40 }} />
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function PhotoPicker({ label, icon, value, onPick, C }: {
  label: string;
  icon: any;
  value: string | null;
  onPick: () => void;
  C: any;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.photoPicker,
        {
          borderColor: value ? "#12B76A" : C.border,
          backgroundColor: value ? "#12B76A08" : C.surface,
          opacity: pressed ? 0.85 : 1,
        }
      ]}
      onPress={onPick}
    >
      {value ? (
        <Image source={{ uri: value }} style={styles.photoThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: C.surfaceSecondary }]}>
          <Ionicons name={icon} size={28} color={C.textMuted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.photoLabel, { color: C.text }]}>{label}</Text>
        <Text style={[styles.photoHint, { color: C.textMuted }]}>
          {value ? "Rasm yuklandi — o'zgartirish uchun bosing" : "Rasm tanlash uchun bosing"}
        </Text>
      </View>
      {value ? (
        <Ionicons name="checkmark-circle" size={22} color="#12B76A" />
      ) : (
        <Ionicons name="camera-outline" size={20} color={C.textMuted} />
      )}
    </Pressable>
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
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 20 },
  stepDot: { height: 8, borderRadius: 4 },
  stepLine: { flex: 1, height: 2, maxWidth: 40 },
  stepContent: { paddingTop: 4 },
  stepTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 6 },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 20 },
  // Verify cards
  verifyCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 12 },
  verifyIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  verifyTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  verifySub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  // Photo picker
  photoPicker: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 12 },
  photoThumb: { width: 56, height: 56, borderRadius: 10 },
  photoPlaceholder: { width: 56, height: 56, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  photoLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  photoHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Info box
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  infoBoxText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  // Two buttons
  twoButtons: { flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 8 },
  backBtnSmall: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  backBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 16, marginTop: 8 },
  nextBtnHalf: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  nextBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  // Form
  formSection: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 8 },
  formLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  formInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_400Regular", marginBottom: 4 },
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
  uploadDocBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginTop: 10, borderStyle: "dashed" },
  uploadDocBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
});
