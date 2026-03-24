import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Crown, CheckCircle, XCircle, Zap, Star, Building2 } from "lucide-react";

const PLAN_ICONS = [Zap, Star, Crown];
const PLAN_COLORS = ["blue", "orange", "purple"];

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [plans, setPlans] = useState<any[]>([]);
  const [myData, setMyData] = useState<any>({ subscriptions: [], active: null });
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [plR, myR] = await Promise.all([
        fetch(`${base}/api/subscriptions/plans`, { headers: h }),
        fetch(`${base}/api/subscriptions/my`, { headers: h }),
      ]);
      if (plR.ok) setPlans((await plR.json()).plans || []);
      if (myR.ok) setMyData(await myR.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const subscribe = async (planId: number) => {
    setSubscribing(planId);
    try {
      const res = await fetch(`${base}/api/subscriptions/subscribe`, {
        method: "POST", headers: h, body: JSON.stringify({ planId, autoRenew: false })
      });
      const d = await res.json();
      if (res.ok) { toast({ title: d.message || "Obunaga yozildingiz!" }); load(); }
      else toast({ title: d.error || "Xato", variant: "destructive" });
    } finally { setSubscribing(null); }
  };

  const cancel = async () => {
    const res = await fetch(`${base}/api/subscriptions/cancel`, { method: "POST", headers: h });
    const d = await res.json();
    if (res.ok) { toast({ title: d.message }); load(); }
    else toast({ title: d.error || "Xato", variant: "destructive" });
  };

  const active = myData.active;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="text-orange-500" /> Obuna Rejalari</h1>
          <p className="text-gray-500 mt-1">Oylik obuna bilan arzonroq ijaraga oling va ko'proq imkoniyatlardan foydalaning</p>
        </div>

        {/* Aktiv obuna */}
        {active && (
          <Card className="border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{active.plan_name} Obuna — Faol</p>
                    <p className="text-sm text-gray-500">
                      Muddati: <b>{new Date(active.expires_at).toLocaleDateString()}</b> gacha
                      · Ishlatildi: {active.tools_used_count}/{active.max_tools} asbob
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="text-red-500 border-red-200" onClick={cancel}>Bekor qilish</Button>
              </div>
              {/* Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Asbob limiti</span>
                  <span>{active.tools_used_count}/{active.max_tools}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (active.tools_used_count / active.max_tools) * 100)}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejalar */}
        {loading ? <p className="text-gray-400">Yuklanmoqda...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan: any, idx: number) => {
              const Icon = PLAN_ICONS[idx] || Star;
              const color = PLAN_COLORS[idx] || "orange";
              const features = plan.features || {};
              const isCurrentPlan = active?.plan_id === plan.id;
              return (
                <Card key={plan.id} className={`relative border-2 ${isCurrentPlan ? 'border-orange-500' : 'border-gray-200 hover:border-gray-300'} transition-colors`}>
                  {isCurrentPlan && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium">Joriy reja</div>}
                  <CardHeader className="pb-2">
                    <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center mb-2`}>
                      <Icon className={`w-5 h-5 text-${color}-600`} />
                    </div>
                    <CardTitle className="text-xl">{plan.name_uz || plan.name}</CardTitle>
                    <p className="text-3xl font-bold mt-2">{(Number(plan.price) / 1000).toFixed(0)}K <span className="text-sm font-normal text-gray-400">UZS/oy</span></p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {[
                        { key: "max_tools", label: `${plan.max_tools} ta asbob`, ok: true },
                        { key: "max_workers", label: `${plan.max_workers} ishchi`, ok: true },
                        { key: "discount", label: `${features.discount || 0}% chegirma`, ok: (features.discount || 0) > 0 },
                        { key: "priority", label: "Prioritet qo'llab-quvvatlash", ok: features.priority_support },
                        { key: "insurance", label: "Sug'urta kiritilgan", ok: features.insurance },
                      ].map(f => (
                        <div key={f.key} className="flex items-center gap-2 text-sm">
                          {f.ok ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-gray-300 shrink-0" />}
                          <span className={f.ok ? "text-gray-700" : "text-gray-400"}>{f.label}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 mt-2"
                      disabled={isCurrentPlan || !!active || subscribing === plan.id}
                      onClick={() => subscribe(plan.id)}
                    >
                      {subscribing === plan.id ? "Yuklanmoqda..." : isCurrentPlan ? "Joriy reja" : active ? "Boshqa obuna faol" : "Obunaga yozilish"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Obuna tarixi */}
        {myData.subscriptions.length > 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Obuna Tarixi</h2>
            <div className="space-y-2">
              {myData.subscriptions.filter((s: any) => s.id !== active?.id).map((s: any) => (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{s.plan_name}</span>
                      <span className="text-gray-400 text-sm ml-2">{new Date(s.started_at).toLocaleDateString()} — {new Date(s.expires_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{s.status === 'cancelled' ? 'Bekor' : 'Tugagan'}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
