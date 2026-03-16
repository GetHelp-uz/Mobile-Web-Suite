import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { registerForPushNotificationsAsync, savePushToken } from "@/utils/notifications";

interface RegisterData {
  name: string;
  phone: string;
  password: string;
  region?: string;
  district?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAuth() {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem("tool_rent_token"),
          AsyncStorage.getItem("tool_rent_user"),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  async function registerPushIfNeeded(authToken: string) {
    try {
      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
        : "";
      if (!baseUrl) return;
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) await savePushToken(pushToken, authToken, baseUrl);
    } catch {}
  }

  async function login(phone: string, password: string) {
    const res = await api.auth.login(phone, password);
    await Promise.all([
      AsyncStorage.setItem("tool_rent_token", res.token),
      AsyncStorage.setItem("tool_rent_user", JSON.stringify(res.user)),
    ]);
    setToken(res.token);
    setUser(res.user);
    registerPushIfNeeded(res.token);
  }

  async function register(data: RegisterData) {
    const res = await api.auth.register(data);
    await Promise.all([
      AsyncStorage.setItem("tool_rent_token", res.token),
      AsyncStorage.setItem("tool_rent_user", JSON.stringify(res.user)),
    ]);
    setToken(res.token);
    setUser(res.user);
    registerPushIfNeeded(res.token);
  }

  async function logout() {
    await Promise.all([
      AsyncStorage.removeItem("tool_rent_token"),
      AsyncStorage.removeItem("tool_rent_user"),
    ]);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
