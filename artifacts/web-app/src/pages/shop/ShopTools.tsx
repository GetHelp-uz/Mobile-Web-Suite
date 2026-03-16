import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListShopTools, useCreateTool } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Plus, QrCode, Download, Printer, Search, Satellite, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import JsBarcode from "jsbarcode";

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "Mavjud", color: "bg-green-100 text-green-700" },
  rented: { label: "Ijarada", color: "bg-yellow-100 text-yellow-700" },
  maintenance: { label: "Ta'mirda", color: "bg-red-100 text-red-700" },
};

const CATEGORIES = [
  "Qazish asboblari", "Burg'ulash asboblari", "Kesish asboblari",
  "Mixlash asboblari", "Ko'tarish uskunalari", "Elaklash uskunalari",
  "Beton aralashtirgich", "Kompressor", "Generator", "Boshqa",
];

type Tool = {
  id: number; name: string; category: string; shopId: number;
  pricePerDay: number; pricePerHour?: number; depositAmount: number;
  status: string; qrCode: string; barcode?: string; imageUrl?: string; description?: string;
};

function BarcodeImg({ value, svgRef }: { value: string; svgRef: React.RefObject<SVGSVGElement | null> }) {
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128", lineColor: "#000",
          width: 2, height: 70, displayValue: true,
          fontSize: 14, margin: 12, background: "#fff",
        });
      } catch {}
    }
  }, [value]);
  return <svg ref={svgRef as any} />;
}

export default function ShopTools() {
  const { user } = useAuth();
  const shopId = user?.shopId || 0;
  const { data, isLoading } = useListShopTools(shopId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeMode, setCodeMode] = useState<"qr" | "barcode">("qr");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    name: "", category: "", description: "",
    pricePerDay: "", pricePerHour: "", depositAmount: "",
    gpsDeviceId: "",
  });
  const [gpsDevices, setGpsDevices] = useState<any[]>([]);
  const [showGPS, setShowGPS] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    const token = localStorage.getItem("tool_rent_token") || "";
    const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
    fetch(`${baseUrl}/api/gps/devices/shop/${shopId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      const unlinked = (d.devices || []).filter((g: any) => !g.tool_id);
      setGpsDevices(unlinked);
    }).catch(() => {});
  }, [shopId, createOpen]);

  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  const createTool = useCreateTool({
    mutation: {
      onSuccess: async (data: any) => {
        // GPS qurilma ulash (agar tanlangan bo'lsa)
        if (form.gpsDeviceId && data?.tool?.id) {
          const token = localStorage.getItem("tool_rent_token") || "";
          const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
          await fetch(`${baseUrl}/api/gps/devices/${form.gpsDeviceId}/link`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ toolId: data.tool.id }),
          });
        }
        setCreateOpen(false);
        setShowGPS(false);
        setForm({ name: "", category: "", description: "", pricePerDay: "", pricePerHour: "", depositAmount: "", gpsDeviceId: "" });
        queryClient.invalidateQueries({ queryKey: [`/api/shops/${shopId}/tools`] });
        toast({
          title: "Muvaffaqiyatli",
          description: form.gpsDeviceId ? "Asbob qo'shildi va GPS ulandi!" : "Asbob qo'shildi va QR kod yaratildi"
        });
      },
      onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.pricePerDay || !form.depositAmount) {
      toast({ title: "Xatolik", description: "Majburiy maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    createTool.mutate({
      data: {
        shopId,
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        pricePerDay: Number(form.pricePerDay),
        depositAmount: Number(form.depositAmount),
      }
    });
  };

  const showCode = (tool: Tool, mode: "qr" | "barcode") => {
    setSelectedTool(tool);
    setCodeMode(mode);
    setCodeOpen(true);
  };

  const downloadQR = () => {
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr_${selectedTool?.name || "tool"}.png`;
    a.click();
  };

  const downloadBarcode = () => {
    if (!barcodeSvgRef.current) return;
    const svg = barcodeSvgRef.current;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcode_${selectedTool?.name || "tool"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printCode = () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const qrEl = document.getElementById("print-qr");
    const barEl = document.getElementById("print-bar");
    pw.document.write(`<html><head><title>${selectedTool?.name}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;font-family:sans-serif;padding:30px}
      h2{margin:0 0 4px}p{margin:2px 0;color:#666;font-size:13px}hr{width:100%;margin:16px 0}
      @media print{body{padding:10px}}</style></head><body>
      <h2>${selectedTool?.name}</h2>
      <p>${selectedTool?.category} | Kunlik: ${formatCurrency(selectedTool?.pricePerDay||0)} | Depozit: ${formatCurrency(selectedTool?.depositAmount||0)}</p>
      <hr/>${qrEl?.outerHTML || ""}
      <hr/>${barEl?.outerHTML || ""}
      <p style="margin-top:12px;font-size:11px">ToolRent | ID:${selectedTool?.id}</p>
    </body></html>`);
    pw.print();
    pw.close();
  };

  const tools = (data?.tools || []) as Tool[];
  const filtered = tools.filter(t => {
    const ms = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    const mf = filterStatus === "all" || t.status === filterStatus;
    return ms && mf;
  });

  const barcodeValue = selectedTool?.barcode || selectedTool?.qrCode || String(selectedTool?.id || "0");
  const qrPayload = JSON.stringify({ id: selectedTool?.id, shop: shopId, code: selectedTool?.qrCode, name: selectedTool?.name });

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold mb-1">Inventar boshqaruvi</h1>
          <p className="text-muted-foreground">{tools.length} ta asbob ro'yxatda</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={18} /> Asbob qo'shish
        </Button>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Asbob nomi yoki kategoriya..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[["all","Barchasi"],["available","Mavjud"],["rented","Ijarada"],["maintenance","Ta'mirda"]].map(([v,l])=>(
            <Button key={v} variant={filterStatus===v?"default":"outline"} size="sm" onClick={()=>setFilterStatus(v)}>{l}</Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_,i)=><div key={i} className="h-64 rounded-2xl bg-muted animate-pulse"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <QrCode size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-xl font-semibold mb-2">Asboblar yo'q</p>
          <p>Yangi asbob qo'shish uchun yuqoridagi tugmani bosing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(tool => {
            const st = statusLabels[tool.status] || { label: tool.status, color: "bg-gray-100 text-gray-700" };
            return (
              <Card key={tool.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                  {tool.imageUrl
                    ? <img src={tool.imageUrl} alt={tool.name} className="w-full h-full object-cover"/>
                    : <span className="text-5xl opacity-20">🔧</span>}
                  <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full ${st.color}`}>{st.label}</span>
                </div>
                <CardContent className="p-4 flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground mb-1">{tool.category}</p>
                  <h3 className="font-bold text-base line-clamp-1 mb-3">{tool.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-muted-foreground">Kunlik</p>
                      <p className="font-bold text-sm">{formatCurrency(tool.pricePerDay)}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-muted-foreground">{tool.pricePerHour ? "Soatlik" : "Depozit"}</p>
                      <p className="font-bold text-sm">{formatCurrency(tool.pricePerHour ?? tool.depositAmount)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={()=>showCode(tool,"qr")}>
                      <QrCode size={13}/> QR Kod
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={()=>showCode(tool,"barcode")}>
                      <span className="text-xs font-bold">|||</span> Barcode
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR / Barcode dialog */}
      <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedTool?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant={codeMode==="qr"?"default":"outline"} size="sm" className="flex-1" onClick={()=>setCodeMode("qr")}>
                <QrCode size={14} className="mr-1"/> QR Kod
              </Button>
              <Button variant={codeMode==="barcode"?"default":"outline"} size="sm" className="flex-1" onClick={()=>setCodeMode("barcode")}>
                <span className="mr-1 font-bold">|||</span> Shtrix kod
              </Button>
            </div>

            <div className="flex flex-col items-center bg-white rounded-xl p-6 border">
              {codeMode==="qr" ? (
                <div id="print-qr" className="flex flex-col items-center gap-2">
                  <QRCodeCanvas id="qr-canvas" value={qrPayload} size={180} level="H" includeMargin/>
                  <p className="text-xs text-muted-foreground font-mono">{selectedTool?.qrCode?.slice(0,16)}</p>
                </div>
              ) : (
                <div id="print-bar">
                  <BarcodeImg value={barcodeValue} svgRef={barcodeSvgRef}/>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-secondary rounded-lg p-2 text-center">
                <p className="text-muted-foreground">Kunlik</p>
                <p className="font-bold">{formatCurrency(selectedTool?.pricePerDay||0)}</p>
              </div>
              {selectedTool?.pricePerHour ? (
                <div className="bg-secondary rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">Soatlik</p>
                  <p className="font-bold">{formatCurrency(selectedTool.pricePerHour)}</p>
                </div>
              ) : <div/>}
              <div className="bg-secondary rounded-lg p-2 text-center">
                <p className="text-muted-foreground">Depozit</p>
                <p className="font-bold">{formatCurrency(selectedTool?.depositAmount||0)}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={printCode} className="gap-1"><Printer size={14}/> Chop</Button>
            <Button size="sm" onClick={codeMode==="qr"?downloadQR:downloadBarcode} className="gap-1"><Download size={14}/> Yuklab olish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yangi asbob dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus size={18}/> Yangi asbob qo'shish</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-1">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Asbob nomi *</label>
              <Input placeholder="Perforator, Bolgar, Generator..." value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Kategoriya *</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} required>
                <option value="">Kategoriyani tanlang...</option>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Tavsif</label>
              <Input placeholder="Asbob haqida qisqacha ma'lumot..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Kunlik narx *</label>
                <Input type="number" placeholder="50000" value={form.pricePerDay} onChange={e=>setForm(f=>({...f,pricePerDay:e.target.value}))} required min="0"/>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Soatlik narx</label>
                <Input type="number" placeholder="10000" value={form.pricePerHour} onChange={e=>setForm(f=>({...f,pricePerHour:e.target.value}))} min="0"/>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Depozit *</label>
                <Input type="number" placeholder="200000" value={form.depositAmount} onChange={e=>setForm(f=>({...f,depositAmount:e.target.value}))} required min="0"/>
              </div>
            </div>

            {/* Ixtiyoriy GPS qurilma ulash */}
            <div className="border border-dashed rounded-xl p-3">
              <button type="button"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
                onClick={() => setShowGPS(v => !v)}>
                <Satellite className="h-4 w-4 text-blue-500" />
                GPS qurilma ulash (ixtiyoriy)
                <span className="ml-auto text-xs">{showGPS ? "▲" : "▼"}</span>
              </button>
              {showGPS && (
                <div className="mt-3">
                  {gpsDevices.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded-lg">
                      Mavjud GPS qurilmalar yo'q. Avval GPS Monitoring sahifasida qurilma qo'shing.
                    </div>
                  ) : (
                    <>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Asbobga biriktiriladigan GPS qurilma:</label>
                      <Select value={form.gpsDeviceId} onValueChange={v => setForm(f => ({ ...f, gpsDeviceId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="GPS qurilmani tanlang..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">GPS ulashmaslik</SelectItem>
                          {gpsDevices.map((g: any) => (
                            <SelectItem key={g.id} value={String(g.id)}>
                              <div className="flex items-center gap-2">
                                <Satellite className="h-3.5 w-3.5" />
                                {g.device_name} ({g.model} • {g.serial_number})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.gpsDeviceId && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded p-2">
                          <Link className="h-3.5 w-3.5" />
                          GPS qurilma asbobga ulanadi va xaritada ko'rinadi
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {form.name && (
              <div className="bg-secondary rounded-xl p-4 flex items-center gap-4">
                <div className="bg-white rounded-lg p-2 flex-shrink-0">
                  <QRCodeSVG value={`preview:${form.name}`} size={64} level="M"/>
                </div>
                <div className="text-xs">
                  <p className="font-bold text-sm mb-1">{form.name}</p>
                  <p className="text-muted-foreground">QR kod va shtrix kod saqlashdan keyin avtomatik yaratiladi</p>
                  {form.pricePerDay && <p>Kunlik: {formatCurrency(Number(form.pricePerDay))}</p>}
                  {form.pricePerHour && <p>Soatlik: {formatCurrency(Number(form.pricePerHour))}</p>}
                  {form.depositAmount && <p>Depozit: {formatCurrency(Number(form.depositAmount))}</p>}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={()=>setCreateOpen(false)}>Bekor</Button>
              <Button type="submit" disabled={createTool.isPending}>
                {createTool.isPending ? "Saqlanmoqda..." : "Qo'shish va QR yaratish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
