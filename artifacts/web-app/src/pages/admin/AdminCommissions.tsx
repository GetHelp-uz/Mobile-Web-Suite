import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, TrendingUp, Building2, RefreshCw, Edit2, Save, X,
  Percent, ArrowDownCircle, ArrowUpCircle, ShieldCheck, Lock, Unlock,
  PlusCircle, Trash2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
const h = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}`,
});

// ─── Komissiya turi ma'lumotlari ────────────────────────────────────────────
const COMM_TYPES: Record<string, { label: string; icon: any; color: string; group: string }> = {
  rental_shop:         { label: "Ijara (do'kon)",     icon: Building2,       color: "emerald", group: "ijara" },
  rental_customer:     { label: "Ijara (mijoz)",      icon: DollarSign,      color: "blue",    group: "ijara" },
  topup_customer:      { label: "Topup (mijoz)",      icon: ArrowUpCircle,   color: "violet",  group: "topup" },
  topup_shop:          { label: "Topup (do'kon)",     icon: ArrowUpCircle,   color: "purple",  group: "topup" },
  withdrawal_customer: { label: "Yechish (mijoz)",    icon: ArrowDownCircle, color: "amber",   group: "yechish" },
  withdrawal_shop:     { label: "Yechish (do'kon)",   icon: ArrowDownCircle, color: "orange",  group: "yechish" },
};

const TYPE_OPTIONS = Object.entries(COMM_TYPES).map(([k, v]) => ({ value: k, label: v.label }));

type CommSetting = {
  id: number; type: string; rate: string; min_amount: number;
  max_amount: number; is_active: boolean; description: string;
};
type Shop = { id: number; name: string; commission: number; address?: string };
type Override = {
  id: number; shop_id: number; shop_name: string;
  type: string; rate: string; is_active: boolean;
};
type CommTx = {
  id: number; type: string; user_name?: string; shop_name?: string;
  gross_amount: number; commission_rate: string; commission_amount: number;
  net_amount: number; description: string; created_at: string;
};
type EscrowHold = {
  id: number; rental_id: number; user_name: string; amount: number;
  type: string; status: string; created_at: string; rental_status?: string;
};

function fmtMoney(n: number | string) {
  return Number(n || 0).toLocaleString("uz-UZ") + " UZS";
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminCommissions() {
  const { toast } = useToast();

  // ─── GLOBAL SETTINGS ────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<CommSetting[]>([]);
  const [editSetting, setEditSetting] = useState<CommSetting | null>(null);
  const [editForm, setEditForm] = useState({ rate: "", min_amount: "0", max_amount: "0", is_active: true, description: "" });
  const [savingGlobal, setSavingGlobal] = useState(false);

  // ─── DO'KON OVERRIDE ─────────────────────────────────────────────────────────
  const [shops, setShops] = useState<Shop[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [addOverrideOpen, setAddOverrideOpen] = useState(false);
  const [addForm, setAddForm] = useState({ type: "rental_shop", rate: "0", is_active: true });
  const [savingOverride, setSavingOverride] = useState(false);

  // ─── HISOBOT ────────────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [txFilter, setTxFilter] = useState("");
  const [txList, setTxList] = useState<CommTx[]>([]);
  const [txTotals, setTxTotals] = useState<any>(null);
  const [byType, setByType] = useState<any[]>([]);
  const [escrowHolds, setEscrowHolds] = useState<EscrowHold[]>([]);
  const [escrowTotals, setEscrowTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    const r = await fetch(`${baseUrl}/api/platform/commission-settings`, { headers: h() });
    if (r.ok) { const d = await r.json(); setSettings(d.settings || []); }
  }, []);

  const loadShopsAndOverrides = useCallback(async () => {
    const [sr, or] = await Promise.all([
      fetch(`${baseUrl}/api/shops?limit=200`, { headers: h() }),
      fetch(`${baseUrl}/api/platform/shop-commission-overrides`, { headers: h() }),
    ]);
    if (sr.ok) { const d = await sr.json(); setShops(d.shops || []); }
    if (or.ok) { const d = await or.json(); setOverrides(d.overrides || []); }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [txR, escR] = await Promise.all([
        fetch(`${baseUrl}/api/platform/commission-transactions?period=${period}${txFilter ? `&type=${txFilter}` : ""}`, { headers: h() }),
        fetch(`${baseUrl}/api/platform/escrow?status=held`, { headers: h() }),
      ]);
      if (txR.ok) {
        const d = await txR.json();
        setTxList(d.transactions || []);
        setTxTotals(d.totals);
        setByType(d.byType || []);
      }
      if (escR.ok) {
        const d = await escR.json();
        setEscrowHolds(d.holds || []);
        setEscrowTotals(d.totals);
      }
    } catch {}
    setLoading(false);
  }, [period, txFilter]);

  useEffect(() => { loadSettings(); loadShopsAndOverrides(); }, []);
  useEffect(() => { loadReport(); }, [period, txFilter]);

  // ─── Global setting tahrirlash ────────────────────────────────────────────
  function openEdit(s: CommSetting) {
    setEditSetting(s);
    setEditForm({
      rate: String(s.rate),
      min_amount: String(s.min_amount),
      max_amount: String(s.max_amount),
      is_active: s.is_active,
      description: s.description || "",
    });
  }

  async function saveGlobal() {
    if (!editSetting) return;
    setSavingGlobal(true);
    try {
      const r = await fetch(`${baseUrl}/api/platform/commission-settings/${editSetting.type}`, {
        method: "PATCH", headers: h(),
        body: JSON.stringify({
          rate: Number(editForm.rate),
          min_amount: Number(editForm.min_amount),
          max_amount: Number(editForm.max_amount),
          is_active: editForm.is_active,
          description: editForm.description,
        }),
      });
      if (r.ok) {
        toast({ title: "Saqlandi", description: `${COMM_TYPES[editSetting.type]?.label} komissiya yangilandi` });
        setEditSetting(null);
        loadSettings();
      } else {
        const e = await r.json();
        toast({ title: "Xato", description: e.error, variant: "destructive" });
      }
    } catch { toast({ title: "Xato", description: "Tarmoq xatosi", variant: "destructive" }); }
    setSavingGlobal(false);
  }

  // ─── Do'kon override saqlash ──────────────────────────────────────────────
  async function saveOverride() {
    if (!selectedShop) { toast({ title: "Do'kon tanlang", variant: "destructive" }); return; }
    setSavingOverride(true);
    try {
      const r = await fetch(`${baseUrl}/api/platform/shop-commission-overrides`, {
        method: "POST", headers: h(),
        body: JSON.stringify({
          shop_id: selectedShop,
          type: addForm.type,
          rate: Number(addForm.rate),
          is_active: addForm.is_active,
        }),
      });
      if (r.ok) {
        toast({ title: "Override saqlandi" });
        setAddOverrideOpen(false);
        loadShopsAndOverrides();
      } else {
        const e = await r.json();
        toast({ title: "Xato", description: e.error, variant: "destructive" });
      }
    } catch { toast({ title: "Xato", description: "Tarmoq xatosi", variant: "destructive" }); }
    setSavingOverride(false);
  }

  async function deleteOverride(shopId: number, type: string) {
    const r = await fetch(`${baseUrl}/api/platform/shop-commission-overrides/${shopId}/${type}`, {
      method: "DELETE", headers: h(),
    });
    if (r.ok) { toast({ title: "O'chirildi" }); loadShopsAndOverrides(); }
  }

  // ─── Do'kon bo'yicha override guruhlash ───────────────────────────────────
  const overridesByShop: Record<number, Override[]> = {};
  for (const ov of overrides) {
    if (!overridesByShop[ov.shop_id]) overridesByShop[ov.shop_id] = [];
    overridesByShop[ov.shop_id].push(ov);
  }

  const PIE_COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899"];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Komissiya boshqaruvi</h1>
          <p className="text-muted-foreground text-sm">Global, do'kon bo'yicha va escrow sozlamalar</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadSettings(); loadShopsAndOverrides(); loadReport(); }}>
          <RefreshCw className="h-4 w-4 mr-1" /> Yangilash
        </Button>
      </div>

      <Tabs defaultValue="global">
        <TabsList className="mb-6 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="global" className="flex items-center gap-1">
            <Percent className="h-3.5 w-3.5" /> Global stavkalar
          </TabsTrigger>
          <TabsTrigger value="shops" className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> Do'kon bo'yicha
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Hisobot
          </TabsTrigger>
          <TabsTrigger value="escrow" className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Escrow/Depozit
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Global stavkalar ──────────────────────────────────────── */}
        <TabsContent value="global">
          <p className="text-sm text-muted-foreground mb-4">
            Bu yerda barcha tranzaksiya turlari uchun <strong>standart</strong> komissiya stavkalarini belgilang.
            Do'kon bo'yicha alohida stavka belgilangan bo'lsa, u ustunlik qiladi.
          </p>

          {/* Guruhlar */}
          {[
            { key: "ijara",   label: "Ijara komissiyalari",         desc: "Asbob ijarasidan olinadi" },
            { key: "topup",   label: "Hamyon to'ldirish komissiyasi", desc: "Hamyon to'ldirishdan olinadi" },
            { key: "yechish", label: "Yechib olish komissiyasi",     desc: "Pul yechib olishdan olinadi" },
          ].map(group => (
            <Card key={group.key} className="mb-4 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{group.label}</CardTitle>
                <p className="text-xs text-muted-foreground">{group.desc}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {settings.filter(s => COMM_TYPES[s.type]?.group === group.key).map(s => {
                    const meta = COMM_TYPES[s.type];
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-${meta?.color}-50`}>
                            {meta && <meta.icon className={`h-4 w-4 text-${meta.color}-600`} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{meta?.label || s.type}</p>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-2">
                            <p className="text-lg font-bold">{Number(s.rate).toFixed(1)}%</p>
                            {Number(s.min_amount) > 0 && (
                              <p className="text-xs text-muted-foreground">min: {fmtMoney(s.min_amount)}</p>
                            )}
                            {Number(s.max_amount) > 0 && (
                              <p className="text-xs text-muted-foreground">max: {fmtMoney(s.max_amount)}</p>
                            )}
                          </div>
                          <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                            {s.is_active ? "Faol" : "O'chiq"}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(s)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Edit dialog */}
          <Dialog open={!!editSetting} onOpenChange={v => !v && setEditSetting(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editSetting ? COMM_TYPES[editSetting.type]?.label : ""} komissiyasini tahrirlash
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Stavka (%)</Label>
                  <div className="relative">
                    <Input
                      type="number" step="0.1" min="0" max="100"
                      value={editForm.rate}
                      onChange={e => setEditForm(f => ({ ...f, rate: e.target.value }))}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Minimum (UZS, 0=yo'q)</Label>
                    <Input
                      type="number" min="0"
                      value={editForm.min_amount}
                      onChange={e => setEditForm(f => ({ ...f, min_amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Maksimum (UZS, 0=yo'q)</Label>
                    <Input
                      type="number" min="0"
                      value={editForm.max_amount}
                      onChange={e => setEditForm(f => ({ ...f, max_amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Tavsif (ixtiyoriy)</Label>
                  <Input
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.is_active}
                    onCheckedChange={v => setEditForm(f => ({ ...f, is_active: v }))}
                  />
                  <Label>{editForm.is_active ? "Faol" : "O'chiq"}</Label>
                </div>

                {/* Preview */}
                {Number(editForm.rate) > 0 && (
                  <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-medium">Misol hisob-kitob:</p>
                    {[100_000, 500_000, 1_000_000].map(amt => {
                      let comm = Math.round(amt * Number(editForm.rate) / 100);
                      const minA = Number(editForm.min_amount);
                      const maxA = Number(editForm.max_amount);
                      if (minA > 0 && comm < minA) comm = minA;
                      if (maxA > 0 && comm > maxA) comm = maxA;
                      comm = Math.min(comm, amt);
                      return (
                        <p key={amt} className="flex justify-between">
                          <span>{amt.toLocaleString()} UZS:</span>
                          <span className="font-semibold text-emerald-600">
                            {comm.toLocaleString()} UZS komissiya → {(amt - comm).toLocaleString()} UZS net
                          </span>
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditSetting(null)}>Bekor</Button>
                <Button onClick={saveGlobal} disabled={savingGlobal}>
                  <Save className="h-4 w-4 mr-1" /> Saqlash
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── TAB 2: Do'kon bo'yicha ────────────────────────────────────── */}
        <TabsContent value="shops">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Do'kon uchun alohida stavka belgilang. U global stavkadan ustun turadi.
            </p>
            <Button size="sm" onClick={() => setAddOverrideOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-1" /> Override qo'shish
            </Button>
          </div>

          {/* Override qo'shish dialogi */}
          <Dialog open={addOverrideOpen} onOpenChange={setAddOverrideOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Do'kon komissiya override qo'shish</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Do'kon tanlang</Label>
                  <Select onValueChange={v => setSelectedShop(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Do'kon..." />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Komissiya turi</Label>
                  <Select value={addForm.type} onValueChange={v => setAddForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Stavka (%)</Label>
                  <div className="relative">
                    <Input
                      type="number" step="0.1" min="0" max="100"
                      value={addForm.rate}
                      onChange={e => setAddForm(f => ({ ...f, rate: e.target.value }))}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={addForm.is_active}
                    onCheckedChange={v => setAddForm(f => ({ ...f, is_active: v }))}
                  />
                  <Label>{addForm.is_active ? "Faol" : "O'chiq"}</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOverrideOpen(false)}>Bekor</Button>
                <Button onClick={saveOverride} disabled={savingOverride}>
                  <Save className="h-4 w-4 mr-1" /> Saqlash
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Do'konlar ro'yxati */}
          <div className="space-y-4">
            {shops.map(shop => {
              const shopOverrides = overridesByShop[shop.id] || [];
              return (
                <Card key={shop.id} className="shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">{shop.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Asosiy: {shop.commission || 0}%
                        </Badge>
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => { setSelectedShop(shop.id); setAddOverrideOpen(true); }}
                        >
                          <PlusCircle className="h-3 w-3 mr-1" /> Qo'shish
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {shopOverrides.length > 0 && (
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {shopOverrides.map(ov => {
                          const meta = COMM_TYPES[ov.type];
                          return (
                            <div key={ov.id} className="flex items-center justify-between p-2 rounded border bg-muted/20">
                              <div className="flex items-center gap-2">
                                {meta && <meta.icon className={`h-3.5 w-3.5 text-${meta.color}-600`} />}
                                <span className="text-xs font-medium">{meta?.label || ov.type}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{Number(ov.rate).toFixed(1)}%</span>
                                <Badge variant={ov.is_active ? "default" : "secondary"} className="text-xs">
                                  {ov.is_active ? "Faol" : "O'chiq"}
                                </Badge>
                                <Button
                                  size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                                  onClick={() => deleteOverride(ov.shop_id, ov.type)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                  {shopOverrides.length === 0 && (
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Override yo'q — global stavkalar qo'llaniladi
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            {shops.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Hali do'konlar yo'q</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── TAB 3: Hisobot ───────────────────────────────────────────────── */}
        <TabsContent value="report">
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="flex gap-1">
              {(["week", "month", "year"] as const).map(p => (
                <Button
                  key={p} variant={period === p ? "default" : "outline"}
                  size="sm" onClick={() => setPeriod(p)}
                >
                  {p === "week" ? "Hafta" : p === "month" ? "Oy" : "Yil"}
                </Button>
              ))}
            </div>
            <Select value={txFilter} onValueChange={setTxFilter}>
              <SelectTrigger className="w-44 h-8">
                <SelectValue placeholder="Barcha turlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Barcha turlar</SelectItem>
                {TYPE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadReport} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Jami kartalar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Jami gross", value: fmtMoney(txTotals?.total_gross || 0), color: "blue" },
              { label: "Platform komissiya", value: fmtMoney(txTotals?.total_commission || 0), color: "emerald" },
              { label: "Net o'tgan", value: fmtMoney(txTotals?.total_net || 0), color: "purple" },
              { label: "Tranzaksiyalar", value: Number(txTotals?.count || 0), color: "amber" },
            ].map((s, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                  <p className="text-lg font-bold mt-1">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Bar chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Tur bo'yicha komissiya</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byType.map(t => ({
                    name: (COMM_TYPES[t.type]?.label || t.type).slice(0, 14),
                    komissiya: Number(t.commission),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v / 1000}K`} />
                    <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} UZS`} />
                    <Bar dataKey="komissiya" fill="#10B981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Komissiya ulushi</CardTitle>
              </CardHeader>
              <CardContent>
                {byType.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={byType} dataKey="commission" nameKey="type" cx="50%" cy="50%" outerRadius={70}>
                          {byType.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} UZS`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 flex-1">
                      {byType.map((t, i) => (
                        <div key={t.type} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="truncate">{COMM_TYPES[t.type]?.label || t.type}</span>
                          <span className="ml-auto font-semibold">{Number(t.cnt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">Ma'lumot yo'q</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tranzaksiya jadvali */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Oxirgi komissiya tranzaksiyalari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2 pr-3">Sana</th>
                      <th className="text-left pb-2 pr-3">Tur</th>
                      <th className="text-left pb-2 pr-3">Foydalanuvchi</th>
                      <th className="text-right pb-2 pr-3">Gross</th>
                      <th className="text-right pb-2 pr-3">Stavka</th>
                      <th className="text-right pb-2">Komissiya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txList.map(tx => (
                      <tr key={tx.id} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 pr-3 text-muted-foreground">{fmtDate(tx.created_at)}</td>
                        <td className="py-1.5 pr-3">
                          <Badge variant="outline" className="text-xs">
                            {COMM_TYPES[tx.type]?.label || tx.type}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-3">{tx.user_name || tx.shop_name || "—"}</td>
                        <td className="py-1.5 pr-3 text-right">{Number(tx.gross_amount).toLocaleString()}</td>
                        <td className="py-1.5 pr-3 text-right">{Number(tx.commission_rate).toFixed(1)}%</td>
                        <td className="py-1.5 text-right font-bold text-emerald-600">
                          {Number(tx.commission_amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {txList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">Ma'lumot yo'q</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: Escrow/Depozit ─────────────────────────────────────── */}
        <TabsContent value="escrow">
          {/* Escrow statistika */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Ushlanib turibdi", value: Number(escrowTotals?.held_count || 0), sub: fmtMoney(escrowTotals?.held_amount || 0), icon: Lock, color: "amber" },
              { label: "Qaytarilgan", value: Number(escrowTotals?.released_count || 0), sub: fmtMoney(escrowTotals?.released_amount || 0), icon: Unlock, color: "emerald" },
            ].map((s, i) => (
              <Card key={i} className="shadow-sm col-span-1">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                      <p className="text-xl font-bold mt-1">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                    </div>
                    <div className={`bg-${s.color}-50 p-2 rounded-lg`}>
                      <s.icon className={`h-4 w-4 text-${s.color}-600`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Faol escrow holdlar (ushlanib turibdi)</CardTitle>
                <Badge variant="secondary">{escrowHolds.length} ta</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2 pr-3">ID</th>
                      <th className="text-left pb-2 pr-3">Foydalanuvchi</th>
                      <th className="text-left pb-2 pr-3">Ijara #</th>
                      <th className="text-left pb-2 pr-3">Tur</th>
                      <th className="text-right pb-2 pr-3">Summa</th>
                      <th className="text-left pb-2 pr-3">Holat</th>
                      <th className="text-left pb-2">Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {escrowHolds.map(hold => (
                      <tr key={hold.id} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 pr-3 text-muted-foreground">#{hold.id}</td>
                        <td className="py-1.5 pr-3 font-medium">{hold.user_name}</td>
                        <td className="py-1.5 pr-3">{hold.rental_id ? `#${hold.rental_id}` : "—"}</td>
                        <td className="py-1.5 pr-3">
                          <Badge variant="outline" className="text-xs capitalize">{hold.type}</Badge>
                        </td>
                        <td className="py-1.5 pr-3 text-right font-bold text-amber-600">
                          {Number(hold.amount).toLocaleString()} UZS
                        </td>
                        <td className="py-1.5 pr-3">
                          <Badge variant={hold.status === "held" ? "default" : "secondary"} className="text-xs">
                            {hold.status === "held" ? "Ushlanib" : "Chiqarildi"}
                          </Badge>
                        </td>
                        <td className="py-1.5 text-muted-foreground">{fmtDate(hold.created_at)}</td>
                      </tr>
                    ))}
                    {escrowHolds.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          Hozirda faol escrow holdlar yo'q
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
