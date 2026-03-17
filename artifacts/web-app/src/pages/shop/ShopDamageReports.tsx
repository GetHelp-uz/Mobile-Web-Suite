import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, Eye, CheckCircle, Wrench } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "bg-yellow-100 text-yellow-700",
  moderate: "bg-orange-100 text-orange-700",
  severe: "bg-red-100 text-red-700",
};

const SEVERITY_LABELS: Record<string, string> = {
  minor: "Kichik",
  moderate: "O'rtacha",
  severe: "Jiddiy",
};

export default function ShopDamageReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewReport, setViewReport] = useState<any>(null);
  const [cost, setCost] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/damage-reports/shop/${shopId}`, { headers: h });
      const d = await r.json();
      setReports(d.reports || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const resolve = async () => {
    if (!viewReport) return;
    try {
      const r = await fetch(`${baseUrl}/api/damage-reports/${viewReport.id}/resolve`, {
        method: "PATCH", headers: h, body: JSON.stringify({ estimatedCost: Number(cost) }),
      });
      if (!r.ok) throw new Error("Xatolik");
      toast({ title: "Hal qilindi!" });
      setViewReport(null);
      setCost("");
      load();
    } catch (err: any) { toast({ title: "Xatolik", description: err.message, variant: "destructive" }); }
  };

  const pending = reports.filter(r => r.status === "pending");
  const resolved = reports.filter(r => r.status === "resolved");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Shikast Xabarlari</h1>
          <p className="text-muted-foreground">Mijozlar tomonidan yuborilgan shikast xabarlari</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-red-600">{pending.length}</div><div className="text-sm text-red-600">Hal qilinmagan</div></CardContent></Card>
          <Card className="border-green-200 bg-green-50"><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-green-600">{resolved.length}</div><div className="text-sm text-green-600">Hal qilingan</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold">{formatCurrency(resolved.reduce((s, r) => s + (r.estimated_cost || 0), 0))}</div><div className="text-sm text-muted-foreground">Jami zarar</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Xabarlar ro'yxati</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div> :
              reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Shikast xabarlari yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(r => (
                    <div key={r.id} className="p-4 border rounded-xl hover:bg-muted/20">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[r.severity]}`}>{SEVERITY_LABELS[r.severity]}</span>
                            <Badge variant={r.status === "resolved" ? "secondary" : "destructive"}>{r.status === "resolved" ? "Hal qilindi" : "Kutilmoqda"}</Badge>
                          </div>
                          <div className="font-medium">{r.tool_name}</div>
                          <div className="text-sm text-muted-foreground mt-0.5">{r.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Mijoz: {r.customer_name} • {new Date(r.created_at).toLocaleString("uz-UZ")}
                            {r.estimated_cost > 0 && ` • Zarar: ${formatCurrency(r.estimated_cost)}`}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setViewReport(r); setCost(r.estimated_cost || ""); }}>
                          <Eye className="h-4 w-4 mr-1" /> Ko'rish
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Shikast xabari</DialogTitle></DialogHeader>
          {viewReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Asbob:</span> <strong>{viewReport.tool_name}</strong></div>
                <div><span className="text-muted-foreground">Mijoz:</span> <strong>{viewReport.customer_name}</strong></div>
                <div><span className="text-muted-foreground">Darajasi:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${SEVERITY_COLORS[viewReport.severity]}`}>{SEVERITY_LABELS[viewReport.severity]}</span></div>
                <div><span className="text-muted-foreground">Sana:</span> <strong>{new Date(viewReport.created_at).toLocaleDateString("uz-UZ")}</strong></div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Tavsif:</p>
                <p className="text-sm">{viewReport.description}</p>
              </div>
              {viewReport.photo_url && (
                <div className="border rounded-xl overflow-hidden">
                  <img src={`${baseUrl}${viewReport.photo_url}`} alt="Shikast" className="w-full max-h-64 object-cover" />
                </div>
              )}
              {viewReport.status === "pending" && (
                <div>
                  <label className="text-sm font-medium">Zarar miqdori (so'm)</label>
                  <Input type="number" placeholder="0" value={cost} onChange={e => setCost(e.target.value)} className="mt-1" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewReport(null)}>Yopish</Button>
            {viewReport?.status === "pending" && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={resolve}>
                <CheckCircle className="h-4 w-4 mr-2" /> Hal qilingan deb belgilash
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
