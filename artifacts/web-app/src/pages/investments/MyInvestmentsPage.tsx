import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link } from "wouter";
import {
  TrendingUp, Wallet, Clock, RefreshCw, ArrowRight,
  Wrench, BarChart2,
} from "lucide-react";

const BASE = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
function getToken() { return localStorage.getItem("gethelp_token") || ""; }
function authH() { return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" }; }

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

interface MyInvestment {
  id: number;
  fund_id: number;
  fund_name: string;
  tool_type: string;
  annual_return_rate: number;
  duration_months: number;
  fund_status: string;
  target_amount: number;
  collected_amount: number;
  amount: number;
  share_percent: number;
  earned_amount: number;
  status: string;
  invested_at: string;
  returned_at: string | null;
}

const FUND_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Faol", color: "text-green-600" },
  closed: { label: "To'liq to'plangan", color: "text-blue-600" },
  matured: { label: "Tugagan", color: "text-gray-500" },
  cancelled: { label: "Bekor qilingan", color: "text-red-500" },
};

const INV_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Faol", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
  returned: { label: "Qaytarilgan", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
  cancelled: { label: "Bekor qilingan", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
};

export default function MyInvestmentsPage() {
  const { toast } = useToast();
  const [investments, setInvestments] = useState<MyInvestment[]>([]);
  const [summary, setSummary] = useState({ totalInvested: 0, totalEarned: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/funds/my`, { headers: authH() });
      if (!res.ok) throw new Error("Yuklashda xatolik");
      const data = await res.json();
      setInvestments(data.investments || []);
      setSummary(data.summary || { totalInvested: 0, totalEarned: 0, count: 0 });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvestments(); }, [fetchInvestments]);

  const activeInvestments = investments.filter(i => i.status === "active");
  const pastInvestments = investments.filter(i => i.status !== "active");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <BarChart2 size={24} className="text-primary" />
              Mening Investitsiyalarim
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Barcha fondlardagi investitsiyalaringiz va daromadlaringiz
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchInvestments} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Yangilash
            </Button>
            <Link href="/investments">
              <Button size="sm">
                Fondlar bozori
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <Wallet size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{fmt(summary.totalInvested)} so'm</div>
              <div className="text-sm text-muted-foreground">Jami investitsiya</div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{fmt(summary.totalEarned)} so'm</div>
              <div className="text-sm text-muted-foreground">Jami daromad</div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
              <BarChart2 size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.count}</div>
              <div className="text-sm text-muted-foreground">Jami investitsiyalar</div>
            </div>
          </Card>
        </div>

        {/* Investments table */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : investments.length === 0 ? (
          <Card className="p-12 text-center">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold mb-2">Hali investitsiya yo'q</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Investitsiya bozoriga o'tib, faol fondlarga investitsiya qiling
            </p>
            <Link href="/investments">
              <Button>Fondlar bozoriga o'tish</Button>
            </Link>
          </Card>
        ) : (
          <>
            {activeInvestments.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3">Faol Investitsiyalar</h2>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fond</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Qo'yilgan summa</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ulush</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Daromad</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Holat</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Sana</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {activeInvestments.map(inv => {
                          const invStatus = INV_STATUS_LABELS[inv.status] || { label: inv.status, color: "", bg: "" };
                          const fundStatus = FUND_STATUS_LABELS[inv.fund_status] || { label: inv.fund_status, color: "" };
                          return (
                            <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium">{inv.fund_name}</div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <Wrench size={11} />
                                  <span>{inv.tool_type}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs mt-0.5">
                                  <Clock size={11} className="text-muted-foreground" />
                                  <span className="text-muted-foreground">{inv.duration_months} oy</span>
                                  <span className="mx-1">·</span>
                                  <span className="font-semibold text-green-600">{inv.annual_return_rate}% yillik</span>
                                </div>
                                <div className={`text-xs mt-0.5 ${fundStatus.color}`}>{fundStatus.label}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-bold">{fmt(inv.amount)} so'm</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold">{Number(inv.share_percent).toFixed(2)}%</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-green-600">+{fmt(inv.earned_amount)} so'm</div>
                                <div className="text-xs text-muted-foreground">
                                  Oylik: ~{fmt(inv.amount * inv.annual_return_rate / 100 / 12)} so'm
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${invStatus.bg} ${invStatus.color}`}>
                                  {invStatus.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {new Date(inv.invested_at).toLocaleDateString("uz-UZ")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {pastInvestments.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3 text-muted-foreground">O'tgan Investitsiyalar</h2>
                <Card className="overflow-hidden opacity-80">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fond</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Qo'yilgan summa</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Jami daromad</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Holat</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Qaytarilgan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {pastInvestments.map(inv => {
                          const invStatus = INV_STATUS_LABELS[inv.status] || { label: inv.status, color: "", bg: "" };
                          return (
                            <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium">{inv.fund_name}</div>
                                <div className="text-xs text-muted-foreground">{inv.tool_type}</div>
                              </td>
                              <td className="px-4 py-3 font-bold">{fmt(inv.amount)} so'm</td>
                              <td className="px-4 py-3 font-bold text-green-600">+{fmt(inv.earned_amount)} so'm</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${invStatus.bg} ${invStatus.color}`}>
                                  {invStatus.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {inv.returned_at ? new Date(inv.returned_at).toLocaleDateString("uz-UZ") : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
