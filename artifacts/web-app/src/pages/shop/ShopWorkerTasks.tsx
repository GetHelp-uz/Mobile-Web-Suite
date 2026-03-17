import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ClipboardCheck, Plus, CheckCircle, Clock, AlertTriangle, User } from "lucide-react";

const PRIORITIES: Record<string, { label: string; color: string }> = {
  low: { label: "Past", color: "bg-gray-100 text-gray-700" },
  normal: { label: "Oddiy", color: "bg-blue-100 text-blue-700" },
  high: { label: "Yuqori", color: "bg-orange-100 text-orange-700" },
  urgent: { label: "Shoshilinch", color: "bg-red-100 text-red-700" },
};

const STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: "Kutilmoqda", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "Bajarilmoqda", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Bajarildi", color: "bg-green-100 text-green-700" },
};

export default function ShopWorkerTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [tasks, setTasks] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", workerId: "", priority: "normal", dueDate: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [tasksR, workersR] = await Promise.all([
        fetch(`${baseUrl}/api/worker-tasks/shop/${shopId}`, { headers: h }),
        fetch(`${baseUrl}/api/shops/${shopId}/workers`, { headers: h }),
      ]);
      const td = await tasksR.json();
      const wd = await workersR.json();
      setTasks(td.tasks || []);
      setWorkers(wd.workers || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const create = async () => {
    try {
      const r = await fetch(`${baseUrl}/api/worker-tasks`, {
        method: "POST", headers: h,
        body: JSON.stringify({ shopId, ...form, workerId: form.workerId ? Number(form.workerId) : null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: "Vazifa yaratildi!" });
      setCreateOpen(false);
      setForm({ title: "", description: "", workerId: "", priority: "normal", dueDate: "" });
      load();
    } catch (err: any) { toast({ title: "Xatolik", description: err.message, variant: "destructive" }); }
  };

  const changeStatus = async (id: number, status: string) => {
    await fetch(`${baseUrl}/api/worker-tasks/${id}/status`, { method: "PATCH", headers: h, body: JSON.stringify({ status }) });
    load();
  };

  const filtered = statusFilter === "all" ? tasks : tasks.filter(t => t.status === statusFilter);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Xodim Vazifalari</h1>
            <p className="text-muted-foreground">Xodimlarga vazifa bering va kuzating</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Vazifa qo'shish</Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {["pending", "in_progress", "completed"].map(s => (
            <Card key={s} className={`cursor-pointer border-2 transition-all ${statusFilter === s ? "border-primary" : "border-transparent"}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{tasks.filter(t => t.status === s).length}</div>
                <div className="text-sm text-muted-foreground">{STATUSES[s].label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Vazifalar</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div> :
              filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Vazifalar topilmadi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(task => (
                    <div key={task.id} className="p-4 border rounded-xl hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITIES[task.priority]?.color}`}>
                              {PRIORITIES[task.priority]?.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUSES[task.status]?.color}`}>
                              {STATUSES[task.status]?.label}
                            </span>
                          </div>
                          <div className="font-medium">{task.title}</div>
                          {task.description && <div className="text-sm text-muted-foreground mt-0.5">{task.description}</div>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {task.worker_name && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {task.worker_name}</span>}
                            {task.due_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString("uz-UZ")}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {task.status !== "in_progress" && task.status !== "completed" && (
                            <Button size="sm" variant="outline" onClick={() => changeStatus(task.id, "in_progress")}>Boshlash</Button>
                          )}
                          {task.status !== "completed" && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => changeStatus(task.id, "completed")}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Bajarildi
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yangi vazifa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Vazifa nomi *</label>
              <Input placeholder="Masalan: Asbobni tekshirish" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Tavsif</label>
              <Textarea placeholder="Batafsil yozing..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Xodim</label>
                <Select value={form.workerId} onValueChange={v => setForm(p => ({ ...p, workerId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Tanlang" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Belgilanmagan</SelectItem>
                    {workers.map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Muhimlik</label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Bajarish muddati</label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
            <Button onClick={create}>Yaratish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
