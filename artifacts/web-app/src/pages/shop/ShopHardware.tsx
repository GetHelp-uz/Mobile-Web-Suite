import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  QrCode, Wifi, CreditCard, ShoppingCart, Package,
  Plus, Minus, CheckCircle, Clock, Truck, X, ChevronRight,
  BarChart2, MapPin, Zap,
} from "lucide-react";

const typeConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  qr_card:  { icon: QrCode,   label: "QR/Barcode Karta", color: "text-blue-600",   bg: "bg-blue-50" },
  gps_mini: { icon: Wifi,     label: "GPS Mini",          color: "text-green-600",  bg: "bg-green-50" },
  gps_iot:  { icon: Zap,      label: "GPS IoT Pro",       color: "text-purple-600", bg: "bg-purple-50" },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: "Kutilmoqda",   color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed:  { label: "Tasdiqlandi",  color: "bg-blue-100 text-blue-700",    icon: CheckCircle },
  processing: { label: "Tayyorlanmoqda", color: "bg-orange-100 text-orange-700", icon: Package },
  shipped:    { label: "Yo'lda",       color: "bg-indigo-100 text-indigo-700", icon: Truck },
  delivered:  { label: "Yetkazildi",   color: "bg-green-100 text-green-700",  icon: CheckCircle },
  cancelled:  { label: "Bekor qilindi", color: "bg-red-100 text-red-700",     icon: X },
};

interface Product {
  id: number;
  name: string;
  type: string;
  description: string;
  price: number;
  unit: string;
  specs: Record<string, any>;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function ShopHardware() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"products" | "orders">("products");
  const { toast } = useToast();

  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const getH = () => {
    const token = localStorage.getItem("gethelp_token") || "";
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/hardware/products`, { headers: getH() });
      const d = await res.json();
      setProducts(d.products || []);
    } catch { } finally { setLoading(false); }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/hardware/orders`, { headers: getH() });
      const d = await res.json();
      setOrders(d.orders || []);
    } catch { }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    toast({ title: "Savatga qo'shildi", description: product.name });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty < 1 ? i : { ...i, quantity: newQty };
    }).filter(i => !(i.product.id === productId && i.quantity + delta < 1)));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const totalAmount = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  const placeOrder = async () => {
    if (!deliveryAddress.trim()) { toast({ title: "Manzil kiriting", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/hardware/orders`, {
        method: "POST",
        headers: getH(),
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          deliveryAddress,
          notes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Xato");
      toast({ title: "Buyurtma berildi!", description: `Buyurtma #${d.orderId} muvaffaqiyatli yaratildi` });
      setCart([]);
      setShowOrderModal(false);
      setShowCart(false);
      setDeliveryAddress("");
      setNotes("");
      loadOrders();
      setTab("orders");
    } catch (err: any) {
      toast({ title: "Xato", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold">Hardware & Qurilmalar</h1>
            <p className="text-muted-foreground text-sm">Asboblaringiz uchun QR kartalar, GPS tracker va IoT qurilmalar</p>
          </div>
          {cart.length > 0 && (
            <Button onClick={() => setShowCart(true)} className="gap-2 relative">
              <ShoppingCart size={18}/>
              Savat ({totalItems})
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white border-0 text-xs px-1.5">
                {totalItems}
              </Badge>
            </Button>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {(["products", "orders"] as const).map(t => (
            <Button key={t} variant={tab === t ? "default" : "ghost"} size="sm" onClick={() => setTab(t)}>
              {t === "products" ? "Mahsulotlar" : `Buyurtmalar (${orders.length})`}
            </Button>
          ))}
        </div>
      </div>

      {tab === "products" && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-80 bg-muted animate-pulse rounded-xl"/>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.map(product => {
                const cfg = typeConfig[product.type] || { icon: Package, label: product.type, color: "text-gray-600", bg: "bg-gray-50" };
                const CartIcon = cfg.icon;
                const cartItem = cart.find(i => i.product.id === product.id);
                return (
                  <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className={`${cfg.bg} p-8 flex items-center justify-center`}>
                      <CartIcon size={48} className={cfg.color}/>
                    </div>
                    <CardContent className="p-5">
                      <Badge variant="outline" className="text-xs mb-2">{cfg.label}</Badge>
                      <h3 className="font-bold text-base mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.description}</p>

                      {product.specs && Object.keys(product.specs).length > 0 && (
                        <div className="space-y-1 mb-4 p-3 bg-secondary/50 rounded-lg">
                          {Object.entries(product.specs).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs">
                              <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                              <span className="font-medium">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Narxi</p>
                          <p className="text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
                          <p className="text-xs text-muted-foreground">{product.unit}</p>
                        </div>
                        {cartItem ? (
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(product.id, -1)}>
                              <Minus size={14}/>
                            </Button>
                            <span className="font-bold w-6 text-center">{cartItem.quantity}</span>
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(product.id, 1)}>
                              <Plus size={14}/>
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => addToCart(product)} className="gap-1.5">
                            <Plus size={14}/> Qo'shish
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package size={48} className="mx-auto mb-4 opacity-30"/>
              <p>Hali buyurtma yo'q</p>
              <Button variant="link" onClick={() => setTab("products")}>Mahsulotlarni ko'rish</Button>
            </div>
          ) : orders.map(order => {
            const sc = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <Card key={order.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">Buyurtma #{order.id}</span>
                        <Badge className={`${sc.color} border-0 text-xs gap-1`}>
                          <StatusIcon size={11}/> {sc.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('uz-UZ', { year:'numeric', month:'long', day:'numeric' })}
                      </p>
                      {order.delivery_address && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin size={11}/> {order.delivery_address}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart size={20}/> Savat ({totalItems} dona)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.product.id, -1)}>
                    <Minus size={12}/>
                  </Button>
                  <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.product.id, 1)}>
                    <Plus size={12}/>
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                    <X size={12}/>
                  </Button>
                </div>
                <p className="font-bold text-sm w-20 text-right">{formatCurrency(item.product.price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold">Jami:</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</span>
            </div>
            <Button className="w-full gap-2" onClick={() => { setShowCart(false); setShowOrderModal(true); }}>
              Buyurtma berish <ChevronRight size={16}/>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Dialog */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buyurtmani rasmiylashtirish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-secondary/40 rounded-xl">
              <p className="text-sm font-medium mb-1">Buyurtma jami</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-muted-foreground">{totalItems} ta mahsulot</p>
            </div>
            <div>
              <Label>Yetkazib berish manzili *</Label>
              <Textarea
                placeholder="Shahar, tuman, ko'cha, uy raqami..."
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                className="mt-1.5 resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label>Qo'shimcha izoh</Label>
              <Input
                placeholder="Qurilma sozlamalari, maxsus talablar..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">To'lov haqida</p>
              <p>Buyurtma tasdiqlangandan so'ng admin siz bilan bog'lanadi. To'lov yetkazib berish vaqtida amalga oshiriladi.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowOrderModal(false)}>Bekor</Button>
              <Button className="flex-1 gap-2" onClick={placeOrder} disabled={submitting}>
                {submitting ? "Yuborilmoqda..." : "Buyurtma berish"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
