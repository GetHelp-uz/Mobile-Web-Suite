import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Star, Wrench, Users, Check } from "lucide-react";

const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
const h = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}`,
});

type Plan = {
  id: number; name: string; name_uz: string; price: number;
  max_tools: number; max_workers: number; features: string[];
  is_active: boolean; created_at: string;
};

const DEFAULT_FEATURES = [
  "QR kod boshqaruvi",
  "SMS bildirishnomalar",
  "Ijara tarixi",
  "Statistika",
  "Ko'p do'kon boshqaruvi",
  "API integratsiya",
];

export default function AdminTariffs() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    nameUz: "", price: "", maxTools: "30", maxWorkers: "3",
    features: [] as string[], isActive: true,
  });

  async function load() {
    setLoading(true);
    const r = await fetch(`${baseUrl}/api/plans`, { headers: h() });
    if (r.ok) { const d = await r.json(); setPlans(d.plans || []); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditPlan(null);
    setForm({ nameUz: "", price: "", maxTools: "30", maxWorkers: "3", features: [], isActive: true });
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditPlan(plan);
    setForm({
      nameUz: plan.name_uz, price: String(plan.price),
      maxTools: String(plan.max_tools), maxWorkers: String(plan.max_workers),
      features: plan.features || [], isActive: plan.is_active,
    });
    setDialogOpen(true);
  }

  async function save() {
    const body = {
      nameUz: form.nameUz, name: form.nameUz,
      price: Number(form.price), maxTools: Number(form.maxTools),
      maxWorkers: Number(form.maxWorkers), features: form.features,
      isActive: form.isActive,
    };
    const url = editPlan ? `${baseUrl}/api/plans/${editPlan.id}` : `${baseUrl}/api/plans`;
    const method = editPlan ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: h(), body: JSON.stringify(body) });
    if (r.ok) {
      toast({ title: editPlan ? "Tarif yangilandi" : "Tarif yaratildi" });
      setDialogOpen(false);
      load();
    } else {
      const e = await r.json();
      toast({ title: "Xato", description: e.error, variant: "destructive" });
    }
  }

  async function toggleActive(plan: Plan) {
    const r = await fetch(`${baseUrl}/api/plans/${plan.id}`, {
      method: "PATCH", headers: h(),
      body: JSON.stringify({ isActive: !plan.is_active }),
    });
    if (r.ok) load();
  }

  function toggleFeature(feature: string) {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  }

  const tiers = [
    { name: "Bepul", price: 0, color: "gray" },
    { name: "Asosiy", price: 99000, color: "blue" },
    { name: "Professional", price: 299000, color: "purple" },
    { name: "Enterprise", price: 599000, color: "amber" },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tarif rejalari</h1>
          <p className="text-muted-foreground text-sm">Do'kon egalariga taklif etiladigan tarif rejalari</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Yangi tarif
        </Button>
      </div>

      {/* Tavsiya qilingan tariflar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {tiers.map((tier, i) => (
          <Card key={i} className={`border-2 ${i === 2 ? "border-purple-400 shadow-lg" : "border-border"}`}>
            {i === 2 && (
              <div className="bg-purple-600 text-white text-xs font-bold text-center py-1 rounded-t-lg">
                ENG MASHHUR
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className={`h-4 w-4 ${i === 0 ? "text-gray-400" : i === 1 ? "text-blue-500" : i === 2 ? "text-purple-600" : "text-amber-500"}`} />
                <span className="font-semibold text-sm">{tier.name}</span>
              </div>
              <p className="text-2xl font-bold mb-1">
                {tier.price === 0 ? "Bepul" : `${tier.price.toLocaleString()} UZS`}
              </p>
              {tier.price > 0 && <p className="text-xs text-muted-foreground">/ oy</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mavjud tariflar */}
      <h2 className="text-lg font-semibold mb-4">Faol tariflar ({plans.length})</h2>
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className={`shadow-sm ${!plan.is_active ? "opacity-60" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name_uz}</CardTitle>
                  <Badge variant={plan.is_active ? "default" : "secondary"}>
                    {plan.is_active ? "Faol" : "Faol emas"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-3">
                  {plan.price === 0 ? "Bepul" : `${plan.price.toLocaleString()} UZS`}
                  {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/oy</span>}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-blue-500" />
                    <span>{plan.max_tools} asbob</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-green-500" />
                    <span>{plan.max_workers} hodim</span>
                  </div>
                </div>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-1 mb-4">
                    {plan.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-xs text-muted-foreground">+{plan.features.length - 3} ta xususiyat</li>
                    )}
                  </ul>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() => toggleActive(plan)}
                    />
                    <span className="text-xs text-muted-foreground">Faol</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(plan)}>
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Tahrirlash
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {plans.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Hali tarif rejalari yo'q</p>
              <Button onClick={openCreate} className="mt-3">Birinchi tarif yaratish</Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPlan ? "Tarifni tahrirlash" : "Yangi tarif yaratish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tarif nomi (o'zbek tilida)</Label>
              <Input value={form.nameUz} onChange={e => setForm({ ...form, nameUz: e.target.value })} placeholder="Masalan: Professional" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Narx (UZS/oy)</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>Max asbob</Label>
                <Input type="number" value={form.maxTools} onChange={e => setForm({ ...form, maxTools: e.target.value })} />
              </div>
              <div>
                <Label>Max hodim</Label>
                <Input type="number" value={form.maxWorkers} onChange={e => setForm({ ...form, maxWorkers: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Xususiyatlar</Label>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_FEATURES.map(feature => (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => toggleFeature(feature)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-colors ${
                      form.features.includes(feature)
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Check className={`h-3 w-3 flex-shrink-0 ${form.features.includes(feature) ? "text-primary" : "text-transparent"}`} />
                    {feature}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
              <Label>Faol (ko'rinadigan)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={save}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
