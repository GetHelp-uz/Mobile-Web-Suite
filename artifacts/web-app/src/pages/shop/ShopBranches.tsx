import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Building2, Plus, MapPin, Phone, User, Star, Edit, Trash2, CheckCircle } from "lucide-react";

const TOSHKENT_DISTRICTS = [
  "Yunusobod", "Mirzo Ulug'bek", "Chilonzor", "Sergeli", "Uchtepa",
  "Olmazor", "Yakkasaray", "Bektemir", "Mirobod", "Shayxontohur",
  "Hamza", "Yashnobod"
];

export default function ShopBranches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("tool_rent_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", address: "", lat: "", lng: "", phone: "", managerName: "", isMain: false
  });

  const load = async () => {
    setLoading(true);
    const r = await fetch(`${baseUrl}/api/branches/shop/${shopId}`, { headers: h });
    const d = await r.json();
    setBranches(d.branches || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopId]);

  const openAdd = () => {
    setEditBranch(null);
    setForm({ name: "", address: "", lat: "", lng: "", phone: "", managerName: "", isMain: false });
    setAddOpen(true);
  };

  const openEdit = (b: any) => {
    setEditBranch(b);
    setForm({
      name: b.name, address: b.address,
      lat: b.lat || "", lng: b.lng || "",
      phone: b.phone || "", managerName: b.manager_name || "", isMain: b.is_main
    });
    setAddOpen(true);
  };

  const save = async () => {
    try {
      const body = { shopId, ...form, lat: form.lat ? Number(form.lat) : null, lng: form.lng ? Number(form.lng) : null };
      const r = editBranch
        ? await fetch(`${baseUrl}/api/branches/${editBranch.id}`, { method: "PATCH", headers: h, body: JSON.stringify(body) })
        : await fetch(`${baseUrl}/api/branches`, { method: "POST", headers: h, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: editBranch ? "Yangilandi!" : "Filial qo'shildi!" });
      setAddOpen(false);
      load();
    } catch (err: any) { toast({ title: "Xatolik", description: err.message, variant: "destructive" }); }
  };

  const deleteBranch = async (id: number) => {
    if (!confirm("Filiani o'chirishni tasdiqlaysizmi?")) return;
    await fetch(`${baseUrl}/api/branches/${id}`, { method: "DELETE", headers: h });
    toast({ title: "Filial o'chirildi" });
    load();
  };

  const setMain = async (id: number) => {
    await fetch(`${baseUrl}/api/branches/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ isMain: true }) });
    toast({ title: "Asosiy filial o'rnatildi" });
    load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> Filiallar boshqaruvi
            </h1>
            <p className="text-muted-foreground">Do'koningizning barcha manzillari va filiallarini boshqaring</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Yangi filial</Button>
        </div>

        {/* Statistika */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-700">{branches.length}</div>
              <div className="text-sm text-blue-600">Jami filiallar</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-700">
                {branches.reduce((acc, b) => acc + Number(b.tool_count || 0), 0)}
              </div>
              <div className="text-sm text-green-600">Jami asboblar</div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-700">
                {branches.filter(b => b.is_main).length > 0 ? "1" : "0"}
              </div>
              <div className="text-sm text-orange-600">Asosiy filial</div>
            </CardContent>
          </Card>
        </div>

        {/* Filiallar ro'yxati */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Yuklanmoqda...</div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg text-muted-foreground">Hali filial yo'q</p>
            <p className="text-sm text-muted-foreground mt-1">Birinchi filialini qo'shing</p>
            <Button className="mt-4" onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Filial qo'shish</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map(b => (
              <Card key={b.id} className={`relative overflow-hidden transition-all hover:shadow-md ${b.is_main ? "border-primary border-2" : ""}`}>
                {b.is_main && (
                  <div className="absolute top-0 left-0 bg-primary text-white text-xs px-3 py-1 rounded-br-lg font-medium flex items-center gap-1">
                    <Star className="h-3 w-3" /> Asosiy
                  </div>
                )}
                <CardContent className="p-5 pt-7">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${b.is_main ? "bg-primary/10" : "bg-muted"}`}>
                        <Building2 className={`h-6 w-6 ${b.is_main ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{b.name}</h3>
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {b.tool_count || 0} ta asbob
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{b.address}</span>
                    </div>
                    {b.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${b.phone}`} className="text-primary hover:underline">{b.phone}</a>
                      </div>
                    )}
                    {b.manager_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Mas'ul: {b.manager_name}</span>
                      </div>
                    )}
                    {b.lat && b.lng && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-500" />
                        <a
                          href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-green-600 text-xs hover:underline">
                          Google Maps'da ko'rish
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    {!b.is_main && (
                      <Button variant="outline" size="sm" onClick={() => setMain(b.id)}>
                        <Star className="h-3.5 w-3.5 mr-1" /> Asosiy qilish
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Tahrir
                    </Button>
                    {!b.is_main && (
                      <Button variant="ghost" size="sm" className="text-red-500 ml-auto" onClick={() => deleteBranch(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Filial qo'shish/tahrirlash */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editBranch ? "Filialni tahrirlash" : "Yangi filial qo'shish"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Filial nomi *</label>
              <Input placeholder="Masalan: Yunusobod filliali" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Manzil *</label>
              <Input placeholder="Ko'cha, mahalla, tuman..." value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground text-xs block mb-1">Tezkor tuman tanlash:</label>
              <div className="flex flex-wrap gap-1">
                {TOSHKENT_DISTRICTS.map(d => (
                  <button key={d} type="button"
                    className="text-xs px-2 py-0.5 border rounded-full hover:bg-primary hover:text-white transition-all"
                    onClick={() => setForm(p => ({ ...p, address: `${d}, Toshkent` }))}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <Input placeholder="+998..." value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Mas'ul shaxs</label>
                <Input placeholder="F.I.O" value={form.managerName} onChange={e => setForm(p => ({ ...p, managerName: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Latitude (GPS)</label>
                <Input type="number" step="0.0001" placeholder="41.2995" value={form.lat} onChange={e => setForm(p => ({ ...p, lat: e.target.value }))} className="mt-1 font-mono text-xs" />
              </div>
              <div>
                <label className="text-sm font-medium">Longitude (GPS)</label>
                <Input type="number" step="0.0001" placeholder="69.2401" value={form.lng} onChange={e => setForm(p => ({ ...p, lng: e.target.value }))} className="mt-1 font-mono text-xs" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isMain} onChange={e => setForm(p => ({ ...p, isMain: e.target.checked }))} className="w-4 h-4 accent-primary" />
              <span className="text-sm">Bu asosiy filial</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Bekor</Button>
            <Button onClick={save}>{editBranch ? "Saqlash" : "Qo'shish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
