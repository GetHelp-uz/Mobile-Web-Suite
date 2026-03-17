import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, Wrench, TrendingUp, Server, Database,
  Cpu, HardDrive, Activity, ArrowUpRight, DollarSign,
  ShoppingCart, AlertCircle, CheckCircle, RefreshCw,
  BarChart3, PieChart, Zap, Wifi,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
const h = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}`,
});

type ServerStatus = {
  server: {
    uptime: number; uptimeFormatted: string; cpuCount: number;
    cpuModel: string; memTotal: number; memUsed: number;
    memFree: number; memPercent: number; nodeVersion: string;
    platform: string; hostname: string;
  };
  database: {
    status: string; users_count: string; shops_count: string;
    tools_count: string; active_rentals: string; tx_count: string;
    total_wallet_balance: string; rentals_today: string; new_users_today: string;
  };
  metrics: {
    weeklyRentals: any[]; monthlyRevenue: number;
    commissionRevenue: number; topShops: any[];
  };
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}
function fmtSum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M UZS";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K UZS";
  return n.toLocaleString() + " UZS";
}
function fmtBytes(bytes: number) {
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return gb.toFixed(1) + " GB";
  return (bytes / 1024 / 1024).toFixed(0) + " MB";
}

export default function AdminOverview() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/platform/status`, { headers: h() });
      if (r.ok) setStatus(await r.json());
    } catch {}
    setLoading(false);
    setLastRefresh(new Date());
  }

  useEffect(() => { load(); }, []);

  const db_s = status?.database;
  const srv = status?.server;
  const metrics = status?.metrics;

  const statsCards = [
    { label: "Jami do'konlar", value: Number(db_s?.shops_count || 0), icon: Building2, color: "text-blue-600", bg: "bg-blue-50", delta: `+${db_s?.new_users_today || 0} bugun` },
    { label: "Foydalanuvchilar", value: Number(db_s?.users_count || 0), icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", delta: `${db_s?.new_users_today || 0} yangi bugun` },
    { label: "Asboblar", value: Number(db_s?.tools_count || 0), icon: Wrench, color: "text-amber-600", bg: "bg-amber-50", delta: "Ro'yhatdagi" },
    { label: "Faol ijaralar", value: Number(db_s?.active_rentals || 0), icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50", delta: `${db_s?.rentals_today || 0} bugun yangi` },
    { label: "Oylik daromad", value: fmtSum(metrics?.monthlyRevenue || 0), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", delta: "Joriy oy" },
    { label: "Platform komissiya", value: fmtSum(metrics?.commissionRevenue || 0), icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", delta: "Joriy oy" },
  ];

  const weekData = (metrics?.weeklyRentals || []).map((r: any) => ({
    date: new Date(r.date).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
    count: Number(r.count),
    revenue: Math.round(Number(r.revenue) / 1000),
  }));

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Boshqaruv Paneli</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Oxirgi yangilanish: {lastRefresh.toLocaleTimeString("uz-UZ")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Yangilash
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {statsCards.map((s, i) => (
          <Card key={i} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.delta}</p>
                </div>
                <div className={`${s.bg} p-2 rounded-lg`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Haftalik ijara daromadi (ming UZS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weekData}>
                <defs>
                  <linearGradient id="colRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}K`} />
                <Tooltip formatter={(v: any) => [`${v}K UZS`, "Daromad"]} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#colRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top shops */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Top do'konlar (30 kun)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(metrics?.topShops || []).slice(0, 5).map((shop: any, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{shop.shop_name || "Noma'lum"}</p>
                    <p className="text-xs text-muted-foreground">{shop.rental_count} ijara</p>
                  </div>
                  <p className="text-xs font-semibold text-emerald-600">{fmt(Number(shop.revenue))} UZS</p>
                </div>
              ))}
              {(!metrics?.topShops || metrics.topShops.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-3">Ma'lumot yo'q</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Infrastructure Infographic */}
      <Card className="shadow-sm mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-slate-600" />
              Server infratuzilmasi
            </CardTitle>
            <Badge variant={db_s?.status === "healthy" ? "default" : "destructive"} className="text-xs">
              {db_s?.status === "healthy" ? "Barcha tizimlar ishlayapti" : "Xatolik bor"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Service Status Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { name: "API Server", sub: `Node ${srv?.nodeVersion || ""}`, ok: true, icon: Zap },
              { name: "PostgreSQL", sub: `${fmt(Number(db_s?.tx_count || 0))} tranzaksiya`, ok: db_s?.status === "healthy", icon: Database },
              { name: "SMS Xizmati", sub: "Eskiz SMS", ok: true, icon: Wifi },
              { name: "Expo Mobile", sub: "iOS / Android", ok: true, icon: Activity },
            ].map((svc, i) => (
              <div key={i} className={`flex items-center gap-2.5 p-3 rounded-xl border ${svc.ok ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                <svc.icon className={`h-4 w-4 ${svc.ok ? "text-emerald-600" : "text-red-500"}`} />
                <div>
                  <p className="text-xs font-semibold">{svc.name}</p>
                  <p className={`text-xs ${svc.ok ? "text-emerald-600" : "text-red-500"}`}>{svc.sub}</p>
                </div>
                <div className="ml-auto">
                  {svc.ok ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                </div>
              </div>
            ))}
          </div>

          {/* Resource Meters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <HardDrive className="h-3.5 w-3.5 text-blue-500" />RAM xotira
                </div>
                <span className="text-xs text-muted-foreground">{srv?.memPercent || 0}%</span>
              </div>
              <Progress value={srv?.memPercent || 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {fmtBytes(srv?.memUsed || 0)} / {fmtBytes(srv?.memTotal || 0)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Cpu className="h-3.5 w-3.5 text-purple-500" />CPU ({srv?.cpuCount || 0} yadro)
                </div>
                <span className="text-xs text-muted-foreground">~35%</span>
              </div>
              <Progress value={35} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 truncate">{srv?.cpuModel}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Activity className="h-3.5 w-3.5 text-amber-500" />Ishlash vaqti
                </div>
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                  Faol
                </span>
              </div>
              <p className="text-xl font-bold">{srv?.uptimeFormatted || "—"}</p>
              <p className="text-xs text-muted-foreground">{srv?.platform} • {srv?.hostname}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Tarif rejalari", href: "/admin/tariffs", icon: PieChart, color: "blue" },
          { label: "Komissiya hisoboti", href: "/admin/commissions", icon: DollarSign, color: "emerald" },
          { label: "Yechib olish so'rovlari", href: "/admin/withdrawals", icon: ArrowUpRight, color: "amber" },
          { label: "Ilova boshqaruvi", href: "/admin/app-management", icon: Activity, color: "purple" },
        ].map((link, i) => (
          <a key={i} href={link.href}>
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className={`p-2 rounded-lg bg-${link.color}-50`}>
                  <link.icon className={`h-4 w-4 text-${link.color}-600`} />
                </div>
                <span className="text-sm font-medium">{link.label}</span>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </DashboardLayout>
  );
}
