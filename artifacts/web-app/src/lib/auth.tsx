import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useLocation } from "wouter";
import type { User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("gethelp_token");
    const storedUser = localStorage.getItem("gethelp_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("gethelp_user");
        localStorage.removeItem("gethelp_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("gethelp_token", newToken);
    localStorage.setItem("gethelp_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    
    // Redirect based on role
    switch (newUser.role) {
      case "super_admin": setLocation("/admin"); break;
      case "shop_owner": setLocation("/shop"); break;
      case "worker": setLocation("/worker"); break;
      case "customer": setLocation("/browse"); break;
      default: setLocation("/");
    }
  };

  const logout = () => {
    const currentToken = localStorage.getItem("gethelp_token");
    localStorage.removeItem("gethelp_token");
    localStorage.removeItem("gethelp_user");
    setToken(null);
    setUser(null);
    setLocation("/login");

    // Backend'da tokenni bekor qilish (fire-and-forget)
    if (currentToken) {
      const BASE = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
      fetch(`${BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
