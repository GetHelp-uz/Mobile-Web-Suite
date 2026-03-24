import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2, Search, Phone, MapPin, RefreshCw, X,
  ChevronLeft, ChevronRight, Power, PowerOff, Percent,
  Wrench, ShoppingCart, User, CheckCircle2, AlertCircle,
  Calendar, Crown,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const BASE = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
function getToken() { return localStorage.getItem("gethelp_token") || ""; }
function authH() { return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" }; }

interface ShopRow {
  id: number;
  name: string;
  address: string;
  phone: string;
  region: string | null;
  district: string | null;
  commission: number;
  is_active: boolean;
  subscription_status: string;
  subscription_ends_at: string | null;
  created_at: string;
  owner_id: number;
  owner_name: string;
  owner_phone: string;
  owner_active: boolean;
  tools_count: string;
  rentals_count: string;
}

const SUB_LABELS: Record<string, { label: string; color: string }> = {
  active:  { label: "Faol obuna", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  trial:   { label: "Sinov davri", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  expired: { label: "Tugagan", color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
};

interface CommissionModalState {
  open: boolean;
  shop: ShopRow | null;
  value: string;
  loading: boolean;
}

export default function AdminShops() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [commModal, setCommModal] = useState<CommissionModalState>({ open: false, shop: null, value: "", loading: false });
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`${BASE}/api/shops/admin/list?${params}`, { headers: authH() });
      if (!res.ok) throw new Error("Yuklashda xatolik");
      const data = await res.json();
      setShops(data.shops || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchShops(); }, [fetchShops]);

  async function handleToggleActive(shop: ShopRow) {
    setTogglingId(shop.id);
    try {
      const res = await fetch(`${BASE}/api/shops/${shop.id}/toggle-active`, { method: "PATCH", headers: authH() });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
      const data = await res.json();
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, is_active: data.isActive } : s));
      toast({
        title: data.isActive ? "Do'kon faollashtirildi" : "Do'kon bloklandi",
        description: shop.name,
      });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCommissionSave() {
    if (!commModal.shop) return;
    const val = Number(commModal.value);
    if (isNaN(val) || val < 0 || val > 100) {
      toast({ title: "Xatolik", description: "Komissiya 0–100 orasida bo'lishi kerak", variant: "destructive" }); return;
    }
    setCommModal(m => ({ ...m, loading: true }));
    try {
      const res = await fetch(`${BASE}/api/shops/${commModal.shop!.id}/commission`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ commission: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setShops(prev => prev.map(s => s.id === commModal.shop!.id ? { ...s, commission: data.commission } : s));
      toast({ title: "Komissiya yangilandi", description: `${commModal.shop!.name}: ${val}%` });
      setCommModal({ open: false, shop: null, value: "", loading: false });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setCommModal(m => ({ ...m, loading: false }));
    }
  }

  const totalPages = Math.ceil(total / 15);
  const activeCount = shops.filter(s => s.is_active).length;
  const blockedCount = shops.filter(s => !s.is_active).length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Building2 size={24} className="text-primary" />
              Do'konlar boshqaruvi
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Jami {total} ta do'kon — {activeCount} faol, {blockedCount} bloklangan
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchShops} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Yangilash
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Jami do'konlar", value: total, icon: Building2, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Faol", value: activeCount, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
            { label: "Bloklangan", value: blockedCount, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
            {
              label: "O'rt. komissiya",
              value: shops.length > 0 ? `${(shops.reduce((s, x) => s + x.commission, 0) / shops.length).toFixed(1)}%` : "—",
              icon: Percent, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20",
            },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={stat.color} />
                </div>
                <div>
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            className="pl-9"
            placeholder="Do'kon nomi, telefon, egasi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : shops.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Building2 size={40} className="mb-3 opacity-30" />
              <p>Hech narsa topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Do'kon</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Egasi</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Obuna</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Asboblar</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ijaralar</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Komissiya</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Holat</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shops.map(shop => {
                    const sub = SUB_LABELS[shop.subscription_status] || { label: shop.subscription_status, color: "text-muted-foreground" };
                    return (
                      <tr key={shop.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{shop.name}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Phone size={10} />
                            <span className="font-mono">{shop.phone}</span>
                          </div>
                          {(shop.region || shop.district) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin size={10} />
                              <span>{[shop.region, shop.district].filter(Boolean).join(", ")}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">#{shop.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-muted-foreground flex-shrink-0" />
                            <div>
                              <div className="font-medium text-sm">{shop.owner_name || "—"}</div>
                              <div className="text-xs font-mono text-muted-foreground">{shop.owner_phone}</div>
                              {!shop.owner_active && (
                                <span className="text-xs text-red-500">Bloklangan</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sub.color}`}>
                            <Crown size={10} />
                            {sub.label}
                          </span>
                          {shop.subscription_ends_at && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Calendar size={10} />
                              {new Date(shop.subscription_ends_at).toLocaleDateString("uz-UZ")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Wrench size={12} className="text-muted-foreground" />
                            <span className="font-semibold">{shop.tools_count}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <ShoppingCart size={12} className="text-muted-foreground" />
                            <span className="font-semibold">{shop.rentals_count}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setCommModal({ open: true, shop, value: String(shop.commission), loading: false })}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                          >
                            <Percent size={12} />
                            {shop.commission}%
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${shop.is_active ? "text-green-600" : "text-red-500"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${shop.is_active ? "bg-green-500" : "bg-red-500"}`} />
                            {shop.is_active ? "Faol" : "Bloklangan"}
                          </span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(shop.created_at).toLocaleDateString("uz-UZ")}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => handleToggleActive(shop)}
                              disabled={togglingId === shop.id}
                              className={`p-1.5 rounded hover:bg-muted transition-colors ${shop.is_active ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}`}
                              title={shop.is_active ? "Bloklash" : "Faollashtirish"}
                            >
                              {togglingId === shop.id
                                ? <RefreshCw size={14} className="animate-spin" />
                                : shop.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <span className="text-sm text-muted-foreground">
                {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} / {total}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="flex items-center px-3 text-sm font-medium">{page} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Commission Modal */}
      {commModal.open && commModal.shop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Percent size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Komissiya o'zgartirish</h3>
                  <p className="text-muted-foreground text-sm">{commModal.shop.name}</p>
                </div>
              </div>
              <button onClick={() => setCommModal(m => ({ ...m, open: false }))} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="text-muted-foreground">Hozirgi komissiya</div>
                <div className="text-2xl font-bold text-primary">{commModal.shop.commission}%</div>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Yangi komissiya (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                  <Input
                    className="pl-9"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="0–100"
                    value={commModal.value}
                    onChange={e => setCommModal(m => ({ ...m, value: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">0 dan 100 gacha (masalan: 10, 12.5)</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setCommModal(m => ({ ...m, open: false }))}>
                Bekor qilish
              </Button>
              <Button className="flex-1" onClick={handleCommissionSave} disabled={commModal.loading}>
                {commModal.loading ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
