import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, PenLine, CheckCircle, Shield, Download,
  RotateCcw, Building2, User, CalendarDays, Banknote,
  Phone, MapPin, AlertCircle, Check, Loader2,
} from "lucide-react";

type ContractData = {
  contractNumber: string;
  rentalId: number;
  signed: boolean;
  startDate: string;
  dueDate: string;
  days: number;
  tool: { name: string; category: string; pricePerDay: number; deposit: number };
  customer: { name: string; phone: string; passport?: string };
  shop: { name: string; address?: string; phone?: string; ownerName?: string; ownerSignature?: string };
  totals: { rentalCost: number; deposit: number; paymentMethod: string };
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, "0")}.${(dt.getMonth() + 1).toString().padStart(2, "0")}.${dt.getFullYear()}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Naqd pul", click: "Click", payme: "Payme", paynet: "Paynet", uzum: "Uzum Bank",
};

interface Props {
  rentalId: number | null;
  open: boolean;
  onClose: () => void;
  onSigned: () => void;
}

export function RentalContractModal({ rentalId, open, onClose, onSigned }: Props) {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { Authorization: `Bearer ${token}` };

  const [data, setData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  // Canvas imzo
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Contract text sections bilan ko'rsatish
  const [showFullContract, setShowFullContract] = useState(false);

  const load = useCallback(async () => {
    if (!rentalId) return;
    setLoading(true);
    setData(null);
    setSigned(false);
    setAgreed(false);
    setHasSignature(false);
    try {
      const r = await fetch(`${baseUrl}/api/contracts/${rentalId}/info`, { headers: h });
      if (!r.ok) throw new Error("Yuklab bo'lmadi");
      const d = await r.json();
      setData(d);
      if (d.signed) setSigned(true);
    } catch {
      toast({ title: "Xatolik", description: "Shartnoma ma'lumotlarini yuklab bo'lmadi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  useEffect(() => {
    if (open && rentalId) load();
  }, [open, rentalId, load]);

  // Canvas setup
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [open, data]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawing.current = true;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!agreed) { toast({ title: "Rozilik", description: "Shartnoma shartlariga rozilik bildiring", variant: "destructive" }); return; }
    if (!hasSignature) { toast({ title: "Imzo", description: "Imzongizni chizing", variant: "destructive" }); return; }

    const signatureData = canvasRef.current?.toDataURL("image/png") || null;
    setSigning(true);
    try {
      const r = await fetch(`${baseUrl}/api/contracts/${rentalId}/sign`, {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ agreed: true, signatureData }),
      });
      if (!r.ok) throw new Error("Imzolashda xatolik");
      setSigned(true);
      toast({ title: "✅ Shartnoma imzolandi!", description: "Ijara shartnomangiz tasdiqlandi." });
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    } finally {
      setSigning(false);
    }
  };

  const downloadPdf = () => {
    window.open(`${baseUrl}/api/contracts/${rentalId}/pdf`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl w-full max-h-[95vh] overflow-y-auto p-0 gap-0">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-5 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={20} className="text-white/80"/>
                <span className="text-white/80 text-sm font-medium">Ijara shartnomasi</span>
              </div>
              <h2 className="text-white font-bold text-xl leading-tight">
                Qurilish Uskunalarini Ijaraga Berish Shartnomasi
              </h2>
              {data && (
                <p className="text-blue-100 text-sm mt-1">
                  Shartnoma #{data.contractNumber} • GetHelp.uz platformasi
                </p>
              )}
            </div>
            {signed && (
              <Badge className="bg-green-400 text-green-900 font-semibold shrink-0">
                <CheckCircle size={12} className="mr-1"/> Imzolangan
              </Badge>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 size={32} className="animate-spin text-blue-600"/>
            <p>Shartnoma yuklanmoqda...</p>
          </div>
        ) : !data ? null : (
          <div className="p-6 space-y-6">

            {/* ── Shartnoma ma'lumotlari ─────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
                <CalendarDays size={18} className="text-blue-600 mt-0.5 shrink-0"/>
                <div>
                  <p className="text-xs text-blue-600 font-medium mb-0.5">Muddat</p>
                  <p className="font-bold text-sm">{fmtDate(data.startDate)}</p>
                  <p className="text-xs text-muted-foreground">→ {fmtDate(data.dueDate)} ({data.days} kun)</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-green-50 rounded-xl p-4 border border-green-100">
                <Banknote size={18} className="text-green-600 mt-0.5 shrink-0"/>
                <div>
                  <p className="text-xs text-green-600 font-medium mb-0.5">To'lov</p>
                  <p className="font-bold text-sm">{(data.totals.rentalCost).toLocaleString()} so'm</p>
                  <p className="text-xs text-muted-foreground">{PAYMENT_LABELS[data.totals.paymentMethod] || data.totals.paymentMethod}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4 border border-amber-100">
                <Shield size={18} className="text-amber-600 mt-0.5 shrink-0"/>
                <div>
                  <p className="text-xs text-amber-600 font-medium mb-0.5">Depozit</p>
                  <p className="font-bold text-sm">{Number(data.totals.deposit).toLocaleString()} so'm</p>
                  <p className="text-xs text-muted-foreground">Uskuna qaytarilsa qaytariladi</p>
                </div>
              </div>
            </div>

            {/* ── Asbob ─────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl p-4 border">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ijara predmeti</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-base">{data.tool.name}</p>
                  <p className="text-sm text-muted-foreground">{data.tool.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Kunlik narx</p>
                  <p className="font-bold text-blue-700">{Number(data.tool.pricePerDay).toLocaleString()} so'm</p>
                </div>
              </div>
            </div>

            {/* ── Shartnoma matni (qisqa + to'liq) ──────────────── */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText size={14}/> Shartnoma shartlari
                </span>
                <button
                  onClick={() => setShowFullContract(v => !v)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {showFullContract ? "Yig'ish" : "To'liq ko'rish"}
                </button>
              </div>
              <div className={`px-4 py-4 text-sm text-slate-700 leading-relaxed space-y-3 overflow-y-auto transition-all ${showFullContract ? "max-h-96" : "max-h-48"}`}>
                <ContractText data={data}/>
              </div>
            </div>

            {/* ── Imzolar ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Do'kon imzosi (avtomatik) */}
              <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={15} className="text-blue-600"/>
                  <span className="text-sm font-semibold text-blue-700">Ijara beruvchi imzosi</span>
                  <Badge variant="outline" className="text-xs ml-auto border-blue-300 text-blue-600">Avtomatik</Badge>
                </div>
                <div className="mb-3">
                  <p className="font-bold text-sm">{data.shop.name}</p>
                  {data.shop.ownerName && <p className="text-xs text-muted-foreground">Mas'ul: {data.shop.ownerName}</p>}
                  {data.shop.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin size={10}/> {data.shop.address}
                    </p>
                  )}
                  {data.shop.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone size={10}/> +{data.shop.phone}
                    </p>
                  )}
                </div>
                {/* Imzo ko'rsatish */}
                <div className="bg-white rounded-lg border border-blue-200 h-20 flex items-center justify-center overflow-hidden">
                  {data.shop.ownerSignature ? (
                    <img
                      src={data.shop.ownerSignature}
                      alt="Do'kon imzosi"
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <PenLine size={16} className="opacity-40"/>
                      <span className="text-xs opacity-60">Raqamli imzolangan</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle size={11}/>
                  <span>Do'kon imzosi tasdiqlangan</span>
                </div>
              </div>

              {/* Mijoz imzosi (canvas) */}
              <div className={`border-2 rounded-xl p-4 transition-colors ${signed ? "border-green-300 bg-green-50/50" : "border-dashed border-slate-300 bg-slate-50/50"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <User size={15} className="text-slate-600"/>
                  <span className="text-sm font-semibold text-slate-700">Mijoz imzosi</span>
                  {!signed && <Badge variant="outline" className="text-xs ml-auto text-amber-600 border-amber-300">Talab etiladi</Badge>}
                  {signed && <Badge className="text-xs ml-auto bg-green-500 text-white">Imzolandi</Badge>}
                </div>
                <div className="mb-3">
                  <p className="font-bold text-sm">{data.customer.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone size={10}/> +{data.customer.phone}
                  </p>
                  {data.customer.passport && (
                    <p className="text-xs text-muted-foreground mt-0.5">Pasport: {data.customer.passport}</p>
                  )}
                </div>

                {signed ? (
                  <div className="bg-white rounded-lg border border-green-200 h-20 flex flex-col items-center justify-center gap-1">
                    <CheckCircle size={20} className="text-green-500"/>
                    <span className="text-xs text-green-600 font-medium">Imzolandi</span>
                  </div>
                ) : (
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={80}
                      className="w-full h-20 bg-white rounded-lg border-2 border-slate-200 cursor-crosshair touch-none hover:border-blue-300 transition-colors"
                      style={{ touchAction: "none" }}
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                    />
                    {!hasSignature && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <PenLine size={16} className="text-slate-300 mb-1"/>
                        <span className="text-xs text-slate-400">Bu yerga imzo chizing</span>
                      </div>
                    )}
                    {hasSignature && (
                      <button
                        onClick={clearCanvas}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-white border rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                      >
                        <RotateCcw size={11}/>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Rozilik ────────────────────────────────────────── */}
            {!signed && (
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <div
                  onClick={() => setAgreed(v => !v)}
                  className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                    agreed ? "bg-blue-600 border-blue-600" : "border-slate-300 group-hover:border-blue-400"
                  }`}
                >
                  {agreed && <Check size={12} className="text-white"/>}
                </div>
                <span className="text-sm text-slate-700 leading-relaxed">
                  Men <strong>GetHelp.uz Ijaraga Berish Shartnomasini</strong> to'liq o'qib chiqdim va barcha shartlarga roziman.
                  Shartnoma {fmtDate(data.startDate)} kuni tuziladi va elektron shaklda qonuniy kuchga ega.
                </span>
              </label>
            )}

            {/* ── Alert: rozilik yoki imzo yo'q ─────────────────── */}
            {!signed && (!agreed || !hasSignature) && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0"/>
                <p className="text-xs text-amber-700">
                  Shartnomani imzolash uchun: <strong>1)</strong> shartnoma shartlariga roziliging bildiring,{" "}
                  <strong>2)</strong> imzo chizish maydoniga imzongizni chizing.
                </p>
              </div>
            )}

            {/* ── Tugmalar ───────────────────────────────────────── */}
            <div className="flex gap-3 pt-1">
              {signed ? (
                <>
                  <Button onClick={downloadPdf} variant="outline" className="flex-1 gap-2">
                    <Download size={15}/> PDF yuklab olish
                  </Button>
                  <Button onClick={onSigned} className="flex-1 bg-green-600 hover:bg-green-700 gap-2">
                    <CheckCircle size={15}/> Davom etish
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Keyinroq
                  </Button>
                  <Button
                    onClick={handleSign}
                    disabled={signing || !agreed || !hasSignature}
                    className="flex-2 px-8 bg-blue-600 hover:bg-blue-700 gap-2 disabled:opacity-50"
                  >
                    {signing ? (
                      <><Loader2 size={15} className="animate-spin"/> Imzolanmoqda...</>
                    ) : (
                      <><PenLine size={15}/> Shartnomani imzolash</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Shartnoma matni ─────────────────────────────────────────────────────────
function ContractText({ data }: { data: ContractData }) {
  const fmtMoney = (n: number) => `${Number(n).toLocaleString()} so'm`;

  return (
    <>
      <p className="font-semibold text-slate-800">QURILISH USKUNALARINI IJARAGA BERISH SHARTNOMASI (OFERTA)</p>

      <p>
        Ushbu shartnoma <strong>{data.shop.name}</strong> ("Ijara beruvchi") va{" "}
        <strong>{data.customer.name}</strong> ("Mijoz") o'rtasida tuziladi.
        Shartnoma raqami: <strong>{data.contractNumber}</strong>.
      </p>

      <div className="bg-slate-100 rounded-lg p-3 space-y-1">
        <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-1">Shartnoma predmeti</p>
        <p>Uskuna: <strong>{data.tool.name}</strong> ({data.tool.category})</p>
        <p>Ijara muddati: <strong>{data.days} kun</strong></p>
        <p>Kunlik narx: <strong>{fmtMoney(data.tool.pricePerDay)}</strong></p>
        <p>Jami: <strong>{fmtMoney(data.totals.rentalCost)}</strong></p>
        <p>Depozit: <strong>{fmtMoney(data.totals.deposit)}</strong></p>
        <p>To'lov usuli: <strong>{data.totals.paymentMethod}</strong></p>
      </div>

      <p><strong>1. Umumiy qoidalar.</strong> Mijoz ilovada ro'yxatdan o'tib "Roziman" tugmasini bosganidan so'ng ushbu shartnoma avtomatik ravishda kuchga kiradi.</p>

      <p><strong>2. Uskunani olish.</strong> Mijoz ilova orqali uskunani tanlaydi, ijara muddatini belgilaydi va buyurtma beradi. QR kod scan qilingan vaqtdan boshlab ijara boshlanadi.</p>

      <p><strong>3. Uskunani qaytarish.</strong> Uskuna qaytarilganda QR kod yana scan qilinadi, ishlatilgan kunlar hisoblanadi va to'lov chiqariladi. Mijoz to'lovni to'liq amalga oshirishi shart.</p>

      <p><strong>4. Mijoz majburiyatlari.</strong> Mijoz uskunani sindirmasligi, yo'qotmasligi, boshqalarga bermasligi, vaqtida qaytarishi va shikast yetkazmasligi shart.</p>

      <p><strong>5. Jarima.</strong> Kech qaytarilsa: kuniga +20%. Yo'qotilsa yoki sindirilib qaytarilmasa: to'liq narx to'lanadi.</p>

      <p><strong>6. Depozit.</strong> Uskuna butun qaytarilsa depozit qaytariladi.</p>

      <p><strong>7. Javobgarlik.</strong> Mijoz uskunadan foydalanish vaqtida yuz beradigan jarohat, zarar va avariya uchun o'zi javob beradi. Ijara beruvchi javobgar emas.</p>

      <p><strong>8. Ma'lumotlarni qayta ishlash.</strong> Ilova mijozning ism, telefon, pasport va manzil ma'lumotlarini saqlash va qayta ishlashga haqli.</p>

      <p><strong>9. Shartnomani bekor qilish.</strong> Qoidabuzarlik yoki qarzdorlik bo'lsa ijara beruvchi mijozni bloklashi mumkin.</p>

      <p className="text-slate-500 text-xs">
        Ilovadan foydalanish ushbu shartnomaga rozilik bildiradi. Shartnoma elektron shaklda tuzilgan va qonuniy kuchga ega.
        Ijara beruvchi: <strong>{data.shop.name}</strong> (GetHelp.uz platformasi). Mijoz: <strong>{data.customer.name}</strong>.
      </p>
    </>
  );
}
