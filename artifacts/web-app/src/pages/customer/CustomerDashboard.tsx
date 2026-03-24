import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench, CalendarCheck, Wallet, Star, TrendingUp, Gift,
  ArrowRight, Clock, CheckCircle, ShieldCheck, Crown,
  Calculator, Users, Building2, Users2, Bell, ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

const quickLinks = [
  { label: "Asboblar katalogi", path: "/browse", icon: Wrench, color: "bg-blue-500" },
  { label: "Bronlarim", path: "/bookings", icon: CalendarCheck, color: "bg-purple-500" },
  { label: "Sug'urta", path: "/insurance", icon: ShieldCheck, color: "bg-green-500" },
  { label: "Kalkulyator", path: "/calculator", icon: Calculator, color: "bg-orange-500" },
  { label: "Obuna rejalari", path: "/subscriptions", icon: Crown, color: "bg-yellow-500" },
  { label: "Ustoz + Asbob", path: "/worker-packages", icon: Users, color: "bg-pink-500" },
  { label: "B2B Portal", path: "/b2b", icon: Building2, color: "bg-cyan-500" },
  { label: "Hamshaharlarga", path: "/peer-listings", icon: Users2, color: "bg-indigo-500" },
];

const statusLabels: Record<string, string> = {
  active: "Faol",
  overdue: "Muddati o'tgan",
  returned: "Qaytarilgan",
  pending: "Kutilmoqda",
  completed: "Yakunlandi",
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ wallet: 0, loyalty: 0, activeRentals: 0, totalRentals: 0 });
  const [recentRentals, setRecentRentals] = useState<any[]>([]);
  const [featuredTools, setFeaturedTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [walletRes, rentalsRes, toolsRes] = await Promise.allSettled([
          fetch(`${baseUrl}/api/wallet`, { headers: h }),
          fetch(`${baseUrl}/api/rentals?customerId=${user?.id}&limit=5`, { headers: h }),
          fetch(`${baseUrl}/api/tools?status=available&limit=6&sortBy=rating`, { headers: h }),
        ]);

        if (walletRes.status === "fulfilled" && walletRes.value.ok) {
          const d = await walletRes.value.json();
          setStats(prev => ({ ...prev, wallet: d.balance || 0, loyalty: d.loyaltyPoints || 0 }));
        }

        if (rentalsRes.status === "fulfilled" && rentalsRes.value.ok) {
          const d = await rentalsRes.value.json();
          const rentals = d.rentals || [];
          setRecentRentals(rentals.slice(0, 5));
          const active = rentals.filter((r: any) => r.status === "active" || r.status === "pending").length;
          setStats(prev => ({ ...prev, activeRentals: active, totalRentals: rentals.length }));
        }

        if (toolsRes.status === "fulfilled" && toolsRes.value.ok) {
          const d = await toolsRes.value.json();
          setFeaturedTools((d.tools || []).slice(0, 6));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Xayrli tong" : hour < 17 ? "Xayrli kun" : "Xayrli kech";

  return (
    <DashboardLayout>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-1">
          {greeting}, {user?.fullName?.split(" ")[0] || "Foydalanuvchi"}! 👋
        </h1>
        <p className="text-muted-foreground text-lg">Bugun nima ijaraga olmoqchisiz?</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-primary text-white border-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Wallet size={20} />
              </div>
            </div>
            <p className="text-primary-foreground/70 text-sm font-medium">Hamyon balansi</p>
            <p className="text-2xl font-bold">{loading ? "..." : formatCurrency(stats.wallet)}</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500 text-white border-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Star size={20} />
              </div>
            </div>
            <p className="text-yellow-100 text-sm font-medium">Loyallik ballari</p>
            <p className="text-2xl font-bold">{loading ? "..." : stats.loyalty.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-green-500 text-white border-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Wrench size={20} />
              </div>
            </div>
            <p className="text-green-100 text-sm font-medium">Faol ijaralar</p>
            <p className="text-2xl font-bold">{loading ? "..." : stats.activeRentals}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500 text-white border-none">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </div>
            <p className="text-purple-100 text-sm font-medium">Jami ijaralar</p>
            <p className="text-2xl font-bold">{loading ? "..." : stats.totalRentals}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: quick links + recent rentals */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick links */}
          <div>
            <h2 className="text-xl font-bold mb-4">Tezkor harakatlar</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickLinks.map(link => (
                <Link key={link.path} href={link.path}>
                  <div className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer bg-card">
                    <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
                      <link.icon size={22} />
                    </div>
                    <p className="text-xs font-semibold text-center leading-tight">{link.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent rentals */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">So'nggi ijaralar</h2>
              <Link href="/my-rentals">
                <Button variant="ghost" size="sm" className="gap-1 text-primary">
                  Hammasini ko'rish <ChevronRight size={16} />
                </Button>
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : recentRentals.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Clock size={40} className="mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-semibold mb-1">Hali ijara yo'q</p>
                  <p className="text-muted-foreground text-sm mb-4">Birinchi asbobingizni ijara oling!</p>
                  <Link href="/browse">
                    <Button size="sm">Asboblarni ko'rish</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentRentals.map(r => (
                  <Card key={r.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-2 h-12 rounded-full flex-shrink-0 ${
                        r.status === "active" ? "bg-primary" :
                        r.status === "overdue" ? "bg-destructive" :
                        r.status === "returned" ? "bg-teal-500" : "bg-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{r.toolName}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.startedAt ? format(new Date(r.startedAt), "dd.MM.yyyy") : ""} →{" "}
                          {r.dueDate ? format(new Date(r.dueDate), "dd.MM.yyyy") : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant={
                          r.status === "active" ? "default" :
                          r.status === "overdue" ? "destructive" : "success"
                        } className="text-xs">
                          {statusLabels[r.status] ?? r.status}
                        </Badge>
                        <p className="font-bold text-sm">{formatCurrency(r.totalAmount)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: featured tools */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Mashhur asboblar</h2>
            <Link href="/browse">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                Barchasi <ChevronRight size={16} />
              </Button>
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : featuredTools.length === 0 ? (
            <Card className="border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">Asboblar yo'q</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {featuredTools.map(tool => (
                <Link key={tool.id} href={`/tools/${tool.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img
                          src={tool.imageUrl || `${import.meta.env.BASE_URL}images/placeholder-tool.png`}
                          alt={tool.name}
                          className="max-h-full max-w-full object-contain p-1"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{tool.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tool.shopName || "Do'kon"}</p>
                        <p className="text-primary font-bold text-sm mt-0.5">{formatCurrency(tool.pricePerDay)}<span className="text-xs text-muted-foreground font-normal">/kun</span></p>
                      </div>
                      {tool.status === "available" && (
                        <Badge variant="success" className="text-xs flex-shrink-0">Mavjud</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Promo card */}
          <Card className="mt-4 bg-gradient-to-br from-primary to-primary/80 text-white border-none overflow-hidden">
            <CardContent className="p-5 relative">
              <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <Gift size={28} className="mb-3 relative z-10" />
              <h3 className="font-bold text-base mb-1 relative z-10">Do'st taklif qiling</h3>
              <p className="text-primary-foreground/80 text-sm mb-3 relative z-10">
                Har bir do'st uchun 50 000 so'm bonus oling!
              </p>
              <Link href="/referral">
                <Button size="sm" variant="secondary" className="gap-1.5 relative z-10">
                  Referal kodni ko'rish <ArrowRight size={14} />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
