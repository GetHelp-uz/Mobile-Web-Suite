import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, BookOpen, QrCode, Wrench, ClipboardList, PackageCheck, Tag, AlertTriangle, FileText, ArrowRightLeft, ExternalLink } from "lucide-react";

const EVENT_TYPE_LABELS: Record<string, string> = {
  rental_started: "Ijara boshlandi",
  rental_returned: "Ijara qaytarildi",
  maintenance_started: "Texnik xizmat boshlandi",
  maintenance_completed: "Texnik xizmat tugadi",
  repair: "Ta'mirlash",
  inspection: "Ko'rik",
  damage: "Shikast",
  note: "Eslatma",
  sold: "Sotildi",
  transferred: "O'tkazildi",
};

function EventIcon({ type }: { type: string }) {
  if (type === "repair") return <Wrench size={13} className="text-orange-500"/>;
  if (type === "damage") return <AlertTriangle size={13} className="text-red-500"/>;
  if (type === "note") return <FileText size={13} className="text-gray-400"/>;
  if (type === "transferred") return <ArrowRightLeft size={13} className="text-purple-500"/>;
  if (type === "maintenance_started" || type === "maintenance_completed") return <PackageCheck size={13} className="text-green-500"/>;
  return <ClipboardList size={13} className="text-blue-500"/>;
}

export default function AdminToolPassports() {
  const { toast } = useToast();
  const [searchQr, setSearchQr] = useState("");
  const [passportData, setPassportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const lookupPassport = async (qr?: string) => {
    const code = (qr ?? searchQr).trim();
    if (!code) return;
    setLoading(true);
    try {
      const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
      const r = await fetch(`${baseUrl}/api/passport/${encodeURIComponent(code)}`);
      if (!r.ok) throw new Error("Asbob topilmadi");
      const d = await r.json();
      setPassportData(d);
      setModalOpen(true);
    } catch (e: any) {
      toast({ title: "Topilmadi", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen size={22} className="text-blue-600"/> Asbob Pasportlari
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            QR kod orqali istalgan asbobning tarixini va pasportini ko'ring
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-5">
            <label className="text-sm font-medium mb-2 block">QR Kod orqali qidirish</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <Input
                  className="pl-9"
                  placeholder="QR kod yoki shtrix kod kiriting..."
                  value={searchQr}
                  onChange={e => setSearchQr(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && lookupPassport()}
                />
              </div>
              <Button onClick={() => lookupPassport()} disabled={loading || !searchQr.trim()}>
                {loading ? "Qidirilmoqda..." : <><Search size={15} className="mr-1"/> Qidirish</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="p-5">
            <h3 className="font-semibold text-blue-800 mb-2 text-sm">Asbob Pasporti nima?</h3>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• Har bir asbobning to'liq tarixini saqlaydi</li>
              <li>• Ijara, ta'mirlash, tekshirish voqealarini qayd etadi</li>
              <li>• QR kod orqali ommaviy sahifada ko'rsatiladi</li>
              <li>• Do'kon egalari voqea qo'sha oladi</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Passport detail modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600"/>
              {passportData?.tool?.name} — Pasport
            </DialogTitle>
          </DialogHeader>
          {passportData && (
            <div className="space-y-4">
              {/* Tool basic info */}
              <div className="bg-secondary rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Do'kon:</span> <strong>{passportData.tool?.shop_name}</strong></div>
                  <div><span className="text-muted-foreground">Kategoriya:</span> <strong>{passportData.tool?.category}</strong></div>
                  <div><span className="text-muted-foreground">Holat:</span> <Badge variant="outline" className="text-xs">{passportData.tool?.status}</Badge></div>
                  <div><span className="text-muted-foreground">QR:</span> <code className="text-xs">{passportData.tool?.qr_code}</code></div>
                </div>
                <div className="mt-2">
                  <a
                    href={`/passport/${passportData.tool?.qr_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink size={11}/> Ommaviy sahifani ko'rish
                  </a>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Ijaralar", value: passportData.stats?.total_rentals || 0, icon: <ClipboardList size={13}/>, cls: "text-blue-600" },
                  { label: "Ta'mirlar", value: passportData.stats?.total_repairs || 0, icon: <Wrench size={13}/>, cls: "text-orange-600" },
                  { label: "Texnik", value: passportData.stats?.total_maintenance || 0, icon: <PackageCheck size={13}/>, cls: "text-green-600" },
                  { label: "Xarajat", value: `${Number(passportData.stats?.total_maintenance_cost||0).toLocaleString()} so'm`, icon: <Tag size={13}/>, cls: "text-purple-600" },
                ].map(s => (
                  <div key={s.label} className="bg-secondary rounded-lg p-2 text-center">
                    <div className={`flex justify-center mb-1 ${s.cls}`}>{s.icon}</div>
                    <p className="font-bold text-sm">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Events */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Voqealar tarixi ({passportData.events?.length || 0} ta)</h3>
                {passportData.events?.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-6">Voqealar yo'q</p>
                ) : (
                  <div className="space-y-2">
                    {passportData.events?.map((ev: any) => (
                      <div key={ev.id} className="flex gap-3 p-3 border rounded-lg text-sm">
                        <div className="mt-0.5 shrink-0"><EventIcon type={ev.event_type}/></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{ev.title}</p>
                          {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>{new Date(ev.created_at).toLocaleDateString("uz-UZ")}</span>
                            {ev.performed_by && <span>Bajaruvchi: {ev.performed_by}</span>}
                            {ev.cost && <span className="text-orange-600 font-medium">{Number(ev.cost).toLocaleString()} so'm</span>}
                          </div>
                        </div>
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded shrink-0">
                          {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
