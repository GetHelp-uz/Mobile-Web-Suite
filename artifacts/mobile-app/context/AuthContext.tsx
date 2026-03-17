import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { api, User, BASE_URL } from "@/lib/api";
import {
  saveToken, getToken, deleteToken,
  saveUser, getUser, deleteUser,
  clearAllSecureData, updateLastActive, getLastActive,
  isBiometricEnabled, hasAppPin,
} from "@/lib/secure-storage";
import { authenticateWithBiometric, checkBiometricAvailability } from "@/lib/biometric";
import { registerForPushNotificationsAsync, savePushToken } from "@/utils/notifications";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 daqiqa inaktivlik → bloklash
const BG_LOCK_TIMEOUT = 5 * 60 * 1000;  // 5 daqiqa fondagi boʻlsa → bloklash

interface RegisterData {
  name: string;
  phone: string;
  password: string;
  role?: string;
  region?: string;
  district?: string;
  address?: string;
  homeLat?: string;
  homeLng?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isLocked: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  unlockApp: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);

  // ─── Ilova yuklanganda — SecureStore dan o'qish ──────────────────────────
  useEffect(() => {
    async function loadAuth() {
      try {
        const [savedToken, savedUser] = await Promise.all([
          getToken(),
          getUser<User>(),
        ]);
        if (savedToken && savedUser) {
          const lastActive = await getLastActive();
          const idle = lastActive > 0 ? Date.now() - lastActive : 0;

          if (lastActive > 0 && idle > SESSION_TIMEOUT) {
            // Sessiya tugagan — PIN yoki biometrik talab qilish
            const [bioEnabled, pinExists] = await Promise.all([
              isBiometricEnabled(),
              hasAppPin(),
            ]);
            const shouldLock = bioEnabled || pinExists;
            setToken(savedToken);
            setUser(savedUser);
            setIsLocked(shouldLock);
            if (!shouldLock) {
              // Himoya yo'q — to'liq logout
              await clearAllSecureData();
              setToken(null);
              setUser(null);
            }
          } else {
            setToken(savedToken);
            setUser(savedUser);
            await updateLastActive();
          }
        }
      } catch {
        await clearAllSecureData();
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  // ─── Fon/oldingi planda bloklash ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const sub = AppState.addEventListener("change", async (nextState: AppStateStatus) => {
      const prev = appStateRef.current;

      if (prev === "active" && nextState !== "active") {
        backgroundedAtRef.current = Date.now();
        await updateLastActive();
      }

      if (prev !== "active" && nextState === "active") {
        const bgAt = backgroundedAtRef.current;
        if (bgAt) {
          const elapsed = Date.now() - bgAt;
          if (elapsed > BG_LOCK_TIMEOUT) {
            const [bioEnabled, pinExists] = await Promise.all([
              isBiometricEnabled(),
              hasAppPin(),
            ]);
            if (bioEnabled || pinExists) {
              setIsLocked(true);
            }
          }
        }
        await updateLastActive();
        backgroundedAtRef.current = null;
      }

      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [user]);

  // ─── Push notification ───────────────────────────────────────────────────
  async function registerPushIfNeeded(authToken: string) {
    try {
      if (!BASE_URL) return;
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) await savePushToken(pushToken, authToken, BASE_URL.replace("/api", ""));
    } catch {}
  }

  // ─── Login ───────────────────────────────────────────────────────────────
  async function login(phone: string, password: string) {
    const res = await api.auth.login(phone, password);
    await Promise.all([
      saveToken(res.token),
      saveUser(res.user),
      updateLastActive(),
    ]);
    setToken(res.token);
    setUser(res.user);
    setIsLocked(false);
    registerPushIfNeeded(res.token);
  }

  // ─── Ro'yxatdan o'tish ───────────────────────────────────────────────────
  async function register(data: RegisterData) {
    const res = await api.auth.register(data);
    await Promise.all([
      saveToken(res.token),
      saveUser(res.user),
      updateLastActive(),
    ]);
    setToken(res.token);
    setUser(res.user);
    setIsLocked(false);
    registerPushIfNeeded(res.token);
  }

  // ─── Chiqish ─────────────────────────────────────────────────────────────
  async function logout() {
    try {
      const t = await getToken();
      if (t) {
        fetch(`${BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
        }).catch(() => {});
      }
    } finally {
      await clearAllSecureData();
      setToken(null);
      setUser(null);
      setIsLocked(false);
    }
  }

  // ─── Qulfni ochish (PIN yoki biometrik muvaffaqiyatli bo'lganda) ─────────
  async function unlockApp(): Promise<void> {
    await updateLastActive();
    setIsLocked(false);
  }

  // ─── Biometrik bilan qulfni ochish ───────────────────────────────────────
  async function unlockWithBiometric(): Promise<boolean> {
    const bio = await checkBiometricAvailability();
    if (!bio.available) return false;

    const result = await authenticateWithBiometric({
      promptMessage: "GetHelp.uz — Kimligingizni tasdiqlang",
    });

    if (result.success) {
      await updateLastActive();
      setIsLocked(false);
      return true;
    }
    return false;
  }

  // ─── Foydalanuvchini yangilash ───────────────────────────────────────────
  async function refreshUser() {
    try {
      const t = await getToken();
      if (!t) return;
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const updated = await res.json();
        await saveUser(updated);
        setUser(updated);
      }
    } catch {}
  }

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, isLocked,
      login, register, logout,
      unlockWithBiometric, unlockApp, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
