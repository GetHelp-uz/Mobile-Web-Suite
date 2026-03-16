import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Truck, Plus, Phone, Mail, MapPin, Globe, Pencil, Trash2 } from "lucide-react";

const EMPTY = { name: "", contactPhone: "", contactEmail: "", address: "", website: "", notes: "" };

export default function ShopSuppliers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/suppliers/shop/${shopId}`, { headers: h });
      const d = await r.json();
      setSuppliers(d.suppliers || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const save = async () => {
    try {
      const url = editItem ? `${baseUrl}/api/suppliers/${editItem.id}` : `${baseUrl}/api/suppliers`;
      const method = editItem ? "PUT" : "POST";
      const r = await fetch(url, {
        method, headers: h, body: JSON.stringify({ shopId, ...form }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: editItem ? "Yangilandi!" : "Yaratildi!" });
      setCreateOpen(false);
      setEditItem(null);
      setForm(EMPTY);
      load();
    } catch (err: any) { toast({ title: "Xatolik", description: err.message, variant: "destructive" }); }
  };

  const remove = async (id: number) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    await fetch(`${baseUrl}/api/suppliers/${id}`, { method: "DELETE", headers: h });
    toast({ title: "O'chirildi" });
    load();
  };

  const openEdit = (s: any) => {
    setForm({ name: s.name, contactPhone: s.contact_phone || "", contactEmail: s.contact_email || "", address: s.address || "", website: s.website || "", notes: s.notes || "" });
    setEditItem(s);
    setCreateOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ta'minotchilar</h1>
            <p className="text-muted-foreground">Asbob yetkazib beruvchi kompaniyalar</p>
          </div>
          <Button onClick={() => { setForm(EMPTY); setEditItem(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Ta'minotchi qo'shish
          </Button>
        </div>

        {loading ? <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div> :
          suppliers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Truck className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Ta'minotchilar yo'q</p>
              <p className="text-sm mt-1">Birinchi ta'minotchini qo'shing</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map(s => (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Truck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-bold text-lg">{s.name}</div>
                          {s.tool_count > 0 && <div className="text-xs text-muted-foreground">{s.tool_count} ta asbob</div>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {s.contact_phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {s.contact_phone}</div>}
                      {s.contact_email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {s.contact_email}</div>}
                      {s.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {s.address}</div>}
                      {s.website && <div className="flex items-center gap-2 text-muted-foreground"><Globe className="h-3.5 w-3.5" /><a href={s.website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{s.website}</a></div>}
                      {s.notes && <div className="mt-2 p-2 bg-muted/50 rounded text-xs">{s.notes}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Ta'minotchini tahrirlash" : "Yangi ta'minotchi"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Kompaniya nomi *</label>
              <Input placeholder="Masalan: Toshkent Tool Co." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <Input placeholder="+998901234567" value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="info@company.uz" value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Manzil</label>
              <Input placeholder="Toshkent, Yunusobod..." value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Veb-sayt</label>
              <Input placeholder="https://company.uz" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Qo'shimcha izoh</label>
              <Textarea placeholder="Izohlar..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
            <Button onClick={save}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
