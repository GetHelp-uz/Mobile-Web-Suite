import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = `${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export type UserRole = "super_admin" | "shop_owner" | "worker" | "customer";

export interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  shopId?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Tool {
  id: number;
  name: string;
  description?: string;
  category: string;
  shopId: number;
  shopName?: string;
  pricePerDay: number;
  depositAmount: number;
  status: "available" | "rented" | "maintenance";
  qrCode: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Rental {
  id: number;
  toolId: number;
  toolName?: string;
  customerId: number;
  customerName?: string;
  shopId: number;
  workerId?: number;
  status: "active" | "returned" | "overdue";
  rentalPrice: number;
  depositAmount: number;
  totalAmount: number;
  startedAt: string;
  returnedAt?: string;
  dueDate: string;
  damageNote?: string;
  damageCost?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("tool_rent_token");
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  auth: {
    login: (phone: string, password: string): Promise<AuthResponse> =>
      apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ phone, password }) }),
    register: (data: { name: string; phone: string; password: string; role: string; email?: string }): Promise<AuthResponse> =>
      apiRequest("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    me: (): Promise<User> => apiRequest("/auth/me"),
  },
  tools: {
    list: (params?: { status?: string; shopId?: number; category?: string; page?: number; limit?: number }): Promise<{ tools: Tool[]; total: number }> => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.shopId) q.set("shopId", String(params.shopId));
      if (params?.category) q.set("category", params.category);
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      return apiRequest(`/tools?${q.toString()}`);
    },
    get: (id: number): Promise<Tool> => apiRequest(`/tools/${id}`),
    scanQr: (qrCode: string): Promise<Tool> => apiRequest(`/tools/scan/${qrCode}`),
    getQr: (id: number): Promise<{ toolId: number; qrCode: string; qrImageUrl: string }> =>
      apiRequest(`/tools/${id}/qr`),
  },
  rentals: {
    list: (params?: { status?: string; customerId?: number; shopId?: number }): Promise<{ rentals: Rental[]; total: number }> => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.customerId) q.set("customerId", String(params.customerId));
      if (params?.shopId) q.set("shopId", String(params.shopId));
      return apiRequest(`/rentals?${q.toString()}`);
    },
    startByQr: (data: { qrCode: string; customerId: number; dueDate: string; paymentMethod: string }): Promise<Rental> =>
      apiRequest("/rentals/start-by-qr", { method: "POST", body: JSON.stringify(data) }),
    returnByQr: (data: { qrCode: string; damageNote?: string; damageCost?: number }): Promise<Rental> =>
      apiRequest("/rentals/return-by-qr", { method: "POST", body: JSON.stringify(data) }),
    get: (id: number): Promise<Rental> => apiRequest(`/rentals/${id}`),
  },
  users: {
    lookup: (phone: string): Promise<{ id: number; name: string; phone: string; role: string }> =>
      apiRequest(`/users/lookup?phone=${encodeURIComponent(phone)}`),
  },
  analytics: {
    dashboard: (shopId?: number): Promise<any> => {
      const q = shopId ? `?shopId=${shopId}` : "";
      return apiRequest(`/analytics/dashboard${q}`);
    },
  },
};
