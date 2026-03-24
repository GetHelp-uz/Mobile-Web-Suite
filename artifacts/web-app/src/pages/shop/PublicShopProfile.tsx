import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useRoute, useLocation } from "wouter";
import { Star, MapPin, Phone, Clock, Package, MessageSquare, ChevronRight, Building2, QrCode, Download, X } from "lucide-react";
import QRCodeLib from "qrcode";

function StarRow({ rating, max = 5, size = 16 }: { rating: number; max?: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(max)].map((_, i) => (
        <Star key={i} size={size} className={i < Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
      ))}
    </div>
  );
}

export default function PublicShopProfile() {
  const [, params] = useRoute("/shops/:id");
  const [, setLocation] = useLocation();
  const shopId = Number(params?.id);
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [shop, setShop] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any>({ ratings: [], average: 0, count: 0 });
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tools" | "reviews" | "branches">("tools");
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!shopId) return;
    Promise.all([
      fetch(`${baseUrl}/api/shops/${shopId}`).then(r => r.json()),
      fetch(`${baseUrl}/api/tools?shopId=${shopId}&status=available`).then(r => r.json()),
      fetch(`${baseUrl}/api/ratings/shop/${shopId}`).then(r => r.json()),
      fetch(`${baseUrl}/api/branches/shop/${shopId}`).then(r => r.json()),
    ]).then(([s, t, rat, br]) => {
      setShop(s.shop || s);
      setTools(t.tools || []);
      setRatings(rat);
      setBranches(br.branches || []);
      setLoading(false);
    });
  }, [shopId]);

  const openQR = async () => {
    const shopUrl = `${window.location.origin}${baseUrl}/shops/${shopId}`;
    const dataUrl = await QRCodeLib.toDataURL(shopUrl, { width: 300, margin: 2, color: { dark: "#111111", light: "#FFFFFF" } });
    setQrDataUrl(dataUrl);
    setShowQR(true);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${shop?.name || "shop"}-qr.png`;
    a.click();
  };

  if (loading) return (
    <DashboardLayout>
      <div className="h-48 bg-muted animate-pulse rounded-2xl mb-6" />
    </DashboardLayout>
  );

  if (!shop) return (
    <DashboardLayout>
      <div className="text-center py-24 text-muted-foreground">
        <Building2 className="w-16 h-16 mx-auto mb-4 opacity-40" />
        <p className="text-xl font-bold">Do'kon topilmadi</p>
      </div>
    </DashboardLayout>
  );

  const tabs = [
    { key: "tools", label: `Asboblar (${tools.length})` },
    { key: "reviews", label: `Baholar (${ratings.count})` },
    { key: "branches", label: `Filiallar (${branches.length})` },
  ];

  return (
    <DashboardLayout>
      {/* Do'kon header */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5" />
        <CardContent className="p-6 -mt-10 relative">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-20 h-20 rounded-2xl border-4 border-background bg-primary/10 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-display font-bold">{shop.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRow rating={ratings.average} />
                    <span className="font-bold text-lg">{ratings.average.toFixed(1)}</span>
                    <span className="text-muted-foreground text-sm">({ratings.count} baho)</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setLocation(`/chat`)}>
                    <MessageSquare className="w-4 h-4 mr-2" /> Xabar
                  </Button>
                  <Button onClick={() => setLocation("/browse")}>
                    <Package className="w-4 h-4 mr-2" /> Ijara
                  </Button>
                  <Button variant="outline" onClick={openQR}>
                    <QrCode className="w-4 h-4 mr-2" /> QR Kod
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                {shop.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" /> {shop.address}
                  </span>
                )}
                {shop.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-primary" /> {shop.phone}
                  </span>
                )}
                {shop.working_hours && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" /> {shop.working_hours}
                  </span>
                )}
              </div>
              {shop.description && (
                <p className="mt-3 text-sm text-muted-foreground">{shop.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tablar */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
        {tabs.map(t => (
          <button key={t.key}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Asboblar */}
      {tab === "tools" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tools.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Mavjud asboblar yo'q</p>
            </div>
          ) : tools.map(tool => (
            <Card key={tool.id} className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setLocation(`/tools/${tool.id}`)}>
              <CardContent className="p-4">
                {tool.image_url ? (
                  <img src={tool.image_url} alt={tool.name} className="w-full h-40 object-cover rounded-xl mb-3" />
                ) : (
                  <div className="w-full h-40 bg-muted rounded-xl mb-3 flex items-center justify-center">
                    <Package className="w-12 h-12 text-muted-foreground opacity-40" />
                  </div>
                )}
                <h3 className="font-bold mb-1 group-hover:text-primary transition-colors">{tool.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{tool.category}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="success" className="text-xs">Mavjud</Badge>
                  <p className="font-bold text-primary">{formatCurrency(Number(tool.price_per_day))}/kun</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Baholar */}
      {tab === "reviews" && (
        <div className="space-y-3">
          {ratings.ratings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Hali baho berilmagan</p>
            </div>
          ) : ratings.ratings.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {(r.customer_name || "M")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{r.customer_name || "Mijoz"}</p>
                      <StarRow rating={r.rating} size={14} />
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                    {r.tool_name && <p className="text-xs text-muted-foreground mt-1">Asbob: {r.tool_name}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filiallar */}
      {tab === "branches" && (
        <div className="space-y-3">
          {branches.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Filiallar yo'q</p>
            </div>
          ) : branches.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{b.name}</p>
                    {b.is_main && <Badge className="text-xs">Asosiy</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{b.address}</p>
                  {b.phone && <p className="text-xs text-muted-foreground">{b.phone}</p>}
                </div>
                {b.lat && b.lng && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`https://maps.google.com/?q=${b.lat},${b.lng}`} target="_blank" rel="noopener noreferrer">
                      Xarita <ChevronRight className="w-4 h-4 ml-1" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{shop?.name}</h3>
              <button onClick={() => setShowQR(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {qrDataUrl && (
              <div className="bg-white p-3 rounded-xl border-2 border-gray-100 inline-block mb-4">
                <img src={qrDataUrl} alt="QR kod" className="w-48 h-48" />
              </div>
            )}
            <p className="text-sm text-gray-500 mb-4">Bu QR kodni skanerlash orqali do'kon sahifasiga o'tish mumkin</p>
            <div className="flex gap-3">
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={downloadQR}>
                <Download className="w-4 h-4 mr-2" /> Yuklab olish
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${baseUrl}/shops/${shopId}`); }}>
                Havolani nusxalash
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
