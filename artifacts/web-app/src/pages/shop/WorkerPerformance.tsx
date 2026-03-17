import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  Users, TrendingUp, AlertTriangle, CheckCircle, FileText,
  Award, BarChart2, RefreshCw, Clock,
} from "lucide-react";

type Worker = {
  id: number; name: string; phone: string; role: string;
  rentals_processed: number; returned_count: number; active_count: number;
  damage_reports_filed: number; total_revenue_processed: number;
  tasks_total: number; tasks_done: number; last_rental_at: string | null;
};

type ShopStats = {
  total_rentals: number; completed_rentals: number; active_rentals: number;
  total_revenue: number; active_workers: number;
};

const PERIOD_OPTIONS = [
  { key: "week",  label: "7 kun" },
  { key: "month", label: "30 kun" },
  { key: "year",  label: "1 yil" },
  { key: "all",   label: "Hammasi" },
];

export default function WorkerPerformance() {
  const { toast } = useToast();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [shopId, setShopId] = useState<number | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [shopStats, setShopStats] = useState<ShopStats | null>(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  const load = async (sid: number, p: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/worker-performance?shopId=${sid}&period=${p}`, { headers: h });
      const d = await r.json();
      setWorkers(d.workers || []);
      setShopStats(d.shopStats || null);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/shops?mine=true", { headers: h });
      const d = await r.json();
      const shop = d.shops?.[0] || d[0];
      if (shop) { setShopId(shop.id); load(shop.id, "month"); }
      else setLoading(false);
    })();
  }, []);

  const completionRate = (w: Worker) => {
    if (!w.rentals_processed) return 0;
    return Math.round((w.returned_count / w.rentals_processed) * 100);
  };

  const taskCompletion = (w: Worker) => {
    if (!w.tasks_total) return 0;
    return Math.round((w.tasks_done / w.tasks_total) * 100);
  };

  const getRank = (idx: number) => {
    if (idx === 0) return { icon: "🥇", color: "text-yellow-500" };
    if (idx === 1) return { icon: "🥈", color: "text-slate-400" };
    if (idx === 2) return { icon: "🥉", color: "text-amber-600" };
    return { icon: `#${idx + 1}`, color: "text-muted-foreground" };
  };

  if (loading) {
    return <DashboardLayout><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Xodim samaradorligi</h1>
          <p className="text-muted-foreground">Har bir xodimning ish ko'rsatkichlari</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(p => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? "default" : "outline"}
              onClick={() => { setPeriod(p.key); if (shopId) load(shopId, p.key); }}
            >
              {p.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => shopId && load(shopId, period)}>
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Do'kon umumiy statistikasi */}
      {shopStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Jami ijaralar", value: shopStats.total_rentals, icon: FileText, color: "bg-blue-100 text-blue-700" },
            { label: "Yakunlangan", value: shopStats.completed_rentals, icon: CheckCircle, color: "bg-green-100 text-green-700" },
            { label: "Faol ijaralar", value: shopStats.active_rentals, icon: Clock, color: "bg-orange-100 text-orange-700" },
            { label: "Jami daromad", value: formatCurrency(Number(shopStats.total_revenue)), icon: TrendingUp, color: "bg-purple-100 text-purple-700" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Xodimlar jadvali */}
      {workers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users size={56} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold mb-1">Ma'lumot yo'q</p>
            <p className="text-sm">Bu davr uchun xodim faoliyati topilmadi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workers.map((worker, idx) => {
            const rank = getRank(idx);
            const rate = completionRate(worker);
            const taskRate = taskCompletion(worker);
            return (
              <Card key={worker.id} className={idx === 0 ? "border-2 border-yellow-200 bg-yellow-50/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Rank + Avatar */}
                    <div className="flex items-center gap-3 w-48">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-xl flex-shrink-0">
                        {rank.icon}
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">{worker.name}</p>
                        <p className="text-xs text-muted-foreground">{worker.phone}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {worker.role === "shop_owner" ? "Do'kon egasi" : "Xodim"}
                        </Badge>
                      </div>
                    </div>

                    {/* Asosiy ko'rsatkichlar */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-blue-50 text-center">
                        <p className="text-2xl font-bold text-blue-700">{worker.rentals_processed}</p>
                        <p className="text-xs text-blue-600">Qayta ishlangan</p>
                      </div>
                      <div className="p-3 rounded-xl bg-green-50 text-center">
                        <p className="text-2xl font-bold text-green-700">{worker.returned_count}</p>
                        <p className="text-xs text-green-600">Qaytarilgan</p>
                      </div>
                      <div className="p-3 rounded-xl bg-red-50 text-center">
                        <p className="text-2xl font-bold text-red-700">{worker.damage_reports_filed}</p>
                        <p className="text-xs text-red-600">Shikast xabari</p>
                      </div>
                      <div className="p-3 rounded-xl bg-purple-50 text-center">
                        <p className="text-lg font-bold text-purple-700">{formatCurrency(Number(worker.total_revenue_processed))}</p>
                        <p className="text-xs text-purple-600">Jami summa</p>
                      </div>
                    </div>

                    {/* Samaradorlik foizlari */}
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Ijara yakunlash</span>
                        <span className="font-semibold">{rate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${rate >= 80 ? "bg-green-500" : rate >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${rate}%` }} />
                      </div>
                      {worker.tasks_total > 0 && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Vazifa bajarish ({worker.tasks_done}/{worker.tasks_total})</span>
                            <span className="font-semibold">{taskRate}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500"
                              style={{ width: `${taskRate}%` }} />
                          </div>
                        </>
                      )}
                      {worker.last_rental_at && (
                        <p className="text-xs text-muted-foreground">
                          So'nggi faollik: {new Date(worker.last_rental_at).toLocaleDateString("uz-UZ")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
