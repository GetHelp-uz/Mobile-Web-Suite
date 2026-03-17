import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  Truck, Save, Plus, X, Calculator, CheckCircle,
  MapPin, Clock, Package, Info,
} from "lucide-react";

type DeliverySettings = {
  shop_id: number; is_active: boolean; base_price: number; price_per_km: number;
  min_km: number; max_km: number; free_km: number; time_slots: string[]; notes: string;
};

type DeliveryOrder = {
  id: number; address: string; distance_km: number; delivery_price: number;
  time_slot: string; scheduled_date: string; status: string;
  customer_name: string; customer_phone: string; tool_name: string; created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Kutilmoqda",    color: "warning" },
  confirmed:  { label: "Tasdiqlandi",  color: "success" },
  picked_up:  { label: "Olib ketildi", color: "default" },
  delivered:  { label: "Yetkazildi",   color: "success" },
  cancelled:  { label: "Bekor",        color: "destructive" },
};

const DEFAULT_SLOTS = ["09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-21:00"];

export default function ShopDeliverySettings() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [shopId, setShopId] = useState<number | null>(null);
  const [settings, setSettings] = useState<DeliverySettings>({
    shop_id: 0, is_active: false, base_price: 0, price_per_km: 5000,
    min_km: 1, max_km: 50, free_km: 0, time_slots: [...DEFAULT_SLOTS], notes: "",
  });
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState("");
  const [testKm, setTestKm] = useState("10");

  const load = async (sid: number) => {
    try {
      const [sRes, oRes] = await Promise.all([
        fetch(`/api/delivery/settings/${sid}`, { headers: h }),
        fetch(`/api/delivery/orders?shopId=${sid}`, { headers: h }),
      ]);
      const sData = await sRes.json();
      const oData = await oRes.json();
      setSettings({ ...sData, time_slots: sData.time_slots || DEFAULT_SLOTS });
      setOrders(oData.orders || []);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/shops?mine=true", { headers: h });
      const d = await r.json();
      const shop = d.shops?.[0] || d[0];
      if (shop) { setShopId(shop.id); load(shop.id); }
      else setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!shopId) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/delivery/settings/${shopId}`, {
        method: "PUT", headers: h, body: JSON.stringify(settings),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: "Saqlandi!", description: "Yetkazib berish sozlamalari yangilandi" });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const calcPrice = (km: number) => {
    const chargeableKm = Math.max(0, km - settings.free_km);
    return settings.base_price + chargeableKm * settings.price_per_km;
  };

  const addSlot = () => {
    if (!newSlot.match(/^\d{2}:\d{2}-\d{2}:\d{2}$/)) {
      toast({ title: "Format noto'g'ri", description: "HH:MM-HH:MM formatida kiriting", variant: "destructive" });
      return;
    }
    setSettings(s => ({ ...s, time_slots: [...s.time_slots, newSlot] }));
    setNewSlot("");
  };

  const removeSlot = (slot: string) => {
    setSettings(s => ({ ...s, time_slots: s.time_slots.filter(x => x !== slot) }));
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    await fetch(`/api/delivery/orders/${orderId}/status`, {
      method: "PATCH", headers: h, body: JSON.stringify({ status }),
    });
    load(shopId!);
    toast({ title: "Holat yangilandi!" });
  };

  if (loading) {
    return <DashboardLayout><div className="space-y-4">{[1,2].map(i => <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />)}</div></DashboardLayout>;
  }

  const testPrice = calcPrice(Number(testKm) || 0);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">Yetkazib berish xizmati</h1>
        <p className="text-muted-foreground">Yetkazib berish narxini va vaqt oynalarini sozlang</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Sozlamalar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Truck size={18} /> Asosiy sozlamalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary">
              <div>
                <p className="font-semibold">Yetkazib berish faol</p>
                <p className="text-sm text-muted-foreground">Mijozlar buyurtma bera oladi</p>
              </div>
              <Switch
                checked={settings.is_active}
                onCheckedChange={v => setSettings(s => ({ ...s, is_active: v }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Boshlang'ich narx (UZS)</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={settings.base_price}
                  onChange={e => setSettings(s => ({ ...s, base_price: Number(e.target.value) }))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">Masofadan qat'iy nazar asosiy narx</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">1 km narxi (UZS)</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={settings.price_per_km}
                  onChange={e => setSettings(s => ({ ...s, price_per_km: Number(e.target.value) }))}
                  placeholder="5000"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Min. masofa (km)</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={settings.min_km}
                  onChange={e => setSettings(s => ({ ...s, min_km: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Max. masofa (km)</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={settings.max_km}
                  onChange={e => setSettings(s => ({ ...s, max_km: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold">Bepul km (0 = bepul yo'q)</Label>
              <Input
                type="number"
                className="mt-1.5"
                value={settings.free_km}
                onChange={e => setSettings(s => ({ ...s, free_km: Number(e.target.value) }))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Birinchi N km bepul</p>
            </div>

            <div>
              <Label className="text-sm font-semibold">Qo'shimcha eslatma (ixtiyoriy)</Label>
              <Input
                className="mt-1.5"
                value={settings.notes}
                onChange={e => setSettings(s => ({ ...s, notes: e.target.value }))}
                placeholder="Yetkazib berish shartlari..."
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              <Save size={16} /> {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Narx kalkulyatori */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Calculator size={16} /> Narx kalkulyatori</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Masofa (km)"
                  value={testKm}
                  onChange={e => setTestKm(e.target.value)}
                />
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary font-bold whitespace-nowrap">
                  {formatCurrency(testPrice)}
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Boshlang'ich: {formatCurrency(settings.base_price)}</p>
                <p>+ {Math.max(0, Number(testKm) - settings.free_km).toFixed(1)} km × {formatCurrency(settings.price_per_km)}</p>
                {settings.free_km > 0 && <p className="text-green-600">Bepul: {settings.free_km} km</p>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20].map(km => (
                  <button key={km} type="button" onClick={() => setTestKm(String(km))}
                    className="px-2 py-1.5 text-sm rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors">
                    {km} km → {formatCurrency(calcPrice(km))}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vaqt oynalari */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock size={16} /> Vaqt oynalari</CardTitle>
              <CardDescription>Mijozlar tanlay oladigan yetkazib berish vaqtlari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {settings.time_slots.map(slot => (
                  <Badge key={slot} variant="secondary" className="gap-1 pr-1">
                    <Clock size={12} /> {slot}
                    <button type="button" onClick={() => removeSlot(slot)} className="ml-1 hover:text-destructive">
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="09:00-12:00"
                  value={newSlot}
                  onChange={e => setNewSlot(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={addSlot} className="gap-1">
                  <Plus size={14} /> Qo'shish
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Buyurtmalar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package size={18} /> Yetkazib berish buyurtmalari
            <Badge variant="secondary">{orders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck size={48} className="mx-auto mb-4 opacity-30" />
              <p>Hozircha yetkazib berish buyurtmalari yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const st = STATUS_LABELS[order.status] || { label: order.status, color: "secondary" };
                return (
                  <div key={order.id} className="flex items-start gap-4 p-4 rounded-xl border hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm">{order.customer_name}</span>
                        <span className="text-muted-foreground text-xs">{order.customer_phone}</span>
                        <Badge variant={st.color as any} className="text-xs">{st.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <MapPin size={12} /> {order.address}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{order.distance_km} km</span>
                        <span className="font-semibold text-foreground">{formatCurrency(order.delivery_price)}</span>
                        {order.time_slot && <span><Clock size={10} className="inline" /> {order.time_slot}</span>}
                        {order.scheduled_date && <span>{new Date(order.scheduled_date).toLocaleDateString("uz-UZ")}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {order.status === "pending" && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateOrderStatus(order.id, "confirmed")}>
                          Tasdiqlash
                        </Button>
                      )}
                      {order.status === "confirmed" && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateOrderStatus(order.id, "picked_up")}>
                          Olib ketildi
                        </Button>
                      )}
                      {order.status === "picked_up" && (
                        <Button size="sm" className="text-xs h-7 gap-1" onClick={() => updateOrderStatus(order.id, "delivered")}>
                          <CheckCircle size={12} /> Yetkazildi
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
