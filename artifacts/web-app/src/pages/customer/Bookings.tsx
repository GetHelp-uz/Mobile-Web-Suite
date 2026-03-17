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
import { CalendarCheck, Plus, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Kutilmoqda",   color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed: { label: "Tasdiqlandi",  color: "bg-green-100 text-green-700",  icon: CheckCircle },
  cancelled: { label: "Bekor qilindi",color: "bg-red-100 text-red-700",      icon: XCircle },
  completed: { label: "Bajarildi",    color: "bg-gray-100 text-gray-700",    icon: CheckCircle },
};

export default function BookingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tools, setTools] = useState<any[]>([]);

  const [form, setForm] = useState({
    toolId: "", shopId: "", startDate: "", endDate: "", paymentMethod: "cash", notes: ""
  });

  const isShop = user?.role === "shop_owner";
  const isCustomer = user?.role === "customer";

  const load = async () => {
    setLoading(true);
    try {
      const q = isShop ? `?shopId=${user?.shopId}` : "";
      const r = await fetch(`${baseUrl}/api/bookings${q}`, { headers: h });
      const d = await r.json();
      setBookings(d.bookings || []);
    } finally { setLoading(false); }
  };

  const loadTools = async () => {
    if (!isCustomer) return;
    const r = await fetch(`${baseUrl}/api/tools?limit=100`, { headers: h });
    const d = await r.json();
    setTools(d.tools || []);
  };

  useEffect(() => { load(); loadTools(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.toolId || !form.startDate || !form.endDate) {
      toast({ title: "Xatolik", description: "Barcha maydonlarni to'ldiring", variant: "destructive" }); return;
    }
    const selectedTool = tools.find(t => t.id === Number(form.toolId));
    if (!selectedTool) return;

    const r = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST", headers: h,
      body: JSON.stringify({
        toolId: Number(form.toolId),
        shopId: selectedTool.shopId,
        startDate: form.startDate,
        endDate: form.endDate,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      }),
    });
    const d = await r.json();
    if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
    toast({ title: "Bron qilindi!", description: "Tasdiqlash kutilmoqda" });
    setCreateOpen(false);
    setForm({ toolId: "", shopId: "", startDate: "", endDate: "", paymentMethod: "cash", notes: "" });
    load();
  };

  const handleStatusChange = async (id: number, status: string) => {
    const r = await fetch(`${baseUrl}/api/bookings/${id}/status`, {
      method: "PATCH", headers: h, body: JSON.stringify({ status }),
    });
    if (r.ok) { toast({ title: "Yangilandi" }); load(); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bronni bekor qilasizmi?")) return;
    await fetch(`${baseUrl}/api/bookings/${id}`, { method: "DELETE", headers: h });
    toast({ title: "Bekor qilindi" });
    load();
  };

  const calcDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const diff = new Date(form.endDate).getTime() - new Date(form.startDate).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const selectedTool = tools.find(t => t.id === Number(form.toolId));
  const days = calcDays();
  const totalPreview = selectedTool ? selectedTool.pricePerDay * days : 0;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-1">Bronlar</h1>
          <p className="text-muted-foreground">Asboblarni oldindan band qiling</p>
        </div>
        {isCustomer && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus size={18} /> Bron qilish
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4">{[...Array(4)].map((_,i)=><div key={i} className="h-24 rounded-xl bg-muted animate-pulse"/>)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarCheck size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-xl font-semibold mb-2">Bronlar yo'q</p>
          {isCustomer && <p>Asbobni oldindan band qiling!</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => {
            const sc = statusConfig[b.status] || statusConfig.pending;
            const Icon = sc.icon;
            const startDate = new Date(b.start_date).toLocaleDateString("uz-UZ");
            const endDate = new Date(b.end_date).toLocaleDateString("uz-UZ");
            return (
              <Card key={b.id}>
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CalendarCheck size={24} className="text-primary"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-base">{b.tool_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sc.color} flex items-center gap-1`}>
                        <Icon size={12}/> {sc.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {startDate} — {endDate} ({b.days_count} kun)
                    </p>
                    {b.customer_name && <p className="text-xs text-muted-foreground">Mijoz: {b.customer_name} · {b.customer_phone}</p>}
                    {b.notes && <p className="text-xs text-muted-foreground mt-1">"{b.notes}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold">{formatCurrency(b.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">{b.payment_method?.toUpperCase()}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {isShop && b.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleStatusChange(b.id, "confirmed")}>
                          Tasdiqlash
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleStatusChange(b.id, "cancelled")}>
                          Rad etish
                        </Button>
                      </>
                    )}
                    {(b.status === "pending" || b.status === "confirmed") && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)}>
                        <Trash2 size={16}/>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bron qilish dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarCheck size={20}/> Asbob bron qilish</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Asbob *</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.toolId} onChange={e => setForm(f => ({ ...f, toolId: e.target.value }))} required>
                <option value="">Asbobni tanlang...</option>
                {tools.filter(t => t.status === "available").map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {formatCurrency(t.pricePerDay)}/kun ({t.shopName})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Boshlanish sanasi *</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} min={new Date().toISOString().split("T")[0]} required/>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Tugash sanasi *</label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} min={form.startDate || new Date().toISOString().split("T")[0]} required/>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">To'lov usuli</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="cash">Naqd</option>
                <option value="click">Click</option>
                <option value="payme">Payme</option>
                <option value="paynet">Paynet</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Izoh</label>
              <Input placeholder="Qo'shimcha ma'lumot..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}/>
            </div>
            {totalPreview > 0 && (
              <div className="bg-secondary rounded-xl p-4 flex justify-between items-center">
                <span className="text-muted-foreground">{days} kun × {formatCurrency(selectedTool?.pricePerDay || 0)}</span>
                <span className="text-2xl font-bold">{formatCurrency(totalPreview)}</span>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
              <Button type="submit">Bron qilish</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
