import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Heart, Wrench, Star, MapPin } from "lucide-react";
import { useLocation } from "wouter";

export default function CustomerFavorites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/favorites`, { headers: h });
      const d = await r.json();
      setFavorites(d.favorites || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const removeFavorite = async (toolId: number) => {
    await fetch(`${baseUrl}/api/favorites/${toolId}`, { method: "DELETE", headers: h });
    toast({ title: "Sevimlilardan olib tashlandi" });
    setFavorites(prev => prev.filter(f => f.tool_id !== toolId));
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    available: { label: "Mavjud", color: "bg-green-100 text-green-700" },
    rented: { label: "Ijarada", color: "bg-blue-100 text-blue-700" },
    maintenance: { label: "Ta'mirda", color: "bg-yellow-100 text-yellow-700" },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sevimli Asboblar</h1>
            <p className="text-muted-foreground">Sizning saqlangan asboblaringiz</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/browse")}>
            <Wrench className="h-4 w-4 mr-2" /> Asboblar ko'rish
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Yuklanmoqda...</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">Sevimlilar bo'sh</h3>
            <p className="text-muted-foreground mb-4">Asboblarni ko'rib, yurakcha tugmasini bosib saqlang</p>
            <Button onClick={() => navigate("/browse")}>Asboblarni ko'rish</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map(fav => {
              const st = STATUS_LABELS[fav.tool_status] || STATUS_LABELS.available;
              return (
                <Card key={fav.id} className="group hover:shadow-lg transition-all">
                  <div className="relative">
                    {fav.image_url ? (
                      <img src={fav.image_url} alt={fav.tool_name} className="w-full h-48 object-cover rounded-t-xl" />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-xl flex items-center justify-center">
                        <Wrench className="h-16 w-16 text-primary/40" />
                      </div>
                    )}
                    <button
                      onClick={() => removeFavorite(fav.tool_id)}
                      className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
                    >
                      <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                    </button>
                    <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  <CardContent className="p-4">
                    <div className="font-semibold text-lg mb-1">{fav.tool_name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{fav.shop_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-primary">{formatCurrency(fav.price_per_day)}</span>
                        <span className="text-xs text-muted-foreground">/kun</span>
                      </div>
                      <Button size="sm" disabled={fav.tool_status !== "available"}
                        onClick={() => navigate(`/tools/${fav.tool_id}`)}>
                        {fav.tool_status === "available" ? "Ijara olish" : "Band"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
