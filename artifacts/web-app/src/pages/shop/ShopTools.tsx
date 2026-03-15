import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListShopTools, useCreateTool, useGetToolQr } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Plus, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

export default function ShopTools() {
  const { user } = useAuth();
  const shopId = user?.shopId || 0;
  const { data, isLoading } = useListShopTools(shopId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<string>("");
  
  const [formData, setFormData] = useState({
    name: "", category: "", pricePerDay: "", depositAmount: ""
  });

  const createTool = useCreateTool({
    mutation: {
      onSuccess: () => {
        setCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: [`/api/shops/${shopId}/tools`] });
        toast({ title: "Success", description: "Tool added to inventory" });
      }
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTool.mutate({
      data: {
        shopId,
        name: formData.name,
        category: formData.category,
        pricePerDay: Number(formData.pricePerDay),
        depositAmount: Number(formData.depositAmount),
      }
    });
  };

  const showQr = (qrCode: string) => {
    setSelectedQr(qrCode);
    setQrOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-display font-bold">Inventory Management</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus size={18} /> Add Tool
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data?.tools?.map(tool => (
          <Card key={tool.id} className="flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline">{tool.category}</Badge>
                <Badge variant={tool.status === 'available' ? 'success' : 'warning'}>{tool.status}</Badge>
              </div>
              <h3 className="text-lg font-bold mb-4 flex-1">{tool.name}</h3>
              <div className="space-y-1 mb-4">
                <p className="text-sm text-muted-foreground flex justify-between">
                  Rate <span>{formatCurrency(tool.pricePerDay)}/d</span>
                </p>
                <p className="text-sm text-muted-foreground flex justify-between">
                  Deposit <span>{formatCurrency(tool.depositAmount)}</span>
                </p>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => showQr(tool.qrCode)}>
                <QrCode size={16} /> View QR Tag
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Equipment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Tool Name</label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Category</label>
              <Input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Drill, Saw" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">Daily Rate (UZS)</label>
                <Input type="number" required value={formData.pricePerDay} onChange={e => setFormData({...formData, pricePerDay: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Deposit (UZS)</label>
                <Input type="number" required value={formData.depositAmount} onChange={e => setFormData({...formData, depositAmount: e.target.value})} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={createTool.isPending}>Save Tool</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm flex flex-col items-center p-12">
          <h3 className="font-display font-bold text-2xl mb-8">Scan to Rent/Return</h3>
          <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-primary">
            {selectedQr && <QRCodeSVG value={selectedQr} size={200} />}
          </div>
          <p className="mt-8 text-sm text-muted-foreground text-center">Print this code and attach it to the physical tool.</p>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
