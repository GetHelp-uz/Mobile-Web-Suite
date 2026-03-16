import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Package, Users, Clock, AlertTriangle, BarChart2, PieChart as PieChartIcon, Star } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4"];

function StatCard({ title, value, icon: Icon, color = "text-primary", sub }: {
  title: string; value: string | number; icon: any; color?: string; sub?: string
}) {
  return (
    <Card>
      <CardContent className="p-6 flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ShopStats() {
  const { user } = useAuth();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("tool_rent_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { Authorization: `Bearer ${token}` };

  const [dashboard, setDashboard] = useState<any>(null);
  const [toolStats, setToolStats] = useState<any>(null);
  const [ratingsData, setRatingsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const shortDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate()}.${(dt.getMonth() + 1).toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    Promise.all([
      fetch(`${baseUrl}/api/analytics/dashboard?shopId=${shopId}`, { headers: h }).then(r => r.json()),
      fetch(`${baseUrl}/api/analytics/tools?shopId=${shopId}`, { headers: h }).then(r => r.json()),
      fetch(`${baseUrl}/api/ratings/shop/${shopId}`, { headers: h }).then(r => r.json()),
    ]).then(([d, t, rat]) => {
      setDashboard(d);
      setToolStats(t);
      setRatingsData(rat);
      setLoading(false);
    });
  }, [shopId]);

  if (loading) return (
    <DashboardLayout>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1,2,3,4].map(i => <Card key={i} className="h-28 animate-pulse bg-muted" />)}
      </div>
    </DashboardLayout>
  );

  const revenueData = (dashboard?.revenueByPeriod || []).map((r: any) => ({
    ...r, date: shortDate(r.date),
    revenueM: Math.round(r.revenue / 1000),
  }));

  const toolStatusData = [
    { name: "Mavjud", value: dashboard?.availableTools || 0, color: "#22c55e" },
    { name: "Ijarada", value: dashboard?.rentedTools || 0, color: "#f97316" },
    { name: "Boshqa", value: Math.max(0, (dashboard?.totalTools || 0) - (dashboard?.availableTools || 0) - (dashboard?.rentedTools || 0)), color: "#94a3b8" },
  ].filter(d => d.value > 0);

  const ratingDistrib = [5,4,3,2,1].map(star => ({
    star: `${star}★`,
    count: (ratingsData?.ratings || []).filter((r: any) => r.rating === star).length,
  }));

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-1">Statistika</h1>
        <p className="text-muted-foreground">Do'koningiz ko'rsatkichlari va tahlili</p>
      </div>

      {/* Karta raqamlari */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Jami daromad" value={formatCurrency(dashboard?.totalRevenue || 0)} icon={TrendingUp} color="text-green-600" />
        <StatCard title="Faol ijaralar" value={dashboard?.activeRentals || 0} icon={Clock} color="text-primary" />
        <StatCard title="Jami asboblar" value={dashboard?.totalTools || 0} icon={Package} color="text-blue-600"
          sub={`${dashboard?.availableTools || 0} ta mavjud`} />
        <StatCard title="Muddati o'tgan" value={dashboard?.overdueRentals || 0} icon={AlertTriangle} color="text-destructive" />
      </div>

      {/* Daromad grafigi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              So'ngi 7 kunlik daromad (ming so'm)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [`${v}K so'm`, "Daromad"]} />
                <Line type="monotone" dataKey="revenueM" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4, fill: "#f97316" }} name="Daromad" />
                <Line type="monotone" dataKey="rentals" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Ijaralar" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Asbob holati
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={toolStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {toolStatusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center">
              {toolStatusData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kategoriya + Reyting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Kategoriya bo'yicha asboblar</CardTitle>
          </CardHeader>
          <CardContent>
            {(toolStats?.categoryBreakdown || []).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Ma'lumot yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={toolStats?.categoryBreakdown || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.1)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="totalTools" fill="#f97316" name="Jami" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="totalRentals" fill="#3b82f6" name="Ijarada" radius={[0, 4, 4, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
              Reyting taqsimoti
              <span className="ml-auto text-3xl font-bold text-primary">{ratingsData?.average?.toFixed(1) || "0.0"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ratingDistrib.map(({ star, count }) => {
                const pct = ratingsData?.count ? Math.round(count / ratingsData.count * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-medium">{star}</span>
                    <div className="flex-1 bg-muted rounded-full h-3">
                      <div className="bg-yellow-400 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-sm text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-muted-foreground text-sm mt-4">{ratingsData?.count || 0} ta baho</p>
          </CardContent>
        </Card>
      </div>

      {/* Top asboblar */}
      {(toolStats?.topRentedTools || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eng ko'p ijaraga berilgan asboblar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {toolStats.topRentedTools.map((t: any, i: number) => (
                <div key={t.toolId} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: COLORS[i % COLORS.length] + "33", color: COLORS[i % COLORS.length] }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t.toolName}</p>
                    <p className="text-sm text-muted-foreground">{t.totalRentals} ta ijara</p>
                  </div>
                  <p className="font-bold text-primary">{formatCurrency(t.totalRevenue)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
