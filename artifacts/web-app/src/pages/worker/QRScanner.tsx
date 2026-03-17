import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useScanToolQr, useStartRentalByQr, useReturnRentalByQr } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  available: "Mavjud",
  rented: "Ijarada",
  maintenance: "Ta'mirda",
};

export default function QRScanner() {
  const [scannedCode, setScannedCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const { toast } = useToast();

  const { data: tool, isSuccess: toolFound } = useScanToolQr(scannedCode, {
    query: { enabled: !!scannedCode, retry: false } as any
  });

  const startRental = useStartRentalByQr({
    mutation: {
      onSuccess: () => {
        toast({ title: "Muvaffaqiyatli", description: "Asbob muvaffaqiyatli ijaraga berildi" });
        setScannedCode("");
      }
    }
  });

  const returnRental = useReturnRentalByQr({
    mutation: {
      onSuccess: () => {
        toast({ title: "Muvaffaqiyatli", description: "Asbob muvaffaqiyatli qaytarildi" });
        setScannedCode("");
      }
    }
  });

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );
    scanner.render((text) => {
      setScannedCode(text);
      scanner.pause();
    }, undefined);

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  const handleAction = () => {
    if (!tool) return;
    if (tool.status === 'available') {
      startRental.mutate({
        data: {
          qrCode: scannedCode,
          customerId: 1,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          paymentMethod: 'cash'
        }
      });
    } else {
      returnRental.mutate({
        data: { qrCode: scannedCode }
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-bold mb-8 text-center">Hodim Terminali</h1>

        {!scannedCode ? (
          <Card className="overflow-hidden mb-8 border-2 border-primary/20">
            <div id="reader" className="w-full"></div>
            <div className="p-6 bg-secondary text-center">
              <p className="text-sm font-semibold mb-4">Yoki kodni qo'lda kiriting</p>
              <div className="flex gap-2">
                <Input 
                  value={manualCode} 
                  onChange={e => setManualCode(e.target.value)} 
                  placeholder="QR kodni kiriting..."
                  className="bg-white"
                />
                <Button onClick={() => setScannedCode(manualCode)}>Tekshirish</Button>
              </div>
            </div>
          </Card>
        ) : toolFound && tool ? (
          <Card className="p-8 shadow-xl text-center">
            <Badge className="mb-4" variant={tool.status === 'available' ? 'success' : 'warning'}>
              {statusLabels[tool.status] ?? tool.status}
            </Badge>
            <h2 className="text-3xl font-bold mb-2">{tool.name}</h2>
            <p className="text-muted-foreground mb-6">{tool.category}</p>
            
            <div className="bg-secondary rounded-xl p-4 mb-8">
              <p className="text-sm text-muted-foreground mb-1">Kunlik narx</p>
              <p className="text-2xl font-bold">{formatCurrency(tool.pricePerDay)}/kun</p>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setScannedCode("")}>Bekor qilish</Button>
              <Button 
                className="flex-1" 
                onClick={handleAction}
                disabled={startRental.isPending || returnRental.isPending}
              >
                {tool.status === 'available' ? 'Ijaraga berish' : 'Qaytarishni qayd etish'}
              </Button>
            </div>
          </Card>
        ) : (
           <Card className="p-8 text-center">
             <p className="text-destructive font-bold mb-4">Asbob topilmadi</p>
             <Button onClick={() => setScannedCode("")}>Qayta skanerlash</Button>
           </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
