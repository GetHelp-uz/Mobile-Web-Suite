import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Plus, Edit3, Trash2, RefreshCw,
  Send, CheckCircle, XCircle, Clock, Server,
  Zap, CreditCard, Webhook, Eye, EyeOff
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type SmsSettings = {
  id: number; shop_id: number | null; provider: string;
  email: string; sender_id: string; is_active: boolean; token_expires_at: string | null;
};
type SmsTemplate = {
  id: number; shop_id: number | null; name: string;
  type: string; message: string; is_active: boolean;
};
type SmsLog = {
  id: number; phone: string; message: string; status: string;
  provider: string; error_message: string | null; sent_at: string;
};

const TEMPLATE_TYPES: Record<string, string> = {
  overdue: "Muddati o'tgan",
  reminder: "Eslatma",
  welcome: "Xush kelibsiz",
  return_confirm: "Qaytarish tasdiqlandi",
  custom: "Shaxsiy",
};
const TEMPLATE_TYPE_COLORS: Record<string, string> = {
  overdue: "destructive",
  reminder: "warning",
  welcome: "success",
  return_confirm: "success",
  custom: "secondary",
};

const SERVER_INTEGRATIONS = [
  { name: "Click To'lov", icon: CreditCard, status: "configured", desc: "Click Uzbekistan to'lov tizimi", color: "text-blue-500" },
  { name: "Payme", icon: CreditCard, status: "configured", desc: "Payme to'lov tizimi", color: "text-green-500" },
  { name: "Paynet", icon: CreditCard, status: "configured", desc: "Paynet to'lov tizimi", color: "text-orange-500" },
  { name: "Eskiz.uz SMS", icon: MessageSquare, status: "dynamic", desc: "SMS xabar yuborish xizmati", color: "text-purple-500" },
  { name: "PostgreSQL", icon: Server, status: "connected", desc: "Asosiy ma'lumotlar bazasi", color: "text-teal-500" },
  { name: "JWT Auth", icon: Zap, status: "connected", desc: "Token asosidagi autentifikatsiya", color: "text-yellow-500" },
  { name: "Webhook (kelgusida)", icon: Webhook, status: "soon", desc: "Tashqi tizimlar bilan bog'lash", color: "text-gray-400" },
];

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function AdminIntegrations() {
  const { toast } = useToast();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [smsSettings, setSmsSettings] = useState<SmsSettings | null>(null);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [smsForm, setSmsForm] = useState({ email: "", password: "", senderId: "4546", isActive: false });
  const [showPass, setShowPass] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);

  // Template dialog
  const [tmplOpen, setTmplOpen] = useState(false);
  const [editTmpl, setEditTmpl] = useState<Partial<SmsTemplate> | null>(null);

  // Test SMS dialog
  const [testOpen, setTestOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testSending, setTestSending] = useState(false);

  // Overdue trigger
  const [triggering, setTriggering] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t, l] = await Promise.all([
        fetch("/api/sms/settings", { headers: h }).then(r => r.json()),
        fetch("/api/sms/templates", { headers: h }).then(r => r.json()),
        fetch("/api/sms/logs?limit=30", { headers: h }).then(r => r.json()),
      ]);
      const settings = s.settings?.[0] ?? null;
      setSmsSettings(settings);
      if (settings) {
        setSmsForm({ email: settings.email || "", password: "", senderId: settings.sender_id || "4546", isActive: settings.is_active });
      }
      setTemplates(t.templates || []);
      setLogs(l.logs || []);
    } catch {
      toast({ title: "Xatolik", description: "Ma'lumotlar yuklanmadi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── SMS Sozlamalarni saqlash ───────────────────────────────────────────────
  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const body: any = { provider: "eskiz", email: smsForm.email, senderId: smsForm.senderId, isActive: smsForm.isActive };
      if (smsForm.password) body.password = smsForm.password;
      const r = await fetch("/api/sms/settings", { method: "POST", headers: h, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Saqlandi!", description: "SMS sozlamalari yangilandi" });
      load();
    } finally {
      setSavingSettings(false);
    }
  };

  // ─── Token yangilash ──────────────────────────────────────────────────────
  const refreshToken = async () => {
    setRefreshingToken(true);
    try {
      const r = await fetch("/api/sms/settings/refresh-token", { method: "POST", headers: h, body: JSON.stringify({}) });
      const d = await r.json();
      if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Token yangilandi!", description: `Amal qilish muddati: ${new Date(d.expiresAt).toLocaleDateString("uz-UZ")}` });
      load();
    } finally {
      setRefreshingToken(false);
    }
  };

  // ─── Shablon saqlash ─────────────────────────────────────────────────────
  const saveTmpl = async () => {
    if (!editTmpl) return;
    try {
      const body = { name: editTmpl.name, type: editTmpl.type, message: editTmpl.message, isActive: editTmpl.is_active ?? true };
      let r;
      if (editTmpl.id) {
        r = await fetch(`/api/sms/templates/${editTmpl.id}`, { method: "PATCH", headers: h, body: JSON.stringify(body) });
      } else {
        r = await fetch("/api/sms/templates", { method: "POST", headers: h, body: JSON.stringify(body) });
      }
      const d = await r.json();
      if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Saqlandi!" });
      setTmplOpen(false);
      load();
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
  };

  const deleteTmpl = async (id: number) => {
    await fetch(`/api/sms/templates/${id}`, { method: "DELETE", headers: h });
    toast({ title: "O'chirildi" });
    load();
  };

  // ─── Test SMS ────────────────────────────────────────────────────────────
  const sendTest = async () => {
    if (!testPhone || !testMsg) return;
    setTestSending(true);
    try {
      const r = await fetch("/api/sms/send", { method: "POST", headers: h, body: JSON.stringify({ phone: testPhone, message: testMsg }) });
      const d = await r.json();
      if (d.success) {
        toast({ title: "SMS yuborildi!", description: `${testPhone} raqamiga xabar muvaffaqiyatli ketdi` });
        setTestOpen(false);
        load();
      } else {
        toast({ title: "SMS yuborilmadi", description: d.error, variant: "destructive" });
      }
    } finally {
      setTestSending(false);
    }
  };

  // ─── Overdue trigger ───────────────────────────────────────────────────────
  const triggerOverdue = async () => {
    setTriggering(true);
    try {
      const r = await fetch("/api/sms/trigger-overdue", { method: "POST", headers: h });
      const d = await r.json();
      toast({ title: "Bajarildi!", description: `${d.sent} ta muddati o'tgan ijara uchun SMS yuborildi` });
      load();
    } finally {
      setTriggering(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Integratsiyalar</h1>
          <p className="text-muted-foreground">SMS xizmatlari, server integratsiyalari va webhook sozlamalari</p>
        </div>
        <Button onClick={() => setTestOpen(true)} className="gap-2">
          <Send size={18} /> Test SMS
        </Button>
      </div>

      <Tabs defaultValue="sms">
        <TabsList className="mb-8">
          <TabsTrigger value="sms" className="gap-2"><MessageSquare size={16} /> SMS Xizmati</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><Edit3 size={16} /> Shablonlar</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><Clock size={16} /> SMS Tarixi</TabsTrigger>
          <TabsTrigger value="servers" className="gap-2"><Server size={16} /> Server Integratsiyalar</TabsTrigger>
        </TabsList>

        {/* ─── SMS Sozlamalari ─────────────────────────────────────────── */}
        <TabsContent value="sms">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare size={20} className="text-primary" />
                    Eskiz.uz SMS Sozlamalari
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary">
                    <div className={`w-3 h-3 rounded-full ${smsSettings?.is_active ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    <span className="font-medium">{smsSettings?.is_active ? "Faol — SMS yuborishga tayyor" : "Nofaol — Email va parol kiriting"}</span>
                    {smsSettings?.token_expires_at && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        Token: {new Date(smsSettings.token_expires_at).toLocaleDateString("uz-UZ")} gacha
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Eskiz.uz Email *</label>
                    <Input placeholder="email@example.com" value={smsForm.email} onChange={e => setSmsForm(f => ({ ...f, email: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">notify.eskiz.uz saytida ro'yhatdan o'tgan email</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Parol {smsSettings ? "(o'zgartirish uchun kiriting)" : "*"}</label>
                    <div className="relative">
                      <Input
                        type={showPass ? "text" : "password"}
                        placeholder={smsSettings ? "••••••••" : "Eskiz.uz parolingiz"}
                        value={smsForm.password}
                        onChange={e => setSmsForm(f => ({ ...f, password: e.target.value }))}
                        className="pr-12"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(v => !v)}>
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Sender ID (jo'natuvchi nomi)</label>
                    <Input placeholder="4546" value={smsForm.senderId} onChange={e => setSmsForm(f => ({ ...f, senderId: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">Eskiz.uz'da tasdiqlangan sender nomi yoki 4546</p>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer" onClick={() => setSmsForm(f => ({ ...f, isActive: !f.isActive }))}>
                    <div className={`w-12 h-6 rounded-full transition-colors ${smsForm.isActive ? "bg-primary" : "bg-muted"} relative`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${smsForm.isActive ? "translate-x-7" : "translate-x-1"}`} />
                    </div>
                    <span className="font-medium">{smsForm.isActive ? "Faollashtirish — SMS yuborishga ruxsat" : "O'chirilgan"}</span>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={saveSettings} disabled={savingSettings} className="flex-1">
                      {savingSettings ? "Saqlanmoqda..." : "Saqlash"}
                    </Button>
                    <Button variant="outline" onClick={refreshToken} disabled={refreshingToken} className="gap-2">
                      <RefreshCw size={16} className={refreshingToken ? "animate-spin" : ""} />
                      Token yangilash
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Muddati o'tgan ijaralar */}
              <Card className="border-orange-200 bg-orange-50/30">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Zap size={24} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">Muddati o'tgan ijaralar uchun SMS</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Ijara muddati 1 kundan ko'proq o'tgan mijozlarga avtomatik SMS yuboriladi.
                        Cron job har soatda ishlaydi. Qo'lda ham ishga tushirishingiz mumkin.
                      </p>
                      <Button variant="outline" onClick={triggerOverdue} disabled={triggering} className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-100">
                        <Send size={16} className={triggering ? "animate-pulse" : ""} />
                        {triggering ? "Ishlamoqda..." : "Hozir tekshirish va SMS yuborish"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* O'ng: qo'llanma */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Qo'llanma</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">1</div><p>notify.eskiz.uz saytida ro'yhatdan o'ting va email/parolni kiriting</p></div>
                  <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">2</div><p>Saqlang va "Token yangilash" tugmasini bosing — bu Eskiz.uz'ga ulanadi</p></div>
                  <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">3</div><p>Faollashtiring va "Test SMS" orqali ishlashini tekshiring</p></div>
                  <div className="flex gap-3"><div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">4</div><p>Shablonlarni o'zingizga mos ravishda moslashtiring</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Shablon o'zgaruvchilari</CardTitle></CardHeader>
                <CardContent>
                  {["{mijoz}", "{asbob}", "{dokon}", "{sana}"].map(v => (
                    <div key={v} className="flex items-center justify-between py-2 border-b last:border-0">
                      <code className="text-xs bg-secondary px-2 py-1 rounded font-mono">{v}</code>
                      <span className="text-xs text-muted-foreground">
                        {v === "{mijoz}" ? "Mijoz ismi" : v === "{asbob}" ? "Asbob nomi" : v === "{dokon}" ? "Do'kon nomi" : "Ijara sanasi"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Shablonlar ──────────────────────────────────────────────── */}
        <TabsContent value="templates">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">SMS Shablonlari</h2>
            <Button onClick={() => { setEditTmpl({ type: "custom", is_active: true }); setTmplOpen(true); }} className="gap-2">
              <Plus size={18} /> Yangi shablon
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(t => (
              <Card key={t.id} className="relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold">{t.name}</h3>
                      <Badge variant={(TEMPLATE_TYPE_COLORS[t.type] || "secondary") as any} className="mt-1 text-xs">
                        {TEMPLATE_TYPES[t.type] || t.type}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditTmpl({ ...t }); setTmplOpen(true); }}>
                        <Edit3 size={16} />
                      </Button>
                      {!t.shop_id && <Button size="icon" variant="ghost" onClick={() => deleteTmpl(t.id)} className="text-destructive hover:text-destructive">
                        <Trash2 size={16} />
                      </Button>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground bg-secondary rounded-lg p-3 font-mono leading-relaxed">{t.message}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className={`w-2 h-2 rounded-full ${t.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                    <span className="text-xs text-muted-foreground">{t.is_active ? "Faol" : "Nofaol"}</span>
                    {t.shop_id && <Badge variant="outline" className="text-xs ml-auto">Do'kon shabloni</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── SMS Tarixi ──────────────────────────────────────────────── */}
        <TabsContent value="logs">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">SMS Yuborish Tarixi</h2>
            <Button variant="outline" onClick={load} className="gap-2"><RefreshCw size={16} /> Yangilash</Button>
          </div>
          {logs.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Hali SMS yuborilmagan</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <Card key={log.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${log.status === "sent" ? "bg-green-100" : log.status === "failed" ? "bg-red-100" : "bg-yellow-100"}`}>
                      {log.status === "sent" ? <CheckCircle size={20} className="text-green-600" /> : log.status === "failed" ? <XCircle size={20} className="text-red-600" /> : <Clock size={20} className="text-yellow-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{log.phone}</span>
                        <Badge variant={log.status === "sent" ? "success" as any : log.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                          {log.status === "sent" ? "Yuborildi" : log.status === "failed" ? "Xatolik" : "Kutilmoqda"}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">{new Date(log.sent_at).toLocaleString("uz-UZ")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{log.message}</p>
                      {log.error_message && <p className="text-xs text-destructive mt-1">{log.error_message}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Server Integratsiyalar ────────────────────────────────────── */}
        <TabsContent value="servers">
          <h2 className="text-xl font-bold mb-6">Server va API Integratsiyalar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVER_INTEGRATIONS.map(srv => (
              <Card key={srv.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                      <srv.icon size={24} className={srv.color} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold mb-1">{srv.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{srv.desc}</p>
                      <Badge variant={
                        srv.status === "dynamic" && smsSettings?.is_active ? "success" as any :
                        srv.status === "connected" || srv.status === "configured" ? "success" as any :
                        srv.status === "soon" ? "secondary" :
                        "destructive"
                      } className="text-xs">
                        {srv.status === "dynamic"
                          ? (smsSettings?.is_active ? "Ulangan" : "Sozlanmagan")
                          : srv.status === "connected" ? "Ulangan"
                          : srv.status === "configured" ? "Sozlangan"
                          : "Tez kunda"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader><CardTitle>API Ma'lumotlari</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "API bazasi", value: "/api" },
                  { label: "Autentifikatsiya", value: "Bearer JWT (30 kun)" },
                  { label: "SMS provider", value: "Eskiz.uz (notify.eskiz.uz)" },
                  { label: "Ma'lumotlar bazasi", value: "PostgreSQL (Replit DB)" },
                  { label: "Real-vaqt yangilash", value: "Polling (30 soniya)" },
                  { label: "To'lov usullari", value: "Click, Payme, Paynet, Naqd" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center p-3 bg-secondary rounded-xl">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <code className="text-sm font-mono font-semibold">{item.value}</code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Template Dialog ─────────────────────────────────────────────── */}
      <Dialog open={tmplOpen} onOpenChange={setTmplOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTmpl?.id ? "Shablonni tahrirlash" : "Yangi shablon"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-1 block">Nom *</label>
              <Input value={editTmpl?.name || ""} onChange={e => setEditTmpl(p => ({ ...p, name: e.target.value }))} placeholder="Shablon nomi" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Turi</label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={editTmpl?.type || "custom"} onChange={e => setEditTmpl(p => ({ ...p, type: e.target.value }))}>
                {Object.entries(TEMPLATE_TYPES).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Xabar matni *</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={editTmpl?.message || ""}
                onChange={e => setEditTmpl(p => ({ ...p, message: e.target.value }))}
                placeholder="Hurmatli {mijoz}, {asbob} asbobining ijara muddati o'tdi..."
              />
              <p className="text-xs text-muted-foreground mt-1">O'zgaruvchilar: &#123;mijoz&#125; &#123;asbob&#125; &#123;dokon&#125; &#123;sana&#125;</p>
            </div>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setEditTmpl(p => ({ ...p, is_active: !p?.is_active }))}>
              <div className={`w-10 h-5 rounded-full transition-colors ${editTmpl?.is_active ? "bg-primary" : "bg-muted"} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editTmpl?.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm">{editTmpl?.is_active ? "Faol" : "Nofaol"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTmplOpen(false)}>Bekor</Button>
            <Button onClick={saveTmpl}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Test SMS Dialog ─────────────────────────────────────────────── */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Test SMS Yuborish</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-1 block">Telefon raqam *</label>
              <Input placeholder="+998 90 123 45 67" value={testPhone} onChange={e => setTestPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Xabar *</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                placeholder="Test xabar matni..."
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {templates.slice(0, 3).map(t => (
                  <button key={t.id} type="button" className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors" onClick={() => setTestMsg(t.message)}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Bekor</Button>
            <Button onClick={sendTest} disabled={testSending || !testPhone || !testMsg} className="gap-2">
              <Send size={16} /> {testSending ? "Yuborilmoqda..." : "Yuborish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
