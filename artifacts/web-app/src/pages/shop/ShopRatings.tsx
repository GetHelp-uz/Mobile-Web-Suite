import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { Star, TrendingUp, MessageSquare } from "lucide-react";

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(max)].map((_, i) => (
        <Star key={i} size={16} className={i < Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}/>
      ))}
    </div>
  );
}

export default function ShopRatings() {
  const { user } = useAuth();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { Authorization: `Bearer ${token}` };

  const [data, setData] = useState<any>({ ratings: [], average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ratings/shop/${shopId}`, { headers: h })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [shopId]);

  const distrib = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: data.ratings.filter((r: any) => r.rating === star).length,
    pct: data.ratings.length ? Math.round(data.ratings.filter((r: any) => r.rating === star).length / data.ratings.length * 100) : 0,
  }));

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-1">Mijozlar baholari</h1>
        <p className="text-muted-foreground">Do'koningiz va asboblaringizga berilgan baholar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-7xl font-bold font-display mb-2">{data.average.toFixed(1)}</p>
          <StarRating rating={data.average}/>
          <p className="text-muted-foreground mt-2">{data.count} ta baho</p>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Baho taqsimoti</h3>
            <div className="space-y-3">
              {distrib.map(d => (
                <div key={d.star} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-bold">{d.star}</span>
                  <Star size={14} className="text-yellow-400 fill-yellow-400 flex-shrink-0"/>
                  <div className="flex-1 bg-secondary rounded-full h-3 overflow-hidden">
                    <div className="bg-yellow-400 h-full rounded-full transition-all" style={{ width: `${d.pct}%` }}/>
                  </div>
                  <span className="w-10 text-sm text-right text-muted-foreground">{d.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-20 rounded-xl bg-muted animate-pulse"/>)}</div>
      ) : data.ratings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Star size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-xl font-semibold">Hali baho yo'q</p>
          <p>Mijozlar ijara tugagach baho berishadi</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare size={18}/> Sharhlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.ratings.map((r: any) => (
                <div key={r.id} className="flex gap-4 pb-4 border-b last:border-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
                    {(r.customer_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{r.customer_name}</span>
                      <StarRating rating={r.rating}/>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{r.tool_name} · {new Date(r.created_at).toLocaleDateString("uz-UZ")}</p>
                    {r.comment && <p className="text-sm text-foreground">"{r.comment}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
