import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetTool, useCreateRental } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Clock, CreditCard, CheckCircle2, FileText, Upload, Heart, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

const paymentLabels: Record<string, string> = {
  click: "Click",
  payme: "Payme",
  paynet: "Paynet",
  cash: "Naqd pul",
};

const DOC_TYPES = [
  { value: "passport", label: "Pasport" },
  { value: "id_card", label: "ID karta" },
  { value: "driver_license", label: "Haydovchilik guvohnomasi" },
];

export default function ToolDetails() {
  const [, params] = useRoute("/tools/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: tool, isLoading } = useGetTool(id);
  const [rentDialogOpen, setRentDialogOpen] = useState(false);
  const [days, setDays] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"click" | "payme" | "paynet" | "cash">("cash");
  const [isFavorite, setIsFavorite] = useState(false);

  // Tasdiq turi: depozit yoki hujjat
  const [identType, setIdentType] = useState<"deposit" | "document">("deposit");
  const [docType, setDocType] = useState("passport");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { Authorization: `Bearer ${token}` };

  const createRental = useCreateRental({
    mutation: {
      onSuccess: async (rental: any) => {
        // Agar hujjat tanlansa, upload qilamiz
        if (identType === "document" && docFile && rental?.id) {
          const fd = new FormData();
          fd.append("file", docFile);
          fd.append("rentalId", String(rental.id));
          fd.append("documentType", docType);
          await fetch(`${baseUrl}/api/documents/upload`, { method: "POST", headers: h, body: fd });
        }
        // Loyallik ballari beriladi (API server ichida avtomatik)
        setRentDialogOpen(false);
        toast({ title: "Muvaffaqiyatli!", description: "Ijara so'rovi yuborildi! Loyallik ballari qo'shildi." });
        setLocation("/my-rentals");
      },
      onError: () => {
        toast({ title: "Xatolik", description: "Ijara yaratib bo'lmadi", variant: "destructive" });
      }
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setDocPreview(url);
    } else {
      setDocPreview(null);
    }
  };

  const handleRent = async () => {
    if (!user) return;
    if (identType === "document" && !docFile) {
      toast({ title: "Hujjat talab qilinadi", description: "Iltimos, hujjatingizni yuklang", variant: "destructive" });
      return;
    }
    createRental.mutate({
      data: {
        toolId: id,
        customerId: user.id,
        dueDate: addDays(new Date(), days).toISOString(),
        paymentMethod: paymentMethod,
      }
    });
  };

  const toggleFavorite = async () => {
    const method = isFavorite ? "DELETE" : "POST";
    await fetch(`${baseUrl}/api/favorites/${id}`, { method, headers: { ...h } });
    setIsFavorite(!isFavorite);
    toast({ title: isFavorite ? "Sevimlilardan olib tashlandi" : "Sevimlilarga qo'shildi!" });
  };

  if (isLoading) return <DashboardLayout><div className="animate-pulse h-96 bg-muted rounded-2xl" /></DashboardLayout>;
  if (!tool) return <DashboardLayout>Asbob topilmadi</DashboardLayout>;

  const rentalCost = tool.pricePerDay * days;
  const depositCost = identType === "deposit" ? tool.depositAmount : 0;
  const totalCost = rentalCost + depositCost;

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-white dark:bg-card rounded-3xl p-8 shadow-lg border border-border/50 flex items-center justify-center min-h-[500px] relative">
          <button onClick={toggleFavorite} className="absolute top-4 right-4 w-10 h-10 bg-white dark:bg-card rounded-full flex items-center justify-center shadow border border-border hover:bg-red-50 transition-colors">
            <Heart className={`h-5 w-5 ${isFavorite ? "text-red-500 fill-red-500" : "text-muted-foreground"}`} />
          </button>
          <img
            src={tool.imageUrl || `${import.meta.env.BASE_URL}images/placeholder-tool.png`}
            alt={tool.name}
            className="w-full max-w-md object-contain"
          />
        </div>

        <div>
          <Badge className="mb-4 text-sm px-3 py-1" variant="outline">{tool.category}</Badge>
          <h1 className="text-4xl font-display font-bold mb-4">{tool.name}</h1>
          <p className="text-lg text-muted-foreground mb-8">
            {tool.description || "Professional darajadagi uskuna. Keyingi loyihangiz uchun tayyor."}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <Card className="p-4 bg-primary text-primary-foreground border-none">
              <p className="text-primary-foreground/70 text-sm font-medium mb-1">Kunlik narx</p>
              <p className="text-3xl font-bold">{formatCurrency(tool.pricePerDay)}</p>
            </Card>
            <Card className="p-4 bg-secondary border-none">
              <p className="text-muted-foreground text-sm font-medium mb-1">Depozit miqdori</p>
              <p className="text-2xl font-bold">{formatCurrency(tool.depositAmount)}</p>
            </Card>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <Shield size={20} />
              </div>
              <div>
                <p className="font-semibold">Depozit yoki Hujjat</p>
                <p className="text-sm text-muted-foreground">Siz tanlashingiz mumkin: depozit yoki pasport</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="font-semibold">Sifat kafolati</p>
                <p className="text-sm text-muted-foreground">Har bir ijaradan oldin tekshiriladi</p>
              </div>
            </div>
          </div>

          {/* Narx kalkulyator */}
          <div className="bg-muted/50 rounded-2xl p-5 mb-5 border border-border">
            <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Narx hisobi</h3>
            <div className="flex items-center gap-3 mb-3">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDays(Math.max(1, days - 1))}>-</Button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold">{days}</span>
                <span className="text-muted-foreground ml-1.5 text-sm">kun</span>
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDays(days + 1)}>+</Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ijara ({days} kun)</span>
                <span className="font-medium">{formatCurrency(tool.pricePerDay * days)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Depozit (qaytariladi)</span>
                <span className="font-medium text-accent">{formatCurrency(tool.depositAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-bold">Jami to'lov</span>
                <span className="font-bold text-primary text-base">{formatCurrency(tool.pricePerDay * days + tool.depositAmount)}</span>
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full text-lg h-14" onClick={() => setRentDialogOpen(true)}>
            Ijara olish
          </Button>
        </div>
      </div>

      <Dialog open={rentDialogOpen} onOpenChange={setRentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ijarani rasmiylashtirish</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Muddat */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Muddat (kunlar)</label>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setDays(Math.max(1, days - 1))}>-</Button>
                <span className="text-xl font-bold w-8 text-center">{days}</span>
                <Button variant="outline" size="icon" onClick={() => setDays(days + 1)}>+</Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Qaytarish: <span className="font-semibold text-foreground">{format(addDays(new Date(), days), 'dd.MM.yyyy')}</span>
              </p>
            </div>

            {/* Tasdiq turi: depozit yoki hujjat */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Kafolat turi</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setIdentType("deposit")}
                  className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${identType === "deposit" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <CreditCard className="h-7 w-7 mx-auto mb-1.5 text-primary" />
                  <div className="font-semibold text-sm">Depozit</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatCurrency(tool.depositAmount)}</div>
                  <div className="text-xs text-green-600 mt-1">Qaytarib beriladi</div>
                </div>
                <div
                  onClick={() => setIdentType("document")}
                  className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${identType === "document" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <FileText className="h-7 w-7 mx-auto mb-1.5 text-primary" />
                  <div className="font-semibold text-sm">Hujjat yuklash</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Pasport yoki ID</div>
                  <div className="text-xs text-blue-600 mt-1">Depozitsiz</div>
                </div>
              </div>
            </div>

            {/* Hujjat yuklash maydoni */}
            {identType === "document" && (
              <div className="border-2 border-dashed border-border rounded-xl p-4">
                <div className="mb-2 flex gap-2">
                  {DOC_TYPES.map(dt => (
                    <button key={dt.value}
                      onClick={() => setDocType(dt.value)}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${docType === dt.value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                      {dt.label}
                    </button>
                  ))}
                </div>
                {docFile ? (
                  <div className="relative">
                    {docPreview ? (
                      <img src={docPreview} alt="Hujjat" className="w-full h-36 object-cover rounded-lg" />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-muted rounded-lg">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                        <span className="ml-2 text-sm">{docFile.name}</span>
                      </div>
                    )}
                    <button onClick={() => { setDocFile(null); setDocPreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <Upload className="h-8 w-8" />
                    <span className="text-sm font-medium">Hujjat rasmini yuklang</span>
                    <span className="text-xs">JPG, PNG yoki PDF (max 10MB)</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              </div>
            )}

            {/* To'lov usuli */}
            <div>
              <label className="text-sm font-semibold mb-2 block">To'lov usuli</label>
              <div className="grid grid-cols-4 gap-2">
                {(['click', 'payme', 'paynet', 'cash'] as const).map((method) => (
                  <div
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`cursor-pointer rounded-xl border-2 p-2 text-center font-medium text-sm transition-all ${paymentMethod === method ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    {paymentLabels[method]}
                  </div>
                ))}
              </div>
            </div>

            {/* Jami */}
            <div className="bg-secondary p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ijara ({days} kun)</span>
                <span>{formatCurrency(rentalCost)}</span>
              </div>
              {identType === "deposit" ? (
                <div className="flex justify-between text-sm">
                  <span>Depozit (qaytariladi)</span>
                  <span>{formatCurrency(depositCost)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Hujjat bilan — depozitsiz</span>
                  <span>+0 so'm</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex justify-between font-bold text-lg">
                <span>Jami to'lov</span>
                <span>{formatCurrency(totalCost)}</span>
              </div>
              <div className="text-xs text-muted-foreground text-right">Loyallik: +{Math.floor(rentalCost / 10000)} ball</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRentDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleRent} disabled={createRental.isPending || uploading}>
              {createRental.isPending ? "Jarayonda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
