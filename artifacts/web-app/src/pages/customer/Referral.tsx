import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Users, Gift, Copy, Check, Trophy, TrendingUp, Share2 } from "lucide-react";

export default function ReferralPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [data, setData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [myR, lbR] = await Promise.all([
        fetch("/api/referrals/my", { headers: h }),
        fetch("/api/referrals/leaderboard"),
      ]);
      const myD = await myR.json();
      const lbD = await lbR.json();
      setData(myD);
      setLeaderboard(lbD.leaderboard || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const copyCode = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Nusxalandi!", description: `${data.referralCode} kod nusxalandi` });
  };

  const shareLink = () => {
    const text = `ToolRent — qurilish asboblari ijarasi! Qo'shiling va mening kodimdan foydalaning: ${data?.referralCode}. Har ikkovingiz 20,000 so'm bonus olasiz!`;
    if (navigator.share) {
      navigator.share({ title: "ToolRent", text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Havola nusxalandi!" });
    }
  };

  const handleApply = async () => {
    if (!applyCode.trim()) return;
    setApplying(true);
    try {
      const r = await fetch("/api/referrals/apply", {
        method: "POST", headers: h,
        body: JSON.stringify({ referralCode: applyCode.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Muvaffaqiyatli!", description: d.message });
      setApplyCode("");
      load();
    } finally { setApplying(false); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">{[...Array(3)].map((_,i)=><div key={i} className="h-32 rounded-xl bg-muted animate-pulse"/>)}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">Referal dasturi</h1>
        <p className="text-muted-foreground">Do'stlaringizni taklif qiling va har biri uchun 20,000 so'm bonus oling!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Referal kodi */}
        <Card className="md:col-span-2 bg-gradient-to-br from-purple-600 to-indigo-600 text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4"/>
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Gift size={24}/>
              </div>
              <span className="text-white/80 font-medium">Sizning referal kodingiz</span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 bg-white/20 rounded-xl px-6 py-4 font-mono text-3xl font-bold tracking-widest text-center">
                {data?.referralCode || "—"}
              </div>
              <Button onClick={copyCode} className="bg-white/20 hover:bg-white/30 border-0 gap-2">
                {copied ? <Check size={18}/> : <Copy size={18}/>}
                {copied ? "Nusxalandi!" : "Nusxalash"}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={shareLink} className="bg-white/20 hover:bg-white/30 border-0 gap-2">
                <Share2 size={16}/> Ulashish
              </Button>
              <div className="text-sm text-white/70">
                Har bir yangi foydalanuvchi uchun <strong className="text-white">20,000 so'm</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistika */}
        <div className="grid grid-rows-2 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users size={24} className="text-purple-600"/>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taklif qilindi</p>
                <p className="text-2xl font-bold">{data?.rewards?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp size={24} className="text-green-600"/>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jami bonus</p>
                <p className="text-2xl font-bold">{formatCurrency(data?.totalEarned || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Boshqa kod qo'llash */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gift size={18}/> Referal kod qo'llash</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Agar kimdir sizni taklif qilgan bo'lsa, uning kodini kiriting:
            </p>
            <div className="flex gap-2">
              <Input placeholder="Masalan: ab12cd34" value={applyCode} onChange={e => setApplyCode(e.target.value.toLowerCase())} className="font-mono text-base"/>
              <Button onClick={handleApply} disabled={applying || !applyCode.trim()}>
                {applying ? "Tekshirilmoqda..." : "Qo'llash"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Taklif tarixi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users size={18}/> Taklif tarixi</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.rewards?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Hali hech kim taklif qilinmagan</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.rewards.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{r.referred_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("uz-UZ")}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={r.status === "paid" ? "success" as any : "secondary"} className="text-xs">
                        {r.status === "paid" ? "To'landi" : "Kutilmoqda"}
                      </Badge>
                      <p className="text-sm font-bold mt-1">{formatCurrency(r.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy size={18}/> Top referralchilar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((l, idx) => (
                <div key={l.id} className={`flex items-center gap-4 p-3 rounded-xl ${l.id === user?.id ? "bg-primary/5 border border-primary/20" : "hover:bg-secondary/50"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? "bg-yellow-100 text-yellow-700" : idx === 1 ? "bg-gray-200 text-gray-700" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-secondary text-muted-foreground"}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{l.name} {l.id === user?.id && "(Siz)"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{l.referral_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{l.total_referrals} kishi</p>
                    <p className="text-xs text-green-600">{formatCurrency(l.total_earned)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
