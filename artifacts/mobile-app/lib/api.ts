import AsyncStorage from "@react-native-async-storage/async-storage";

const _domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const normalizedDomain = _domain.trim().replace(/\/+$/, "");
export const API_ORIGIN = normalizedDomain
  ? normalizedDomain.startsWith("http")
    ? normalizedDomain
    : `https://${normalizedDomain}`
  : "http://localhost:8080";
export const BASE_URL = `${API_ORIGIN}/api`;

export type UserRole = "super_admin" | "shop_owner" | "worker" | "customer";

export interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  shopId?: number;
  region?: string;
  district?: string;
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
  return AsyncStorage.getItem("gethelp_token");
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
    register: (data: {
      name: string;
      phone: string;
      password: string;
      role?: string;
      region?: string;
      district?: string;
      email?: string;
      address?: string;
      homeLat?: string;
      homeLng?: string;
    }): Promise<AuthResponse> =>
      apiRequest("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    me: (): Promise<User> => apiRequest("/auth/me"),
  },
  tools: {
    list: (params?: {
      status?: string;
      shopId?: number;
      category?: string;
      page?: number;
      limit?: number;
      region?: string;
    }): Promise<{ tools: Tool[]; total: number }> => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.shopId) q.set("shopId", String(params.shopId));
      if (params?.category) q.set("category", params.category);
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.region) q.set("region", params.region);
      return apiRequest(`/tools?${q.toString()}`);
    },
    get: (id: number): Promise<Tool> => apiRequest(`/tools/${id}`),
    scanQr: (qrCode: string): Promise<Tool> => apiRequest(`/tools/scan/${qrCode}`),
    getQr: (id: number): Promise<{ toolId: number; qrCode: string; qrImageUrl: string }> =>
      apiRequest(`/tools/${id}/qr`),
    create: (data: {
      shopId: number;
      name: string;
      category: string;
      description?: string;
      pricePerDay: number;
      pricePerHour?: number;
      depositAmount: number;
    }): Promise<Tool> =>
      apiRequest("/tools", { method: "POST", body: JSON.stringify(data) }),
  },
  rentals: {
    list: (params?: { status?: string; customerId?: number; shopId?: number }): Promise<{ rentals: Rental[]; total: number }> => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.customerId) q.set("customerId", String(params.customerId));
      if (params?.shopId) q.set("shopId", String(params.shopId));
      return apiRequest(`/rentals?${q.toString()}`);
    },
    create: (data: {
      toolId: number;
      customerId: number;
      dueDate: string;
      paymentMethod: string;
      verificationType?: string;
      idFrontUrl?: string;
      idBackUrl?: string;
      selfieUrl?: string;
    }): Promise<Rental> =>
      apiRequest("/rentals", { method: "POST", body: JSON.stringify(data) }),
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
  workers: {
    list: (): Promise<{ workers: any[]; total: number }> =>
      apiRequest("/users/workers"),
    create: (data: { name: string; phone: string; password: string }): Promise<{ worker: any }> =>
      apiRequest("/users/workers", { method: "POST", body: JSON.stringify(data) }),
    remove: (id: number): Promise<{ success: boolean }> =>
      apiRequest(`/users/workers/${id}`, { method: "DELETE" }),
  },
  analytics: {
    dashboard: (shopId?: number): Promise<any> => {
      const q = shopId ? `?shopId=${shopId}` : "";
      return apiRequest(`/analytics/dashboard${q}`);
    },
  },
  wallet: {
    get: (): Promise<{ wallet: any; transactions: any[] }> => apiRequest("/wallet/me"),
    topup: (amount: number, provider: string): Promise<{ referenceId: string; paymentUrl: string; amount: number }> =>
      apiRequest("/wallet/topup", { method: "POST", body: JSON.stringify({ amount, provider }) }),
    confirmTopup: (referenceId: string, providerTxId?: string): Promise<{ success: boolean; newBalance: number }> =>
      apiRequest("/wallet/topup/confirm", { method: "POST", body: JSON.stringify({ referenceId, providerTxId }) }),
    pay: (amount: number, rentalId?: number, description?: string): Promise<{ success: boolean; newBalance: number }> =>
      apiRequest("/wallet/pay", { method: "POST", body: JSON.stringify({ amount, rentalId, description }) }),
    transactions: (limit?: number, offset?: number): Promise<{ transactions: any[]; total: number }> => {
      const q = new URLSearchParams();
      if (limit) q.set("limit", String(limit));
      if (offset) q.set("offset", String(offset));
      return apiRequest(`/wallet/transactions?${q.toString()}`);
    },
    withdraw: (amount: number, cardNumber: string, cardHolder?: string, provider?: string): Promise<{ request: any; message: string }> =>
      apiRequest("/withdrawals", { method: "POST", body: JSON.stringify({ amount, cardNumber, cardHolder: cardHolder || "", provider: provider || "payme" }) }),
  },
  bookings: {
    list: (params?: { shopId?: number; customerId?: number; status?: string }): Promise<{ bookings: any[] }> => {
      const q = new URLSearchParams();
      if (params?.shopId) q.set("shopId", String(params.shopId));
      if (params?.customerId) q.set("customerId", String(params.customerId));
      if (params?.status) q.set("status", params.status);
      return apiRequest(`/bookings?${q.toString()}`);
    },
    create: (data: { toolId: number; shopId: number; startDate: string; endDate: string; paymentMethod?: string; notes?: string }): Promise<{ success: boolean; booking: any }> =>
      apiRequest("/bookings", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string): Promise<{ success: boolean }> =>
      apiRequest(`/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    cancel: (id: number): Promise<{ success: boolean }> =>
      apiRequest(`/bookings/${id}`, { method: "DELETE" }),
    getAvailability: (toolId: number): Promise<{ bookedDates: any[] }> =>
      apiRequest(`/bookings/tool/${toolId}/availability`),
  },
  referrals: {
    my: (): Promise<{ referralCode: string; rewards: any[]; totalEarned: number; pendingCount: number }> =>
      apiRequest("/referrals/my"),
    apply: (referralCode: string): Promise<{ success: boolean; message: string }> =>
      apiRequest("/referrals/apply", { method: "POST", body: JSON.stringify({ referralCode }) }),
    leaderboard: (): Promise<{ leaderboard: any[] }> =>
      apiRequest("/referrals/leaderboard"),
  },
  ratings: {
    forTool: (toolId: number): Promise<{ ratings: any[]; average: number; count: number }> =>
      apiRequest(`/ratings/tool/${toolId}`),
    create: (data: { toolId: number; shopId: number; rentalId?: number; rating: number; comment?: string }): Promise<{ success: boolean }> =>
      apiRequest("/ratings", { method: "POST", body: JSON.stringify(data) }),
  },
  notifications: {
    registerToken: (token: string, platform?: string): Promise<{ success: boolean }> =>
      apiRequest("/notifications/register-token", { method: "POST", body: JSON.stringify({ token, platform: platform || "expo" }) }),
  },
  contracts: {
    getForRental: (rentalId: number): Promise<{ contract: any }> =>
      apiRequest(`/contracts/rental/${rentalId}`),
  },
};
