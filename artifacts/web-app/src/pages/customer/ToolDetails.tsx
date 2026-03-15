import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetTool, useCreateRental } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Clock, CreditCard, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

const paymentLabels: Record<string, string> = {
  click: "Click",
  payme: "Payme",
  cash: "Naqd pul",
};

export default function ToolDetails() {
  const [, params] = useRoute("/tools/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: tool, isLoading } = useGetTool(id);
  const [rentDialogOpen, setRentDialogOpen] = useState(false);
  const [days, setDays] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"click" | "payme" | "cash">("click");

  const createRental = useCreateRental({
    mutation: {
      onSuccess: () => {
        setRentDialogOpen(false);
        toast({ title: "Muvaffaqiyatli", description: "Ijara so'rovi yaratildi!" });
        setLocation("/my-rentals");
      },
      onError: () => {
        toast({ title: "Xatolik", description: "Ijara yaratib bo'lmadi", variant: "destructive" });
      }
    }
  });

  const handleRent = () => {
    if (!user) return;
    createRental.mutate({
      data: {
        toolId: id,
        customerId: user.id,
        dueDate: addDays(new Date(), days).toISOString(),
        paymentMethod: paymentMethod,
      }
    });
  };

  if (isLoading) return <DashboardLayout><div className="animate-pulse h-96 bg-muted rounded-2xl"></div></DashboardLayout>;
  if (!tool) return <DashboardLayout>Asbob topilmadi</DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-border/50 flex items-center justify-center min-h-[500px]">
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
            {tool.description || "Eng yuqori standartlarga muvofiq texnik xizmat ko'rsatilgan professional darajadagi uskuna. Keyingi loyihangiz uchun tayyor."}
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
                <p className="font-semibold">Depozit himoyasi</p>
                <p className="text-sm text-muted-foreground">Qaytarilgunga qadar xavfsiz saqlanadi</p>
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

          <Button size="lg" className="w-full text-lg h-14" onClick={() => setRentDialogOpen(true)}>
            Ijara olish
          </Button>
        </div>
      </div>

      <Dialog open={rentDialogOpen} onOpenChange={setRentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ijarani rasmiylashtirish</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Muddat (kunlar)</label>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setDays(Math.max(1, days - 1))}>-</Button>
                <span className="text-xl font-bold w-8 text-center">{days}</span>
                <Button variant="outline" size="icon" onClick={() => setDays(days + 1)}>+</Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Qaytarish sanasi: <span className="font-semibold text-foreground">{format(addDays(new Date(), days), 'dd.MM.yyyy')}</span>
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">To'lov usuli</label>
              <div className="grid grid-cols-3 gap-3">
                {(['click', 'payme', 'cash'] as const).map((method) => (
                  <div 
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`cursor-pointer rounded-xl border-2 p-3 text-center font-medium transition-all ${
                      paymentMethod === method ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {paymentLabels[method]}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-secondary p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ijara ({days} kun)</span>
                <span>{formatCurrency(tool.pricePerDay * days)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Depozit (qaytariladi)</span>
                <span>{formatCurrency(tool.depositAmount)}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between font-bold text-lg">
                <span>Jami to'lov</span>
                <span>{formatCurrency((tool.pricePerDay * days) + tool.depositAmount)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRentDialogOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleRent} disabled={createRental.isPending}>
              {createRental.isPending ? "Jarayonda..." : "Tasdiqlash va to'lash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
