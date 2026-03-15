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
    const storedToken = localStorage.getItem("tool_rent_token");
    const storedUser = localStorage.getItem("tool_rent_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("tool_rent_user");
        localStorage.removeItem("tool_rent_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("tool_rent_token", newToken);
    localStorage.setItem("tool_rent_user", JSON.stringify(newUser));
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
    localStorage.removeItem("tool_rent_token");
    localStorage.removeItem("tool_rent_user");
    setToken(null);
    setUser(null);
    setLocation("/login");
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
