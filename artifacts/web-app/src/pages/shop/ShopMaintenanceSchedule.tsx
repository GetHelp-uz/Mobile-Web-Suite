import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench, AlertTriangle, CheckCircle, Clock, Settings,
  BarChart2, RefreshCw, Plus,
} from "lucide-react";

type ToolMaintenance = {
  id: number; name: string; category: string; status: string;
  rental_count: number; maintenance_interval: number; last_maintained_at: string | null;
  sinceLastMaint: number; percentageDone: number; isDue: boolean; isWarning: boolean;
  total_maintenance_count: number;
};

type Stats = { total: number; due: number; warning: number; ok: number };

export default function ShopMaintenanceSchedule() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [shopId, setShopId] = useState<number | null>(null);
  const [tools, setTools] = useState<ToolMaintenance[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, due: 0, warning: 0, ok: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "due" | "warning" | "ok">("all");

  // Dialog holat
  const [editTool, setEditTool] = useState<ToolMaintenance | null>(null);
  const [newInterval, setNewInterval] = useState("");
  const [doneDialog, setDoneDialog] = useState<ToolMaintenance | null>(null);
  const [doneDesc, setDoneDesc] = useState("");
  const [doneCost, setDoneCost] = useState("");

  const load = async (sid: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/maintenance/schedule?shopId=${sid}`, { headers: h });
      const d = r.ok ? await r.json() : { tools: [], stats: { total: 0, due: 0, warning: 0, ok: 0 } };
      setTools(d.tools || []);
      setStats(d.stats || { total: 0, due: 0, warning: 0, ok: 0 });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const r = await fetch(`${baseUrl}/api/shops?mine=true`, { headers: h });
      const d = r.ok ? await r.json() : {};
      const shop = d.shops?.[0] || d[0];
      if (shop) { setShopId(shop.id); load(shop.id); }
      else setLoading(false);
    })();
  }, []);

  const handleSetInterval = async () => {
    if (!editTool || !newInterval) return;
    try {
      const r = await fetch(`${baseUrl}/api/maintenance/schedule/${editTool.id}`, {
        method: "PUT", headers: h, body: JSON.stringify({ maintenanceInterval: Number(newInterval) }),
      });
      if (!r.ok) throw new Error("Xatolik");
      toast({ title: "Interval yangilandi!" });
      setEditTool(null);
      load(shopId!);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    }
  };

  const handleMarkDone = async () => {
    if (!doneDialog) return;
    try {
      const r = await fetch(`${baseUrl}/api/maintenance/schedule/${doneDialog.id}/done`, {
        method: "POST", headers: h,
        body: JSON.stringify({ description: doneDesc || "Texnik xizmat bajarildi", cost: Number(doneCost) || 0 }),
      });
      if (!r.ok) throw new Error("Xatolik");
      toast({ title: "Bajarildi!", description: "Texnik xizmat yozildi, asbob holati yangilandi" });
      setDoneDialog(null);
      setDoneDesc("");
      setDoneCost("");
      load(shopId!);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    }
  };

  const filteredTools = tools.filter(t => {
    if (filter === "due")     return t.isDue;
    if (filter === "warning") return t.isWarning;
    if (filter === "ok")      return !t.isDue && !t.isWarning;
    return true;
  });

  const statusBadge = (t: ToolMaintenance) => {
    if (t.isDue)     return <Badge variant="destructive" className="gap-1"><AlertTriangle size={10} /> Texnik xizmat kerak</Badge>;
    if (t.isWarning) return <Badge variant="warning" className="gap-1 bg-yellow-100 text-yellow-800"><Clock size={10} /> Yaqinlashmoqda</Badge>;
    return <Badge variant="success" className="gap-1 bg-green-100 text-green-800"><CheckCircle size={10} /> Yaxshi holat</Badge>;
  };

  if (loading) {
    return <DashboardLayout><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Texnik xizmat jadvali</h1>
          <p className="text-muted-foreground">Asboblarning texnik holati va xizmat vaqtlarini kuzating</p>
        </div>
        <Button variant="outline" onClick={() => shopId && load(shopId)} className="gap-2">
          <RefreshCw size={16} /> Yangilash
        </Button>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { key: "all",     label: "Jami asboblar",       count: stats.total,   color: "bg-blue-100 text-blue-800",   icon: BarChart2 },
          { key: "due",     label: "Xizmat kerak",        count: stats.due,     color: "bg-red-100 text-red-800",     icon: AlertTriangle },
          { key: "warning", label: "Yaqinlashmoqda",      count: stats.warning, color: "bg-yellow-100 text-yellow-800",icon: Clock },
          { key: "ok",      label: "Yaxshi holat",        count: stats.ok,      color: "bg-green-100 text-green-800", icon: CheckCircle },
        ].map(s => (
          <button key={s.key} type="button" onClick={() => setFilter(s.key as any)}
            className={`p-4 rounded-2xl transition-all text-left ${filter === s.key ? "ring-2 ring-primary" : "hover:shadow-md"} ${s.color}`}>
            <s.icon size={20} className="mb-2" />
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm font-medium">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Asboblar ro'yxati */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === "due" ? "Texnik xizmat kerak bo'lgan asboblar" :
             filter === "warning" ? "Tez orada texnik xizmat kerak" :
             filter === "ok" ? "Yaxshi holattagi asboblar" : "Barcha asboblar"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTools.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench size={48} className="mx-auto mb-4 opacity-30" />
              <p>Bu filtr bo'yicha asboblar yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTools.map(tool => (
                <div key={tool.id}
                  className={`p-4 rounded-xl border-2 transition-colors ${
                    tool.isDue ? "border-red-200 bg-red-50" :
                    tool.isWarning ? "border-yellow-200 bg-yellow-50" :
                    "border-border"
                  }`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tool.isDue ? "bg-red-100" : tool.isWarning ? "bg-yellow-100" : "bg-green-100"
                      }`}>
                        <Wrench size={18} className={tool.isDue ? "text-red-600" : tool.isWarning ? "text-yellow-600" : "text-green-600"} />
                      </div>
                      <div>
                        <p className="font-semibold">{tool.name}</p>
                        <p className="text-sm text-muted-foreground">{tool.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(tool)}
                      <Button
                        size="sm" variant="outline" className="gap-1 h-7 text-xs"
                        onClick={() => { setEditTool(tool); setNewInterval(String(tool.maintenance_interval)); }}
                      >
                        <Settings size={12} /> Interval
                      </Button>
                      {(tool.isDue || tool.isWarning) && (
                        <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => setDoneDialog(tool)}>
                          <CheckCircle size={12} /> Bajarildi
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {tool.sinceLastMaint} / {tool.maintenance_interval} ijara
                        {tool.last_maintained_at && ` (so'nggi: ${new Date(tool.last_maintained_at).toLocaleDateString("uz-UZ")})`}
                      </span>
                      <span className="font-semibold">{tool.percentageDone}%</span>
                    </div>
                    <Progress
                      value={tool.percentageDone}
                      className={`h-2 ${tool.isDue ? "[&>div]:bg-red-500" : tool.isWarning ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Jami texnik xizmat: {tool.total_maintenance_count} marta
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interval o'zgartirish dialog */}
      <Dialog open={!!editTool} onOpenChange={v => !v && setEditTool(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Texnik xizmat intervali</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">{editTool?.name}</p>
            <div>
              <Label>Har necha ijaradan keyin tekshirish?</Label>
              <Input
                type="number"
                className="mt-1.5"
                value={newInterval}
                onChange={e => setNewInterval(e.target.value)}
                min={1}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground mt-1">Hozirgi interval: {editTool?.maintenance_interval} ijara</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTool(null)}>Bekor</Button>
            <Button onClick={handleSetInterval}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bajarildi dialog */}
      <Dialog open={!!doneDialog} onOpenChange={v => !v && setDoneDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle size={18} className="text-green-600" /> Texnik xizmat bajarildi</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">{doneDialog?.name}</p>
            <div>
              <Label>Tavsif</Label>
              <Input
                className="mt-1.5"
                value={doneDesc}
                onChange={e => setDoneDesc(e.target.value)}
                placeholder="Nima qilindi (ixtiyoriy)"
              />
            </div>
            <div>
              <Label>Xarajat (UZS)</Label>
              <Input
                type="number"
                className="mt-1.5"
                value={doneCost}
                onChange={e => setDoneCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoneDialog(null)}>Bekor</Button>
            <Button onClick={handleMarkDone} className="gap-2"><CheckCircle size={16} /> Tasdiqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
