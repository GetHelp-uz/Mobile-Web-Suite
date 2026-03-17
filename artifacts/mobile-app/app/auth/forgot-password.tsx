import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL as API_BASE } from "@/lib/api";

type Step = "phone" | "code" | "newpass" | "done";

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length === 12) return digits;
  if (digits.length === 9) return `998${digits}`;
  return digits;
}

export default function ForgotPasswordScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  async function handleSendCode() {
    if (!phone.trim()) {
      Alert.alert("Xato", "Telefon raqamni kiriting");
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("code");
      setResendTimer(60);
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Xato", err.message || "Qayta urining");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (code.trim().length !== 6) {
      Alert.alert("Xato", "6 xonali kodni kiriting");
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const res = await fetch(`${API_BASE}/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Noto'g'ri kod");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResetToken(data.resetToken);
      setStep("newpass");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Xato", err.message || "Qayta urining");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (newPassword.length < 6) {
      Alert.alert("Xato", "Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Xato", "Parollar mos kelmaydi");
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("done");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Xato", err.message || "Qayta urining");
    } finally {
      setLoading(false);
    }
  }

  const STEP_INFO: Record<Step, { title: string; subtitle: string; num: string }> = {
    phone: { title: "Telefon raqam", subtitle: "Ro'yxatdan o'tgan raqamingizni kiriting", num: "1/3" },
    code: { title: "SMS kodni kiriting", subtitle: `+${normalizePhone(phone)} raqamiga kod yuborildi. 10 daqiqa amal qiladi.`, num: "2/3" },
    newpass: { title: "Yangi parol", subtitle: "Kamida 6 ta belgi bo'lishi kerak", num: "3/3" },
    done: { title: "Tayyor!", subtitle: "Parol muvaffaqiyatli yangilandi", num: "" },
  };

  const info = STEP_INFO[step];

  return (
    <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.textSecondary} />
            <Text style={[styles.backText, { color: C.textSecondary }]}>Orqaga</Text>
          </Pressable>

          <View style={styles.headerRow}>
            <View style={[styles.iconBox, { backgroundColor: C.primary + "18" }]}>
              <Ionicons name="key-outline" size={32} color={C.primary} />
            </View>
            {info.num ? (
              <View style={[styles.stepBadge, { backgroundColor: C.primary + "15" }]}>
                <Text style={[styles.stepBadgeText, { color: C.primary }]}>{info.num}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.title, { color: C.text }]}>{info.title}</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{info.subtitle}</Text>

          {step === "phone" && (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Telefon raqam</Text>
              <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                <Ionicons name="call-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="998XXXXXXXXX"
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </View>
              <Pressable
                style={({ pressed }) => [styles.btn, { backgroundColor: C.primary, opacity: pressed || loading ? 0.85 : 1, marginTop: 18 }]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>SMS Kod Yuborish</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {step === "code" && (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.label, { color: C.textSecondary }]}>6 xonali tasdiqlash kodi</Text>
              <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, styles.codeInput, { color: C.text }]}
                  value={code}
                  onChangeText={t => setCode(t.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <Pressable
                style={({ pressed }) => [styles.btn, { backgroundColor: C.primary, opacity: pressed || loading ? 0.85 : 1, marginTop: 18 }]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>Kodni Tasdiqlash</Text>
                  </>
                )}
              </Pressable>
              <View style={styles.resendRow}>
                {resendTimer > 0 ? (
                  <Text style={[styles.resendText, { color: C.textMuted }]}>
                    Qayta yuborish: <Text style={{ color: C.primary, fontFamily: "Inter_700Bold" }}>{resendTimer}s</Text>
                  </Text>
                ) : (
                  <Pressable onPress={() => { setStep("phone"); setCode(""); }}>
                    <Text style={[styles.resendText, { color: C.primary }]}>Qayta SMS yuborish</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {step === "newpass" && (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Yangi parol</Text>
              <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Kamida 6 ta belgi"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPass(v => !v)}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.label, { color: C.textSecondary, marginTop: 14 }]}>Parolni tasdiqlang</Text>
              <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Parolni takrorlang"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirm(v => !v)}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                </Pressable>
              </View>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={[styles.errorText, { color: "#E84D0E" }]}>Parollar mos kelmaydi</Text>
              )}

              <Pressable
                style={({ pressed }) => [styles.btn, {
                  backgroundColor: C.primary,
                  opacity: pressed || loading || (confirmPassword.length > 0 && newPassword !== confirmPassword) ? 0.6 : 1,
                  marginTop: 20,
                }]}
                onPress={handleResetPassword}
                disabled={loading || (confirmPassword.length > 0 && newPassword !== confirmPassword)}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.btnText}>Parolni Saqlash</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {step === "done" && (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, alignItems: "center", paddingVertical: 36 }]}>
              <View style={[styles.successIcon, { backgroundColor: "#12B76A15" }]}>
                <Ionicons name="checkmark-circle" size={56} color="#12B76A" />
              </View>
              <Text style={[styles.successTitle, { color: C.text }]}>Parol yangilandi!</Text>
              <Text style={[styles.successSub, { color: C.textSecondary }]}>
                Endi yangi parolingiz bilan tizimga kirish mumkin.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.btn, { backgroundColor: "#12B76A", opacity: pressed ? 0.85 : 1, marginTop: 24 }]}
                onPress={() => router.replace("/auth/login")}
              >
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Kirish sahifasiga</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 16 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 24 },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  codeInput: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 6, textAlign: "center" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resendRow: {
    marginTop: 14,
    alignItems: "center",
  },
  resendText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8 },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
