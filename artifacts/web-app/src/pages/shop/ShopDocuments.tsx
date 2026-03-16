import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { FileText, CheckCircle, XCircle, Eye, Clock, Download } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  approved: "Tasdiqlandi",
  rejected: "Rad etildi",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: "Pasport",
  id_card: "ID karta",
  driver_license: "Haydovchilik guvohnomasi",
  other: "Boshqa",
};

export default function ShopDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDoc, setReviewDoc] = useState<any>(null);
  const [viewDoc, setViewDoc] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [filter, setFilter] = useState("all");

  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/documents/shop/${shopId}`, { headers: h });
      const d = await r.json();
      setDocs(d.documents || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [shopId]);

  const review = async (status: "approved" | "rejected") => {
    if (!reviewDoc) return;
    try {
      const r = await fetch(`${baseUrl}/api/documents/${reviewDoc.id}/review`, {
        method: "PATCH", headers: h,
        body: JSON.stringify({ status, reviewNote }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Xatolik");
      toast({ title: status === "approved" ? "Tasdiqlandi!" : "Rad etildi", description: `Hujjat ${status === "approved" ? "tasdiqlandi" : "rad etildi"}` });
      setReviewDoc(null);
      setReviewNote("");
      load();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    }
  };

  const filtered = filter === "all" ? docs : docs.filter(d => d.status === filter);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mijoz Hujjatlari</h1>
            <p className="text-muted-foreground">Pasport va ID karta tasvirlarini ko'ring va tasdiqlang</p>
          </div>
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected"].map(f => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
                onClick={() => setFilter(f)}>
                {f === "all" ? "Barchasi" : STATUS_LABELS[f]}
                {f !== "all" && <span className="ml-1 bg-white/20 rounded-full px-1.5 text-xs">{docs.filter(d => d.status === f).length}</span>}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-700">{docs.filter(d => d.status === "pending").length}</div>
                <div className="text-sm text-yellow-600">Kutilmoqda</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">{docs.filter(d => d.status === "approved").length}</div>
                <div className="text-sm text-green-600">Tasdiqlangan</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-700">{docs.filter(d => d.status === "rejected").length}</div>
                <div className="text-sm text-red-600">Rad etilgan</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Hujjatlar ro'yxati
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Hujjatlar topilmadi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{doc.customer_name || "Noma'lum"}</div>
                        <div className="text-sm text-muted-foreground">{doc.customer_phone} • {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</div>
                        {doc.tool_name && <div className="text-xs text-muted-foreground">Asbob: {doc.tool_name}</div>}
                        <div className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleString("uz-UZ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status]}`}>
                        {STATUS_LABELS[doc.status]}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setViewDoc(doc)}>
                        <Eye className="h-4 w-4 mr-1" /> Ko'rish
                      </Button>
                      {doc.status === "pending" && (
                        <Button size="sm" onClick={() => { setReviewDoc(doc); setReviewNote(""); }}>
                          Ko'rib chiqish
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hujjatni ko'rish */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Hujjat: {viewDoc && DOC_TYPE_LABELS[viewDoc.document_type]}</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Mijoz:</span> <strong>{viewDoc.customer_name}</strong></div>
                <div><span className="text-muted-foreground">Telefon:</span> <strong>{viewDoc.customer_phone}</strong></div>
                <div><span className="text-muted-foreground">Holat:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[viewDoc.status]}`}>{STATUS_LABELS[viewDoc.status]}</span></div>
                <div><span className="text-muted-foreground">Yuborildi:</span> <strong>{new Date(viewDoc.created_at).toLocaleString("uz-UZ")}</strong></div>
                {viewDoc.review_note && <div className="col-span-2"><span className="text-muted-foreground">Izoh:</span> <strong>{viewDoc.review_note}</strong></div>}
              </div>
              <div className="border rounded-xl overflow-hidden bg-muted/20">
                {viewDoc.file_url.match(/\.(jpg|jpeg|png|webp|heic)/i) ? (
                  <img
                    src={`${baseUrl}${viewDoc.file_url}`}
                    alt="Hujjat"
                    className="w-full max-h-96 object-contain"
                  />
                ) : (
                  <div className="p-8 text-center">
                    <FileText className="h-16 w-16 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">PDF fayl</p>
                    <a href={`${baseUrl}${viewDoc.file_url}`} target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-primary underline">
                      <Download className="h-4 w-4" /> Yuklab olish
                    </a>
                  </div>
                )}
              </div>
              {viewDoc.status === "pending" && (
                <div className="flex gap-3">
                  <Button className="flex-1" variant="destructive" onClick={() => { setViewDoc(null); setReviewDoc(viewDoc); }}>
                    <XCircle className="h-4 w-4 mr-2" /> Rad etish
                  </Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={async () => {
                    setReviewDoc(viewDoc);
                    await new Promise(r => setTimeout(r, 100));
                    setViewDoc(null);
                  }}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Tasdiqlash
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ko'rib chiqish dialogi */}
      <Dialog open={!!reviewDoc} onOpenChange={() => setReviewDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hujjatni ko'rib chiqish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">Mijoz: <strong>{reviewDoc?.customer_name}</strong></p>
            <div>
              <label className="text-sm font-medium mb-1 block">Izoh (ixtiyoriy)</label>
              <Textarea placeholder="Rad etish sababi yoki tasdiq izohi..." value={reviewNote}
                onChange={e => setReviewNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDoc(null)}>Bekor</Button>
            <Button variant="destructive" onClick={() => review("rejected")}>
              <XCircle className="h-4 w-4 mr-2" /> Rad etish
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => review("approved")}>
              <CheckCircle className="h-4 w-4 mr-2" /> Tasdiqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
