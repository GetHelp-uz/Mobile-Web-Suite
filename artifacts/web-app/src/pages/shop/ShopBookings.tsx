import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { CalendarCheck, Clock, CheckCircle, XCircle, Package, Undo2, Wallet } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Kutilmoqda",      color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed: { label: "Tasdiqlandi",     color: "bg-green-100 text-green-700",   icon: CheckCircle },
  cancelled: { label: "Bekor",           color: "bg-red-100 text-red-700",       icon: XCircle },
  completed: { label: "Tugallandi",      color: "bg-gray-100 text-gray-600",     icon: CheckCircle },
  active:    { label: "Faol ijara",      color: "bg-blue-100 text-blue-700",     icon: Package },
  returned:  { label: "Qaytarilgan",     color: "bg-orange-100 text-orange-700", icon: Undo2 },
};

export default function ShopBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [bookings, setBookings] = useState<any[]>([]);
  const [returnedRentals, setReturnedRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        fetch(`${baseUrl}/api/bookings?shopId=${shopId}`, { headers: h }),
        fetch(`${baseUrl}/api/rentals?shopId=${shopId}&status=returned&limit=50`, { headers: h }),
      ]);
      const bData = await bRes.json();
      const rData = await rRes.json();
      setBookings(bData.bookings || []);
      setReturnedRentals(rData.rentals || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (id: number, status: string) => {
    const r = await fetch(`${baseUrl}/api/bookings/${id}/status`, {
      method: "PATCH", headers: h, body: JSON.stringify({ status }),
    });
    if (r.ok) { toast({ title: status === "confirmed" ? "Tasdiqlandi!" : "Rad etildi" }); load(); }
  };

  const handleConfirmReturn = async (rentalId: number, depositAmount: number) => {
    if (!confirm(`Qaytarishni tasdiqlash va ${formatCurrency(depositAmount)} depozitni mijozga qaytarish?`)) return;
    setConfirming(rentalId);
    try {
      const r = await fetch(`${baseUrl}/api/rentals/${rentalId}/confirm-return`, {
        method: "POST", headers: h,
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: d.error || "Xatolik", variant: "destructive" }); return; }
      toast({ title: `Tasdiqlandi! ${formatCurrency(d.depositRefunded || 0)} mijoz hamyoniga o'tkazildi.` });
      load();
    } catch {
      toast({ title: "Server xatosi", variant: "destructive" });
    } finally { setConfirming(null); }
  };

  const pending = bookings.filter(b => b.status === "pending");
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-1">Bron va ijaralar</h1>
        <p className="text-muted-foreground">Bronlar, qaytarilgan asboblar va depozit boshqaruvi</p>
      </div>

      {/* Qaytarilgan ijaralar — depozit tasdiqlash */}
      {returnedRentals.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="text-xl font-bold text-orange-700">
              Qaytarilgan ijaralar — depozit tasdiqlash kerak ({returnedRentals.length})
            </h2>
          </div>
          <div className="space-y-3">
            {returnedRentals.map(r => (
              <Card key={r.id} className="border-orange-200 bg-orange-50">
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Undo2 size={22} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold">{r.toolName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        Tasdiqlash kutilmoqda
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mijoz: <strong>{r.customerName}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Qaytarildi: {r.returnedAt ? new Date(r.returnedAt).toLocaleDateString("uz-UZ") : "—"}
                      {r.paymentMethod === "cash" && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Naqd</span>
                      )}
                    </p>
                    {r.damageCost > 0 && (
                      <p className="text-sm text-red-600 font-medium mt-1">
                        Zarar: {formatCurrency(r.damageCost)}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-xs text-muted-foreground">Depozit</p>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(r.depositAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Mijozga qaytadi: {formatCurrency(Math.max(0, (r.depositAmount || 0) - (r.damageCost || 0)))}
                    </p>
                  </div>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white gap-2 flex-shrink-0"
                    onClick={() => handleConfirmReturn(r.id, r.depositAmount || 0)}
                    disabled={confirming === r.id}
                  >
                    <Wallet size={16} />
                    {confirming === r.id ? "Jarayonda..." : "Depozitni qaytarish"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bron so'rovlari */}
      {pending.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Clock size={20} className="text-yellow-600 flex-shrink-0"/>
          <p className="text-yellow-800 font-medium">{pending.length} ta yangi bron so'rovi kutilmoqda!</p>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-xl font-bold mb-4">Bron so'rovlari</h2>
        <div className="flex gap-2 mb-6 flex-wrap">
          {[["all","Barchasi"],["pending","Kutilmoqda"],["confirmed","Tasdiqlandi"],["cancelled","Bekor"],["completed","Tugallandi"]].map(([v,l])=>(
            <Button key={v} variant={filter===v?"default":"outline"} size="sm" onClick={()=>setFilter(v)}>{l}</Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-24 rounded-xl bg-muted animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarCheck size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-xl font-semibold">Bronlar yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const sc = statusConfig[b.status] || statusConfig.pending;
            const Icon = sc.icon;
            return (
              <Card key={b.id}>
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CalendarCheck size={24} className="text-primary"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold">{b.tool_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sc.color} flex items-center gap-1`}>
                        <Icon size={12}/> {sc.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(b.start_date).toLocaleDateString("uz-UZ")} — {new Date(b.end_date).toLocaleDateString("uz-UZ")} ({b.days_count} kun)
                    </p>
                    <p className="text-sm font-medium">{b.customer_name} · {b.customer_phone}</p>
                    {b.notes && <p className="text-xs text-muted-foreground mt-1">"{b.notes}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold">{formatCurrency(b.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">{b.payment_method?.toUpperCase()}</p>
                  </div>
                  {b.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => handleStatus(b.id, "confirmed")}>
                        <CheckCircle size={14}/> Tasdiqlash
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 border-red-200 gap-1" onClick={() => handleStatus(b.id, "cancelled")}>
                        <XCircle size={14}/> Rad etish
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
