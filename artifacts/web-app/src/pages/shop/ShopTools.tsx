import { useState, useRef, useEffect, useCallback } from "react";
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
import { Plus, QrCode, Download, Printer, Search, Satellite, Link, Camera, Shuffle, CheckCircle, AlertCircle, ScanLine, Barcode, X, BookOpen, ClipboardList, Wrench, AlertTriangle, FileText, PackageCheck, ArrowRightLeft, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import JsBarcode from "jsbarcode";
import { BarcodeScanner } from "@/components/BarcodeScanner";

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
  const [resolvedShopId, setResolvedShopId] = useState<number>(user?.shopId || 0);
  const shopId = resolvedShopId;

  useEffect(() => {
    if (user?.shopId) {
      setResolvedShopId(user.shopId);
      return;
    }
    const token = localStorage.getItem("gethelp_token") || "";
    const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
    fetch(`${baseUrl}/api/shops/my`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.shop?.id) {
        setResolvedShopId(d.shop.id);
        const storedUser = localStorage.getItem("gethelp_user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.shopId = d.shop.id;
            localStorage.setItem("gethelp_user", JSON.stringify(parsed));
          } catch {}
        }
      }
    }).catch(() => {});
  }, [user?.shopId]);

  const { data, isLoading } = useListShopTools(shopId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeMode, setCodeMode] = useState<"qr" | "barcode">("qr");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [passportOpen, setPassportOpen] = useState(false);
  const [passportTool, setPassportTool] = useState<Tool | null>(null);
  const [passportData, setPassportData] = useState<any>(null);
  const [passportLoading, setPassportLoading] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ eventType: "inspection", title: "", description: "", cost: "", performedBy: "" });
  const [addingEvent, setAddingEvent] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    name: "", category: "", description: "",
    pricePerDay: "", pricePerHour: "", depositAmount: "",
    gpsDeviceId: "", customBarcode: "",
  });
  const [gpsDevices, setGpsDevices] = useState<any[]>([]);
  const [showGPS, setShowGPS] = useState(false);
  const [showBarcodeSection, setShowBarcodeSection] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeStatus, setBarcodeStatus] = useState<"idle"|"checking"|"ok"|"taken">("idle");
  const [barcodeTakenInfo, setBarcodeTakenInfo] = useState<string>("");
  const barcodeCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formBarcodeRef = useRef<SVGSVGElement>(null);
  const [printAfterCreate, setPrintAfterCreate] = useState(false);
  const [thermalSize, setThermalSize] = useState<"58mm" | "80mm">("58mm");

  useEffect(() => {
    if (!shopId) return;
    const token = localStorage.getItem("gethelp_token") || "";
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
          const token = localStorage.getItem("gethelp_token") || "";
          const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
          await fetch(`${baseUrl}/api/gps/devices/${form.gpsDeviceId}/link`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ toolId: data.tool.id }),
          });
        }
        const shouldPrint = printAfterCreate;
        const createdTool = data?.tool;
        const savedSize = thermalSize;
        setCreateOpen(false);
        setShowGPS(false);
        setShowBarcodeSection(false);
        setBarcodeStatus("idle");
        setPrintAfterCreate(false);
        setForm({ name: "", category: "", description: "", pricePerDay: "", pricePerHour: "", depositAmount: "", gpsDeviceId: "", customBarcode: "" });
        queryClient.invalidateQueries({ queryKey: [`/api/shops/${shopId}/tools`] });
        toast({
          title: "Muvaffaqiyatli",
          description: form.customBarcode ? "Asbob va shtrix kod saqlandi!" : form.gpsDeviceId ? "Asbob qo'shildi va GPS ulandi!" : "Asbob qo'shildi va QR kod yaratildi"
        });
        if (shouldPrint && createdTool?.qrCode) {
          await printThermalLabel(createdTool, savedSize);
        }
      },
      onError: (e: any) => toast({ title: "Xatolik", description: e.message, variant: "destructive" }),
    }
  });

  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  // Shtrix kod o'zgarganda unique tekshirish
  const checkBarcodeUnique = useCallback(async (code: string) => {
    if (!code.trim()) { setBarcodeStatus("idle"); return; }
    setBarcodeStatus("checking");
    try {
      const r = await fetch(`${baseUrl}/api/tools/barcode-check/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.exists) {
        setBarcodeStatus("taken");
        setBarcodeTakenInfo(`Allaqachon ishlatilgan: "${d.tool?.name || "noma'lum"}" (Do'kon: ${d.tool?.shop_name || ""})`);
      } else {
        setBarcodeStatus("ok");
        setBarcodeTakenInfo("");
      }
    } catch {
      setBarcodeStatus("idle");
    }
  }, [baseUrl, token]);

  const handleBarcodeChange = (value: string) => {
    setForm(f => ({ ...f, customBarcode: value }));
    setBarcodeStatus("idle");
    if (barcodeCheckTimeout.current) clearTimeout(barcodeCheckTimeout.current);
    if (value.trim()) {
      barcodeCheckTimeout.current = setTimeout(() => checkBarcodeUnique(value), 600);
    }
  };

  const generateBarcode = () => {
    const code = `TR${shopId}${Date.now().toString(36).toUpperCase()}`;
    setForm(f => ({ ...f, customBarcode: code }));
    checkBarcodeUnique(code);
  };

  const handleScanResult = (scannedCode: string) => {
    setScannerOpen(false);
    handleBarcodeChange(scannedCode);
    setShowBarcodeSection(true);
  };

  // Formda barcode preview
  useEffect(() => {
    if (formBarcodeRef.current && form.customBarcode) {
      try {
        JsBarcode(formBarcodeRef.current, form.customBarcode, {
          format: "CODE128", lineColor: "#000", width: 1.8, height: 50,
          displayValue: true, fontSize: 12, margin: 8, background: "#fff",
        });
      } catch {}
    }
  }, [form.customBarcode]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) {
      toast({ title: "Xatolik", description: "Do'kon aniqlanmadi. Sahifani yangilang.", variant: "destructive" });
      return;
    }
    if (!form.name || !form.category || !form.pricePerDay || !form.depositAmount) {
      toast({ title: "Xatolik", description: "Majburiy maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    if (barcodeStatus === "taken") {
      toast({ title: "Shtrix kod band", description: barcodeTakenInfo, variant: "destructive" });
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
        ...(form.pricePerHour ? { pricePerHour: Number(form.pricePerHour) } : {}),
        ...(form.customBarcode ? { customBarcode: form.customBarcode } : {}),
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
      <p style="margin-top:12px;font-size:11px">GetHelp.uz | ID:${selectedTool?.id}</p>
    </body></html>`);
    pw.print();
    pw.close();
  };

  const printPassportLabel = async () => {
    if (!passportTool) return;
    const token = localStorage.getItem("gethelp_token") || "";
    const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/passport/${passportTool.qrCode}`)}`;
    let barcodeDataUrl = "";
    try {
      const r = await fetch(`${baseUrl}/api/tools/${passportTool.id}/barcode-image`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const blob = await r.blob();
        barcodeDataUrl = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch { /* ignore, label will skip barcode if unavailable */ }
    const pw = window.open("", "_blank");
    if (!pw) return;
    const barcodeHtml = barcodeDataUrl
      ? `<img src="${barcodeDataUrl}" alt="barcode" style="max-width:260px;height:60px;object-fit:contain;"/>`
      : `<p style="font-family:monospace;font-size:13px;letter-spacing:2px">${passportTool.qrCode}</p>`;
    pw.document.write(`<!DOCTYPE html><html><head><title>Yorliq — ${passportTool.name}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff;padding:20px}
        .card{border:2px solid #333;border-radius:8px;padding:18px 22px;max-width:320px;width:100%;text-align:center}
        .name{font-size:17px;font-weight:700;margin-bottom:4px}
        .price{font-size:13px;color:#555;margin-bottom:14px}
        .sep{border-top:1px dashed #ccc;margin:12px 0}
        .label{font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
        .foot{font-size:10px;color:#999;margin-top:14px}
        @media print{body{padding:0}button{display:none}}
      </style></head><body>
      <div class="card">
        <p class="label">GetHelp.uz asbob yorlig'i</p>
        <p class="name">${passportTool.name}</p>
        <p class="price">Kunlik: ${formatCurrency(passportTool.pricePerDay)} | Depozit: ${formatCurrency(passportTool.depositAmount)}</p>
        <div class="sep"></div>
        <p class="label">QR Kod (skaner qiling)</p>
        <img src="${qrUrl}" alt="QR" style="width:150px;height:150px;margin:6px auto"/>
        <div class="sep"></div>
        <p class="label">Shtrix kod</p>
        ${barcodeHtml}
        <p class="foot">GetHelp.uz | ID: ${passportTool.id}</p>
      </div>
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    pw.document.close();
  };

  const printThermalLabel = async (tool: { id: number; name: string; category?: string; qrCode: string; pricePerDay: number; depositAmount: number }, size: "58mm" | "80mm" = "58mm") => {
    const tok = localStorage.getItem("gethelp_token") || "";
    const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/passport/${tool.qrCode}`)}`;
    let barcodeDataUrl = "";
    try {
      const r = await fetch(`${base}/api/tools/${tool.id}/barcode-image`, { headers: { Authorization: `Bearer ${tok}` } });
      if (r.ok) {
        const blob = await r.blob();
        barcodeDataUrl = await new Promise<string>(res => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch { /* barcode olmasa ham chiqaradi */ }

    const pw = window.open("", "_blank");
    if (!pw) return;
    const w = size === "58mm" ? "54mm" : "76mm";
    const barcodeHtml = barcodeDataUrl
      ? `<img src="${barcodeDataUrl}" alt="barcode" style="width:100%;max-height:36px;object-fit:contain;margin-top:4px"/>`
      : `<div style="font-family:monospace;font-size:8px;letter-spacing:1px;word-break:break-all">${tool.qrCode}</div>`;

    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${tool.name}</title>
      <style>
        @page { size: ${size} auto; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Arial Narrow', Arial, sans-serif; background: #fff; width: ${w}; padding: 3mm; }
        .brand { font-size: 7px; text-align: center; color: #555; letter-spacing: .5px; margin-bottom: 2px; }
        .name  { font-size: 10px; font-weight: 700; text-align: center; line-height: 1.2; margin-bottom: 1px; }
        .cat   { font-size: 7px; text-align: center; color: #777; margin-bottom: 3px; }
        .sep   { border-top: 1px dashed #bbb; margin: 3px 0; }
        .qrwrap{ display: flex; justify-content: center; margin: 2px 0; }
        .qrwrap img { width: ${size === "58mm" ? "40mm" : "50mm"}; height: ${size === "58mm" ? "40mm" : "50mm"}; }
        .barwrap{ text-align: center; }
        .price { display: flex; justify-content: space-between; font-size: 8px; margin-top: 3px; }
        .price span { color: #444; }
        .price b { color: #000; }
        .foot { font-size: 6px; text-align: center; color: #aaa; margin-top: 3px; }
      </style></head><body>
      <div class="brand">GetHelp.uz — Asbob ijarasi</div>
      <div class="name">${tool.name}</div>
      ${tool.category ? `<div class="cat">${tool.category}</div>` : ""}
      <div class="sep"></div>
      <div class="qrwrap"><img src="${qrUrl}" alt="QR"/></div>
      <div class="sep"></div>
      <div class="barwrap">${barcodeHtml}</div>
      <div class="price">
        <span>Kunlik: <b>${formatCurrency(tool.pricePerDay)}</b></span>
        <span>Depozit: <b>${formatCurrency(tool.depositAmount)}</b></span>
      </div>
      <div class="foot">ID:${tool.id} | gethelp.uz</div>
      <script>window.onload=()=>{ window.print(); }</script>
    </body></html>`);
    pw.document.close();
  };

  const openPassport = async (tool: Tool) => {
    setPassportTool(tool);
    setPassportData(null);
    setPassportOpen(true);
    setPassportLoading(true);
    try {
      const token = localStorage.getItem("gethelp_token") || "";
      const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
      const r = await fetch(`${baseUrl}/api/tools/${tool.id}/passport`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Xatolik");
      setPassportData(await r.json());
    } catch {
      toast({ title: "Xatolik", description: "Pasport ma'lumotlarini yuklashda xatolik", variant: "destructive" });
    } finally {
      setPassportLoading(false);
    }
  };

  const submitEvent = async () => {
    if (!passportTool || !eventForm.title) return;
    setAddingEvent(true);
    try {
      const token = localStorage.getItem("gethelp_token") || "";
      const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
      const r = await fetch(`${baseUrl}/api/tools/${passportTool.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventType: eventForm.eventType,
          title: eventForm.title,
          description: eventForm.description || undefined,
          cost: eventForm.cost ? Number(eventForm.cost) : undefined,
          performedBy: eventForm.performedBy || undefined,
        }),
      });
      if (!r.ok) throw new Error("Xatolik");
      toast({ title: "Voqea qo'shildi" });
      setEventForm({ eventType: "inspection", title: "", description: "", cost: "", performedBy: "" });
      setAddEventOpen(false);
      await openPassport(passportTool);
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    } finally {
      setAddingEvent(false);
    }
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
                  <div className="flex gap-1 mt-auto flex-wrap">
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs min-w-0" onClick={()=>showCode(tool,"qr")}>
                      <QrCode size={12}/> QR
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs min-w-0" onClick={()=>showCode(tool,"barcode")}>
                      <span className="text-xs font-bold">|||</span> Barcode
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs min-w-0 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={()=>openPassport(tool)}>
                      <BookOpen size={12}/> Pasport
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

            {/* Shtrix / QR kod bo'limi */}
            <div className={`border-2 rounded-xl p-3 transition-colors ${showBarcodeSection ? "border-primary/30 bg-primary/5" : "border-dashed border-border"}`}>
              <button type="button"
                className="flex items-center gap-2 text-sm font-medium w-full"
                onClick={() => setShowBarcodeSection(v => !v)}>
                <ScanLine className="h-4 w-4 text-orange-500" />
                <span>Shtrix / QR kod biriktirish</span>
                {form.customBarcode && barcodeStatus === "ok" && (
                  <Badge className="ml-1 text-xs bg-green-100 text-green-700 h-5">Tayyor</Badge>
                )}
                {barcodeStatus === "taken" && (
                  <Badge className="ml-1 text-xs bg-red-100 text-red-700 h-5">Band</Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{showBarcodeSection ? "▲" : "▼"}</span>
              </button>

              {showBarcodeSection && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Har bir shtrix/QR kod faqat bitta asbobga biriktiriladi.
                  </p>

                  {/* Input va tugmalar */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Shtrix/QR kod qiymati..."
                        value={form.customBarcode}
                        onChange={e => handleBarcodeChange(e.target.value)}
                        className={`pr-8 ${barcodeStatus === "ok" ? "border-green-500" : barcodeStatus === "taken" ? "border-red-500" : ""}`}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {barcodeStatus === "checking" && <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                        {barcodeStatus === "ok"       && <CheckCircle size={16} className="text-green-600" />}
                        {barcodeStatus === "taken"    && <AlertCircle size={16} className="text-red-600" />}
                      </div>
                    </div>
                    {form.customBarcode && (
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => handleBarcodeChange("")}>
                        <X size={14} />
                      </Button>
                    )}
                  </div>

                  {/* Xato xabar */}
                  {barcodeStatus === "taken" && (
                    <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{barcodeTakenInfo}</span>
                    </div>
                  )}
                  {barcodeStatus === "ok" && (
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg p-2">
                      <CheckCircle size={14} />
                      <span>Bu kod bo'sh — asbobga biriktirish mumkin</span>
                    </div>
                  )}

                  {/* Tugmalar qatori */}
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={generateBarcode}>
                      <Shuffle size={13} /> Avtomatik generatsiya
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => setScannerOpen(true)}>
                      <Camera size={13} /> Kamera bilan skan
                    </Button>
                  </div>

                  {/* Barcode preview */}
                  {form.customBarcode && barcodeStatus !== "taken" && (
                    <div className="bg-white rounded-xl p-3 border text-center">
                      <p className="text-xs text-muted-foreground mb-2">Ko'rinish:</p>
                      <div className="flex gap-4 justify-center items-center flex-wrap">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Shtrix kod</p>
                          <svg ref={formBarcodeRef as any} className="max-w-full" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">QR kod</p>
                          <QRCodeSVG value={form.customBarcode} size={72} level="M" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

            {/* Termal printer chop etish bo'limi */}
            <div className={`border-2 rounded-xl p-3 transition-colors ${printAfterCreate ? "border-blue-300 bg-blue-50/50" : "border-dashed border-border"}`}>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printAfterCreate}
                  onChange={e => setPrintAfterCreate(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <Printer className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Qo'shgandan keyin termal printer chop etish</span>
                <span className="ml-auto text-xs text-muted-foreground">(ixtiyoriy)</span>
              </label>

              {printAfterCreate && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    QR kod va shtrix kod yorlig'i printer dialogida ochiladi.
                  </p>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-medium text-muted-foreground">Qog'oz kengligi:</span>
                    <div className="flex gap-1.5">
                      {(["58mm", "80mm"] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setThermalSize(s)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${thermalSize === s ? "bg-blue-600 text-white border-blue-600" : "border-border text-muted-foreground hover:border-blue-400"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">
                      {thermalSize === "58mm" ? "— kichik termal" : "— katta termal"}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 rounded-lg p-2 border border-blue-100">
                    <Printer size={13} className="mt-0.5 flex-shrink-0" />
                    <span>Saqlash tugmasini bosganingizdan so'ng printer dialogi avtomatik ochiladi</span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={()=>setCreateOpen(false)}>Bekor</Button>
              <Button type="submit" disabled={createTool.isPending || barcodeStatus === "taken"} className="gap-1.5">
                {createTool.isPending ? "Saqlanmoqda..." :
                  form.customBarcode && barcodeStatus === "ok" ? "Qo'shish va shtrix kod saqlash" : "Qo'shish va QR yaratish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kamera scanner */}
      {scannerOpen && (
        <BarcodeScanner
          onScan={handleScanResult}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Asbob Pasporti Modal */}
      <Dialog open={passportOpen} onOpenChange={setPassportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600"/>
              Asbob Pasporti — {passportTool?.name}
            </DialogTitle>
          </DialogHeader>
          {passportLoading ? (
            <div className="py-16 text-center text-muted-foreground">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3"/>
              <p>Yuklanmoqda...</p>
            </div>
          ) : passportData ? (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Jami ijaralar", value: passportData.stats?.total_rentals || 0, icon: <ClipboardList size={14}/>, color: "text-blue-600" },
                  { label: "Ta'mirlar", value: passportData.stats?.total_repairs || 0, icon: <Wrench size={14}/>, color: "text-orange-600" },
                  { label: "Texnik xizmat", value: passportData.stats?.total_maintenance || 0, icon: <PackageCheck size={14}/>, color: "text-green-600" },
                  { label: "Xarajat (UZS)", value: Number(passportData.stats?.total_maintenance_cost||0).toLocaleString(), icon: <Tag size={14}/>, color: "text-purple-600" },
                ].map(s => (
                  <div key={s.label} className="bg-secondary rounded-lg p-3 text-center">
                    <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
                    <p className="font-bold text-sm">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Public link */}
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Link size={14} className="text-blue-600 shrink-0"/>
                <span className="text-xs text-blue-700 flex-1 truncate">
                  {window.location.origin}/passport/{passportTool?.qrCode}
                </span>
                <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/passport/${passportTool?.qrCode}`);
                  toast({ title: "Nusxalandi!" });
                }}>
                  Nusxa
                </Button>
              </div>

              {/* Events list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Voqealar tarixi</h3>
                  <Button size="sm" className="gap-1 text-xs h-7" onClick={() => setAddEventOpen(true)}>
                    <Plus size={12}/> Voqea qo'shish
                  </Button>
                </div>
                {passportData.events?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Hali voqealar yo'q</p>
                ) : (
                  <div className="space-y-2">
                    {passportData.events?.map((ev: any) => (
                      <div key={ev.id} className="flex gap-3 p-3 border rounded-lg text-sm">
                        <div className="shrink-0 mt-0.5">
                          {ev.event_type === "repair" ? <Wrench size={14} className="text-orange-500"/> :
                           ev.event_type === "damage" ? <AlertTriangle size={14} className="text-red-500"/> :
                           ev.event_type === "note" ? <FileText size={14} className="text-gray-500"/> :
                           ev.event_type === "transferred" ? <ArrowRightLeft size={14} className="text-purple-500"/> :
                           <ClipboardList size={14} className="text-blue-500"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{ev.title}</p>
                          {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>{new Date(ev.created_at).toLocaleDateString("uz-UZ")}</span>
                            {ev.performed_by && <span>Bajaruvchi: {ev.performed_by}</span>}
                            {ev.cost && <span className="text-orange-600 font-medium">{Number(ev.cost).toLocaleString()} so'm</span>}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs bg-secondary px-2 py-0.5 rounded capitalize">{ev.event_type.replace("_"," ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {passportTool && !passportLoading && (
            <DialogFooter className="pt-2 border-t mt-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={printPassportLabel}>
                <Printer size={14}/> Yorliq chop etish
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Voqea qo'shish modal */}
      <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yangi voqea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Voqea turi</label>
              <Select value={eventForm.eventType} onValueChange={v => setEventForm(f => ({ ...f, eventType: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {[
                    ["inspection","Ko'rik / Tekshiruv"],["repair","Ta'mirlash"],["modification","Modifikatsiya"],
                    ["maintenance_started","Texnik xizmat boshlandi"],
                    ["maintenance_completed","Texnik xizmat tugadi"],["damage","Shikast"],["note","Eslatma"],
                    ["sold","Sotildi"],["transferred","O'tkazildi"],
                  ].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Sarlavha *</label>
              <Input className="h-9 text-sm" placeholder="Masalan: Yillik ko'rik" value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Tavsif</label>
              <Input className="h-9 text-sm" placeholder="Qo'shimcha izoh" value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">Xarajat (so'm)</label>
                <Input type="number" className="h-9 text-sm" placeholder="0" value={eventForm.cost} onChange={e => setEventForm(f => ({ ...f, cost: e.target.value }))}/>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Bajaruvchi</label>
                <Input className="h-9 text-sm" placeholder="Ism" value={eventForm.performedBy} onChange={e => setEventForm(f => ({ ...f, performedBy: e.target.value }))}/>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddEventOpen(false)}>Bekor</Button>
            <Button size="sm" onClick={submitEvent} disabled={addingEvent || !eventForm.title}>
              {addingEvent ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
