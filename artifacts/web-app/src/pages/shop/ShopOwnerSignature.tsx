import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  PenLine, RotateCcw, CheckCircle, Shield, Save, Info, FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function ShopOwnerSignature() {
  const { toast } = useToast();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Foydalanuvchi va do'kon ID
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const r = await fetch("/api/auth/me", { headers: h });
      return r.json();
    },
  });

  const shopId = me?.shopId;

  const { data: sigStatus, refetch: refetchSig } = useQuery({
    queryKey: ["shop-sig", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const r = await fetch(`/api/shops/${shopId}/owner-signature`, { headers: h });
      if (!r.ok) return { hasSignature: false };
      return r.json();
    },
  });

  // Canvas o'lchamini to'g'rilash
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 600;
    canvas.height = 200;
  }, []);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
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
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawing.current = true;
    setHasSignature(true);
    setSavedOk(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
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
    setSavedOk(false);
  };

  const handleSave = async () => {
    if (!shopId || !hasSignature) return;
    const canvas = canvasRef.current!;
    const signatureData = canvas.toDataURL("image/png");
    setSaving(true);
    try {
      const r = await fetch(`/api/shops/${shopId}/owner-signature`, {
        method: "PUT",
        headers: h,
        body: JSON.stringify({ signatureData }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSavedOk(true);
      refetchSig();
      toast({ title: "Saqlandi!", description: "Do'kon imzosi muvaffaqiyatli saqlandi. U barcha shartnomalar PDF sida avtomatik ko'rinadi." });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">Do'kon imzosi</h1>
        <p className="text-muted-foreground">
          Bir marta imzo qo'ying — u barcha shartnomalar PDF siga avtomatik joylanadi
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Holat */}
        <Card className={sigStatus?.hasSignature ? "border-green-200 bg-green-50/40" : "border-orange-200 bg-orange-50/30"}>
          <CardContent className="p-4 flex items-center gap-3">
            {sigStatus?.hasSignature ? (
              <>
                <CheckCircle size={22} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Imzo saqlangan</p>
                  <p className="text-sm text-green-700">Barcha yangi shartnomalar PDF sida sizning imzongiz avtomatik ko'rinadi</p>
                </div>
                <Badge className="ml-auto bg-green-600">Faol</Badge>
              </>
            ) : (
              <>
                <Info size={22} className="text-orange-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-800">Imzo saqlanmagan</p>
                  <p className="text-sm text-orange-700">Shartnoma PDFlarda imzo maydoni bo'sh ko'rinadi</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Imzo maydoni */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine size={18} /> Imzo chizish
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Quyidagi oq maydonga imzongizni chizing:</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearSignature}
                className="gap-1 h-7 text-xs"
                disabled={!hasSignature}
              >
                <RotateCcw size={12} /> Tozalash
              </Button>
            </div>

            <div className="relative border-2 border-dashed border-border rounded-xl overflow-hidden bg-white" style={{ touchAction: "none" }}>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full cursor-crosshair touch-none"
                style={{ display: "block" }}
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
                    <PenLine size={16} /> Bu yerga imzongizni chizing
                  </p>
                </div>
              )}
              {savedOk && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-lg">
                  <CheckCircle size={12} /> Saqlandi
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Shield size={14} className="text-blue-600 flex-shrink-0" />
              <span>Imzongiz xavfsiz saqlangach barcha shartnoma PDFlarida avtomatik paydo bo'ladi. Istalgan vaqt yangi imzo chizib yangilashingiz mumkin.</span>
            </div>

            <Button
              className="w-full gap-2"
              disabled={!hasSignature || saving}
              onClick={handleSave}
              size="lg"
            >
              <Save size={18} />
              {saving ? "Saqlanmoqda..." : "Imzoni saqlash"}
            </Button>
          </CardContent>
        </Card>

        {/* Ko'rsatma */}
        <Card className="bg-secondary/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <FileText size={16} /> Shartnomada qanday ko'rinadi?
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="bg-white rounded-lg p-3 border">
                <p className="font-semibold text-foreground mb-1">Ijara beruvchi (siz)</p>
                <p>Do'kon nomi</p>
                <p>Mas'ul: {me?.name || "..."}</p>
                <div className="mt-2 h-8 border border-dashed rounded flex items-center justify-center text-muted-foreground/60">
                  [ imzongiz bu yerda ]
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <p className="font-semibold text-foreground mb-1">Mijoz</p>
                <p>F.I.Sh: mijoz ismi</p>
                <p>Pasport/ID: AA1234567</p>
                <div className="mt-2 h-8 border border-dashed rounded flex items-center justify-center text-muted-foreground/60">
                  [ mijoz imzosi bu yerda ]
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Mijoz "Elektron imzo" sahifasida o'z imzosini qo'yadi — u ham avtomatik PDF ga joylanadi.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
