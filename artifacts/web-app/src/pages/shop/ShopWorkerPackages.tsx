import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";

export default function ShopWorkerPackagesPage() {
  const { toast } = useToast();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}` };
  const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [packages, setPackages] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ workerId: "", toolId: "", name: "", description: "", dailyPrice: "", workerDailyRate: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [pkgR, wR, tR] = await Promise.all([
        fetch(`${base}/api/worker-packages/shop/my`, { headers: h }),
        fetch(`${base}/api/worker-tasks/workers`, { headers: h }),
        fetch(`${base}/api/tools/my`, { headers: h }),
      ]);
      if (pkgR.ok) setPackages((await pkgR.json()).packages || []);
      if (wR.ok) setWorkers((await wR.json()).workers || []);
      if (tR.ok) setTools((await tR.json()).tools || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.workerId || !form.toolId || !form.name || !form.dailyPrice || !form.workerDailyRate) {
      toast({ title: "Barcha maydonlarni to'ldiring", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${base}/api/worker-packages`, {
        method: "POST", headers: h,
        body: JSON.stringify({ workerId: Number(form.workerId), toolId: Number(form.toolId), name: form.name, description: form.description, dailyPrice: Number(form.dailyPrice), workerDailyRate: Number(form.workerDailyRate) })
      });
      const d = await res.json();
      if (res.ok) { toast({ title: "Paket qo'shildi!" }); setShowForm(false); setForm({ workerId: "", toolId: "", name: "", description: "", dailyPrice: "", workerDailyRate: "" }); load(); }
      else toast({ title: d.error || "Xato", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleAvailable = async (pkg: any) => {
    await fetch(`${base}/api/worker-packages/${pkg.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ isAvailable: !pkg.is_available }) });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    await fetch(`${base}/api/worker-packages/${id}`, { method: "DELETE", headers: h });
    toast({ title: "O'chirildi" }); load();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-orange-500" /> Ishchi + Asbob Paketlari</h1>
            <p className="text-gray-500 mt-1">Mijozlarga usta va asbob birgalikda taklif qiling</p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" /> Yangi Paket</Button>
        </div>

        {loading ? <p className="text-gray-400">Yuklanmoqda...</p> : packages.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 mb-3">Hali paket yo'q</p>
              <Button className="bg-orange-500 hover:bg-orange-600" size="sm" onClick={() => setShowForm(true)}>Paket Qo'shish</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {packages.map((pkg: any) => (
              <Card key={pkg.id} className={`border-l-4 ${pkg.is_available ? 'border-l-green-400' : 'border-l-gray-300'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{pkg.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {pkg.is_available ? "Mavjud" : "Yopiq"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-500">
                        <span>🔧 {pkg.tool_name}</span>
                        <span>👷 {pkg.worker_name}</span>
                        <span>💰 {Number(pkg.daily_price).toLocaleString()} UZS/kun</span>
                        <span>⭐ {Number(pkg.rating || 0).toFixed(1)} ({pkg.rating_count || 0})</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => toggleAvailable(pkg)}>
                        {pkg.is_available ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500" onClick={() => remove(pkg.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Yangi Paket</CardTitle>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Paket nomi *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Masalan: Burg'ulash usta bilan" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Ishchi *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.workerId} onChange={e => setForm(f => ({ ...f, workerId: e.target.value }))}>
                      <option value="">Tanlang</option>
                      {workers.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Asbob *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.toolId} onChange={e => setForm(f => ({ ...f, toolId: e.target.value }))}>
                      <option value="">Tanlang</option>
                      {tools.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Paket narxi (UZS/kun) *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="150000" value={form.dailyPrice} onChange={e => setForm(f => ({ ...f, dailyPrice: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Ishchi stavkasi (UZS/kun) *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="80000" value={form.workerDailyRate} onChange={e => setForm(f => ({ ...f, workerDailyRate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Tavsif</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm h-16 resize-none" placeholder="Paket haqida..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={save} disabled={saving}>{saving ? "Saqlanmoqda..." : "Saqlash"}</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Bekor</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
