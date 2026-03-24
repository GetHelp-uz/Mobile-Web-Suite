import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  TrendingUp, Plus, RefreshCw, X, Users, Wallet,
  Clock, Target, ChevronDown, ChevronUp, CheckCircle2, DollarSign,
  Wrench, Building2,
} from "lucide-react";

const BASE = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
function getToken() { return localStorage.getItem("gethelp_token") || ""; }
function authH() { return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" }; }

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

interface Fund {
  id: number;
  name: string;
  description: string | null;
  tool_type: string;
  shop_name: string | null;
  target_amount: number;
  collected_amount: number;
  annual_return_rate: number;
  duration_months: number;
  min_investment: number;
  status: string;
  investor_count: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

interface FundForm {
  name: string;
  description: string;
  toolType: string;
  shopId: string;
  targetAmount: string;
  annualReturnRate: string;
  durationMonths: string;
  minInvestment: string;
}

const defaultForm: FundForm = {
  name: "", description: "", toolType: "", shopId: "",
  targetAmount: "", annualReturnRate: "28", durationMonths: "12", minInvestment: "500000",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Ochiq", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  closed: { label: "To'liq to'plangan", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  matured: { label: "Tugagan", color: "text-gray-500 bg-gray-100 dark:bg-gray-800" },
  cancelled: { label: "Bekor qilingan", color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
};

export default function AdminFunds() {
  const { toast } = useToast();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FundForm>(defaultForm);
  const [creating, setCreating] = useState(false);
  const [expandedFund, setExpandedFund] = useState<number | null>(null);
  const [fundDetail, setFundDetail] = useState<{ investors: any[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [distributing, setDistributing] = useState<number | null>(null);
  const [returning, setReturning] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchFunds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: "50" });
      const res = await fetch(`${BASE}/api/funds?${params}`, { headers: authH() });
      if (!res.ok) throw new Error("Yuklashda xatolik");
      const data = await res.json();
      setFunds(data.funds || []);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchFunds(); }, [fetchFunds]);

  const loadFundDetail = async (fundId: number) => {
    if (expandedFund === fundId) {
      setExpandedFund(null);
      setFundDetail(null);
      return;
    }
    setExpandedFund(fundId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${BASE}/api/funds/${fundId}`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setFundDetail(data);
      }
    } catch {} finally {
      setLoadingDetail(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.toolType || !form.targetAmount) {
      toast({ title: "Xatolik", description: "Majburiy maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${BASE}/api/funds`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          toolType: form.toolType,
          shopId: form.shopId ? Number(form.shopId) : undefined,
          targetAmount: Number(form.targetAmount),
          annualReturnRate: Number(form.annualReturnRate),
          durationMonths: Number(form.durationMonths),
          minInvestment: Number(form.minInvestment),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      toast({ title: "Fond yaratildi", description: form.name });
      setShowCreate(false);
      setForm(defaultForm);
      fetchFunds();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (fundId: number, newStatus: string) => {
    try {
      const res = await fetch(`${BASE}/api/funds/${fundId}`, {
        method: "PATCH",
        headers: authH(),
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      toast({ title: "Holat yangilandi" });
      fetchFunds();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    }
  };

  const handleDistribute = async (fundId: number, fundName: string) => {
    setDistributing(fundId);
    try {
      const res = await fetch(`${BASE}/api/funds/${fundId}/distribute`, {
        method: "POST",
        headers: authH(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      toast({ title: "Daromad ulashildi", description: data.message });
      fetchFunds();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setDistributing(null);
    }
  };

  const handleReturn = async (fundId: number) => {
    setReturning(fundId);
    try {
      const res = await fetch(`${BASE}/api/funds/${fundId}/return`, {
        method: "POST",
        headers: authH(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      toast({ title: "Asosiy pul qaytarildi", description: data.message });
      fetchFunds();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setReturning(null);
    }
  };

  const progressPercent = (fund: Fund) =>
    Math.min(100, (fund.collected_amount / fund.target_amount) * 100);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <TrendingUp size={24} className="text-primary" />
              Fondlar Boshqaruvi
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Ijara fondlarini boshqarish, daromad ulashish
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchFunds} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Yangilash
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} className="mr-1" />
              Yangi fond
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "active", "closed", "matured", "cancelled"].map(s => (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? "Barchasi" : STATUS_LABELS[s]?.label || s}
            </button>
          ))}
        </div>

        {/* Funds list */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : funds.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
            <p>Fond topilmadi</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus size={14} className="mr-1" /> Yangi fond yaratish
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {funds.map(fund => {
              const progress = progressPercent(fund);
              const status = STATUS_LABELS[fund.status] || { label: fund.status, color: "" };
              const isExpanded = expandedFund === fund.id;
              return (
                <Card key={fund.id} className="overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                          <h3 className="font-bold text-base">{fund.name}</h3>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1"><Wrench size={11} />{fund.tool_type}</div>
                          {fund.shop_name && <div className="flex items-center gap-1"><Building2 size={11} />{fund.shop_name}</div>}
                          <div className="flex items-center gap-1"><Clock size={11} />{fund.duration_months} oy</div>
                          <div className="flex items-center gap-1"><Users size={11} />{fund.investor_count} investor</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{fund.annual_return_rate}%</div>
                          <div className="text-xs text-muted-foreground">yillik</div>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span>To'plangan: {fmt(fund.collected_amount)} so'm</span>
                        <span>{progress.toFixed(1)}% / Maqsad: {fmt(fund.target_amount)} so'm</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {(fund.status === "active" || fund.status === "closed") && (
                        <Button size="sm" variant="outline"
                          onClick={() => handleDistribute(fund.id, fund.name)}
                          disabled={distributing === fund.id}>
                          <DollarSign size={13} className="mr-1" />
                          {distributing === fund.id ? "Ulashilmoqda..." : "Daromad ulash"}
                        </Button>
                      )}
                      {(fund.status === "active" || fund.status === "closed") && (
                        <Button size="sm" variant="outline"
                          onClick={() => handleReturn(fund.id)}
                          disabled={returning === fund.id}>
                          <Wallet size={13} className="mr-1" />
                          {returning === fund.id ? "Qaytarilmoqda..." : "Asosiy pul qaytarish"}
                        </Button>
                      )}
                      {fund.status === "active" && (
                        <Button size="sm" variant="outline"
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => handleStatusChange(fund.id, "cancelled")}>
                          <X size={13} className="mr-1" />
                          Bekor qilish
                        </Button>
                      )}
                      {fund.status === "cancelled" && (
                        <Button size="sm" variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleStatusChange(fund.id, "active")}>
                          <CheckCircle2 size={13} className="mr-1" />
                          Aktivlashtirish
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => loadFundDetail(fund.id)}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Investorlar ({fund.investor_count})
                      </Button>
                    </div>
                  </div>

                  {/* Expanded investors */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 p-5">
                      {loadingDetail ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <RefreshCw size={14} className="animate-spin" />
                          Yuklanmoqda...
                        </div>
                      ) : !fundDetail?.investors?.length ? (
                        <p className="text-muted-foreground text-sm">Hali investor yo'q</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="pb-2 text-left font-semibold text-muted-foreground">Investor</th>
                                <th className="pb-2 text-left font-semibold text-muted-foreground">Summa</th>
                                <th className="pb-2 text-left font-semibold text-muted-foreground">Ulush</th>
                                <th className="pb-2 text-left font-semibold text-muted-foreground">Daromad</th>
                                <th className="pb-2 text-left font-semibold text-muted-foreground">Holat</th>
                                <th className="pb-2 text-left font-semibold text-muted-foreground">Sana</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {fundDetail.investors.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-muted/30">
                                  <td className="py-2">
                                    <div className="font-medium">{inv.user_name}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{inv.user_phone}</div>
                                  </td>
                                  <td className="py-2 font-semibold">{fmt(inv.amount)} so'm</td>
                                  <td className="py-2">{Number(inv.share_percent).toFixed(2)}%</td>
                                  <td className="py-2 text-green-600 font-semibold">+{fmt(inv.earned_amount)} so'm</td>
                                  <td className="py-2">
                                    <span className={`text-xs ${inv.status === "active" ? "text-green-600" : "text-gray-500"}`}>
                                      {inv.status === "active" ? "Faol" : inv.status === "returned" ? "Qaytarilgan" : "Bekor"}
                                    </span>
                                  </td>
                                  <td className="py-2 text-xs text-muted-foreground">
                                    {new Date(inv.invested_at).toLocaleDateString("uz-UZ")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create fund modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp size={20} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold">Yangi fond yaratish</h2>
              </div>
              <button onClick={() => { setShowCreate(false); setForm(defaultForm); }} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5">Fond nomi *</label>
                <Input placeholder="Masalan: Perforator Fondi #1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Tavsif</label>
                <Input placeholder="Fond haqida qisqacha ma'lumot" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Asbob turi *</label>
                <Input placeholder="Masalan: Perforator, Ekskavator, Generator..." value={form.toolType} onChange={e => setForm(f => ({ ...f, toolType: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Do'kon ID (ixtiyoriy)</label>
                <Input type="number" placeholder="Do'kon IDsi" value={form.shopId} onChange={e => setForm(f => ({ ...f, shopId: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Maqsad summa (so'm) *</label>
                  <Input type="number" placeholder="10,000,000" min={1000000} step={500000} value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Min investitsiya (so'm) *</label>
                  <Input type="number" placeholder="500,000" min={100000} step={100000} value={form.minInvestment} onChange={e => setForm(f => ({ ...f, minInvestment: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Yillik daromad (%) *</label>
                  <Input type="number" placeholder="28" min={1} max={100} step={0.5} value={form.annualReturnRate} onChange={e => setForm(f => ({ ...f, annualReturnRate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Davomiylik (oy) *</label>
                  <Input type="number" placeholder="12" min={1} max={60} value={form.durationMonths} onChange={e => setForm(f => ({ ...f, durationMonths: e.target.value }))} />
                </div>
              </div>

              {form.targetAmount && form.annualReturnRate && form.durationMonths && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1">Hisob-kitob</div>
                  <div className="flex justify-between">
                    <span>Oylik daromad foizi:</span>
                    <span className="font-bold">{(Number(form.annualReturnRate) / 12).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jami daromad ({form.durationMonths} oy):</span>
                    <span className="font-bold text-green-600">
                      {fmt(Number(form.targetAmount) * Number(form.annualReturnRate) / 100)} so'm
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCreate(false); setForm(defaultForm); }}>
                Bekor qilish
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={creating}>
                {creating ? "Yaratilmoqda..." : "Yaratish"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
