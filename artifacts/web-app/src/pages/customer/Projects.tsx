import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { FolderOpen, Plus, CheckCircle, Clock, MapPin, Wrench } from "lucide-react";

const statusConf: Record<string, { label: string; color: string }> = {
  active:    { label: "Faol",       color: "bg-green-100 text-green-700"  },
  paused:    { label: "To'xtatildi",color: "bg-yellow-100 text-yellow-700"},
  completed: { label: "Tugallandi", color: "bg-gray-100 text-gray-600"    },
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<any>(null);
  const [detailRentals, setDetailRentals] = useState<any[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [shops, setShops] = useState<any[]>([]);

  const [form, setForm] = useState({ name: "", shopId: "", description: "", location: "" });

  const isShop = user?.role === "shop_owner";

  const load = async () => {
    setLoading(true);
    const q = isShop ? `?shopId=${user?.shopId}` : "";
    try {
      const r = await fetch(`/api/projects${q}`, { headers: h });
      const d = await r.json();
      setProjects(d.projects || []);
    } finally { setLoading(false); }
  };

  const loadShops = async () => {
    const r = await fetch("/api/shops?limit=100", { headers: h });
    const d = await r.json();
    setShops(d.shops || []);
  };

  useEffect(() => { load(); loadShops(); }, []);

  const openDetail = async (p: any) => {
    setDetailProject(p);
    setDetailOpen(true);
    const r = await fetch(`/api/projects/${p.id}`, { headers: h });
    const d = await r.json();
    setDetailRentals(d.rentals || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/projects", {
      method: "POST", headers: h,
      body: JSON.stringify({ name: form.name, shopId: Number(form.shopId), description: form.description, location: form.location }),
    });
    const d = await r.json();
    if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
    toast({ title: "Loyiha yaratildi!" });
    setCreateOpen(false);
    setForm({ name: "", shopId: "", description: "", location: "" });
    load();
  };

  const complete = async (id: number) => {
    await fetch(`/api/projects/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ status: "completed" }) });
    toast({ title: "Loyiha tugallandi!" });
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-1">Loyihalar</h1>
          <p className="text-muted-foreground">Qurilish loyihalaringiz va ijaralar guruhi</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={18}/> Loyiha yaratish
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="p-5 text-center">
          <p className="text-muted-foreground text-sm mb-1">Faol</p>
          <p className="text-3xl font-bold text-green-600">{projects.filter(p=>p.status==="active").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-muted-foreground text-sm mb-1">Tugallandi</p>
          <p className="text-3xl font-bold">{projects.filter(p=>p.status==="completed").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-muted-foreground text-sm mb-1">Jami xarajat</p>
          <p className="text-2xl font-bold">{formatCurrency(projects.reduce((s,p)=>s+(p.actual_total||p.total_amount||0),0))}</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_,i)=><div key={i} className="h-40 rounded-xl bg-muted animate-pulse"/>)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FolderOpen size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-xl font-semibold mb-2">Loyihalar yo'q</p>
          <p>Qurilish loyihangiz uchun yangi loyiha yarating</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const sc = statusConf[p.status] || statusConf.active;
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(p)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FolderOpen size={20} className="text-primary"/>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                  {p.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                  {p.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin size={12}/> {p.location}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Wrench size={14}/>
                      <span>{p.rental_count || 0} ta ijara</span>
                    </div>
                    <span className="font-bold">{formatCurrency(p.actual_total || p.total_amount || 0)}</span>
                  </div>
                  {p.status === "active" && (
                    <Button size="sm" variant="outline" className="w-full mt-3" onClick={e => { e.stopPropagation(); complete(p.id); }}>
                      <CheckCircle size={14} className="mr-1"/> Tugallash
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Loyiha yaratish */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FolderOpen size={18}/> Yangi loyiha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Loyiha nomi *</label>
              <Input placeholder="5 qavatli turar-joy binosi..." value={form.name} onChange={e => setForm(f=>({...f, name: e.target.value}))} required/>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Do'kon *</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.shopId} onChange={e => setForm(f=>({...f, shopId: e.target.value}))} required>
                <option value="">Do'konni tanlang...</option>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Manzil</label>
              <Input placeholder="Toshkent, Chilonzor t..." value={form.location} onChange={e => setForm(f=>({...f, location: e.target.value}))}/>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Tavsif</label>
              <Input placeholder="Loyiha haqida qisqacha..." value={form.description} onChange={e => setForm(f=>({...f, description: e.target.value}))}/>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
              <Button type="submit">Yaratish</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Loyiha detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FolderOpen size={18}/>{detailProject?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto py-2">
            {detailProject?.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin size={14}/> {detailProject.location}
              </div>
            )}
            <div className="bg-secondary rounded-xl p-4 flex justify-between items-center">
              <span className="text-muted-foreground">Jami xarajat</span>
              <span className="text-2xl font-bold">{formatCurrency(detailProject?.actual_total || 0)}</span>
            </div>
            <h4 className="font-semibold text-sm">Ijaralar ({detailRentals.length})</h4>
            {detailRentals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Hali ijara yo'q</p>
            ) : detailRentals.map(r => (
              <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                <div>
                  <p className="font-semibold">{r.tool_name}</p>
                  <p className="text-muted-foreground">{new Date(r.started_at).toLocaleDateString("uz-UZ")}</p>
                </div>
                <span className="font-bold">{formatCurrency(r.total_amount)}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
