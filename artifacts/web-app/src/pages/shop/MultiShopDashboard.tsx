import { useState, useEffect } from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  Building2, TrendingUp, Users, Package, Star,
  ExternalLink, MapPin, Phone, RefreshCw, BarChart2, Plus,
} from "lucide-react";

type Shop = {
  id: number; name: string; address: string; phone: string; region: string;
  is_active: boolean; is_verified: boolean; subscription_status: string;
  logo_url: string | null;
};

type ShopMetrics = {
  shopId: number; totalTools: number; activeRentals: number;
  totalRevenue: number; averageRating: number; ratingCount: number;
};

export default function MultiShopDashboard() {
  const { toast } = useToast();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [shops, setShops] = useState<Shop[]>([]);
  const [metrics, setMetrics] = useState<Record<number, ShopMetrics>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/shops?mine=true", { headers: h });
      const d = await r.json();
      const myShops: Shop[] = d.shops || d || [];
      setShops(myShops);

      // Har bir do'kon uchun analytics yuklaymiz
      const metricsMap: Record<number, ShopMetrics> = {};
      await Promise.all(myShops.map(async (shop) => {
        try {
          const ar = await fetch(`/api/analytics/dashboard?shopId=${shop.id}`, { headers: h });
          if (ar.ok) {
            const ad = await ar.json();
            metricsMap[shop.id] = {
              shopId: shop.id,
              totalTools: ad.totalTools || 0,
              activeRentals: ad.activeRentals || 0,
              totalRevenue: ad.totalRevenue || 0,
              averageRating: ad.averageRating || 0,
              ratingCount: ad.ratingCount || 0,
            };
          }
        } catch { /* ignore */ }
      }));
      setMetrics(metricsMap);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Umumiy ko'rsatkichlar
  const totalRevenue = Object.values(metrics).reduce((s, m) => s + m.totalRevenue, 0);
  const totalTools   = Object.values(metrics).reduce((s, m) => s + m.totalTools, 0);
  const totalRentals = Object.values(metrics).reduce((s, m) => s + m.activeRentals, 0);
  const avgRating    = shops.length
    ? Object.values(metrics).reduce((s, m) => s + m.averageRating, 0) / shops.length
    : 0;

  if (loading) {
    return <DashboardLayout><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Do'konlar tarmog'i</h1>
          <p className="text-muted-foreground">Barcha do'konlaringizni bir joydan boshqaring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw size={16} /> Yangilash
          </Button>
          <Button asChild className="gap-2">
            <Link href="/register-shop"><Plus size={16} /> Yangi do'kon</Link>
          </Button>
        </div>
      </div>

      {/* Umumiy statistika */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Jami do'konlar", value: shops.length, icon: Building2, color: "from-blue-500 to-blue-600" },
          { label: "Jami asboblar",  value: totalTools,   icon: Package,   color: "from-orange-500 to-orange-600" },
          { label: "Faol ijaralar",  value: totalRentals, icon: Users,     color: "from-green-500 to-green-600" },
          { label: "Jami daromad",   value: formatCurrency(totalRevenue), icon: TrendingUp, color: "from-purple-500 to-purple-600" },
        ].map(s => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${s.color} p-4 text-white`}>
                <s.icon size={20} className="mb-2 opacity-80" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm opacity-80">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Do'konlar ro'yxati */}
      {shops.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 size={56} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold mb-2">Do'kon yo'q</p>
            <p className="text-sm mb-4">Hali hech qanday do'kon ro'yxatdan o'tkazilmagan</p>
            <Button asChild><Link href="/register-shop"><Plus size={16} className="mr-2" /> Do'kon qo'shish</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {shops.map(shop => {
            const m = metrics[shop.id];
            return (
              <Card key={shop.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {shop.logo_url
                          ? <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                          : <Building2 size={22} className="text-primary" />
                        }
                      </div>
                      <div>
                        <CardTitle className="text-lg leading-tight">{shop.name}</CardTitle>
                        <div className="flex items-center gap-1 mt-0.5">
                          {shop.is_verified && <Badge variant="success" as any className="text-xs bg-green-100 text-green-700">Tasdiqlangan</Badge>}
                          <Badge variant={shop.is_active ? "success" as any : "secondary"} className={`text-xs ${shop.is_active ? "bg-green-100 text-green-700" : ""}`}>
                            {shop.is_active ? "Faol" : "Nofaol"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{shop.subscription_status}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p className="flex items-center gap-2"><MapPin size={14} /> {shop.address}{shop.region ? `, ${shop.region}` : ""}</p>
                    <p className="flex items-center gap-2"><Phone size={14} /> {shop.phone}</p>
                  </div>

                  {/* Ko'rsatkichlar */}
                  {m ? (
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { label: "Asbob",   value: m.totalTools,    color: "bg-blue-50 text-blue-700" },
                        { label: "Ijara",   value: m.activeRentals, color: "bg-orange-50 text-orange-700" },
                        { label: "Reyting", value: m.averageRating?.toFixed(1) || "0", color: "bg-yellow-50 text-yellow-700" },
                        { label: "Daromad", value: formatCurrency(m.totalRevenue).replace("so'm","").trim(), color: "bg-green-50 text-green-700" },
                      ].map(s => (
                        <div key={s.label} className={`p-2 rounded-xl text-center ${s.color}`}>
                          <p className="text-lg font-bold leading-tight">{s.value}</p>
                          <p className="text-xs opacity-80">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-16 rounded-xl bg-muted animate-pulse mb-4" />
                  )}

                  {/* Havolalar */}
                  <div className="flex gap-2 flex-wrap">
                    <Button asChild size="sm" variant="default" className="gap-1 flex-1">
                      <Link href="/shop"><BarChart2 size={14} /> Boshqaruv</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link href="/shop/tools"><Package size={14} /> Asboblar</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link href={`/shops/${shop.id}`}><ExternalLink size={14} /></Link>
                    </Button>
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
