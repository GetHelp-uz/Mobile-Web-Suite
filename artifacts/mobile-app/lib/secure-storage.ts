import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEYS = {
  TOKEN: "gh_auth_token",
  USER: "gh_auth_user",
  BIOMETRIC_ENABLED: "gh_biometric_enabled",
  APP_PIN_HASH: "gh_app_pin_hash",
  PIN_ATTEMPTS: "gh_pin_attempts",
  PIN_LOCKED_UNTIL: "gh_pin_locked_until",
  LAST_ACTIVE: "gh_last_active",
} as const;

const OPT = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY } as const;

// ─── Token ───────────────────────────────────────────────────────────────────
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.TOKEN, token, OPT);
}
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.TOKEN);
}
export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.TOKEN);
}

// ─── Foydalanuvchi ma'lumotlari ──────────────────────────────────────────────
export async function saveUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user), OPT);
}
export async function getUser<T = any>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
export async function deleteUser(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.USER);
}

// ─── Biometrik ───────────────────────────────────────────────────────────────
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.BIOMETRIC_ENABLED, enabled ? "1" : "0");
}
export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED);
  return val === "1";
}

// ─── Ilova PIN ───────────────────────────────────────────────────────────────
// PIN oddiy hash bilan saqlanadi — SecureStore o'zi shifrlaydi
async function simpleHash(pin: string): Promise<string> {
  // React Native'da crypto yo'q, shuning uchun xost muhit bilan ishlashni ta'minlaymiz
  // Yetarli: SecureStore o'zi AES-256 bilan shifrlaydi
  let h = 0;
  const salt = "gh_pin_salt_2025";
  const str = pin + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    h = ((h << 5) - h) + char;
    h = h & h;
  }
  // 32 xona hex ga aylantirish
  const base = Math.abs(h).toString(16).padStart(8, "0");
  return base.repeat(4).slice(0, 32) + str.length.toString(16).padStart(8, "0");
}

export async function setAppPin(pin: string): Promise<void> {
  const hash = await simpleHash(pin);
  await SecureStore.setItemAsync(KEYS.APP_PIN_HASH, hash, OPT);
  // Urinishlar hisobini tozalash
  await SecureStore.deleteItemAsync(KEYS.PIN_ATTEMPTS);
  await SecureStore.deleteItemAsync(KEYS.PIN_LOCKED_UNTIL);
}

export async function hasAppPin(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEYS.APP_PIN_HASH);
  return !!val;
}

export async function verifyAppPin(pin: string): Promise<{ ok: boolean; locked?: boolean; remainingSeconds?: number }> {
  // Bloklanganmi?
  const lockedUntilStr = await SecureStore.getItemAsync(KEYS.PIN_LOCKED_UNTIL);
  if (lockedUntilStr) {
    const lockedUntil = parseInt(lockedUntilStr);
    if (Date.now() < lockedUntil) {
      return { ok: false, locked: true, remainingSeconds: Math.ceil((lockedUntil - Date.now()) / 1000) };
    }
    // Blok muddati o'tdi
    await SecureStore.deleteItemAsync(KEYS.PIN_LOCKED_UNTIL);
    await SecureStore.deleteItemAsync(KEYS.PIN_ATTEMPTS);
  }

  const savedHash = await SecureStore.getItemAsync(KEYS.APP_PIN_HASH);
  if (!savedHash) return { ok: false };

  const hash = await simpleHash(pin);
  if (hash === savedHash) {
    await SecureStore.deleteItemAsync(KEYS.PIN_ATTEMPTS);
    return { ok: true };
  }

  // Noto'g'ri — urinishlarni sanash
  const attemptsStr = await SecureStore.getItemAsync(KEYS.PIN_ATTEMPTS);
  const attempts = parseInt(attemptsStr || "0") + 1;
  await SecureStore.setItemAsync(KEYS.PIN_ATTEMPTS, attempts.toString());

  if (attempts >= 5) {
    // 3 daqiqa bloklash
    const until = Date.now() + 3 * 60 * 1000;
    await SecureStore.setItemAsync(KEYS.PIN_LOCKED_UNTIL, until.toString());
    await SecureStore.deleteItemAsync(KEYS.PIN_ATTEMPTS);
    return { ok: false, locked: true, remainingSeconds: 180 };
  }

  return { ok: false };
}

export async function removeAppPin(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(KEYS.APP_PIN_HASH),
    SecureStore.deleteItemAsync(KEYS.PIN_ATTEMPTS),
    SecureStore.deleteItemAsync(KEYS.PIN_LOCKED_UNTIL),
  ]);
}

// ─── Faollik vaqti ───────────────────────────────────────────────────────────
export async function updateLastActive(): Promise<void> {
  await SecureStore.setItemAsync(KEYS.LAST_ACTIVE, Date.now().toString());
}
export async function getLastActive(): Promise<number> {
  const val = await SecureStore.getItemAsync(KEYS.LAST_ACTIVE);
  return val ? parseInt(val) : 0;
}

// ─── Barcha ma'lumotlarni tozalash (logout) ──────────────────────────────────
export async function clearAllSecureData(): Promise<void> {
  await Promise.allSettled(
    Object.values(KEYS).map(k => SecureStore.deleteItemAsync(k))
  );
}
