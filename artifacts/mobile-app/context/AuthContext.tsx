import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api, User } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
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

  async function login(phone: string, password: string) {
    const res = await api.auth.login(phone, password);
    await Promise.all([
      AsyncStorage.setItem("tool_rent_token", res.token),
      AsyncStorage.setItem("tool_rent_user", JSON.stringify(res.user)),
    ]);
    setToken(res.token);
    setUser(res.user);
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
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
