import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownToLine, CheckCircle, XCircle, Clock, RefreshCw, Building2, Phone, CreditCard, DollarSign } from "lucide-react";

const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
const h = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}`,
});

type WithdrawalRequest = {
  id: number; shop_id: number; user_id: number; amount: number;
  provider: string; card_number: string; card_holder: string;
  status: string; admin_note: string; processed_at: string;
  created_at: string; owner_name: string; owner_phone: string;
  shop_name: string; current_balance: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Kutilmoqda", color: "amber", icon: Clock },
  processing: { label: "Jarayonda", color: "blue", icon: RefreshCw },
  approved: { label: "Tasdiqlandi", color: "emerald", icon: CheckCircle },
  rejected: { label: "Rad etildi", color: "red", icon: XCircle },
};

export default function AdminWithdrawals() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [actionReq, setActionReq] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<"approved" | "rejected" | "">("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`${baseUrl}/api/withdrawals`, { headers: h() });
    if (r.ok) { const d = await r.json(); setRequests(d.requests || []); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAction() {
    if (!actionReq || !actionType) return;
    setSaving(true);
    const r = await fetch(`${baseUrl}/api/withdrawals/${actionReq.id}`, {
      method: "PATCH", headers: h(),
      body: JSON.stringify({ status: actionType, adminNote }),
    });
    if (r.ok) {
      toast({ title: actionType === "approved" ? "So'rov tasdiqlandi" : "So'rov rad etildi" });
      setActionReq(null);
      setAdminNote("");
      load();
    } else {
      const e = await r.json();
      toast({ title: "Xato", description: e.error, variant: "destructive" });
    }
    setSaving(false);
  }

  const filtered = requests.filter(r =>
    !filter ||
    r.shop_name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.owner_name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.card_number?.includes(filter)
  );

  const pending = requests.filter(r => r.status === "pending").length;
  const totalPending = requests.filter(r => r.status === "pending").reduce((sum, r) => sum + r.amount, 0);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Yechib olish so'rovlari</h1>
          <p className="text-muted-foreground text-sm">Do'kon egalari balansdan yechib olish so'rovlari</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Kutilayotgan", value: pending, color: "amber", icon: Clock },
          { label: "Kutilayotgan summa", value: `${totalPending.toLocaleString()} UZS`, color: "red", icon: DollarSign },
          { label: "Tasdiqlangan", value: requests.filter(r => r.status === "approved").length, color: "emerald", icon: CheckCircle },
          { label: "Jami so'rovlar", value: requests.length, color: "blue", icon: ArrowDownToLine },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`bg-${stat.color}-50 p-2 rounded-lg`}>
                  <stat.icon className={`h-4 w-4 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Input
          placeholder="Do'kon nomi, egasi yoki karta raqami bilan qidirish..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Yuklanmoqda...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
            return (
              <Card key={req.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{req.shop_name}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs bg-${cfg.color}-50 text-${cfg.color}-700 border-${cfg.color}-200`}
                        >
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Egasi</p>
                          <p className="font-medium">{req.owner_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Telefon</p>
                          <p className="font-medium">{req.owner_phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Karta</p>
                          <p className="font-medium font-mono">{req.card_number}</p>
                          {req.card_holder && <p className="text-xs text-muted-foreground">{req.card_holder}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tizim</p>
                          <p className="font-medium capitalize">{req.provider}</p>
                        </div>
                      </div>
                      {req.admin_note && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                          Izoh: {req.admin_note}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(req.created_at).toLocaleString("uz-UZ")}
                        {req.processed_at && ` • Qayta ishlandi: ${new Date(req.processed_at).toLocaleString("uz-UZ")}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold">{req.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">UZS</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Balans: {Number(req.current_balance || 0).toLocaleString()} UZS
                      </p>
                      {req.status === "pending" && (
                        <div className="flex gap-1 mt-3 justify-end">
                          <Button
                            size="sm"
                            className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-xs"
                            onClick={() => { setActionReq(req); setActionType("approved"); setAdminNote(""); }}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Tasdiqlash
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => { setActionReq(req); setActionType("rejected"); setAdminNote(""); }}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Rad etish
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowDownToLine className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Yechib olish so'rovlari yo'q</p>
            </div>
          )}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={!!actionReq} onOpenChange={open => !open && setActionReq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approved" ? "So'rovni tasdiqlash" : "So'rovni rad etish"}
            </DialogTitle>
          </DialogHeader>
          {actionReq && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Do'kon</span>
                  <span className="font-medium">{actionReq.shop_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Summa</span>
                  <span className="text-lg font-bold">{actionReq.amount.toLocaleString()} UZS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Karta</span>
                  <span className="font-mono font-medium">{actionReq.card_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tizim</span>
                  <span className="capitalize font-medium">{actionReq.provider}</span>
                </div>
              </div>
              <div>
                <Label>Admin izohi (ixtiyoriy)</Label>
                <Input
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder={actionType === "approved" ? "To'lov amalga oshirildi" : "Sabab: ..."}
                />
              </div>
              {actionType === "approved" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Tasdiqlashdan oldin to'lovni {actionReq.provider} orqali qo'lda amalga oshiring, keyin tasdiqlang.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionReq(null)}>Bekor qilish</Button>
            <Button
              variant={actionType === "approved" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={saving}
            >
              {saving ? "Saqlanmoqda..." : actionType === "approved" ? "Tasdiqlash" : "Rad etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
