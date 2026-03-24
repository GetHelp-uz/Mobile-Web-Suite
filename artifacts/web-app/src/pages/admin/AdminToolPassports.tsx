import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, BookOpen, QrCode, Wrench, ClipboardList, PackageCheck,
  Tag, AlertTriangle, FileText, ArrowRightLeft, ExternalLink,
  BarChart2, Building2, Filter, RefreshCw,
} from "lucide-react";

const EVENT_TYPE_LABELS: Record<string, string> = {
  rental_started: "Ijara boshlandi",
  rental_returned: "Ijara qaytarildi",
  maintenance_started: "Texnik xizmat boshlandi",
  maintenance_completed: "Texnik xizmat tugadi",
  repair: "Ta'mirlash",
  inspection: "Ko'rik",
  damage: "Shikast",
  note: "Eslatma",
  sold: "Sotildi",
  transferred: "O'tkazildi",
};

const STATUS_STYLES: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  rented:    "bg-blue-100 text-blue-700",
  maintenance: "bg-orange-100 text-orange-700",
  retired:   "bg-gray-100 text-gray-600",
};

function EventIcon({ type }: { type: string }) {
  if (type === "repair") return <Wrench size={13} className="text-orange-500"/>;
  if (type === "damage") return <AlertTriangle size={13} className="text-red-500"/>;
  if (type === "note") return <FileText size={13} className="text-gray-400"/>;
  if (type === "transferred") return <ArrowRightLeft size={13} className="text-purple-500"/>;
  if (type === "maintenance_started" || type === "maintenance_completed") return <PackageCheck size={13} className="text-green-500"/>;
  return <ClipboardList size={13} className="text-blue-500"/>;
}

export default function AdminToolPassports() {
  const { toast } = useToast();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [passportData, setPassportData] = useState<any>(null);
  const [passportLoading, setPassportLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const getH = () => {
    const token = localStorage.getItem("gethelp_token") || "";
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => { loadList(); }, []);

  const loadList = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/passport/admin/list`, { headers: getH() });
      const d = await r.json();
      setTools(d.tools || []);
    } catch {
      toast({ title: "Yuklashda xato", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openPassport = async (qrCode: string) => {
    if (!qrCode) { toast({ title: "QR kod yo'q", variant: "destructive" }); return; }
    setPassportLoading(true);
    setModalOpen(true);
    try {
      const r = await fetch(`${baseUrl}/api/passport/${encodeURIComponent(qrCode)}`);
      if (!r.ok) throw new Error("Topilmadi");
      const d = await r.json();
      setPassportData(d);
    } catch (e: any) {
      toast({ title: "Topilmadi", description: e.message, variant: "destructive" });
      setModalOpen(false);
    } finally { setPassportLoading(false); }
  };

  const uniqueShops = Array.from(new Set(tools.map(t => t.shop_name))).sort();

  const filtered = tools.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q)
      || t.qr_code?.toLowerCase().includes(q) || t.custom_barcode?.toLowerCase().includes(q)
      || t.shop_name?.toLowerCase().includes(q);
    const matchShop = !shopFilter || t.shop_name === shopFilter;
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchShop && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen size={22} className="text-blue-600"/> Asbob Pasportlari
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Barcha asboblarning tarixi, QR kodi va voqealar jurnali
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadList} disabled={loading} className="gap-1.5">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""}/>
            Yangilash
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <Input
                  className="pl-9 h-9"
                  placeholder="Asbob nomi, kategoriya, QR kod..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-9 px-3 rounded-md border border-border bg-background text-sm"
                value={shopFilter}
                onChange={e => setShopFilter(e.target.value)}
              >
                <option value="">Barcha do'konlar</option>
                {uniqueShops.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className="h-9 px-3 rounded-md border border-border bg-background text-sm"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">Barcha holatlar</option>
                <option value="available">Mavjud</option>
                <option value="rented">Ijarada</option>
                <option value="maintenance">Ta'mirda</option>
                <option value="retired">Faolsiz</option>
              </select>
              {(search || shopFilter || statusFilter) && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setShopFilter(""); setStatusFilter(""); }}>
                  Filtrni tozalash
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {loading ? "Yuklanmoqda..." : `${filtered.length} ta asbob (jami: ${tools.length})`}
            </p>
          </CardContent>
        </Card>

        {/* Tools list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => <div key={i} className="h-36 bg-muted animate-pulse rounded-xl"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30"/>
            <p>Asbob topilmadi</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(tool => (
              <Card
                key={tool.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => openPassport(tool.qr_code)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{tool.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 size={10}/> {tool.shop_name}
                      </div>
                    </div>
                    <Badge className={`${STATUS_STYLES[tool.status] || "bg-gray-100 text-gray-600"} border-0 text-xs shrink-0 ml-2`}>
                      {tool.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Tag size={10}/> {tool.category}
                    {tool.custom_barcode && (
                      <span className="ml-2 font-mono bg-secondary px-1 rounded">{tool.custom_barcode}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-sm font-bold text-blue-700">{Number(tool.rental_count) || 0}</p>
                      <p className="text-xs text-blue-600">Ijara</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2">
                      <p className="text-sm font-bold text-orange-700">{Number(tool.damage_count) || 0}</p>
                      <p className="text-xs text-orange-600">Shikast</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-sm font-bold text-gray-700">{Number(tool.event_count) || 0}</p>
                      <p className="text-xs text-gray-600">Voqea</p>
                    </div>
                  </div>

                  {tool.qr_code && (
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <QrCode size={11}/> <code className="truncate max-w-24">{tool.qr_code}</code>
                      </div>
                      <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        Ko'rish <ExternalLink size={10}/>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Passport detail modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600"/>
              {passportLoading ? "Yuklanmoqda..." : `${passportData?.tool?.name} — Pasport`}
            </DialogTitle>
          </DialogHeader>
          {passportLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"/>)}
            </div>
          ) : passportData && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Do'kon:</span> <strong>{passportData.tool?.shop_name}</strong></div>
                  <div><span className="text-muted-foreground">Kategoriya:</span> <strong>{passportData.tool?.category}</strong></div>
                  <div><span className="text-muted-foreground">Holat:</span> <Badge className={`${STATUS_STYLES[passportData.tool?.status] || ""} border-0 text-xs`}>{passportData.tool?.status}</Badge></div>
                  <div><span className="text-muted-foreground">Barcode:</span> <code className="text-xs">{passportData.tool?.custom_barcode || "—"}</code></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <a href={`/passport/${passportData.tool?.qr_code}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    onClick={e => e.stopPropagation()}>
                    <ExternalLink size={11}/> Ommaviy sahifani ko'rish
                  </a>
                  <span className="text-muted-foreground text-xs">•</span>
                  <span className="text-xs text-muted-foreground">QR: <code>{passportData.tool?.qr_code}</code></span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Ijaralar", value: passportData.stats?.total_rentals || 0, cls: "text-blue-600" },
                  { label: "Ta'mirlar", value: passportData.stats?.total_repairs || 0, cls: "text-orange-600" },
                  { label: "Texnik", value: passportData.stats?.total_maintenance || 0, cls: "text-green-600" },
                  { label: "Xarajat", value: `${Number(passportData.stats?.total_maintenance_cost||0).toLocaleString()} s`, cls: "text-purple-600" },
                ].map(s => (
                  <div key={s.label} className="bg-secondary rounded-lg p-3 text-center">
                    <p className={`font-bold text-base ${s.cls}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1">
                  <BarChart2 size={14}/> Voqealar tarixi ({passportData.events?.length || 0} ta)
                </h3>
                {passportData.events?.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-6">Voqealar yo'q</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {passportData.events?.map((ev: any) => (
                      <div key={ev.id} className="flex gap-3 p-3 border rounded-lg text-sm">
                        <div className="mt-0.5 shrink-0"><EventIcon type={ev.event_type}/></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{ev.title}</p>
                          {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>{new Date(ev.created_at).toLocaleDateString("uz-UZ")}</span>
                            {ev.performed_by && <span>Bajaruvchi: {ev.performed_by}</span>}
                            {ev.cost && <span className="text-orange-600 font-medium">{Number(ev.cost).toLocaleString()} so'm</span>}
                          </div>
                        </div>
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded shrink-0">
                          {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
