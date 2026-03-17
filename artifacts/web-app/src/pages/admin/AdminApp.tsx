import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Plus, Edit3, Zap, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Plan = {
  id: number;
  name: string;
  name_uz: string;
  price: number;
  max_tools: number;
  max_workers: number;
  features: string[];
  is_active: boolean;
};

export default function AdminApp() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Partial<Plan> | null>(null);
  const [featuresText, setFeaturesText] = useState("");

  const token = localStorage.getItem("gethelp_token");
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/plans`);
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      toast({ title: "Xatolik", description: "Tariflarni yuklab bo'lmadi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const openEdit = (plan?: Plan) => {
    if (plan) {
      setEditPlan({ ...plan });
      setFeaturesText((plan.features || []).join("\n"));
    } else {
      setEditPlan({ name: "", name_uz: "", price: 0, max_tools: 30, max_workers: 3, is_active: true });
      setFeaturesText("");
    }
    setEditOpen(true);
  };

  const savePlan = async () => {
    if (!editPlan) return;
    const features = featuresText.split("\n").map(f => f.trim()).filter(Boolean);
    const body = { ...editPlan, features };
    try {
      let res;
      if (editPlan.id) {
        res = await fetch(`${baseUrl}/api/plans/${editPlan.id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      } else {
        res = await fetch(`${baseUrl}/api/plans`, { method: "POST", headers, body: JSON.stringify(body) });
      }
      if (!res.ok) {
        const d = await res.json();
        toast({ title: "Xatolik", description: d.error, variant: "destructive" });
        return;
      }
      toast({ title: "Saqlandi!", description: "Tarif muvaffaqiyatli yangilandi" });
      setEditOpen(false);
      loadPlans();
    } catch {
      toast({ title: "Xatolik", description: "Server bilan aloqa yo'q", variant: "destructive" });
    }
  };

  const toggleActive = async (plan: Plan) => {
    try {
      await fetch(`${baseUrl}/api/plans/${plan.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ isActive: !plan.is_active }),
      });
      loadPlans();
    } catch {}
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Ilova Boshqaruvi</h1>
          <p className="text-muted-foreground">Obuna tariflari va platforma sozlamalarini boshqaring</p>
        </div>
        <Button onClick={() => openEdit()} className="gap-2">
          <Plus size={18} /> Yangi tarif
        </Button>
      </div>

      {/* Tariflar */}
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Zap size={24} className="text-accent" /> Obuna Tariflari
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => <Card key={i} className="h-64 animate-pulse bg-muted" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {plans.map((plan, i) => (
            <Card key={plan.id} className={`relative overflow-hidden border-2 ${i === 1 ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'}`}>
              {i === 1 && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary gap-1"><Star size={12} fill="currentColor" /> Mashhur</Badge>
                </div>
              )}
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-display font-bold">{plan.name_uz || plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-4xl font-bold text-primary">{formatCurrency(plan.price)}</span>
                      <span className="text-muted-foreground text-sm">/oy</span>
                    </div>
                  </div>
                  <Badge variant={plan.is_active ? "success" : "secondary"}>
                    {plan.is_active ? "Faol" : "Nofaol"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6 bg-secondary p-3 rounded-xl">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{plan.max_tools >= 9999 ? "∞" : plan.max_tools}</p>
                    <p className="text-xs text-muted-foreground">Asbob</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{plan.max_workers >= 9999 ? "∞" : plan.max_workers}</p>
                    <p className="text-xs text-muted-foreground">Hodim</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {(plan.features || []).map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => openEdit(plan)}>
                    <Edit3 size={16} /> Tahrirlash
                  </Button>
                  <Button
                    variant={plan.is_active ? "destructive" : "default"}
                    className="flex-1"
                    onClick={() => toggleActive(plan)}
                  >
                    {plan.is_active ? "O'chirish" : "Yoqish"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Platform info */}
      <Card>
        <CardHeader>
          <CardTitle>Platforma Ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-secondary rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Platforma versiyasi</p>
              <p className="font-bold text-lg">GetHelp.uz v1.0</p>
            </div>
            <div className="p-4 bg-secondary rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">To'lov tizimlari</p>
              <p className="font-bold text-lg">Click, Payme, Paynet, Naqd</p>
            </div>
            <div className="p-4 bg-secondary rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Platformadagi faol tariflar</p>
              <p className="font-bold text-lg">{plans.filter(p => p.is_active).length} ta tarif</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editPlan?.id ? "Tarifni tahrirlash" : "Yangi tarif qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-1 block">Nomi (o'zbek) *</label>
              <Input value={editPlan?.name_uz || ""} onChange={e => setEditPlan(p => ({ ...p, name_uz: e.target.value, name: e.target.value }))} placeholder="Masalan: Standart" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Narx (so'm/oy) *</label>
              <Input type="number" value={editPlan?.price || ""} onChange={e => setEditPlan(p => ({ ...p, price: Number(e.target.value) }))} placeholder="150000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">Maks. asbob</label>
                <Input type="number" value={editPlan?.max_tools || ""} onChange={e => setEditPlan(p => ({ ...p, max_tools: Number(e.target.value) }))} placeholder="30" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Maks. hodim</label>
                <Input type="number" value={editPlan?.max_workers || ""} onChange={e => setEditPlan(p => ({ ...p, max_workers: Number(e.target.value) }))} placeholder="3" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Xususiyatlar (har qatorda bittadan)</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={featuresText}
                onChange={e => setFeaturesText(e.target.value)}
                placeholder="30 tagacha asbob&#10;3 ta hodim&#10;QR kod boshqaruvi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Bekor qilish</Button>
            <Button onClick={savePlan}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
