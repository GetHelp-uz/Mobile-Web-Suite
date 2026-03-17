import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FileText, Search, CheckCircle2, XCircle, Clock, Eye,
  RefreshCw, ChevronLeft, ChevronRight, Download, X, Filter
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const BASE = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
function getToken() { return localStorage.getItem("gethelp_token") || ""; }

const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const DOC_TYPES: Record<string, string> = {
  passport: "Pasport",
  license: "Litsenziya",
  contract: "Shartnoma",
  other: "Boshqa",
};

interface Document {
  id: number;
  user_id: number;
  rental_id: number | null;
  booking_id: number | null;
  document_type: string;
  file_url: string;
  original_name: string;
  status: string;
  review_note: string | null;
  created_at: string;
  user_name?: string;
  user_phone?: string;
}

export default function AdminDocuments() {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Document | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        ...(filterStatus !== "all" ? { status: filterStatus } : {}),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`${BASE}/api/documents/admin?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ma'lumot yuklashda xatolik");
      const data = await res.json();
      setDocs(data.documents || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, search]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleReview(docId: number, status: "approved" | "rejected") {
    setReviewLoading(true);
    try {
      const res = await fetch(`${BASE}/api/documents/${docId}/review`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: rejectNote || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
      toast({
        title: status === "approved" ? "Tasdiqlandi" : "Rad etildi",
        description: `Hujjat ${status === "approved" ? "muvaffaqiyatli tasdiqlandi" : "rad etildi"}`,
      });
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, status, review_note: rejectNote } : d));
      setPreview(null);
      setRejectNote("");
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setReviewLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 15);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <FileText size={24} className="text-primary" />
              Hujjatlar boshqaruvi
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Jami {total} ta hujjat — tasdiqlash, rad etish va ko'rish
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDocs} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Yangilash
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              className="pl-9"
              placeholder="Hujjat nomini qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
            {[
              { key: "all", label: "Barcha", icon: Filter },
              { key: "pending", label: "Kutilmoqda", icon: Clock },
              { key: "approved", label: "Tasdiqlangan", icon: CheckCircle2 },
              { key: "rejected", label: "Rad etilgan", icon: XCircle },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setFilterStatus(tab.key); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterStatus === tab.key
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <FileText size={40} className="mb-3 opacity-30" />
              <p>Hujjat topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Hujjat</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Foydalanuvchi</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Turi</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Holat</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Sana</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {docs.map(doc => (
                    <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">#{doc.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{doc.original_name}</div>
                        {doc.rental_id && <div className="text-xs text-muted-foreground">Ijara #{doc.rental_id}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{doc.user_name || `User #${doc.user_id}`}</div>
                        {doc.user_phone && <div className="text-xs text-muted-foreground font-mono">{doc.user_phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {DOC_TYPES[doc.document_type] || doc.document_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] || ""}`}>
                          {doc.status === "pending" && <Clock size={10} />}
                          {doc.status === "approved" && <CheckCircle2 size={10} />}
                          {doc.status === "rejected" && <XCircle size={10} />}
                          {STATUS_LABELS[doc.status] || doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString("uz-UZ") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setPreview(doc); setRejectNote(""); }}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title="Ko'rish va boshqarish"
                          >
                            <Eye size={14} />
                          </button>
                          <a
                            href={`${BASE}${doc.file_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title="Yuklab olish"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <span className="text-sm text-muted-foreground">
                {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} / {total}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="flex items-center px-3 text-sm font-medium">{page} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Preview / Review Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">Hujjatni ko'rish</h3>
                <p className="text-muted-foreground text-sm">{preview.original_name}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Foydalanuvchi</p>
                  <p className="font-medium">{preview.user_name || `#${preview.user_id}`}</p>
                  {preview.user_phone && <p className="text-xs font-mono text-muted-foreground">{preview.user_phone}</p>}
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Hujjat turi</p>
                  <p className="font-medium">{DOC_TYPES[preview.document_type] || preview.document_type}</p>
                  <span className={`inline-flex text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[preview.status]}`}>
                    {STATUS_LABELS[preview.status]}
                  </span>
                </div>
              </div>

              {/* File preview */}
              <div className="border border-border rounded-lg overflow-hidden">
                {preview.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={`${BASE}${preview.file_url}`}
                    alt={preview.original_name}
                    className="w-full max-h-64 object-contain bg-muted"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-muted/30">
                    <FileText size={40} className="text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{preview.original_name}</p>
                    <a
                      href={`${BASE}${preview.file_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 text-primary text-sm font-medium hover:underline flex items-center gap-1"
                    >
                      <Download size={14} />
                      Yuklab olish
                    </a>
                  </div>
                )}
              </div>

              {preview.review_note && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Izoh:</p>
                  <p>{preview.review_note}</p>
                </div>
              )}
            </div>

            {preview.status === "pending" && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold block mb-1">Rad etish sababi (ixtiyoriy)</label>
                  <Input
                    placeholder="Masalan: Pasport rasmidan nusxa sifati past..."
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => handleReview(preview.id, "rejected")}
                    disabled={reviewLoading}
                  >
                    <XCircle size={15} />
                    Rad etish
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleReview(preview.id, "approved")}
                    disabled={reviewLoading}
                  >
                    <CheckCircle2 size={15} />
                    Tasdiqlash
                  </Button>
                </div>
              </div>
            )}

            {preview.status !== "pending" && (
              <Button variant="outline" className="w-full" onClick={() => setPreview(null)}>
                Yopish
              </Button>
            )}
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
