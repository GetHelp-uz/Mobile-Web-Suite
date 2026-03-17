import * as SecureStore from "expo-secure-store";

const KEYS = {
  TOKEN: "gh_auth_token",
  USER: "gh_auth_user",
  BIOMETRIC_ENABLED: "gh_biometric_enabled",
  LAST_ACTIVE: "gh_last_active",
} as const;

// ─── Xavfsiz token saqlash ───────────────────────────────────────────────────
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.TOKEN, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.TOKEN);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.TOKEN);
}

// ─── Xavfsiz foydalanuvchi ma'lumotini saqlash ──────────────────────────────
export async function saveUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getUser<T = any>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function deleteUser(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.USER);
}

// ─── Biometrik sozlamalar ────────────────────────────────────────────────────
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.BIOMETRIC_ENABLED, enabled ? "1" : "0");
}

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED);
  return val === "1";
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
  await Promise.allSettled([
    SecureStore.deleteItemAsync(KEYS.TOKEN),
    SecureStore.deleteItemAsync(KEYS.USER),
    SecureStore.deleteItemAsync(KEYS.LAST_ACTIVE),
  ]);
}
