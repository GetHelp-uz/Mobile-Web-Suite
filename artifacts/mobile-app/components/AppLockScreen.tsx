import React, { useEffect, useRef, useState } from "react";
import {
  Animated, StyleSheet, Text, TouchableOpacity, View,
  useColorScheme, Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { checkBiometricAvailability } from "@/lib/biometric";
import { hasAppPin, isBiometricEnabled, verifyAppPin } from "@/lib/secure-storage";
import { PinDots, PinPad } from "./PinPad";

const PIN_LENGTH = 4;

export function AppLockScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, unlockWithBiometric, unlockApp, logout } = useAuth();

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [bioType, setBioType] = useState<"finger-print" | "eye">("finger-print");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    (async () => {
      const [bio, bioEnabled, pin_] = await Promise.all([
        checkBiometricAvailability(),
        isBiometricEnabled(),
        hasAppPin(),
      ]);
      setBioAvailable(bio.available);
      setBioOn(bio.available && bioEnabled);
      setBioType(bio.type === "facial" ? "eye" : "finger-print");
      setPinExists(pin_);

      // Biometrik yoqiq bo'lsa — darhol taklif qilish
      if (bio.available && bioEnabled) {
        tryBiometric();
      }
    })();

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ─── Bloklash sanagichi ──────────────────────────────────────────────────
  function startLockTimer(seconds: number) {
    setSecondsLeft(seconds);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setLockedUntil(null);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // ─── Silkitish animatsiyasi ──────────────────────────────────────────────
  function shake() {
    Vibration.vibrate([0, 80, 40, 80]);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  // ─── Raqam kiritish ─────────────────────────────────────────────────────
  async function handleDigit(d: string) {
    if (loading || lockedUntil) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(null);

    if (newPin.length >= PIN_LENGTH) {
      setLoading(true);
      const result = await verifyAppPin(newPin);
      setLoading(false);

      if (result.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await unlockApp();
      } else if (result.locked) {
        setLockedUntil(Date.now() + (result.remainingSeconds || 180) * 1000);
        setSecondsLeft(result.remainingSeconds || 180);
        startLockTimer(result.remainingSeconds || 180);
        shake();
        setError(`Juda ko'p urinish. ${formatSeconds(result.remainingSeconds || 180)} kuting.`);
      } else {
        shake();
        setError("Noto'g'ri PIN. Qayta urining.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setPin("");
    }
  }

  function handleDelete() {
    if (pin.length > 0) setPin(prev => prev.slice(0, -1));
    setError(null);
  }

  // ─── Biometrik ──────────────────────────────────────────────────────────
  async function tryBiometric() {
    if (!bioOn || loading) return;
    setLoading(true);
    const ok = await unlockWithBiometric();
    setLoading(false);
    if (!ok) {
      setError("Biometrik autentifikatsiya muvaffaqiyatsiz.");
    }
  }

  function formatSeconds(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${s} soniya`;
  }

  const initials = user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Avatar + ism */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: C.primary }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: C.text }]}>{user?.name || "Foydalanuvchi"}</Text>
        <Text style={[styles.hint, { color: C.textMuted }]}>
          {pinExists ? "Ilova PIN kodini kiriting" : "Biometrik bilan kiring"}
        </Text>
      </View>

      {/* PIN nuqtalar */}
      {pinExists && (
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <PinDots pin={pin} maxLength={PIN_LENGTH} />
        </Animated.View>
      )}

      {/* Xatolik / bloklash xabari */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : lockedUntil ? (
        <Text style={styles.errorText}>{formatSeconds(secondsLeft)} dan keyin urining</Text>
      ) : null}

      {/* PIN klaviatura */}
      {pinExists && !lockedUntil && (
        <View style={styles.padWrap}>
          <PinPad
            pin={pin}
            maxLength={PIN_LENGTH}
            onDigit={handleDigit}
            onDelete={handleDelete}
            onBiometric={bioOn ? tryBiometric : undefined}
            bioIcon={bioType}
            disabled={loading}
          />
        </View>
      )}

      {/* Faqat biometrik (PIN yo'q holatda) */}
      {!pinExists && bioOn && (
        <TouchableOpacity style={[styles.bioBtn, { backgroundColor: C.primary }]} onPress={tryBiometric} activeOpacity={0.8}>
          <Ionicons name={bioType} size={32} color="#fff" />
          <Text style={styles.bioBtnText}>
            {bioType === "eye" ? "Face ID bilan kirish" : "Barmoq izi bilan kirish"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tizimdan chiqish */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color={C.textMuted} />
        <Text style={[styles.logoutText, { color: C.textMuted }]}>Tizimdan chiqish</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 48,
  },
  header: { alignItems: "center", paddingTop: 48, gap: 10 },
  avatar: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: "center", alignItems: "center",
    marginBottom: 4,
  },
  avatarText: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText: {
    fontSize: 14, fontFamily: "Inter_500Medium",
    color: "#EF4444", textAlign: "center",
    paddingHorizontal: 32, marginTop: -8,
  },
  padWrap: { width: "100%" },
  bioBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 36, paddingVertical: 18,
    borderRadius: 16, width: "80%", justifyContent: "center",
  },
  bioBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 12,
  },
  logoutText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
