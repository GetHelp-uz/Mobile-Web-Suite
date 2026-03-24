import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Package, QrCode, Wifi, Zap, Pencil, Trash2,
  CheckCircle, Clock, Truck, X, ShoppingBag, ToggleLeft, ToggleRight,
} from "lucide-react";

const typeOptions = [
  { value: "qr_card",  label: "QR/Barcode Karta", icon: QrCode },
  { value: "gps_mini", label: "GPS Mini Tracker",  icon: Wifi },
  { value: "gps_iot",  label: "GPS IoT Pro",       icon: Zap },
  { value: "other",    label: "Boshqa",             icon: Package },
];

const statusOptions = [
  { value: "pending",    label: "Kutilmoqda",       color: "bg-yellow-100 text-yellow-700" },
  { value: "confirmed",  label: "Tasdiqlandi",       color: "bg-blue-100 text-blue-700" },
  { value: "processing", label: "Tayyorlanmoqda",    color: "bg-orange-100 text-orange-700" },
  { value: "shipped",    label: "Yo'lda",            color: "bg-indigo-100 text-indigo-700" },
  { value: "delivered",  label: "Yetkazildi",        color: "bg-green-100 text-green-700" },
  { value: "cancelled",  label: "Bekor qilindi",     color: "bg-red-100 text-red-700" },
];

export default function AdminHardware() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "", type: "qr_card", description: "", price: "", unit: "dona",
    stock: "999", imageUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const getH = () => {
    const token = localStorage.getItem("gethelp_token") || "";
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pr, or] = await Promise.all([
        fetch(`${baseUrl}/api/hardware/products/all`, { headers: getH() }).then(r => r.json()),
        fetch(`${baseUrl}/api/hardware/orders`, { headers: getH() }).then(r => r.json()),
      ]);
      setProducts(pr.products || []);
      setOrders(or.orders || []);
    } catch { } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditProduct(null);
    setForm({ name: "", type: "qr_card", description: "", price: "", unit: "dona", stock: "999", imageUrl: "" });
    setShowProductModal(true);
  };

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({
      name: p.name, type: p.type, description: p.description || "",
      price: String(p.price), unit: p.unit || "dona", stock: String(p.stock ?? 999),
      imageUrl: p.image_url || "",
    });
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!form.name || !form.price) { toast({ title: "Nom va narx majburiy", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
      let res: Response;
      if (editProduct) {
        res = await fetch(`${baseUrl}/api/hardware/products/${editProduct.id}`, {
          method: "PATCH", headers: getH(), body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${baseUrl}/api/hardware/products`, {
          method: "POST", headers: getH(), body: JSON.stringify(body),
        });
      }
      if (!res.ok) throw new Error("Xato");
      toast({ title: editProduct ? "Yangilandi" : "Qo'shildi" });
      setShowProductModal(false);
      loadAll();
    } catch (err: any) {
      toast({ title: "Xato", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleActive = async (product: any) => {
    try {
      await fetch(`${baseUrl}/api/hardware/products/${product.id}`, {
        method: "PATCH", headers: getH(),
        body: JSON.stringify({ isActive: !product.is_active }),
      });
      toast({ title: product.is_active ? "O'chirildi" : "Yoqildi" });
      loadAll();
    } catch { toast({ title: "Xato", variant: "destructive" }); }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`${baseUrl}/api/hardware/orders/${orderId}/status`, {
        method: "PATCH", headers: getH(), body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Xato");
      toast({ title: "Status yangilandi" });
      loadAll();
    } catch { toast({ title: "Xato", variant: "destructive" }); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hardware Boshqaruvi</h1>
          <p className="text-muted-foreground text-sm">QR kartalar, GPS qurilmalar — narx va buyurtmalarni boshqarish</p>
        </div>
        {tab === "products" && (
          <Button onClick={openCreate} className="gap-2">
            <Plus size={16}/> Mahsulot qo'shish
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {(["products", "orders"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "ghost"} size="sm" onClick={() => setTab(t)}>
            {t === "products" ? `Mahsulotlar (${products.length})` : `Buyurtmalar (${orders.length})`}
          </Button>
        ))}
      </div>

      {tab === "products" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? [1,2,3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-xl"/>) :
          products.map(p => {
            const tCfg = typeOptions.find(t => t.value === p.type) || typeOptions[3];
            const TypeIcon = tCfg.icon;
            return (
              <Card key={p.id} className={`overflow-hidden ${!p.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <TypeIcon size={20} className="text-primary"/>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{p.name}</p>
                        <Badge variant="outline" className="text-xs">{tCfg.label}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil size={13}/>
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className={`h-7 w-7 ${p.is_active ? 'text-green-600' : 'text-muted-foreground'}`}
                        onClick={() => toggleActive(p)}
                      >
                        {p.is_active ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Narxi</p>
                      <p className="font-bold text-primary">{formatCurrency(p.price)}</p>
                      <p className="text-xs text-muted-foreground">/{p.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Stok</p>
                      <p className="font-bold">{p.stock}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-4">
          {loading ? <div className="h-40 bg-muted animate-pulse rounded-xl"/> :
          orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-30"/>
              <p>Hali buyurtma yo'q</p>
            </div>
          ) : orders.map(order => {
            const sc = statusOptions.find(s => s.value === order.status) || statusOptions[0];
            return (
              <Card key={order.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">Buyurtma #{order.id}</span>
                        <Badge className={`${sc.color} border-0 text-xs`}>{sc.label}</Badge>
                      </div>
                      <p className="text-sm font-medium text-primary">{order.shop_name}</p>
                      <p className="text-xs text-muted-foreground">{order.user_name}</p>
                      {order.delivery_address && (
                        <p className="text-xs text-muted-foreground mt-1">📍 {order.delivery_address}</p>
                      )}
                      {order.notes && <p className="text-xs text-muted-foreground mt-0.5">💬 {order.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleDateString('uz-UZ', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg text-primary">{formatCurrency(order.total_amount)}</p>
                      <Select defaultValue={order.status} onValueChange={v => updateOrderStatus(order.id, v)}>
                        <SelectTrigger className="h-8 text-xs w-40 mt-2">
                          <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tur *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom *</Label>
              <Input className="mt-1.5" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Mahsulot nomi"/>
            </div>
            <div>
              <Label>Tavsif</Label>
              <Textarea className="mt-1.5 resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Mahsulot haqida batafsil..."/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Narxi (so'm) *</Label>
                <Input className="mt-1.5" type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="15000"/>
              </div>
              <div>
                <Label>O'lchov birligi</Label>
                <Input className="mt-1.5" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} placeholder="dona"/>
              </div>
            </div>
            <div>
              <Label>Stok miqdori</Label>
              <Input className="mt-1.5" type="number" value={form.stock} onChange={e => setForm(f => ({...f, stock: e.target.value}))}/>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowProductModal(false)}>Bekor</Button>
              <Button className="flex-1" onClick={saveProduct} disabled={saving}>
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
