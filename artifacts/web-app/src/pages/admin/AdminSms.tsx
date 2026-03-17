import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Send, Settings, FileText, BarChart3, Plus, Trash2, Edit3,
  RefreshCw, CheckCircle, XCircle, Clock, Zap, Globe, AlertTriangle, Eye, EyeOff
} from "lucide-react";

const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

const PROVIDERS = [
  { id: "eskiz",      label: "Eskiz.uz",     country: "uz", flag: "🇺🇿", desc: "O'zbekiston asosiy provayderi. Email + parol + Sender ID" },
  { id: "playmobile", label: "Playmobile.uz", country: "uz", flag: "🇺🇿", desc: "O'zbekiston alternativ provayderi. Email + parol" },
  { id: "smsc",       label: "SMSC.ru",       country: "ru", flag: "🇷🇺", desc: "Rossiya va MDH uchun. Login + parol" },
  { id: "smsru",      label: "SMS.ru",        country: "ru", flag: "🇷🇺", desc: "Rossiya uchun. API kalit kerak" },
  { id: "infobip",    label: "Infobip",       country: "int",flag: "🌐", desc: "Xalqaro provayder. API kalit + Base URL" },
];

const TEMPLATE_TYPES = [
  { id: "welcome_customer", label: "Mijoz xush kelibsiz" },
  { id: "welcome_shop",     label: "Do'kon xush kelibsiz" },
  { id: "rental_reminder",  label: "Ijara eslatmasi (1 kun oldin)" },
  { id: "overdue",          label: "Muddati o'tdi" },
  { id: "booking_confirmed",label: "Bron tasdiqlandi" },
  { id: "return_confirm",   label: "Qaytarish tasdiqlandi" },
  { id: "custom",           label: "Boshqa" },
];

const LANGS = [
  { id: "uz", label: "O'zbek",  flag: "🇺🇿" },
  { id: "ru", label: "Русский", flag: "🇷🇺" },
  { id: "kk", label: "Қазақша", flag: "🇰🇿" },
  { id: "ky", label: "Кыргызча",flag: "🇰🇬" },
  { id: "tg", label: "Тоҷикӣ",  flag: "🇹🇯" },
];

const TEMPLATE_VARS: Record<string, string[]> = {
  welcome_customer: ["{ism}"],
  welcome_shop:     ["{ism}", "{dokon}"],
  rental_reminder:  ["{ism}", "{asbob}", "{dokon}", "{sana}"],
  overdue:          ["{ism}", "{asbob}", "{dokon}", "{sana}"],
  booking_confirmed:["{ism}", "{asbob}", "{dokon}", "{sana}"],
  return_confirm:   ["{ism}", "{asbob}", "{dokon}"],
  custom:           ["{ism}", "{asbob}", "{dokon}", "{sana}"],
};

type Provider = { id: number; provider: string; label: string; country: string; email: string | null; api_key: string | null; sender_id: string; is_active: boolean; is_global: boolean; token_expires_at: string | null; };
type Template = { id: number; name: string; type: string; lang: string; message: string; is_active: boolean; };
type SmsLog  = { id: number; phone: string; message: string; status: string; provider: string; template_type: string | null; lang: string | null; error_message: string | null; sent_at: string; };
type Stats   = { total: string; sent: string; failed: string; today: string; week: string; month: string; };

export default function AdminSms() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [byType, setByType] = useState<any[]>([]);
  const [byProvider, setByProvider] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Provider form
  const [providerOpen, setProviderOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [pForm, setPForm] = useState({ provider: "eskiz", label: "", country: "uz", email: "", password: "", apiKey: "", senderId: "4546", isActive: true, isGlobal: true });
  const [showPass, setShowPass] = useState(false);

  // Template form
  const [tmplOpen, setTmplOpen] = useState(false);
  const [editTmpl, setEditTmpl] = useState<Template | null>(null);
  const [tForm, setTForm] = useState({ name: "", type: "welcome_customer", lang: "uz", message: "", isActive: true });
  const [activeLang, setActiveLang] = useState("uz");

  // Test SMS
  const [testOpen, setTestOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("998");
  const [testType, setTestType] = useState("welcome_customer");
  const [testLang, setTestLang] = useState("uz");
  const [testing, setTesting] = useState(false);

  // Filters
  const [logStatus, setLogStatus] = useState("");
  const [logType, setLogType] = useState("");
  const [triggering, setTriggering] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pR, tR, lR, sR] = await Promise.all([
        fetch(`${baseUrl}/api/sms/settings`, { headers: h }),
        fetch(`${baseUrl}/api/sms/templates`, { headers: h }),
        fetch(`${baseUrl}/api/sms/logs?limit=100`, { headers: h }),
        fetch(`${baseUrl}/api/sms/stats`, { headers: h }),
      ]);
      if (pR.ok) setProviders((await pR.json()).settings || []);
      if (tR.ok) setTemplates((await tR.json()).templates || []);
      if (lR.ok) setLogs((await lR.json()).logs || []);
      if (sR.ok) {
        const sd = await sR.json();
        setStats(sd.stats);
        setByType(sd.byType || []);
        setByProvider(sd.byProvider || []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Provider CRUD ─────────────────────────────────────────────────────────
  const openAddProvider = (prov?: typeof PROVIDERS[0]) => {
    setEditProvider(null);
    setPForm({ provider: prov?.id || "eskiz", label: prov?.label || "", country: prov?.country || "uz", email: "", password: "", apiKey: "", senderId: "4546", isActive: true, isGlobal: true });
    setProviderOpen(true);
  };
  const openEditProvider = (p: Provider) => {
    setEditProvider(p);
    setPForm({ provider: p.provider, label: p.label || "", country: p.country || "uz", email: p.email || "", password: "", apiKey: p.api_key || "", senderId: p.sender_id, isActive: p.is_active, isGlobal: p.is_global });
    setProviderOpen(true);
  };

  const saveProvider = async () => {
    const r = await fetch(`${baseUrl}/api/sms/settings`, {
      method: "POST", headers: h,
      body: JSON.stringify({ ...pForm, senderId: pForm.senderId }),
    });
    const d = r.ok ? await r.json() : await r.json();
    if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
    toast({ title: "Saqlandi" });
    setProviderOpen(false);
    load();
  };

  const toggleProvider = async (id: number) => {
    const r = await fetch(`${baseUrl}/api/sms/settings/${id}/toggle`, { method: "PATCH", headers: h });
    if (r.ok) load();
  };

  const deleteProvider = async (id: number) => {
    if (!confirm("Provayderni o'chirasizmi?")) return;
    await fetch(`${baseUrl}/api/sms/settings/${id}`, { method: "DELETE", headers: h });
    load();
  };

  const refreshToken = async (id: number) => {
    const r = await fetch(`${baseUrl}/api/sms/settings/refresh-token`, {
      method: "POST", headers: h, body: JSON.stringify({ settingsId: id }),
    });
    const d = await r.json();
    if (r.ok) toast({ title: "Token yangilandi" });
    else toast({ title: "Xatolik", description: d.error, variant: "destructive" });
  };

  // ─── Template CRUD ─────────────────────────────────────────────────────────
  const openAddTmpl = (type?: string, lang?: string) => {
    setEditTmpl(null);
    const t = type || "welcome_customer";
    const l = lang || activeLang;
    const prov = PROVIDERS.find(p => p.id === "eskiz");
    setTForm({ name: `${TEMPLATE_TYPES.find(x=>x.id===t)?.label} (${l.toUpperCase()})`, type: t, lang: l, message: "", isActive: true });
    setTmplOpen(true);
  };
  const openEditTmpl = (tmpl: Template) => {
    setEditTmpl(tmpl);
    setTForm({ name: tmpl.name, type: tmpl.type, lang: tmpl.lang, message: tmpl.message, isActive: tmpl.is_active });
    setTmplOpen(true);
  };

  const saveTmpl = async () => {
    const url = editTmpl ? `${baseUrl}/api/sms/templates/${editTmpl.id}` : `${baseUrl}/api/sms/templates`;
    const method = editTmpl ? "PATCH" : "POST";
    const body = editTmpl
      ? { name: tForm.name, type: tForm.type, lang: tForm.lang, message: tForm.message, isActive: tForm.isActive }
      : { name: tForm.name, type: tForm.type, lang: tForm.lang, message: tForm.message };
    const r = await fetch(url, { method, headers: h, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
    toast({ title: editTmpl ? "Yangilandi" : "Qo'shildi" });
    setTmplOpen(false);
    load();
  };

  const deleteTmpl = async (id: number) => {
    if (!confirm("Shablonni o'chirasizmi?")) return;
    await fetch(`${baseUrl}/api/sms/templates/${id}`, { method: "DELETE", headers: h });
    load();
  };

  // ─── Test SMS ──────────────────────────────────────────────────────────────
  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await fetch(`${baseUrl}/api/sms/send-template`, {
        method: "POST", headers: h,
        body: JSON.stringify({
          phone: testPhone, type: testType, lang: testLang,
          vars: { ism: "Test Foydalanuvchi", asbob: "Perforator", dokon: "GetHelp Demo", sana: new Date().toLocaleDateString("uz-UZ") },
        }),
      });
      const d = await r.json();
      if (d.success) toast({ title: "SMS yuborildi!", description: `Xabar ${testPhone} raqamiga yuborildi` });
      else toast({ title: "Xatolik", description: d.error, variant: "destructive" });
      load();
    } finally { setTesting(false); }
  };

  // ─── Triggerlar ────────────────────────────────────────────────────────────
  const trigger = async (type: string) => {
    setTriggering(type);
    try {
      const r = await fetch(`${baseUrl}/api/sms/trigger-${type}`, { method: "POST", headers: h });
      const d = await r.json();
      if (d.success) toast({ title: "Bajarildi", description: `${d.sent} ta SMS yuborildi` });
      else toast({ title: "Xatolik", description: d.error, variant: "destructive" });
      load();
    } finally { setTriggering(""); }
  };

  const filteredLogs = logs.filter(l =>
    (!logStatus || l.status === logStatus) &&
    (!logType || l.template_type === logType)
  );

  const tmplByType = TEMPLATE_TYPES.map(tt => ({
    ...tt,
    langMap: LANGS.reduce<Record<string, Template | undefined>>((acc, lg) => {
      acc[lg.id] = templates.find(t => t.type === tt.id && t.lang === lg.id);
      return acc;
    }, {}),
  }));

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-1">SMS Boshqaruv</h1>
          <p className="text-muted-foreground">Eskiz, SMSC.ru, SMS.ru, Infobip — ko'p provayder, ko'p tilli</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTestOpen(true)} className="gap-2">
            <Send size={16}/> Test SMS
          </Button>
          <Button onClick={() => openAddProvider()} className="gap-2">
            <Plus size={16}/> Provayder qo'shish
          </Button>
        </div>
      </div>

      {/* Statistika */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Jami", value: stats.total, color: "text-foreground" },
            { label: "Yuborildi", value: stats.sent, color: "text-green-600" },
            { label: "Xatolik", value: stats.failed, color: "text-red-600" },
            { label: "Bugun", value: stats.today, color: "text-blue-600" },
            { label: "Hafta", value: stats.week, color: "text-purple-600" },
            { label: "Oy", value: stats.month, color: "text-orange-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="providers">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="providers" className="gap-1.5"><Settings size={14}/> Provayderlar</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText size={14}/> Shablonlar</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><MessageSquare size={14}/> Tarix</TabsTrigger>
          <TabsTrigger value="triggers" className="gap-1.5"><Zap size={14}/> Triggerlar</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 size={14}/> Tahlil</TabsTrigger>
        </TabsList>

        {/* ─── PROVAYDERLAR ─────────────────────────────────────────────── */}
        <TabsContent value="providers">
          <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-2">
            {PROVIDERS.map(p => (
              <Card key={p.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => openAddProvider(p)}>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl mb-1">{p.flag}</div>
                  <p className="font-semibold text-sm">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc.split(".")[0]}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mb-4">Yuqoridagi kartaga bosib yangi provayder qo'shing. Qo'shilgan provayderlar:</p>
          {providers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe size={48} className="mx-auto mb-3 opacity-30"/>
              <p>Hali provayder qo'shilmagan. Yuqoridagi kartalardan birini tanlang.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map(p => {
                const meta = PROVIDERS.find(x => x.id === p.provider);
                return (
                  <Card key={p.id} className={p.is_active ? "border-green-200" : ""}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="text-2xl">{meta?.flag || "📡"}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold">{p.label || meta?.label}</span>
                          <Badge variant={p.is_active ? "default" : "secondary"}>
                            {p.is_active ? "Faol" : "Nofaol"}
                          </Badge>
                          {p.is_global && <Badge variant="outline">Global</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {p.provider} • {p.country?.toUpperCase()} • Sender: {p.sender_id}
                          {p.email && ` • ${p.email}`}
                          {p.token_expires_at && ` • Token: ${new Date(p.token_expires_at) > new Date() ? "✅ Faol" : "⚠️ Muddati o'tdi"}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {p.provider === "eskiz" && (
                          <Button size="sm" variant="outline" onClick={() => refreshToken(p.id)} className="gap-1">
                            <RefreshCw size={13}/> Token
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => toggleProvider(p.id)}>
                          {p.is_active ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditProvider(p)}>
                          <Edit3 size={14}/>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteProvider(p.id)}>
                          <Trash2 size={14}/>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── SHABLONLAR ───────────────────────────────────────────────── */}
        <TabsContent value="templates">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {LANGS.map(l => (
                <Button key={l.id} size="sm" variant={activeLang === l.id ? "default" : "outline"}
                  onClick={() => setActiveLang(l.id)} className="gap-1">
                  {l.flag} {l.label}
                </Button>
              ))}
            </div>
            <Button onClick={() => openAddTmpl(undefined, activeLang)} className="gap-2">
              <Plus size={15}/> Shablon qo'shish
            </Button>
          </div>

          <div className="space-y-4">
            {tmplByType.map(tt => {
              const tmpl = tt.langMap[activeLang];
              return (
                <Card key={tt.id} className={tmpl?.is_active ? "" : "opacity-60"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-sm">{tt.label}</span>
                          <Badge variant="outline" className="text-xs">{tt.id}</Badge>
                          {tmpl ? (
                            <Badge variant="default" className="text-xs bg-green-600">Mavjud</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Yo'q</Badge>
                          )}
                        </div>
                        {tmpl ? (
                          <div>
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 font-mono">{tmpl.message}</p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {(TEMPLATE_VARS[tt.id] || []).map(v => (
                                <span key={v} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{v}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Bu tilda shablon yo'q. "+" tugmasi bilan qo'shing.
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {tmpl ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEditTmpl(tmpl)}>
                              <Edit3 size={13}/>
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteTmpl(tmpl.id)}>
                              <Trash2 size={13}/>
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => openAddTmpl(tt.id, activeLang)} className="gap-1">
                            <Plus size={13}/> Qo'shish
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── TARIX ────────────────────────────────────────────────────── */}
        <TabsContent value="logs">
          <div className="flex gap-2 mb-4">
            <select className="border rounded px-2 py-1.5 text-sm bg-background" value={logStatus} onChange={e => setLogStatus(e.target.value)}>
              <option value="">Barcha holat</option>
              <option value="sent">Yuborildi</option>
              <option value="failed">Xatolik</option>
              <option value="pending">Kutmoqda</option>
            </select>
            <select className="border rounded px-2 py-1.5 text-sm bg-background" value={logType} onChange={e => setLogType(e.target.value)}>
              <option value="">Barcha tur</option>
              {TEMPLATE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw size={14}/></Button>
            <span className="text-sm text-muted-foreground ml-auto self-center">{filteredLogs.length} ta xabar</span>
          </div>
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare size={48} className="mx-auto mb-3 opacity-30"/>
                <p>SMS tarixi bo'sh</p>
              </div>
            ) : filteredLogs.map(l => (
              <Card key={l.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="mt-0.5">
                    {l.status === "sent" ? <CheckCircle size={16} className="text-green-600"/> :
                      l.status === "failed" ? <XCircle size={16} className="text-red-500"/> :
                        <Clock size={16} className="text-yellow-500"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-mono text-sm font-semibold">{l.phone}</span>
                      <Badge variant="outline" className="text-xs">{l.provider}</Badge>
                      {l.template_type && <Badge variant="secondary" className="text-xs">{TEMPLATE_TYPES.find(t=>t.id===l.template_type)?.label || l.template_type}</Badge>}
                      {l.lang && <span className="text-xs">{LANGS.find(lg=>lg.id===l.lang)?.flag}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{l.message}</p>
                    {l.error_message && <p className="text-xs text-red-500">{l.error_message}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.sent_at).toLocaleString("uz-UZ")}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── TRIGGERLAR ───────────────────────────────────────────────── */}
        <TabsContent value="triggers">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle size={18} className="text-orange-500"/> Muddati o'tgan eslatma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Ijara muddati 1 kundan ko'proq o'tgan, hali qaytarilmagan asboblar uchun SMS yuboradi.
                  Har bir ijaraga 24 soatda bir marta yuboriladi.
                </p>
                <Button onClick={() => trigger("overdue")} disabled={triggering === "overdue"} className="gap-2">
                  {triggering === "overdue" ? <RefreshCw size={15} className="animate-spin"/> : <Zap size={15}/>}
                  Hozir ishga tushirish
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock size={18} className="text-blue-500"/> 1 kun oldin eslatma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Keyingi 26 soat ichida muddati tugaydigan ijaralar uchun eslatma SMS yuboradi.
                  Avtomatik ishga tushirish uchun cron job sozlang.
                </p>
                <Button onClick={() => trigger("reminder")} disabled={triggering === "reminder"} className="gap-2">
                  {triggering === "reminder" ? <RefreshCw size={15} className="animate-spin"/> : <Zap size={15}/>}
                  Hozir ishga tushirish
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe size={18}/> Cron job sozlash (Server)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Avtomatik SMS yuborish uchun serverda quyidagi cron job'larni sozlang:
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Har kuni 09:00 — Eslatma (1 kun oldin)", cmd: `0 9 * * * curl -X POST https://yourdomain.com/api/sms/trigger-reminder -H "Authorization: Bearer ADMIN_TOKEN"` },
                    { label: "Har kuni 10:00 — Muddati o'tdi", cmd: `0 10 * * * curl -X POST https://yourdomain.com/api/sms/trigger-overdue -H "Authorization: Bearer ADMIN_TOKEN"` },
                  ].map(c => (
                    <div key={c.label} className="bg-muted rounded p-3">
                      <p className="text-xs font-semibold mb-1">{c.label}</p>
                      <code className="text-xs break-all">{c.cmd}</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAHLIL ───────────────────────────────────────────────────── */}
        <TabsContent value="analytics">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Shablon turlari bo'yicha</CardTitle></CardHeader>
              <CardContent>
                {byType.length === 0 ? <p className="text-sm text-muted-foreground">Ma'lumot yo'q</p> :
                  byType.map((row: any) => {
                    const pct = row.cnt > 0 ? Math.round((row.sent / row.cnt) * 100) : 0;
                    const label = TEMPLATE_TYPES.find(t => t.id === row.template_type)?.label || row.template_type;
                    return (
                      <div key={row.template_type} className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{label}</span>
                          <span className="text-muted-foreground">{row.sent}/{row.cnt} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }}/>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Provayderlar bo'yicha</CardTitle></CardHeader>
              <CardContent>
                {byProvider.length === 0 ? <p className="text-sm text-muted-foreground">Ma'lumot yo'q</p> :
                  byProvider.map((row: any) => {
                    const pct = row.cnt > 0 ? Math.round((row.sent / row.cnt) * 100) : 0;
                    const meta = PROVIDERS.find(p => p.id === row.provider);
                    return (
                      <div key={row.provider} className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{meta?.flag} {meta?.label || row.provider}</span>
                          <span className="text-muted-foreground">{row.sent}/{row.cnt} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}/>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Provayder Dialog ─────────────────────────────────────────────── */}
      <Dialog open={providerOpen} onOpenChange={setProviderOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProvider ? "Provayderni tahrirlash" : "Yangi provayder qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-semibold mb-1 block">Provayder *</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={pForm.provider} onChange={e => setPForm(f => ({ ...f, provider: e.target.value }))}>
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.flag} {p.label} — {p.desc}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">Belgi (ixtiyoriy)</label>
                <Input placeholder="Masalan: Asosiy UZ" value={pForm.label} onChange={e => setPForm(f => ({ ...f, label: e.target.value }))}/>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Davlat</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={pForm.country} onChange={e => setPForm(f => ({ ...f, country: e.target.value }))}>
                  <option value="uz">🇺🇿 O'zbekiston</option>
                  <option value="ru">🇷🇺 Rossiya</option>
                  <option value="kz">🇰🇿 Qozogʻiston</option>
                  <option value="kg">🇰🇬 Qirgʻiziston</option>
                  <option value="tj">🇹🇯 Tojikiston</option>
                  <option value="int">🌐 Xalqaro</option>
                </select>
              </div>
            </div>
            {["eskiz", "playmobile", "smsc"].includes(pForm.provider) && (
              <>
                <div>
                  <label className="text-sm font-semibold mb-1 block">
                    {pForm.provider === "smsc" ? "Login" : "Email"} *
                  </label>
                  <Input placeholder={pForm.provider === "smsc" ? "smsc_login" : "email@example.com"} value={pForm.email} onChange={e => setPForm(f => ({ ...f, email: e.target.value }))}/>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Parol</label>
                  <div className="relative">
                    <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={pForm.password} onChange={e => setPForm(f => ({ ...f, password: e.target.value }))}/>
                    <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>
              </>
            )}
            {["smsru", "infobip"].includes(pForm.provider) && (
              <div>
                <label className="text-sm font-semibold mb-1 block">API Kalit *</label>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} placeholder="API key" value={pForm.apiKey} onChange={e => setPForm(f => ({ ...f, apiKey: e.target.value }))}/>
                  <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">Sender ID</label>
                <Input placeholder="4546" value={pForm.senderId} onChange={e => setPForm(f => ({ ...f, senderId: e.target.value }))}/>
              </div>
              <div className="flex flex-col gap-2 pt-5">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={pForm.isActive} onChange={e => setPForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded"/>
                  Faol
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={pForm.isGlobal} onChange={e => setPForm(f => ({ ...f, isGlobal: e.target.checked }))} className="rounded"/>
                  Global (barcha uchun)
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderOpen(false)}>Bekor</Button>
            <Button onClick={saveProvider}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Shablon Dialog ────────────────────────────────────────────────── */}
      <Dialog open={tmplOpen} onOpenChange={setTmplOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTmpl ? "Shablonni tahrirlash" : "Yangi shablon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-semibold mb-1 block">Nom *</label>
              <Input value={tForm.name} onChange={e => setTForm(f => ({ ...f, name: e.target.value }))}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">Tur *</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={tForm.type} onChange={e => setTForm(f => ({ ...f, type: e.target.value }))}>
                  {TEMPLATE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Til *</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={tForm.lang} onChange={e => setTForm(f => ({ ...f, lang: e.target.value }))}>
                  {LANGS.map(l => <option key={l.id} value={l.id}>{l.flag} {l.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Matn *</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                rows={4} value={tForm.message}
                onChange={e => setTForm(f => ({ ...f, message: e.target.value }))}
                placeholder={`Shablon matnini kiriting. O'zgaruvchilar: ${(TEMPLATE_VARS[tForm.type] || []).join(", ")}`}
              />
              <div className="flex gap-1 flex-wrap mt-1">
                {(TEMPLATE_VARS[tForm.type] || []).map(v => (
                  <button key={v} type="button"
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100"
                    onClick={() => setTForm(f => ({ ...f, message: f.message + v }))}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTmplOpen(false)}>Bekor</Button>
            <Button onClick={saveTmpl}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Test SMS Dialog ───────────────────────────────────────────────── */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send size={18}/> Test SMS yuborish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-semibold mb-1 block">Telefon raqami *</label>
              <Input placeholder="998901234567" value={testPhone} onChange={e => setTestPhone(e.target.value)}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">Shablon turi</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={testType} onChange={e => setTestType(e.target.value)}>
                  {TEMPLATE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Til</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={testLang} onChange={e => setTestLang(e.target.value)}>
                  {LANGS.map(l => <option key={l.id} value={l.id}>{l.flag} {l.label}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              Test o'zgaruvchilari: ism=Test Foydalanuvchi, asbob=Perforator, dokon=GetHelp Demo, sana=Bugun
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Bekor</Button>
            <Button onClick={sendTest} disabled={testing} className="gap-2">
              {testing ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>}
              Yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
