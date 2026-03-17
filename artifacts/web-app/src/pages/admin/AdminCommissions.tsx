import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Building2, RefreshCw, Edit2, Save, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
const h = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}`,
});

type CommissionTotals = {
  total_commission: number; total_shop_amount: number;
  total_revenue: number; count: number;
};
type ShopCommission = {
  shop_id: number; shop_name: string; transactions: number;
  commission: number; revenue: number; avg_rate: number;
};

export default function AdminCommissions() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [totals, setTotals] = useState<CommissionTotals | null>(null);
  const [byShop, setByShop] = useState<ShopCommission[]>([]);
  const [loading, setLoading] = useState(true);

  // Do'kon komissiyasini tahrirlash
  const [shops, setShops] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [commR, shopsR] = await Promise.all([
        fetch(`${baseUrl}/api/platform/commissions?period=${period}`, { headers: h() }),
        fetch(`${baseUrl}/api/shops?limit=100`, { headers: h() }),
      ]);
      if (commR.ok) {
        const d = await commR.json();
        setTotals(d.totals);
        setByShop(d.byShop || []);
      }
      if (shopsR.ok) {
        const d = await shopsR.json();
        setShops(d.shops || []);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [period]);

  async function saveCommission(shopId: number) {
    const val = Number(editVal);
    if (isNaN(val) || val < 0 || val > 100) {
      toast({ title: "Xato", description: "Komissiya 0-100% oralig'ida bo'lishi kerak", variant: "destructive" });
      return;
    }
    const r = await fetch(`${baseUrl}/api/shops/${shopId}`, {
      method: "PATCH", headers: h(),
      body: JSON.stringify({ commission: val }),
    });
    if (r.ok) {
      toast({ title: "Komissiya yangilandi" });
      setEditId(null);
      load();
    } else {
      const e = await r.json();
      toast({ title: "Xato", description: e.error, variant: "destructive" });
    }
  }

  function fmtMoney(n: number) {
    return Number(n || 0).toLocaleString("uz-UZ") + " UZS";
  }

  const chartData = byShop.slice(0, 8).map(s => ({
    name: (s.shop_name || "?").slice(0, 12),
    commission: Math.round(Number(s.commission)),
    revenue: Math.round(Number(s.revenue)),
  }));

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Komissiya boshqaruvi</h1>
          <p className="text-muted-foreground text-sm">Platform komissiyasi va do'konlar hisoboti</p>
        </div>
        <div className="flex gap-2">
          {(["week", "month", "year"] as const).map(p => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p === "week" ? "Hafta" : p === "month" ? "Oy" : "Yil"}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Jami daromad", value: fmtMoney(totals?.total_revenue || 0), icon: TrendingUp, color: "blue" },
          { label: "Platform komissiya", value: fmtMoney(totals?.total_commission || 0), icon: DollarSign, color: "emerald" },
          { label: "Do'konlarga o'tgan", value: fmtMoney(totals?.total_shop_amount || 0), icon: Building2, color: "purple" },
          { label: "Tranzaksiyalar", value: Number(totals?.count || 0), icon: RefreshCw, color: "amber" },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                  <p className="text-lg font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`bg-${stat.color}-50 p-2 rounded-lg`}>
                  <stat.icon className={`h-4 w-4 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Do'konlar bo'yicha komissiya</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v / 1000}K`} />
                <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} UZS`} />
                <Bar dataKey="commission" fill="#10B981" name="Komissiya" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top commissions */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Do'konlar hisoboti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {byShop.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{s.shop_name}</p>
                    <p className="text-xs text-muted-foreground">{s.transactions} tranzaksiya • {Number(s.avg_rate || 0).toFixed(1)}% o'rtacha</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{Number(s.commission || 0).toLocaleString()} UZS</p>
                    <p className="text-xs text-muted-foreground">{Number(s.revenue || 0).toLocaleString()} jami</p>
                  </div>
                </div>
              ))}
              {byShop.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Hali ma'lumot yo'q</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-shop commission settings */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Har bir do'kon uchun komissiya sozlamasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {shops.map(shop => (
              <div key={shop.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{shop.name}</p>
                  <p className="text-xs text-muted-foreground">{shop.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editId === shop.id ? (
                    <>
                      <Input
                        type="number"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        className="w-20 h-8 text-sm"
                        min={0}
                        max={100}
                      />
                      <span className="text-sm">%</span>
                      <Button size="sm" variant="default" className="h-7 px-2" onClick={() => saveCommission(shop.id)}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="font-bold">{shop.commission || 0}%</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => { setEditId(shop.id); setEditVal(String(shop.commission || 10)); }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {shops.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Hali do'konlar yo'q</p>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
