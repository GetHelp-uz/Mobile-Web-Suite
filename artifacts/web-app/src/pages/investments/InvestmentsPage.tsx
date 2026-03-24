import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import {
  TrendingUp, Wallet, Clock, Target, Users, X, RefreshCw,
  ChevronRight, Wrench, Building2, ArrowRight,
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
  shop_id: number | null;
  shop_name: string | null;
  target_amount: number;
  collected_amount: number;
  annual_return_rate: number;
  duration_months: number;
  min_investment: number;
  status: string;
  investor_count: number;
  end_date: string | null;
}

interface WalletInfo {
  balance: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Ochiq", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  closed: { label: "To'liq to'plangan", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  matured: { label: "Tugagan", color: "text-gray-500 bg-gray-100 dark:bg-gray-800" },
  cancelled: { label: "Bekor qilingan", color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
};

export default function InvestmentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [investing, setInvesting] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [fundDetail, setFundDetail] = useState<{ myInvestment: any } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchFunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/funds`, { headers: authH() });
      if (!res.ok) throw new Error("Yuklashda xatolik");
      const data = await res.json();
      setFunds(data.funds || []);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/wallet/me`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchFunds();
    fetchWallet();
  }, [fetchFunds, fetchWallet]);

  const openFund = async (fund: Fund) => {
    setSelectedFund(fund);
    setInvestAmount(String(fund.min_investment));
    setLoadingDetail(true);
    try {
      const res = await fetch(`${BASE}/api/funds/${fund.id}`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setFundDetail(data);
      }
    } catch {} finally {
      setLoadingDetail(false);
    }
  };

  const closeFund = () => {
    setSelectedFund(null);
    setInvestAmount("");
    setFundDetail(null);
  };

  const handleInvest = async () => {
    if (!selectedFund) return;
    const amount = Number(investAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Xatolik", description: "Summa kiriting", variant: "destructive" });
      return;
    }
    setInvesting(true);
    try {
      const res = await fetch(`${BASE}/api/funds/${selectedFund.id}/invest`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      toast({ title: "Muvaffaqiyat", description: `${fmt(amount)} so'm investitsiya qilindi!` });
      closeFund();
      fetchFunds();
      fetchWallet();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setInvesting(false);
    }
  };

  const progressPercent = (fund: Fund) =>
    Math.min(100, (fund.collected_amount / fund.target_amount) * 100);

  const monthlyReturn = (fund: Fund, amount: number) =>
    (amount * fund.annual_return_rate) / 100 / 12;

  const activeFunds = funds.filter(f => f.status === "active");
  const closedFunds = funds.filter(f => f.status !== "active");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <TrendingUp size={24} className="text-primary" />
              Investitsiya Bozori
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Qurilish asboblariga investitsiya qiling va yillik 25–35% daromad oling
            </p>
          </div>
          <div className="flex items-center gap-3">
            {wallet && (
              <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2">
                <Wallet size={16} className="text-primary" />
                <span className="text-sm font-semibold">{fmt(wallet.balance)} so'm</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={fetchFunds} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Yangilash
            </Button>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Faol fondlar", value: activeFunds.length, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
            { label: "Min investitsiya", value: "500,000 so'm", icon: Wallet, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Yillik daromad", value: "25–35%", icon: Target, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
            { label: "Jami investorlar", value: funds.reduce((s, f) => s + Number(f.investor_count), 0), icon: Users, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
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

        {/* Active funds */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold mb-3">Faol Fondlar</h2>
              {activeFunds.length === 0 ? (
                <Card className="p-10 text-center text-muted-foreground">
                  <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Hozircha faol fond yo'q</p>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeFunds.map(fund => {
                    const progress = progressPercent(fund);
                    const status = STATUS_LABELS[fund.status] || { label: fund.status, color: "" };
                    return (
                      <Card key={fund.id} className="p-5 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20"
                        onClick={() => openFund(fund)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                            <h3 className="font-bold text-base mt-1 truncate">{fund.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Wrench size={11} />
                              <span>{fund.tool_type}</span>
                            </div>
                            {fund.shop_name && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 size={11} />
                                <span>{fund.shop_name}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-bold text-green-600">{fund.annual_return_rate}%</div>
                            <div className="text-xs text-muted-foreground">yillik</div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>To'plangan: {fmt(fund.collected_amount)} so'm</span>
                            <span>{progress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Maqsad: {fmt(fund.target_amount)} so'm
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>{fund.duration_months} oy</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users size={11} />
                            <span>{fund.investor_count} investor</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target size={11} />
                            <span>min {fmt(fund.min_investment)} so'm</span>
                          </div>
                        </div>

                        <Button size="sm" className="w-full" onClick={e => { e.stopPropagation(); openFund(fund); }}>
                          Investitsiya qilish
                          <ArrowRight size={14} className="ml-1" />
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Closed/matured funds */}
            {closedFunds.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3 text-muted-foreground">Boshqa Fondlar</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {closedFunds.map(fund => {
                    const progress = progressPercent(fund);
                    const status = STATUS_LABELS[fund.status] || { label: fund.status, color: "" };
                    return (
                      <Card key={fund.id} className="p-5 flex flex-col gap-3 opacity-70 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openFund(fund)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                            <h3 className="font-bold text-sm mt-1 truncate">{fund.name}</h3>
                            <div className="text-xs text-muted-foreground">{fund.tool_type}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xl font-bold text-muted-foreground">{fund.annual_return_rate}%</div>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="bg-muted-foreground h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>{fmt(fund.collected_amount)} / {fmt(fund.target_amount)} so'm</span>
                          <span>{fund.duration_months} oy</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fund detail modal */}
      {selectedFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_LABELS[selectedFund.status]?.color || ""}`}>
                  {STATUS_LABELS[selectedFund.status]?.label || selectedFund.status}
                </span>
                <h2 className="text-xl font-bold mt-1">{selectedFund.name}</h2>
                {selectedFund.description && (
                  <p className="text-muted-foreground text-sm mt-1">{selectedFund.description}</p>
                )}
              </div>
              <button onClick={closeFund} className="text-muted-foreground hover:text-foreground ml-4 flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            {/* Fund details */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Yillik daromad</div>
                <div className="text-2xl font-bold text-green-600">{selectedFund.annual_return_rate}%</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Oylik daromad</div>
                <div className="text-2xl font-bold text-primary">{(selectedFund.annual_return_rate / 12).toFixed(2)}%</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Davomiyligi</div>
                <div className="text-lg font-bold flex items-center gap-1">
                  <Clock size={14} />
                  {selectedFund.duration_months} oy
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Investorlar</div>
                <div className="text-lg font-bold flex items-center gap-1">
                  <Users size={14} />
                  {selectedFund.investor_count}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-5 text-sm">
              <div className="flex items-center gap-2">
                <Wrench size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Asbob turi:</span>
                <span className="font-semibold">{selectedFund.tool_type}</span>
              </div>
              {selectedFund.shop_name && (
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Do'kon:</span>
                  <span className="font-semibold">{selectedFund.shop_name}</span>
                </div>
              )}
              {selectedFund.end_date && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Tugash sanasi:</span>
                  <span className="font-semibold">{new Date(selectedFund.end_date).toLocaleDateString("uz-UZ")}</span>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="mb-5 space-y-1.5">
              <div className="flex justify-between text-sm font-medium">
                <span>To'plangan: {fmt(selectedFund.collected_amount)} so'm</span>
                <span>{progressPercent(selectedFund).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${progressPercent(selectedFund)}%` }} />
              </div>
              <div className="text-xs text-muted-foreground">
                Maqsad: {fmt(selectedFund.target_amount)} so'm
                {selectedFund.status === "active" && (
                  <span className="ml-2 text-orange-600">
                    (Qolgan: {fmt(selectedFund.target_amount - selectedFund.collected_amount)} so'm)
                  </span>
                )}
              </div>
            </div>

            {/* My investment display */}
            {!loadingDetail && fundDetail?.myInvestment && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-5 text-sm">
                <div className="font-semibold text-green-700 dark:text-green-400 mb-1">Sizning investitsiyangiz</div>
                <div className="flex justify-between">
                  <span>Qo'yilgan summa:</span>
                  <span className="font-bold">{fmt(fundDetail.myInvestment.amount)} so'm</span>
                </div>
                <div className="flex justify-between">
                  <span>Ulush:</span>
                  <span className="font-bold">{Number(fundDetail.myInvestment.share_percent).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>To'plangan daromad:</span>
                  <span className="font-bold text-green-600">{fmt(fundDetail.myInvestment.earned_amount)} so'm</span>
                </div>
              </div>
            )}

            {/* Invest form */}
            {selectedFund.status === "active" && (
              <div className="space-y-3 border-t border-border pt-5">
                <h3 className="font-bold">Investitsiya qilish</h3>
                {wallet && (
                  <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                    <span className="text-muted-foreground">Hamyon balansi:</span>
                    <span className="font-bold">{fmt(wallet.balance)} so'm</span>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Summa (so'm)</label>
                  <Input
                    type="number"
                    min={selectedFund.min_investment}
                    step={100000}
                    value={investAmount}
                    onChange={e => setInvestAmount(e.target.value)}
                    placeholder={`Minimum: ${fmt(selectedFund.min_investment)} so'm`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: {fmt(selectedFund.min_investment)} so'm
                  </p>
                </div>

                {investAmount && Number(investAmount) > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm space-y-1">
                    <div className="font-semibold text-blue-700 dark:text-blue-400">Hisob-kitob</div>
                    <div className="flex justify-between">
                      <span>Ulushingiz:</span>
                      <span className="font-bold">{((Number(investAmount) / selectedFund.target_amount) * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Oylik daromad:</span>
                      <span className="font-bold text-green-600">{fmt(monthlyReturn(selectedFund, Number(investAmount)))} so'm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jami daromad ({selectedFund.duration_months} oy):</span>
                      <span className="font-bold text-green-600">
                        {fmt(monthlyReturn(selectedFund, Number(investAmount)) * selectedFund.duration_months)} so'm
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={closeFund}>Bekor qilish</Button>
                  <Button className="flex-1" onClick={handleInvest} disabled={investing}>
                    {investing ? "Qilinmoqda..." : "Investitsiya qilish"}
                    {!investing && <ChevronRight size={14} className="ml-1" />}
                  </Button>
                </div>
              </div>
            )}

            {selectedFund.status !== "active" && (
              <div className="border-t border-border pt-4">
                <Button variant="outline" className="w-full" onClick={closeFund}>Yopish</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
