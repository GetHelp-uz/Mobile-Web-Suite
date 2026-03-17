import React, { useState } from "react";
import {
  StyleSheet, Text, TouchableOpacity, View,
  useColorScheme, Vibration,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { setAppPin, verifyAppPin, removeAppPin } from "@/lib/secure-storage";
import { PinDots, PinPad } from "@/components/PinPad";

type Step = "enter" | "confirm" | "verify_old";

const PIN_LENGTH = 4;

export default function SetPinScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: "set" | "change" | "remove" }>();

  const isChange = mode === "change";
  const isRemove = mode === "remove";

  const [step, setStep] = useState<Step>(isChange || isRemove ? "verify_old" : "enter");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const titles: Record<Step, string> = {
    verify_old: "Joriy PIN ni kiriting",
    enter: isChange ? "Yangi PIN kiriting" : "PIN o'rnating",
    confirm: "PIN ni tasdiqlang",
  };

  const hints: Record<Step, string> = {
    verify_old: "Davom etish uchun joriy PIN kodni kiriting",
    enter: "4 xonali PIN kod kiriting",
    confirm: "Xavfsizlik uchun PIN ni qayta kiriting",
  };

  async function handleDigit(d: string) {
    if (loading) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(null);

    if (newPin.length < PIN_LENGTH) return;

    setLoading(true);

    // ── Bosqichlarni qayta ishlash ──────────────────────────────────────────
    if (step === "verify_old") {
      const result = await verifyAppPin(newPin);
      if (result.ok) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isRemove) {
          await removeAppPin();
          setDone(true);
        } else {
          setStep("enter");
        }
      } else if (result.locked) {
        setError(`Juda ko'p urinish. ${result.remainingSeconds || 180} soniya kuting.`);
        vibrate();
      } else {
        setError("Noto'g'ri PIN. Qayta urining.");
        vibrate();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setPin("");

    } else if (step === "enter") {
      setFirstPin(newPin);
      setPin("");
      setStep("confirm");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    } else if (step === "confirm") {
      if (newPin === firstPin) {
        await setAppPin(newPin);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDone(true);
      } else {
        setError("PIN mos kelmadi. Qayta urining.");
        vibrate();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPin("");
        setFirstPin("");
        setStep("enter");
      }
    }

    setLoading(false);
  }

  function handleDelete() {
    if (pin.length > 0) {
      setPin(prev => prev.slice(0, -1));
      setError(null);
    }
  }

  function vibrate() {
    Vibration.vibrate([0, 60, 30, 60]);
  }

  // ── Tugallandi ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
        <View style={styles.doneBox}>
          <View style={[styles.doneIcon, { backgroundColor: "#22C55E20" }]}>
            <Ionicons name="checkmark-circle" size={72} color="#22C55E" />
          </View>
          <Text style={[styles.doneTitle, { color: C.text }]}>
            {isRemove ? "PIN o'chirildi" : isChange ? "PIN yangilandi" : "PIN o'rnatildi"}
          </Text>
          <Text style={[styles.doneHint, { color: C.textMuted }]}>
            {isRemove
              ? "Ilova paroli muvaffaqiyatli o'chirildi."
              : "Ilova paroli muvaffaqiyatli saqlandi."}
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: C.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>Tayyor</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Orqaga */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={C.text} />
      </TouchableOpacity>

      {/* Sarlavha */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: C.primary + "15" }]}>
          <Ionicons name="lock-closed" size={36} color={C.primary} />
        </View>
        <Text style={[styles.title, { color: C.text }]}>{titles[step]}</Text>
        <Text style={[styles.hint, { color: C.textMuted }]}>{hints[step]}</Text>
      </View>

      {/* PIN nuqtalar */}
      <PinDots pin={pin} maxLength={PIN_LENGTH} />

      {/* Xatolik */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {/* Qadam ko'rsatkichi */}
      {!isRemove && !isChange && (
        <View style={styles.steps}>
          <View style={[styles.stepDot, { backgroundColor: step !== "enter" ? C.primary : C.border }]} />
          <View style={[styles.stepDot, { backgroundColor: step === "confirm" ? C.primary : C.border }]} />
        </View>
      )}

      {/* PIN klaviatura */}
      <View style={styles.padWrap}>
        <PinPad
          pin={pin}
          maxLength={PIN_LENGTH}
          onDigit={handleDigit}
          onDelete={handleDelete}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingBottom: 40 },
  back: { position: "absolute", left: 16, top: 56, padding: 8, zIndex: 10 },
  header: { alignItems: "center", paddingTop: 70, gap: 10 },
  iconBox: { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  errorText: { fontSize: 13, color: "#EF4444", textAlign: "center", paddingHorizontal: 32, fontFamily: "Inter_500Medium" },
  steps: { flexDirection: "row", gap: 8 },
  stepDot: { width: 24, height: 6, borderRadius: 3 },
  padWrap: { width: "100%" },
  doneBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 },
  doneIcon: { width: 120, height: 120, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  doneHint: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  doneBtn: { paddingHorizontal: 48, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  doneBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
});
