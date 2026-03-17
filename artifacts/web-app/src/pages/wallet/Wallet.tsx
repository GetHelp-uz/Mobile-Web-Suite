import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, TrendingUp,
  CreditCard, Shield, Clock, CheckCircle, XCircle, ExternalLink
} from "lucide-react";

type WalletData = {
  id: number; balance: number; escrow_balance: number; currency: string; is_active: boolean;
};
type Transaction = {
  id: number; amount: number; type: string; provider: string;
  status: string; description: string; balance_after: number; created_at: string;
};

const TX_LABELS: Record<string, string> = {
  topup: "To'ldirish",
  payment: "To'lov",
  deposit_hold: "Depozit ushlab qolindi",
  deposit_release: "Depozit qaytarildi",
  deposit_deduct: "Zarar uchun ushlab qolindi",
  refund: "Qaytarib berildi",
  withdrawal: "Yechib olish",
};

const PROVIDERS = [
  {
    id: "click",
    name: "Click",
    icon: "🔵",
    color: "from-blue-500 to-blue-600",
    desc: "Click Uzbekistan",
  },
  {
    id: "payme",
    name: "Payme",
    icon: "🟢",
    color: "from-emerald-500 to-emerald-600",
    desc: "Payme to'lov tizimi",
  },
  {
    id: "paynet",
    name: "Paynet",
    icon: "🟠",
    color: "from-orange-500 to-orange-600",
    desc: "Paynet to'lov",
  },
];

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

export default function WalletPage() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Topup dialog
  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("click");
  const [topping, setTopping] = useState(false);
  const [payUrl, setPayUrl] = useState("");
  const [referenceId, setReferenceId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/wallet/me`, { headers: h });
      const d = await r.json();
      setWallet(d.wallet);
      setTransactions(d.transactions || []);
    } catch {
      toast({ title: "Xatolik", description: "Hamyon ma'lumotlari yuklanmadi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTopup = async () => {
    if (!amount || Number(amount) < 1000) {
      toast({ title: "Xatolik", description: "Minimal miqdor: 1 000 UZS", variant: "destructive" });
      return;
    }
    if (!phone || phone.length < 9) {
      toast({ title: "Xatolik", description: "To'g'ri telefon raqam kiriting", variant: "destructive" });
      return;
    }
    setTopping(true);
    try {
      const r = await fetch(`${baseUrl}/api/wallet/topup`, {
        method: "POST", headers: h,
        body: JSON.stringify({ amount: Number(amount), provider, phone }),
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
      setPayUrl(d.paymentUrl);
      setReferenceId(d.referenceId || "");
      toast({ title: "To'lov yaratildi!", description: "To'lov sahifasiga o'ting" });
    } finally {
      setTopping(false);
    }
  };

  // Test uchun: to'lovni tasdiqlash
  const confirmTestPayment = async (refId: string) => {
    await fetch(`${baseUrl}/api/wallet/topup/confirm`, {
      method: "POST", headers: h,
      body: JSON.stringify({ referenceId: refId, providerTxId: "TEST_" + Date.now() }),
    });
    toast({ title: "Balans to'ldirildi!" });
    setTopupOpen(false);
    setPayUrl("");
    setAmount("");
    load();
  };

  const txIcon = (type: string, status: string) => {
    if (status === "failed") return <XCircle size={20} className="text-red-500" />;
    if (status === "pending") return <Clock size={20} className="text-yellow-500" />;
    if (["topup", "deposit_release", "refund"].includes(type)) return <ArrowDownLeft size={20} className="text-green-500" />;
    return <ArrowUpRight size={20} className="text-red-500" />;
  };

  const isIncome = (type: string) => ["topup", "deposit_release", "refund"].includes(type);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="h-48 rounded-2xl bg-muted animate-pulse" />
          <div className="h-96 rounded-2xl bg-muted animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Hamyon</h1>
          <p className="text-muted-foreground">Hisobingizni boshqaring va to'lovlar tarixi</p>
        </div>
        <Button onClick={() => setTopupOpen(true)} className="gap-2">
          <Plus size={18} /> Hisobni to'ldirish
        </Button>
      </div>

      {/* Balans kartasi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-2 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground overflow-hidden relative">
          <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute right-12 bottom-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <span className="text-primary-foreground/80 font-medium">GetHelp.uz Hamyon</span>
            </div>
            <p className="text-primary-foreground/70 text-sm mb-2">Asosiy balans</p>
            <p className="text-5xl font-bold font-display mb-6">
              {formatCurrency(wallet?.balance || 0)}
            </p>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-primary-foreground/60 text-xs">Depozitda (escrow)</p>
                <p className="font-semibold">{formatCurrency(wallet?.escrow_balance || 0)}</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <p className="text-primary-foreground/60 text-xs">Umumiy balans</p>
                <p className="font-semibold">{formatCurrency((wallet?.balance || 0) + (wallet?.escrow_balance || 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-rows-2 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jami kirim</p>
                <p className="text-xl font-bold">
                  {formatCurrency(transactions.filter(t => isIncome(t.type) && t.status === "completed").reduce((s, t) => s + t.amount, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Shield size={24} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Depozit (escrow)</p>
                <p className="text-xl font-bold">{formatCurrency(wallet?.escrow_balance || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tranzaksiyalar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>So'nggi tranzaksiyalar</CardTitle>
          <Button variant="ghost" size="sm" onClick={load}>Yangilash</Button>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet size={48} className="mx-auto mb-4 opacity-30" />
              <p>Tranzaksiyalar yo'q. Hisobingizni to'ldiring!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    {txIcon(tx.type, tx.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{TX_LABELS[tx.type] || tx.type}</span>
                      <Badge variant={tx.status === "completed" ? "success" as any : tx.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                        {tx.status === "completed" ? "Bajarildi" : tx.status === "failed" ? "Xatolik" : "Kutilmoqda"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tx.description} · {tx.provider.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString("uz-UZ")}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-base ${isIncome(tx.type) ? "text-green-600" : "text-red-600"}`}>
                      {isIncome(tx.type) ? "+" : "-"}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Balans: {formatCurrency(tx.balance_after)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topup Dialog */}
      <Dialog open={topupOpen} onOpenChange={(v) => { setTopupOpen(v); if (!v) { setPayUrl(""); setAmount(""); setPhone(""); setReferenceId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus size={20} /> Hisobni to'ldirish</DialogTitle>
          </DialogHeader>

          {!payUrl ? (
            <div className="space-y-5 py-2">
              {/* Telefon raqam */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Telefon raqam</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">+998</span>
                  <Input
                    type="tel"
                    placeholder="901234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className="pl-14 h-12"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Ro'yxatdan o'tgandagi telefon raqamingiz</p>
              </div>

              {/* Miqdor */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Miqdor (UZS)</label>
                <Input
                  type="number"
                  placeholder="100000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="text-xl font-bold h-14"
                />
                <div className="flex gap-2 flex-wrap mt-3">
                  {QUICK_AMOUNTS.map(q => (
                    <button key={q} type="button" className="px-3 py-1.5 text-sm rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors font-medium" onClick={() => setAmount(String(q))}>
                      {formatCurrency(q)}
                    </button>
                  ))}
                </div>
              </div>

              {/* To'lov usuli */}
              <div>
                <label className="text-sm font-semibold mb-2 block">To'lov usuli</label>
                <div className="grid grid-cols-3 gap-3">
                  {PROVIDERS.map(p => (
                    <button key={p.id} type="button" onClick={() => setProvider(p.id)} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${provider === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}>
                      <span className="text-2xl">{p.icon}</span>
                      <span className="text-sm font-semibold">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {amount && Number(amount) >= 1000 && (
                <div className="p-4 bg-secondary rounded-xl flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">To'lanadigan summa</span>
                  <span className="text-2xl font-bold">{formatCurrency(Number(amount))}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg mb-1">To'lov havolasi tayyor!</h3>
                <p className="text-muted-foreground text-sm">Quyidagi tugmani bosib to'lov sahifasiga o'ting</p>
              </div>
              <Button asChild className="w-full gap-2">
                <a href={payUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={18} /> {provider.toUpperCase()} orqali to'lash
                </a>
              </Button>
              <div className="border-t pt-4">
                <p className="text-xs text-center text-muted-foreground mb-3">Test rejimida to'lovni tasdiqlash:</p>
                <Button variant="outline" className="w-full" onClick={() => confirmTestPayment(referenceId)}>
                  Test: To'lovni tasdiqlash
                </Button>
              </div>
            </div>
          )}

          {!payUrl && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setTopupOpen(false)}>Bekor</Button>
              <Button onClick={handleTopup} disabled={topping || !amount || Number(amount) < 1000 || phone.length < 9} className="gap-2">
                <CreditCard size={16} /> {topping ? "Tayyorlanmoqda..." : "To'lov yaratish"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
