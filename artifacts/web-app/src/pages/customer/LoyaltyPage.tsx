import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Award, Star, TrendingUp, Gift, Trophy } from "lucide-react";

const LEVELS = [
  { name: "bronze",   label: "Bronza",   minPoints: 0,    color: "#CD7F32", bg: "from-amber-700 to-amber-500" },
  { name: "silver",   label: "Kumush",   minPoints: 500,  color: "#C0C0C0", bg: "from-gray-400 to-gray-300" },
  { name: "gold",     label: "Oltin",    minPoints: 2000, color: "#FFD700", bg: "from-yellow-500 to-yellow-300" },
  { name: "platinum", label: "Platina",  minPoints: 5000, color: "#E5E4E2", bg: "from-slate-400 to-slate-200" },
];

export default function LoyaltyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [data, setData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [myR, lbR] = await Promise.all([
        fetch(`${baseUrl}/api/loyalty/my`, { headers: h }),
        fetch(`${baseUrl}/api/loyalty/leaderboard`, { headers: h }),
      ]);
      const myD = await myR.json();
      const lbD = await lbR.json();
      setData(myD);
      setLeaderboard(lbD.leaderboard || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const redeem = async () => {
    const pts = Number(redeemPoints);
    if (!pts || pts < 50) { toast({ title: "Kamida 50 ball kiriting", variant: "destructive" }); return; }
    try {
      const r = await fetch(`${baseUrl}/api/loyalty/redeem`, { method: "POST", headers: h, body: JSON.stringify({ points: pts }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: "Muvaffaqiyat!", description: `${formatCurrency(d.discountAmount)} chegirma olindi` });
      setRedeemPoints("");
      load();
    } catch (err: any) { toast({ title: "Xatolik", description: err.message, variant: "destructive" }); }
  };

  const currentLevel = LEVELS.find(l => l.name === data?.level?.name) || LEVELS[0];
  const nextLevel = data?.nextLevel ? LEVELS.find(l => l.name === data.nextLevel.name) : null;
  const progress = nextLevel ? Math.min(100, ((data?.points?.lifetime_points || 0) - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints) * 100) : 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Loyallik Dasturi</h1>
          <p className="text-muted-foreground">Har ijara uchun ball to'plang va chegirma oling</p>
        </div>

        {loading ? <div className="text-center py-12 text-muted-foreground">Yuklanmoqda...</div> : !data ? null : (
          <>
            {/* Asosiy karta */}
            <div className={`rounded-2xl bg-gradient-to-br ${currentLevel.bg} p-6 text-white shadow-xl`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-5 w-5" />
                    <span className="font-semibold">{currentLevel.label} daraja</span>
                  </div>
                  <div className="text-5xl font-black mt-2">{data.points?.total_points || 0}</div>
                  <div className="text-sm opacity-80 mt-1">mavjud ball (1 ball = 100 so'm chegirma)</div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-70">Jami to'plangan</div>
                  <div className="text-2xl font-bold">{data.points?.lifetime_points || 0}</div>
                  <div className="text-xs opacity-70">ball</div>
                </div>
              </div>

              {nextLevel && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1 opacity-80">
                    <span>{currentLevel.label}</span>
                    <span>{data.pointsToNext} ball qoldi → {nextLevel.label}</span>
                  </div>
                  <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Qanday ishlaydi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-5 text-center">
                <Gift className="h-10 w-10 mx-auto mb-3 text-primary" />
                <div className="font-semibold">Ball to'plash</div>
                <div className="text-sm text-muted-foreground mt-1">Har 10,000 so'm ijarada 1 ball</div>
              </CardContent></Card>
              <Card><CardContent className="p-5 text-center">
                <Award className="h-10 w-10 mx-auto mb-3 text-yellow-500" />
                <div className="font-semibold">Daraja oshirish</div>
                <div className="text-sm text-muted-foreground mt-1">Bronza → Kumush → Oltin → Platina</div>
              </CardContent></Card>
              <Card><CardContent className="p-5 text-center">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 text-green-500" />
                <div className="font-semibold">Chegirma olish</div>
                <div className="text-sm text-muted-foreground mt-1">50 ball = 5,000 so'm chegirma</div>
              </CardContent></Card>
            </div>

            {/* Ball almashtirish */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /> Ballni chegirmaga almashtirish</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-3 max-w-sm">
                  <Input type="number" placeholder="Necha ball?" min={50} value={redeemPoints} onChange={e => setRedeemPoints(e.target.value)} />
                  <Button onClick={redeem} disabled={!redeemPoints}>Almashtirish</Button>
                </div>
                {redeemPoints && Number(redeemPoints) >= 50 && (
                  <div className="mt-2 text-sm text-green-600 font-medium">
                    {Number(redeemPoints)} ball = {formatCurrency(Number(redeemPoints) * 100)} chegirma
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground">Minimal: 50 ball • Sizda: {data.points?.total_points || 0} ball</div>
              </CardContent>
            </Card>

            {/* Darajalar */}
            <Card>
              <CardHeader><CardTitle>Darajalar</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {LEVELS.map(l => (
                    <div key={l.name} className={`p-4 rounded-xl border-2 text-center transition-all ${l.name === currentLevel.name ? "border-primary shadow-md" : "border-transparent bg-muted/30"}`}>
                      <div className="text-2xl mb-1" style={{ color: l.color }}>
                        <Trophy className={`h-8 w-8 mx-auto ${l.name === currentLevel.name ? "opacity-100" : "opacity-40"}`} />
                      </div>
                      <div className="font-bold">{l.label}</div>
                      <div className="text-xs text-muted-foreground">{l.minPoints}+ ball</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tarix */}
            {data.transactions?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Ball tarixi</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.transactions.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <div className="text-sm font-medium">{t.description}</div>
                          <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("uz-UZ")}</div>
                        </div>
                        <div className={`font-bold ${t.type === "earn" ? "text-green-600" : "text-red-500"}`}>
                          {t.type === "earn" ? "+" : ""}{t.points} ball
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
