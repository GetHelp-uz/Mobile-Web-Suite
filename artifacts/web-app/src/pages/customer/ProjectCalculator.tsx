import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Home, Building, Hammer, Leaf, Wrench, ChevronRight, TrendingDown, CheckCircle } from "lucide-react";

const PROJECT_TYPES = [
  { id: "apartment_repair", label: "Kvartira ta'mirlash", icon: Home, color: "orange" },
  { id: "house_construction", label: "Uy qurilishi", icon: Building, color: "blue" },
  { id: "road_work", label: "Yo'l ishlari", icon: Hammer, color: "gray" },
  { id: "landscaping", label: "Obodonlashtirish", icon: Leaf, color: "green" },
  { id: "plumbing", label: "Santexnika", icon: Wrench, color: "teal" },
];

export default function ProjectCalculatorPage() {
  const { toast } = useToast();
  const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ projectType: "", areaM2: "", durationDays: "", region: "" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calc = async () => {
    if (!form.projectType || !form.areaM2 || !form.durationDays) {
      toast({ title: "Barcha maydonlarni to'ldiring", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/calculator/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectType: form.projectType, areaM2: Number(form.areaM2), durationDays: Number(form.durationDays), region: form.region || undefined })
      });
      const d = await res.json();
      if (res.ok) { setResult(d); setStep(3); }
      else toast({ title: d.error || "Xato", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="text-orange-500" /> Loyiha Kalkulyatori</h1>
          <p className="text-gray-500 mt-1">Qurilish loyihangiz uchun kerakli asboblar va narx hisob-kitobini oling</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${step >= s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{s}</div>
              {s < 3 && <ChevronRight className="w-4 h-4 text-gray-300" />}
            </div>
          ))}
          <span className="text-sm text-gray-400 ml-2">{step === 1 ? "Loyiha turi" : step === 2 ? "Parametrlar" : "Natija"}</span>
        </div>

        {/* Step 1: Loyiha turi */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Loyiha turini tanlang</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PROJECT_TYPES.map(pt => {
                  const Icon = pt.icon;
                  return (
                    <button
                      key={pt.id}
                      onClick={() => { setForm(f => ({ ...f, projectType: pt.id })); setStep(2); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all hover:border-orange-400
                        ${form.projectType === pt.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                    >
                      <Icon className="w-8 h-8 text-orange-500 mb-2" />
                      <p className="font-medium text-sm">{pt.label}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Parametrlar */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Loyiha parametrlari</CardTitle>
              <p className="text-sm text-gray-500">Tanlangan: <b>{PROJECT_TYPES.find(p => p.id === form.projectType)?.label}</b></p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Maydon (m²)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" placeholder="100" value={form.areaM2} onChange={e => setForm(f => ({ ...f, areaM2: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Davomiylik (kun)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" placeholder="30" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Hudud (ixtiyoriy)</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                    <option value="">Barcha hududlar</option>
                    {["Toshkent", "Samarqand", "Buxoro", "Farg'ona", "Namangan", "Andijon", "Qashqadaryo"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={calc} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                  {loading ? "Hisoblanmoqda..." : "Hisoblash"}
                </Button>
                <Button variant="outline" onClick={() => { setStep(1); setForm(f => ({ ...f, projectType: "" })); }}>Orqaga</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Natijalar */}
        {step === 3 && result && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Asbob ijarasi", value: `${(result.summary.toolRentalCost / 1000).toFixed(0)}K UZS`, icon: Calculator, color: "orange" },
                { label: "Loyiha narxi (taxm.)", value: `${(result.summary.estimatedProjectCost / 1000000).toFixed(1)} mln`, icon: Building, color: "blue" },
                { label: "Sotib olishga nisbatan tejash", value: `${(result.summary.savingsVsBuying / 1000000).toFixed(1)} mln`, icon: TrendingDown, color: "green" },
                { label: "m² narxi (ijara)", value: `${result.summary.costPerM2.toLocaleString()} UZS`, icon: Home, color: "purple" },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <Card key={i} className={`border-l-4 border-${s.color}-500`}>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className="text-xl font-bold">{s.value}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Asboblar ro'yxati */}
            <Card>
              <CardHeader><CardTitle>Tavsiya Etilgan Asboblar</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.tools.map((t: any, i: number) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${t.available ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.available ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {t.available ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Hammer className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm capitalize">{t.toolName}</p>
                          {t.shopName && <p className="text-xs text-gray-400">{t.shopName}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{t.totalCost.toLocaleString()} UZS</p>
                        <p className="text-xs text-gray-400">{t.quantity} dona × {t.dailyPrice.toLocaleString()} × {result.durationDays} kun</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Maslahatlar */}
            {result.tips?.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader><CardTitle className="text-blue-800 text-base">💡 Foydali Maslahatlar</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.tips.map((tip: string, i: number) => (
                      <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span> {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" onClick={() => { setStep(1); setResult(null); setForm({ projectType: "", areaM2: "", durationDays: "", region: "" }); }}>
              Yangi Hisob-kitob
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
