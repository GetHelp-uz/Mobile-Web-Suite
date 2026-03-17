import * as LocalAuthentication from "expo-local-authentication";
import { Alert, Platform } from "react-native";

export type BiometricType = "fingerprint" | "facial" | "iris" | "none";

// ─── Biometrik mavjudligini tekshirish ──────────────────────────────────────
export async function checkBiometricAvailability(): Promise<{
  available: boolean;
  type: BiometricType;
  label: string;
}> {
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return { available: false, type: "none", label: "" };

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return { available: true, type: "facial", label: "Face ID" };
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return { available: true, type: "fingerprint", label: "Barmoq izi" };
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return { available: true, type: "iris", label: "Ko'z skaneri" };
  }
  return { available: false, type: "none", label: "" };
}

// ─── Biometrik autentifikatsiya ──────────────────────────────────────────────
export async function authenticateWithBiometric(options?: {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage || "GetHelp.uz ga kirish",
      cancelLabel: options?.cancelLabel || "Bekor qilish",
      fallbackLabel: options?.fallbackLabel || "Parol bilan kiring",
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    if (result.error === "user_cancel") {
      return { success: false, error: "cancel" };
    }
    if (result.error === "too_many_attempts") {
      return { success: false, error: "Juda ko'p noto'g'ri urinish. Parol bilan kiring." };
    }
    if (result.error === "lockout") {
      return { success: false, error: "Biometrik autentifikatsiya bloklangan. Parol bilan kiring." };
    }

    return { success: false, error: result.error };
  } catch (err: any) {
    return { success: false, error: err.message || "Biometrik autentifikatsiya mavjud emas" };
  }
}

// ─── Qurilma xavfsizligi tekshiruvi ─────────────────────────────────────────
export async function checkDeviceSecurity(): Promise<{
  isSecure: boolean;
  hasScreenLock: boolean;
  hasBiometric: boolean;
}> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return {
    isSecure: isEnrolled,
    hasScreenLock: hasHardware,
    hasBiometric: isEnrolled,
  };
}
