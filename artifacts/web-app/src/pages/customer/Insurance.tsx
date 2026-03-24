import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertCircle, CheckCircle, Clock, Plus, FileText } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Ko'rib chiqilmoqda", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Tasdiqlandi", color: "bg-blue-100 text-blue-800" },
  rejected: { label: "Rad etildi", color: "bg-red-100 text-red-800" },
  paid: { label: "To'landi", color: "bg-green-100 text-green-800" },
};

export default function InsurancePage() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [policies, setPolicies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rentalId: "", policyId: "", claimAmount: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [polR, clR, rnR] = await Promise.all([
        fetch(`${base}/api/insurance/policies`, { headers: h }),
        fetch(`${base}/api/insurance/my-claims`, { headers: h }),
        fetch(`${base}/api/my-rentals`, { headers: h }),
      ]);
      if (polR.ok) setPolicies((await polR.json()).policies || []);
      if (clR.ok) setClaims((await clR.json()).claims || []);
      if (rnR.ok) setRentals((await rnR.json()).rentals || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitClaim = async () => {
    if (!form.rentalId || !form.claimAmount || !form.description) {
      toast({ title: "Barcha maydonlarni to'ldiring", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/api/insurance/claims`, {
        method: "POST", headers: h,
        body: JSON.stringify({ rentalId: form.rentalId, policyId: form.policyId || undefined, claimAmount: form.claimAmount, description: form.description })
      });
      if (res.ok) {
        toast({ title: "Da'vo yuborildi!", description: "Admin ko'rib chiqadi" });
        setShowForm(false); setForm({ rentalId: "", policyId: "", claimAmount: "", description: "" }); load();
      } else {
        const d = await res.json(); toast({ title: d.error || "Xato", variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="text-orange-500" /> Asbob Sug'urtasi</h1>
            <p className="text-gray-500 mt-1">Ijara davomida shikastlanish va yo'qolishga qarshi himoya</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" /> Da'vo yuborish
          </Button>
        </div>

        {/* Sug'urta rejalari */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Sug'urta Rejalari</h2>
          {loading ? <p className="text-gray-400">Yuklanmoqda...</p> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {policies.map((p: any) => (
                <Card key={p.id} className="border-2 hover:border-orange-400 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-5 h-5 text-orange-500" /> {p.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-gray-500">{p.description}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Qoplash:</span>
                      <span className="font-semibold text-green-600">{p.coverage_percent}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Kunlik to'lov:</span>
                      <span className="font-semibold">{Number(p.daily_rate).toLocaleString()} UZS</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Maks. qoplash:</span>
                      <span className="font-semibold">{(Number(p.max_coverage) / 1000000).toFixed(1)} mln UZS</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Da'vo yuborish shakli */}
        {showForm && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader><CardTitle>Yangi Da'vo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Ijara tanlang</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rentalId} onChange={e => setForm(f => ({ ...f, rentalId: e.target.value }))}>
                  <option value="">-- Ijarani tanlang --</option>
                  {rentals.filter((r: any) => ['active','completed'].includes(r.status)).map((r: any) => (
                    <option key={r.id} value={r.id}>{r.tool_name || `Ijara #${r.id}`} — {new Date(r.started_at).toLocaleDateString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Sug'urta turi (ixtiyoriy)</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.policyId} onChange={e => setForm(f => ({ ...f, policyId: e.target.value }))}>
                  <option value="">-- Sug'urtasiz --</option>
                  {policies.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Zarar miqdori (UZS)</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="500000" value={form.claimAmount} onChange={e => setForm(f => ({ ...f, claimAmount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Hodisani izohlang</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none" placeholder="Nima sodir bo'ldi, qanday shikastlandi..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <Button onClick={submitClaim} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                  {submitting ? "Yuborilmoqda..." : "Da'vo Yuborish"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Bekor qilish</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Da'volar tarixi */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><FileText className="w-5 h-5" /> Da'volar Tarixi</h2>
          {claims.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">Hali da'vo yo'q</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {claims.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium">{c.tool_name || `Ijara #${c.rental_id}`}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_MAP[c.status]?.color}`}>
                            {STATUS_MAP[c.status]?.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{c.description}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-gray-500">Miqdor: <b>{Number(c.claim_amount).toLocaleString()} UZS</b></span>
                          {c.approved_amount && <span className="text-green-600">Qoplandi: <b>{Number(c.approved_amount).toLocaleString()} UZS</b></span>}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
