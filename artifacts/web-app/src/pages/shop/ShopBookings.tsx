import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { CalendarCheck, Clock, CheckCircle, XCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Kutilmoqda",   color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed: { label: "Tasdiqlandi",  color: "bg-green-100 text-green-700",   icon: CheckCircle },
  cancelled: { label: "Bekor",        color: "bg-red-100 text-red-700",       icon: XCircle },
  completed: { label: "Tugallandi",   color: "bg-gray-100 text-gray-600",     icon: CheckCircle },
};

export default function ShopBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/bookings?shopId=${shopId}`, { headers: h });
    const d = await r.json();
    setBookings(d.bookings || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (id: number, status: string) => {
    const r = await fetch(`/api/bookings/${id}/status`, {
      method: "PATCH", headers: h, body: JSON.stringify({ status }),
    });
    if (r.ok) { toast({ title: status === "confirmed" ? "Tasdiqlandi!" : "Rad etildi" }); load(); }
  };

  const pending = bookings.filter(b => b.status === "pending");
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-1">Bron so'rovlari</h1>
        <p className="text-muted-foreground">Mijozlarning asbob bron so'rovlari</p>
      </div>

      {pending.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Clock size={20} className="text-yellow-600 flex-shrink-0"/>
          <p className="text-yellow-800 font-medium">{pending.length} ta yangi bron so'rovi kutilmoqda!</p>
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        {[["all","Barchasi"],["pending","Kutilmoqda"],["confirmed","Tasdiqlandi"],["cancelled","Bekor"],["completed","Tugallandi"]].map(([v,l])=>(
          <Button key={v} variant={filter===v?"default":"outline"} size="sm" onClick={()=>setFilter(v)}>{l}</Button>
        ))}
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
