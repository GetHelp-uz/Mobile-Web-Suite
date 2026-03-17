import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Save, Eye, EyeOff, CheckCircle, XCircle, Info,
  Webhook, Copy, ExternalLink,
} from "lucide-react";

type ShopPaymentSetting = {
  id: number;
  shop_id: number;
  provider: string;
  merchant_id: string;
  secret_key: string;
  service_id: string;
  is_active: boolean;
  is_test_mode: boolean;
};

type Shop = { id: number; name: string };

export default function ShopPaymentSettings() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const appUrl = window.location.origin;

  const [shop, setShop] = useState<Shop | null>(null);
  const [settings, setSettings] = useState<ShopPaymentSetting[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({
    provider: "paynet",
    merchant_id: "",
    secret_key: "",
    service_id: "",
    is_active: false,
    is_test_mode: true,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // Avval do'kon ma'lumotini olamiz
      const meRes = await fetch(`${baseUrl}/api/users/me`, { headers: h });
      const meData = await meRes.json();

      const shopsRes = await fetch(`${baseUrl}/api/shops?mine=true`, { headers: h });
      const shopsData = await shopsRes.json();
      const myShop = shopsData.shops?.[0] || shopsData[0];
      if (!myShop) { setLoading(false); return; }
      setShop(myShop);

      // Do'kon to'lov sozlamalarini olamiz
      const settingsRes = await fetch(`${baseUrl}/api/payment-settings/shop/${myShop.id}`, { headers: h });
      if (settingsRes.ok) {
        const rows: ShopPaymentSetting[] = await settingsRes.json();
        setSettings(rows);
        const paynet = rows.find(r => r.provider === "paynet");
        if (paynet) {
          setFormData({
            provider: "paynet",
            merchant_id: paynet.merchant_id || "",
            secret_key: "",
            service_id: paynet.service_id || "",
            is_active: paynet.is_active,
            is_test_mode: paynet.is_test_mode,
          });
        }
      }
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!shop) return;
    setSaving(true);
    try {
      const body: any = { ...formData };
      if (!body.secret_key) delete body.secret_key;

      const r = await fetch(`${baseUrl}/api/payment-settings/shop/${shop.id}`, {
        method: "PUT", headers: h, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: "Saqlandi!", description: "Paynet sozlamalari muvaffaqiyatli yangilandi" });
      setFormData(prev => ({ ...prev, secret_key: "" }));
      load();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const paynetSetting = settings.find(s => s.provider === "paynet");
  const isConfigured = !!(paynetSetting?.merchant_id);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="h-48 rounded-2xl bg-muted animate-pulse" />
          <div className="h-96 rounded-2xl bg-muted animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!shop) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CreditCard size={48} className="mx-auto mb-4 opacity-30" />
            <p>Do'kon topilmadi. Avval do'kon yarating.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-2">To'lov integratsiyasi</h1>
        <p className="text-muted-foreground">{shop.name} — Paynet to'lov tizimini ulang</p>
      </div>

      {/* Status */}
      <Card className={`mb-6 border-2 ${isConfigured ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}`}>
        <CardContent className="p-5 flex items-center gap-4">
          {isConfigured ? (
            <CheckCircle size={32} className="text-green-600 flex-shrink-0" />
          ) : (
            <XCircle size={32} className="text-orange-600 flex-shrink-0" />
          )}
          <div>
            <p className={`font-bold text-lg ${isConfigured ? "text-green-800" : "text-orange-800"}`}>
              {isConfigured ? "Paynet ulangan" : "Paynet ulanmagan"}
            </p>
            <p className={`text-sm ${isConfigured ? "text-green-700" : "text-orange-700"}`}>
              {isConfigured
                ? `Merchant ID: ${paynetSetting?.merchant_id} · ${paynetSetting?.is_test_mode ? "Test rejim" : "Jonli rejim"}`
                : "Paynet merchant credentials kiriting va saqlang"}
            </p>
          </div>
          {isConfigured && (
            <div className="ml-auto flex gap-2">
              <Badge variant={paynetSetting?.is_active ? "success" as any : "secondary"}>
                {paynetSetting?.is_active ? "Faol" : "Nofaol"}
              </Badge>
              <Badge variant={paynetSetting?.is_test_mode ? "secondary" : "success" as any}>
                {paynetSetting?.is_test_mode ? "Test" : "Jonli"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Credentials forma */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <CreditCard size={16} className="text-white" />
              </div>
              Paynet Sozlamalari
            </CardTitle>
            <CardDescription>
              <a href="https://paynet.uz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                paynet.uz <ExternalLink size={12} />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
              <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Paynet merchant akkauntini ochish uchun paynet.uz saytiga murojaat qiling. Credentials olganingizdan so'ng bu yerga kiriting.
              </p>
            </div>

            <div>
              <Label className="text-sm font-semibold">Merchant ID *</Label>
              <Input
                className="mt-1.5"
                placeholder="Paynet Merchant ID"
                value={formData.merchant_id}
                onChange={e => setFormData(prev => ({ ...prev, merchant_id: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Paynet tomonidan berilgan merchant identifikator</p>
            </div>

            <div>
              <Label className="text-sm font-semibold">Service ID</Label>
              <Input
                className="mt-1.5"
                placeholder="Paynet Service ID"
                value={formData.service_id}
                onChange={e => setFormData(prev => ({ ...prev, service_id: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Secret Key</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder={paynetSetting?.secret_key ? "Yangi kalit (bo'sh qoldirsangiz o'zgarmaydi)" : "Secret Key kiriting"}
                  value={formData.secret_key}
                  onChange={e => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {paynetSetting?.secret_key && (
                <p className="text-xs text-green-600 mt-1">Mavjud: {paynetSetting.secret_key}</p>
              )}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">To'lovlarni qabul qilish</Label>
                  <p className="text-xs text-muted-foreground">Paynet orqali to'lovlarni yoqish</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, is_active: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Test rejim</Label>
                  <p className="text-xs text-muted-foreground">Haqiqiy pul o'tkazmasdan test qilish</p>
                </div>
                <Switch
                  checked={formData.is_test_mode}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, is_test_mode: v }))}
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving || !formData.merchant_id} className="w-full gap-2">
              <Save size={16} />
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </CardContent>
        </Card>

        {/* Webhook va yo'riqnoma */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook size={16} /> Webhook URL'lar
              </CardTitle>
              <CardDescription>Paynet kabinetiga quyidagi URL'larni kiriting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { method: "POST", path: "/api/pay/paynet/check", desc: "Order tekshirish" },
                { method: "POST", path: "/api/pay/paynet/notify", desc: "To'lov natijasi" },
              ].map(wh => (
                <div key={wh.path} className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-xs text-orange-700">{wh.method}</Badge>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${appUrl}${wh.path}`);
                        toast({ title: "Nusxa olindi!" });
                      }}
                    >
                      <Copy size={14} className="text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                  <code className="text-xs font-mono break-all text-orange-700">{appUrl}{wh.path}</code>
                  <p className="text-xs text-muted-foreground mt-1">{wh.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ulash bo'yicha yo'riqnoma</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-sm text-muted-foreground space-y-3 list-none">
                {[
                  "paynet.uz saytida merchant akkaunt oching yoki mavjud akkauntingizga kiring",
                  "Kabinet → Sozlamalar bo'limidan Merchant ID va Secret Key oling",
                  "Yuqoridagi webhook URL'larini Paynet kabinetidagi \"Callback URL\" maydoniga kiriting",
                  "Bu sahifada credentials kiriting, \"To'lovlarni qabul qilish\" ni yoqing va saqlang",
                  "Mijozlar endi hamyonlarini Paynet orqali to'ldira oladi",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
