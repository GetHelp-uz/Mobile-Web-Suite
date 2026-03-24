import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Star, MapPin, Phone, Wrench, Search, Filter } from "lucide-react";

export default function WorkerPackagesPage() {
  const { toast } = useToast();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}` };
  const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/worker-packages`, { headers: h });
      if (res.ok) setPackages((await res.json()).packages || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = packages.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.tool_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.worker_name?.toLowerCase().includes(search.toLowerCase())
  );

  const contact = (pkg: any) => {
    toast({ title: `📞 ${pkg.worker_name}`, description: `Telefon: ${pkg.worker_phone || pkg.shop_name}` });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-orange-500" /> Ustoz + Asbob Paketlari</h1>
          <p className="text-gray-500 mt-1">Asbob bilan birga tajribali usta ijaraga oling — barchasi bir joyda</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            placeholder="Paket nomi, asbob yoki usta bo'yicha qidiring..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <Card key={i} className="animate-pulse h-48 bg-gray-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Paketlar topilmadi</p>
              <p className="text-sm text-gray-300 mt-1">Boshqa kalit so'z bilan qidiring</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((pkg: any) => (
              <Card key={pkg.id} className="hover:shadow-md transition-shadow border-2 hover:border-orange-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium">{Number(pkg.rating || 0).toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({pkg.rating_count || 0} baho)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-500">{(Number(pkg.daily_price) / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-gray-400">UZS/kun</p>
                    </div>
                  </div>

                  {pkg.description && <p className="text-sm text-gray-500 mb-3">{pkg.description}</p>}

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-orange-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-400 mb-0.5">Asbob</p>
                      <p className="text-sm font-medium">{pkg.tool_name || "—"}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-400 mb-0.5">Usta</p>
                      <p className="text-sm font-medium">{pkg.worker_name || "—"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 col-span-2">
                      <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Do'kon</p>
                      <p className="text-sm font-medium">{pkg.shop_name || "—"}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => contact(pkg)}>
                      <Phone className="w-4 h-4 mr-2" /> Bog'lanish
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Wrench className="w-4 h-4 mr-2" /> Bron qilish
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
