import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Tag, Plus, Copy, CheckCircle, XCircle } from "lucide-react";

export default function ShopPromoCodes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ code: "", discountType: "percent", discountValue: "10", minAmount: "", maxUses: "100", expiresAt: "" });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/promo-codes/shop/${shopId}`, { headers: h });
      const d = await r.json();
      setCodes(d.codes || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const create = async () => {
    try {
      const r = await fetch(`${baseUrl}/api/promo-codes`, {
        method: "POST", headers: h,
        body: JSON.stringify({ shopId, ...form, discountValue: Number(form.discountValue), minAmount: Number(form.minAmount) || 0, maxUses: Number(form.maxUses) || 100 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: "Yaratildi!", description: `Promo kod: ${d.code?.code}` });
      setCreateOpen(false);
      setForm({ code: "", discountType: "percent", discountValue: "10", minAmount: "", maxUses: "100", expiresAt: "" });
      load();
    } catch (err: any) { toast({ title: "Xatolik", description: err.message, variant: "destructive" }); }
  };

  const toggle = async (id: number, isActive: boolean) => {
    await fetch(`${baseUrl}/api/promo-codes/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ isActive: !isActive }) });
    load();
  };

  const remove = async (id: number) => {
    await fetch(`${baseUrl}/api/promo-codes/${id}`, { method: "DELETE", headers: h });
    toast({ title: "O'chirildi" });
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Nusxalandi!", description: code });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Promo Kodlar</h1>
            <p className="text-muted-foreground">Chegirma kodlarini yarating va boshqaring</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Yangi kod
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-primary">{codes.length}</div><div className="text-sm text-muted-foreground">Jami kodlar</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-green-600">{codes.filter(c => c.is_active).length}</div><div className="text-sm text-muted-foreground">Faol</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-blue-600">{codes.reduce((s, c) => s + (c.used_count || 0), 0)}</div><div className="text-sm text-muted-foreground">Jami foydalanilgan</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Kodlar ro'yxati</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div> :
              codes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Hali promo kod yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {codes.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 rounded-lg px-4 py-2 font-mono font-bold text-primary text-lg tracking-wider">{c.code}</div>
                        <div>
                          <div className="font-medium">
                            {c.discount_type === "percent" ? `${c.discount_value}% chegirma` : `${formatCurrency(c.discount_value)} chegirma`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {c.min_amount > 0 && `Min: ${formatCurrency(c.min_amount)} • `}
                            {c.used_count}/{c.max_uses} marta ishlatilgan
                            {c.expires_at && ` • ${new Date(c.expires_at).toLocaleDateString("uz-UZ")} gacha`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Faol" : "Nofaol"}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => copyCode(c.code)}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => toggle(c.id, c.is_active)}>
                          {c.is_active ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => remove(c.id)}>O'ch</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yangi promo kod</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Kod (bo'sh qoldirsangiz avtomatik yaratiladi)</label>
              <Input placeholder="YOZGI20" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Chegirma turi</label>
                <Select value={form.discountType} onValueChange={v => setForm(p => ({ ...p, discountType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Foizda (%)</SelectItem>
                    <SelectItem value="fixed">Qo'shaloq (so'm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Qiymat</label>
                <Input type="number" placeholder={form.discountType === "percent" ? "10" : "50000"} value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Min summa (so'm)</label>
                <Input type="number" placeholder="0" value={form.minAmount} onChange={e => setForm(p => ({ ...p, minAmount: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Maks foydalanish</label>
                <Input type="number" value={form.maxUses} onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Muddati tugash sanasi</label>
              <Input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
            <Button onClick={create}>Yaratish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
