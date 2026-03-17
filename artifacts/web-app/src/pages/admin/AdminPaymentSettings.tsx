import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Save, TestTube, Eye, EyeOff,
  CheckCircle, XCircle, Info, Webhook, Copy, RefreshCw,
} from "lucide-react";

type ProviderSetting = {
  id: number;
  provider: string;
  merchant_id: string;
  secret_key: string;
  service_id: string;
  api_url: string;
  is_active: boolean;
  is_test_mode: boolean;
  updated_at: string;
};

const PROVIDERS = [
  {
    key: "click",
    name: "Click",
    color: "from-blue-600 to-blue-700",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Click_logo.svg/200px-Click_logo.svg.png",
    fields: [
      { key: "merchant_id", label: "Merchant ID", placeholder: "12345678", hint: "Click kabineti → Profil → Merchant ID" },
      { key: "service_id", label: "Service ID", placeholder: "12345", hint: "Click kabineti → Xizmatlar → ID" },
      { key: "secret_key", label: "Secret Key", placeholder: "••••••••••••••••", hint: "Click kabineti → Xizmatlar → Secret Key", secret: true },
    ],
    webhooks: [
      { method: "POST", path: "/api/pay/click/prepare", desc: "Prepare (Click → GetHelp.uz)" },
      { method: "POST", path: "/api/pay/click/complete", desc: "Complete (Click → GetHelp.uz)" },
    ],
    docs: "https://docs.click.uz",
  },
  {
    key: "payme",
    name: "Payme",
    color: "from-emerald-600 to-emerald-700",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
    logo: "",
    fields: [
      { key: "merchant_id", label: "Merchant ID (Cashbox ID)", placeholder: "65f8e5c9e34b2700017e65c9", hint: "Payme kabineti → Kasbiy kabinetlar → Cashbox → ID" },
      { key: "secret_key", label: "Secret Key", placeholder: "••••••••••••••••", hint: "Payme kabineti → Sozlamalar → Key", secret: true },
    ],
    webhooks: [
      { method: "POST", path: "/api/pay/payme", desc: "Payme JSON-RPC API (Payme → GetHelp.uz)" },
    ],
    docs: "https://developer.help.paycom.uz",
  },
  {
    key: "paynet",
    name: "Paynet",
    color: "from-orange-500 to-orange-600",
    bgLight: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    logo: "",
    fields: [
      { key: "merchant_id", label: "Merchant ID", placeholder: "gethelp", hint: "Paynet tomonidan berilgan merchant identifikator" },
      { key: "service_id", label: "Service ID", placeholder: "12345", hint: "Paynet xizmat ID raqami" },
      { key: "secret_key", label: "Secret Key", placeholder: "••••••••••••••••", hint: "Paynet tomonidan berilgan maxfiy kalit", secret: true },
    ],
    webhooks: [
      { method: "POST", path: "/api/pay/paynet/check", desc: "Order mavjudligini tekshirish" },
      { method: "POST", path: "/api/pay/paynet/notify", desc: "To'lov natijasini qabul qilish" },
    ],
    docs: "https://paynet.uz",
  },
];

export default function AdminPaymentSettings() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const appUrl = window.location.origin;

  const [settings, setSettings] = useState<Record<string, ProviderSetting>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/payment-settings`, { headers: h });
      if (!r.ok) throw new Error("Yuklashda xatolik");
      const rows: ProviderSetting[] = await r.json();
      const map: Record<string, ProviderSetting> = {};
      const fd: Record<string, Record<string, any>> = {};
      rows.forEach(row => {
        map[row.provider] = row;
        fd[row.provider] = {
          merchant_id: row.merchant_id || "",
          secret_key: "",
          service_id: row.service_id || "",
          api_url: row.api_url || "",
          is_active: row.is_active,
          is_test_mode: row.is_test_mode,
        };
      });
      setSettings(map);
      setFormData(fd);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (provider: string) => {
    setSaving(s => ({ ...s, [provider]: true }));
    try {
      const fd = formData[provider] || {};
      const body: any = {
        merchant_id: fd.merchant_id,
        service_id: fd.service_id,
        api_url: fd.api_url,
        is_active: fd.is_active,
        is_test_mode: fd.is_test_mode,
      };
      if (fd.secret_key) body.secret_key = fd.secret_key;

      const r = await fetch(`${baseUrl}/api/payment-settings/${provider}`, {
        method: "PUT", headers: h, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: `${provider.toUpperCase()} saqlandi!`, description: "Sozlamalar muvaffaqiyatli yangilandi" });
      setFormData(prev => ({ ...prev, [provider]: { ...prev[provider], secret_key: "" } }));
      load();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setSaving(s => ({ ...s, [provider]: false }));
    }
  };

  const handleTest = async (provider: string) => {
    try {
      const r = await fetch(`${baseUrl}/api/payment-settings/test`, {
        method: "POST", headers: h, body: JSON.stringify({ provider }),
      });
      const d = await r.json();
      setTestResults(prev => ({ ...prev, [provider]: { success: d.success, message: d.message } }));
    } catch {
      setTestResults(prev => ({ ...prev, [provider]: { success: false, message: "Server bilan ulanishda xatolik" } }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Nusxa olindi!", description: text });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">To'lov integratsiyalari</h1>
        <p className="text-muted-foreground">Click, Payme va Paynet to'lov tizimlarini sozlang</p>
      </div>

      {/* Xavfsizlik ogohlantirish */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Muhim:</strong> Secret key va parollarni hech kim bilan bo'lishmang. Sozlamalar xavfsiz tarzda ma'lumotlar bazasida saqlanadi. Test rejimida real pul hisoblanmaydi.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="click">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          {PROVIDERS.map(p => {
            const s = settings[p.key];
            return (
              <TabsTrigger key={p.key} value={p.key} className="flex items-center gap-2">
                {p.name}
                {s?.is_active && s?.merchant_id ? (
                  <CheckCircle size={14} className="text-green-500" />
                ) : (
                  <XCircle size={14} className="text-muted-foreground" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {PROVIDERS.map(provider => {
          const s = settings[provider.key];
          const fd = formData[provider.key] || {};
          const isSaving = saving[provider.key];
          const testRes = testResults[provider.key];

          return (
            <TabsContent key={provider.key} value={provider.key} className="space-y-6">
              {/* Status kartasi */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${provider.color} flex items-center justify-center`}>
                        <CreditCard size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{provider.name}</h3>
                        <p className="text-muted-foreground text-sm">
                          {s?.merchant_id ? `Merchant: ${s.merchant_id}` : "Sozlanmagan"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant={fd.is_test_mode ? "secondary" : "success" as any}>
                        {fd.is_test_mode ? "Test rejim" : "Jonli rejim"}
                      </Badge>
                      <Badge variant={fd.is_active && s?.merchant_id ? "success" as any : "destructive"}>
                        {fd.is_active && s?.merchant_id ? "Faol" : "Faol emas"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => handleTest(provider.key)} className="gap-2">
                        <TestTube size={14} /> Test
                      </Button>
                    </div>
                  </div>
                  {testRes && (
                    <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${testRes.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                      {testRes.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {testRes.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Credentials */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Kirish ma'lumotlari</CardTitle>
                    <CardDescription>
                      <a href={provider.docs} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {provider.name} rasmiy hujjatlar →
                      </a>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {provider.fields.map(field => (
                      <div key={field.key}>
                        <Label htmlFor={`${provider.key}-${field.key}`} className="text-sm font-semibold">
                          {field.label}
                        </Label>
                        <div className="relative mt-1.5">
                          <Input
                            id={`${provider.key}-${field.key}`}
                            type={field.secret && !showSecrets[`${provider.key}-${field.key}`] ? "password" : "text"}
                            placeholder={field.placeholder}
                            value={fd[field.key] || ""}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              [provider.key]: { ...prev[provider.key], [field.key]: e.target.value },
                            }))}
                            className="pr-10"
                          />
                          {field.secret && (
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowSecrets(prev => ({ ...prev, [`${provider.key}-${field.key}`]: !prev[`${provider.key}-${field.key}`] }))}
                            >
                              {showSecrets[`${provider.key}-${field.key}`] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{field.hint}</p>
                        {field.key === "secret_key" && s?.secret_key && !fd.secret_key && (
                          <p className="text-xs text-green-600 mt-1">Mavjud: {s.secret_key}</p>
                        )}
                      </div>
                    ))}

                    {/* Rejim tugmalari */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-semibold">Faollashtirish</Label>
                          <p className="text-xs text-muted-foreground">To'lov qabul qilishni yoqish/o'chirish</p>
                        </div>
                        <Switch
                          checked={fd.is_active ?? true}
                          onCheckedChange={v => setFormData(prev => ({ ...prev, [provider.key]: { ...prev[provider.key], is_active: v } }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-semibold">Test rejim</Label>
                          <p className="text-xs text-muted-foreground">Haqiqiy pul o'tkazmasdan test qilish</p>
                        </div>
                        <Switch
                          checked={fd.is_test_mode ?? true}
                          onCheckedChange={v => setFormData(prev => ({ ...prev, [provider.key]: { ...prev[provider.key], is_test_mode: v } }))}
                        />
                      </div>
                    </div>

                    <Button onClick={() => handleSave(provider.key)} disabled={isSaving} className="w-full gap-2">
                      <Save size={16} />
                      {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Webhook URL'lar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Webhook size={16} />
                      Webhook URL'lar
                    </CardTitle>
                    <CardDescription>
                      {provider.name} kabinetiga quyidagi URL'larni kiriting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {provider.webhooks.map(wh => (
                      <div key={wh.path} className={`p-3 rounded-xl ${provider.bgLight} border ${provider.borderColor}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs ${provider.textColor}`}>{wh.method}</Badge>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`${appUrl}${wh.path}`)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <code className={`text-xs font-mono break-all ${provider.textColor}`}>
                          {appUrl}{wh.path}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">{wh.desc}</p>
                      </div>
                    ))}

                    <div className="mt-4 p-3 rounded-xl bg-secondary text-sm space-y-1">
                      <p className="font-semibold text-xs">Sozlash bo'yicha yo'riqnoma:</p>
                      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>{provider.name} merchant kabinetiga kiring</li>
                        <li>Credentials (merchant_id, secret_key) oling</li>
                        <li>Webhook URL'larini kabinet sozlamalarida o'rnating</li>
                        <li>Bu sahifada credentials kiriting va saqlang</li>
                        <li>Test tugmasini bosib tekshiring</li>
                      </ol>
                    </div>

                    <div className="p-3 rounded-xl bg-muted">
                      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <RefreshCw size={12} /> Return URL (muvaffaqiyatli to'lovdan keyin):
                      </p>
                      <code className="text-xs font-mono text-muted-foreground break-all">
                        {appUrl}/wallet/success
                      </code>
                      <button type="button" className="ml-2" onClick={() => copyToClipboard(`${appUrl}/wallet/success`)}>
                        <Copy size={12} className="inline text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </DashboardLayout>
  );
}
