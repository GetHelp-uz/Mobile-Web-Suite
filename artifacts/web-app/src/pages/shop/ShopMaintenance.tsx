import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Wrench, Plus, AlertTriangle, CheckCircle, Clock, Calendar } from "lucide-react";

const TYPES = [
  { value: "routine",    label: "Muntazam texnik ko'rik" },
  { value: "repair",     label: "Ta'mirlash" },
  { value: "cleaning",   label: "Tozalash" },
  { value: "inspection", label: "Ko'rik" },
  { value: "parts",      label: "Qismlarni almashtirish" },
];

export default function ShopMaintenance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [logs, setLogs] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    toolId: "", type: "routine", description: "", cost: "", nextServiceDate: "", status: "completed"
  });

  const load = async () => {
    setLoading(true);
    try {
      const [logsR, toolsR] = await Promise.all([
        fetch(`/api/maintenance/shop/${shopId}`, { headers: h }),
        fetch(`/api/shops/${shopId}/tools?limit=100`, { headers: h }),
      ]);
      const logsD = await logsR.json();
      const toolsD = await toolsR.json();
      setLogs(logsD.logs || []);
      setUpcoming(logsD.upcomingService || []);
      setTools(toolsD.tools || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.toolId || !form.description) {
      toast({ title: "Xatolik", description: "Asbob va tavsif kerak", variant: "destructive" }); return;
    }
    const r = await fetch("/api/maintenance", {
      method: "POST", headers: h,
      body: JSON.stringify({
        toolId: Number(form.toolId), shopId,
        type: form.type, description: form.description,
        cost: Number(form.cost) || 0,
        nextServiceDate: form.nextServiceDate || undefined,
        status: form.status,
      }),
    });
    const d = await r.json();
    if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
    toast({ title: "Yozuv qo'shildi" });
    setCreateOpen(false);
    setForm({ toolId: "", type: "routine", description: "", cost: "", nextServiceDate: "", status: "completed" });
    load();
  };

  const totalCost = logs.reduce((s, l) => s + (l.cost || 0), 0);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-1">Texnik xizmat jurnali</h1>
          <p className="text-muted-foreground">Asboblarning ta'mir va texnik ko'rik tarixi</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={18}/> Yozuv qo'shish
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-1">Jami yozuvlar</p>
          <p className="text-3xl font-bold">{logs.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-1">Jami xarajat</p>
          <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-1">Ta'mirda</p>
          <p className="text-3xl font-bold text-red-600">{tools.filter(t => t.status === "maintenance").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-1">Yaqin xizmat</p>
          <p className={`text-3xl font-bold ${upcoming.length > 0 ? "text-orange-500" : ""}`}>{upcoming.length}</p>
        </CardContent></Card>
      </div>

      {/* Yaqin xizmat eslatmalari */}
      {upcoming.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertTriangle size={20}/> 7 kun ichida texnik xizmat kerak
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {upcoming.map((u: any) => (
              <div key={u.id} className="bg-white border border-orange-200 rounded-lg px-4 py-2 text-sm">
                <span className="font-semibold">{u.tool_name}</span>
                <span className="text-orange-600 ml-2">{new Date(u.next_service_date).toLocaleDateString("uz-UZ")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Jurnalni ro'yxat */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-20 rounded-xl bg-muted animate-pulse"/>)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Wrench size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-xl font-semibold">Yozuvlar yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <Card key={log.id}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${log.status === "completed" ? "bg-green-100" : "bg-yellow-100"}`}>
                  {log.status === "completed" ? <CheckCircle size={20} className="text-green-600"/> : <Clock size={20} className="text-yellow-600"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold">{log.tool_name}</span>
                    <Badge variant="outline" className="text-xs">{TYPES.find(t=>t.value===log.type)?.label || log.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.description}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{new Date(log.created_at).toLocaleDateString("uz-UZ")}</span>
                    {log.performed_by_name && <span>Bajaruvchi: {log.performed_by_name}</span>}
                    {log.next_service_date && (
                      <span className="flex items-center gap-1 text-orange-600">
                        <Calendar size={12}/> Keyingi: {new Date(log.next_service_date).toLocaleDateString("uz-UZ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {log.cost > 0 && <p className="font-bold text-red-600">{formatCurrency(log.cost)}</p>}
                  <p className="text-xs text-muted-foreground">{log.status === "completed" ? "Bajarildi" : "Jarayonda"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Yozuv qo'shish dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wrench size={18}/> Texnik xizmat yozuvi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Asbob *</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.toolId} onChange={e => setForm(f => ({ ...f, toolId: e.target.value }))} required>
                <option value="">Asbobni tanlang...</option>
                {tools.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status === "maintenance" ? "Ta'mirda" : "Mavjud"})</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Turi *</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Tavsif *</label>
              <Input placeholder="Bajarilgan ishlar haqida..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Xarajat (UZS)</label>
                <Input type="number" placeholder="50000" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} min="0"/>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Keyingi xizmat sanasi</label>
                <Input type="date" value={form.nextServiceDate} onChange={e => setForm(f => ({ ...f, nextServiceDate: e.target.value }))}/>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Holat</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="completed">Bajarildi (asbob mavjud)</option>
                <option value="in_progress">Jarayonda (asbob ta'mirda)</option>
              </select>
            </div>
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
