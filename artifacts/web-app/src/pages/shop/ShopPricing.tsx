import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { TrendingUp, Plus, Trash2, Power, PowerOff, Info } from "lucide-react";

const TYPES = [
  { value: "weekend",  label: "Hafta oxiri",   desc: "Shanba va yakshanba",         color: "bg-blue-100 text-blue-700" },
  { value: "seasonal", label: "Mavsumiy",       desc: "Muayyan sana oralig'i",       color: "bg-green-100 text-green-700" },
  { value: "holiday",  label: "Bayram",          desc: "Bayram kunlari",             color: "bg-orange-100 text-orange-700" },
  { value: "peak",     label: "Yuqori talab",    desc: "Ko'p talabga ko'ra",         color: "bg-purple-100 text-purple-700" },
];

const DAYS = [
  { val: "1", label: "Du" }, { val: "2", label: "Se" }, { val: "3", label: "Ch" },
  { val: "4", label: "Pa" }, { val: "5", label: "Ju" }, { val: "6", label: "Sh" }, { val: "7", label: "Ya" },
];

export default function ShopPricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(["6", "7"]);
  const [form, setForm] = useState({
    ruleName: "", type: "weekend", multiplier: "1.2", startDate: "", endDate: ""
  });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/pricing/shop/${shopId}`, { headers: h });
      const d = await r.json();
      setRules(d.rules || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ruleName || !form.multiplier) {
      toast({ title: "Xatolik", description: "Barcha maydonlarni to'ldiring", variant: "destructive" }); return;
    }
    const r = await fetch("/api/pricing", {
      method: "POST", headers: h,
      body: JSON.stringify({
        shopId, ruleName: form.ruleName, type: form.type,
        multiplier: Number(form.multiplier),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        daysOfWeek: selectedDays.join(","),
      }),
    });
    const d = await r.json();
    if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
    toast({ title: "Qoida qo'shildi!" });
    setCreateOpen(false);
    setForm({ ruleName: "", type: "weekend", multiplier: "1.2", startDate: "", endDate: "" });
    load();
  };

  const toggleRule = async (id: number, isActive: boolean) => {
    await fetch(`/api/pricing/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ isActive: !isActive }) });
    load();
  };

  const deleteRule = async (id: number) => {
    if (!confirm("Qoidani o'chirasizmi?")) return;
    await fetch(`/api/pricing/${id}`, { method: "DELETE", headers: h });
    load();
  };

  const percent = (m: number) => m > 1 ? `+${Math.round((m - 1) * 100)}%` : m < 1 ? `-${Math.round((1 - m) * 100)}%` : "0%";

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-1">Narx qoidalari</h1>
          <p className="text-muted-foreground">Hafta oxiri, bayram va mavsumiy narxlarni boshqaring</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={18}/> Qoida qo'shish
        </Button>
      </div>

      {/* Tushuntirish */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5"/>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Narx qoidalari nima?</p>
            <p>Muayyan kunlarda (hafta oxiri, bayramlarda) narxlar avtomatik ko'payadi. Masalan, 1.5x = asosiy narxdan 50% qimmat.</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-20 rounded-xl bg-muted animate-pulse"/>)}</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <TrendingUp size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-xl font-semibold mb-2">Qoidalar yo'q</p>
          <p>Hafta oxiri yoki bayram kunlari uchun narx qoidalari qo'shing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const tc = TYPES.find(t => t.value === rule.type);
            return (
              <Card key={rule.id} className={rule.is_active ? "" : "opacity-60"}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${rule.multiplier >= 1 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {percent(rule.multiplier)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold">{rule.rule_name}</span>
                      <Badge variant="outline" className={`text-xs ${tc?.color}`}>{tc?.label || rule.type}</Badge>
                      {!rule.is_active && <Badge variant="secondary" className="text-xs">Nofaol</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Multiplikator: <strong>{rule.multiplier}x</strong>
                      {rule.days_of_week && ` · Kunlar: ${rule.days_of_week.split(",").map((d: string) => DAYS.find(dd=>dd.val===d)?.label || d).join(", ")}`}
                      {rule.start_date && ` · ${new Date(rule.start_date).toLocaleDateString("uz-UZ")} — ${new Date(rule.end_date).toLocaleDateString("uz-UZ")}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => toggleRule(rule.id, rule.is_active)}>
                      {rule.is_active ? <PowerOff size={16} className="text-red-500"/> : <Power size={16} className="text-green-600"/>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}>
                      <Trash2 size={16} className="text-red-500"/>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Qoida yaratish dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TrendingUp size={18}/> Yangi narx qoidasi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Qoida nomi *</label>
              <Input placeholder="Hafta oxiri narxi, Ramazon aksiyasi..." value={form.ruleName} onChange={e => setForm(f=>({...f, ruleName: e.target.value}))} required/>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Turi *</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setForm(f=>({...f, type: t.value}))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.type === t.value ? "border-primary bg-primary/5" : "border-border"}`}>
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Multiplikator *</label>
              <div className="flex items-center gap-3">
                <Input type="number" step="0.1" min="0.1" max="10" value={form.multiplier} onChange={e => setForm(f=>({...f, multiplier: e.target.value}))} required className="w-28"/>
                <div className="flex-1">
                  {form.multiplier && (
                    <div className="flex gap-2 flex-wrap">
                      {["0.8","1.0","1.2","1.5","2.0"].map(v => (
                        <button key={v} type="button" onClick={() => setForm(f=>({...f, multiplier: v}))}
                          className={`px-3 py-1 rounded-lg text-sm border ${form.multiplier === v ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                          {v}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {form.multiplier && Number(form.multiplier) !== 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  100,000 so'm asosiy narx → {Math.round(100000 * Number(form.multiplier)).toLocaleString()} so'm
                </p>
              )}
            </div>
            {form.type === "weekend" && (
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Kunlar</label>
                <div className="flex gap-2">
                  {DAYS.map(d => (
                    <button key={d.val} type="button" onClick={() => {
                      setSelectedDays(prev => prev.includes(d.val) ? prev.filter(x=>x!==d.val) : [...prev, d.val]);
                    }} className={`w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all ${selectedDays.includes(d.val) ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {["seasonal","holiday"].includes(form.type) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Boshlanish</label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f=>({...f, startDate: e.target.value}))}/>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Tugash</label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f=>({...f, endDate: e.target.value}))}/>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
              <Button type="submit">Saqlash</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
