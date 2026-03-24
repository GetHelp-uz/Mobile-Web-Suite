import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, CheckCircle, Clock, FileText, TrendingUp, Users, DollarSign } from "lucide-react";

export default function AdminB2BPage() {
  const { toast } = useToast();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}` };
  const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [tab, setTab] = useState<"clients" | "contracts">("clients");
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<number | null>(null);
  const [verifyForm, setVerifyForm] = useState<{ id: number; discount: string; credit: string; days: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cR, cnR, sR] = await Promise.all([
        fetch(`${base}/api/b2b/clients`, { headers: h }),
        fetch(`${base}/api/b2b/contracts`, { headers: h }),
        fetch(`${base}/api/b2b/stats`, { headers: h }),
      ]);
      if (cR.ok) setClients((await cR.json()).clients || []);
      if (cnR.ok) setContracts((await cnR.json()).contracts || []);
      if (sR.ok) setStats((await sR.json()).stats);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const verify = async () => {
    if (!verifyForm) return;
    setVerifying(verifyForm.id);
    try {
      const res = await fetch(`${base}/api/b2b/clients/${verifyForm.id}/verify`, {
        method: "PATCH", headers: h,
        body: JSON.stringify({ discountPercent: verifyForm.discount, creditLimit: verifyForm.credit, paymentTermDays: verifyForm.days })
      });
      if (res.ok) { toast({ title: "Tasdiqlandi!" }); setVerifyForm(null); load(); }
      else toast({ title: "Xato", variant: "destructive" });
    } finally { setVerifying(null); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="text-orange-500" /> B2B Boshqaruv</h1>
          <p className="text-gray-500 mt-1">Korporativ klientlar va shartnomalar</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Jami klientlar", value: stats.total_clients, icon: Users, color: "blue" },
              { label: "Tasdiqlangan", value: stats.verified_clients, icon: CheckCircle, color: "green" },
              { label: "Faol shartnomalar", value: stats.active_contracts, icon: FileText, color: "orange" },
              { label: "Oylik limit", value: `${(Number(stats.total_monthly_limit) / 1000000).toFixed(1)} mln`, icon: DollarSign, color: "purple" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${s.color}-600`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{s.label}</p>
                      <p className="text-xl font-bold">{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {(["clients", "contracts"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === "clients" ? "Klientlar" : "Shartnomalar"}
            </button>
          ))}
        </div>

        {loading ? <p className="text-gray-400">Yuklanmoqda...</p> : tab === "clients" ? (
          <div className="space-y-3">
            {clients.length === 0 ? <p className="text-gray-400 text-center py-8">Klientlar yo'q</p> : clients.map((c: any) => (
              <Card key={c.id} className={`border-l-4 ${c.is_verified ? 'border-l-green-400' : 'border-l-yellow-400'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{c.company_name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {c.is_verified ? "Tasdiqlangan" : "Kutilmoqda"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-500">
                        <span>👤 {c.contact_person}</span>
                        <span>📞 {c.contact_phone}</span>
                        {c.company_inn && <span>INN: {c.company_inn}</span>}
                        {c.is_verified && <span>💰 {c.discount_percent}% chegirma</span>}
                      </div>
                    </div>
                    {!c.is_verified && (
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 ml-4" onClick={() => setVerifyForm({ id: c.id, discount: "5", credit: "1000000", days: "30" })}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Tasdiqlash
                      </Button>
                    )}
                  </div>
                  {/* Verify inline form */}
                  {verifyForm?.id === c.id && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium block mb-1">Chegirma (%)</label>
                        <input type="number" className="w-full border rounded-lg px-2 py-1.5 text-sm" value={verifyForm?.discount ?? ""} onChange={e => setVerifyForm(f => f ? { ...f, discount: e.target.value } : null)} />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1">Kredit limit (UZS)</label>
                        <input type="number" className="w-full border rounded-lg px-2 py-1.5 text-sm" value={verifyForm?.credit ?? ""} onChange={e => setVerifyForm(f => f ? { ...f, credit: e.target.value } : null)} />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1">To'lov muddati (kun)</label>
                        <input type="number" className="w-full border rounded-lg px-2 py-1.5 text-sm" value={verifyForm?.days ?? ""} onChange={e => setVerifyForm(f => f ? { ...f, days: e.target.value } : null)} />
                      </div>
                      <div className="col-span-3 flex gap-2">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={verify} disabled={verifying === c.id}>{verifying === c.id ? "..." : "Tasdiqlash"}</Button>
                        <Button size="sm" variant="outline" onClick={() => setVerifyForm(null)}>Bekor</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.length === 0 ? <p className="text-gray-400 text-center py-8">Shartnomalar yo'q</p> : contracts.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium font-mono text-sm">{c.contract_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.status === 'active' ? 'Faol' : 'Tugagan'}</span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>🏢 {c.company_name}</span>
                      <span>🏪 {c.shop_name}</span>
                      <span>📅 {c.start_date} — {c.end_date}</span>
                      {c.monthly_limit && <span>💰 {Number(c.monthly_limit).toLocaleString()} UZS/oy</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
