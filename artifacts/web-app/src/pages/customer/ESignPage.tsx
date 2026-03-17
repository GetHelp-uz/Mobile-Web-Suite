import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, PenLine, CheckCircle, XCircle, Download,
  RotateCcw, Shield, Clock, ExternalLink,
} from "lucide-react";

type Rental = {
  id: number; status: string; started_at: string; due_date: string;
  rental_price: number; deposit_amount: number; contract_signed: boolean;
  contract_signed_at: string | null; tool_name: string; shop_name: string;
};

type ESignStatus = {
  signed: boolean; signedAt: string | null; hasSignature: boolean; ip: string | null;
};

export default function ESignPage() {
  const { toast } = useToast();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [signDialog, setSignDialog] = useState<Rental | null>(null);
  const [signStatuses, setSignStatuses] = useState<Record<number, ESignStatus>>({});
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  // Canvas imzo
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/rentals?limit=20", { headers: h });
      const d = await r.json();
      const myRentals: Rental[] = d.rentals || [];
      setRentals(myRentals);

      // Har bir ijara uchun imzo holatini olamiz
      const statusMap: Record<number, ESignStatus> = {};
      await Promise.all(myRentals.slice(0, 10).map(async rental => {
        try {
          const sr = await fetch(`/api/contracts/rental/${rental.id}/esign`, { headers: h });
          if (sr.ok) statusMap[rental.id] = await sr.json();
        } catch { /* ignore */ }
      }));
      setSignStatuses(statusMap);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Canvas imzo funksiyalari
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawing.current = true;
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => { isDrawing.current = false; };

  const clearSignature = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!signDialog || !agreed) return;
    if (!hasSignature) {
      toast({ title: "Imzo kerak", description: "Iltimos, quyidagi maydonga imzo chizing", variant: "destructive" });
      return;
    }

    const canvas = canvasRef.current!;
    const signatureData = canvas.toDataURL("image/png");

    setSigning(true);
    try {
      const r = await fetch(`/api/contracts/${signDialog.id}/sign`, {
        method: "POST", headers: h,
        body: JSON.stringify({ agreed: true, signatureData }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: "Imzolandi!", description: "Shartnoma muvaffaqiyatli imzolandi" });
      setSignDialog(null);
      setAgreed(false);
      setHasSignature(false);
      load();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setSigning(false);
    }
  };

  const openSignDialog = (rental: Rental) => {
    setSignDialog(rental);
    setAgreed(false);
    setHasSignature(false);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, 100);
  };

  if (loading) {
    return <DashboardLayout><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}</div></DashboardLayout>;
  }

  const unsignedRentals = rentals.filter(r => !r.contract_signed && r.status === "active");
  const signedRentals = rentals.filter(r => r.contract_signed);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">Elektron imzo</h1>
        <p className="text-muted-foreground">Ijara shartnomalarini raqamli imzolang</p>
      </div>

      {/* Imzolanmagan shartnomalar */}
      {unsignedRentals.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Imzo kutmoqda</h2>
            <Badge variant="destructive">{unsignedRentals.length}</Badge>
          </div>
          <div className="space-y-3">
            {unsignedRentals.map(rental => (
              <Card key={rental.id} className="border-2 border-orange-200 bg-orange-50/30">
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{rental.tool_name}</p>
                      <p className="text-sm text-muted-foreground">{rental.shop_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Muddati: {new Date(rental.due_date).toLocaleDateString("uz-UZ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <a href={`/api/contracts/${rental.id}/pdf`} target="_blank" rel="noopener noreferrer">
                        <Download size={14} /> PDF
                      </a>
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => openSignDialog(rental)}>
                      <PenLine size={14} /> Imzolash
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Imzolangan shartnomalar */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" /> Imzolangan shartnomalar
        </h2>
        {signedRentals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p>Imzolangan shartnomalar yo'q</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {signedRentals.map(rental => {
              const status = signStatuses[rental.id];
              return (
                <Card key={rental.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={18} className="text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{rental.tool_name}</p>
                        <p className="text-sm text-muted-foreground">{rental.shop_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="success" as any className="text-xs bg-green-100 text-green-700">
                            <CheckCircle size={10} className="mr-1" /> Imzolangan
                          </Badge>
                          {status?.hasSignature && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <PenLine size={10} /> Raqamli imzo
                            </Badge>
                          )}
                          {rental.contract_signed_at && (
                            <span className="text-xs text-muted-foreground">
                              <Clock size={10} className="inline mr-1" />
                              {new Date(rental.contract_signed_at).toLocaleDateString("uz-UZ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <a href={`/api/contracts/${rental.id}/pdf`} target="_blank" rel="noopener noreferrer">
                        <Download size={14} /> PDF yuklab olish
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Imzolash Dialog */}
      <Dialog open={!!signDialog} onOpenChange={v => { if (!v) { setSignDialog(null); setAgreed(false); setHasSignature(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine size={20} /> Shartnomani imzolash
            </DialogTitle>
          </DialogHeader>

          {signDialog && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-secondary">
                <p className="font-semibold">{signDialog.tool_name}</p>
                <p className="text-sm text-muted-foreground">{signDialog.shop_name}</p>
              </div>

              {/* Imzo maydoni */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold">Imzongizni chizing</label>
                  <Button type="button" size="sm" variant="ghost" onClick={clearSignature} className="gap-1 h-7 text-xs">
                    <RotateCcw size={12} /> Tozalash
                  </Button>
                </div>
                <div className="relative border-2 border-dashed border-border rounded-xl overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={460}
                    height={180}
                    className="w-full touch-none cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <PenLine size={16} /> Bu yerga imzo chizing
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rozilik */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary"
                />
                <div>
                  <p className="text-sm font-semibold">Shartnoma shartlariga roziman</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Men ushbu ijara shartnomasi shartlarini o'qib chiqdim va ularga to'liq roziman. 
                    Mening raqamli imzom qonuniy kuchga ega.
                  </p>
                </div>
              </label>

              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-xl bg-blue-50">
                <Shield size={14} className="text-blue-600 flex-shrink-0" />
                Imzongiz xavfsiz tarzda saqlanadi. IP manzil va vaqt qayd etiladi.
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSignDialog(null)}>Bekor</Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={!agreed || !hasSignature || signing}
                  onClick={handleSign}
                >
                  <PenLine size={16} />
                  {signing ? "Imzolanmoqda..." : "Imzolash"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
