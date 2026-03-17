import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Smartphone, CreditCard, Bell, Users, Settings,
  Save, AlertTriangle, Wrench, MessageSquare, Wifi, Shield,
  RefreshCw, CheckCircle,
} from "lucide-react";

const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
const h = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}`,
});

type Settings = Record<string, string>;

export default function AdminAppManagement() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`${baseUrl}/api/platform/settings`, { headers: h() });
    if (r.ok) { const d = await r.json(); setSettings(d.settings || {}); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function updateSetting(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function toggleSetting(key: string) {
    const cur = settings[key] === "true";
    updateSetting(key, cur ? "false" : "true");
  }

  async function saveAll() {
    setSaving(true);
    const r = await fetch(`${baseUrl}/api/platform/settings/bulk`, {
      method: "POST", headers: h(), body: JSON.stringify({ settings }),
    });
    if (r.ok) {
      toast({ title: "Sozlamalar saqlandi" });
    } else {
      const e = await r.json();
      toast({ title: "Xato", description: e.error, variant: "destructive" });
    }
    setSaving(false);
  }

  const bool = (key: string) => settings[key] === "true";
  const val = (key: string) => settings[key] || "";

  const featureSections = [
    {
      title: "Ilova versiyasi boshqaruvi",
      icon: Smartphone,
      color: "blue",
      fields: [
        {
          type: "input",
          key: "app_version_android",
          label: "Android ilovasi versiyasi",
          placeholder: "1.0.0",
          hint: "Minimum talab qilingan versiya (masalan: 1.2.0)",
        },
        {
          type: "input",
          key: "app_version_ios",
          label: "iOS ilovasi versiyasi",
          placeholder: "1.0.0",
        },
        {
          type: "toggle",
          key: "force_update_android",
          label: "Android majburiy yangilash",
          desc: "Eski versiyada foydalanuvchilar yangilashga majburlanadi",
        },
        {
          type: "toggle",
          key: "force_update_ios",
          label: "iOS majburiy yangilash",
          desc: "Eski versiyada foydalanuvchilar yangilashga majburlanadi",
        },
      ],
    },
    {
      title: "To'lov tizimlari",
      icon: CreditCard,
      color: "emerald",
      fields: [
        { type: "toggle", key: "click_enabled", label: "Click to'lov tizimi", desc: "Click Uzbekistan orqali to'lovlar" },
        { type: "toggle", key: "payme_enabled", label: "Payme to'lov tizimi", desc: "Payme orqali to'lovlar" },
        { type: "toggle", key: "paynet_enabled", label: "Paynet to'lov tizimi", desc: "Paynet orqali to'lovlar" },
        { type: "toggle", key: "cash_enabled", label: "Naqd to'lov", desc: "Naqd pul bilan to'lov imkoniyati" },
      ],
    },
    {
      title: "Komissiya sozlamalari",
      icon: Settings,
      color: "amber",
      fields: [
        { type: "toggle", key: "auto_commission_enabled", label: "Avtomatik komissiya", desc: "Ijara to'lovida komissiyani avtomatik ajratish" },
        { type: "input", key: "platform_commission", label: "Standart komissiya (%)", placeholder: "10", hint: "Do'konlarga alohida komissiya o'rnatilmagan holda qo'llaniladi" },
        { type: "input", key: "min_commission", label: "Minimal komissiya (%)", placeholder: "5" },
        { type: "input", key: "max_commission", label: "Maksimal komissiya (%)", placeholder: "30" },
      ],
    },
    {
      title: "Foydalanuvchilar va tizim",
      icon: Users,
      color: "purple",
      fields: [
        { type: "toggle", key: "registration_enabled", label: "Yangi ro'yhatdan o'tish", desc: "Yangi foydalanuvchilar ro'yhatdan o'ta olishi" },
        { type: "toggle", key: "sms_enabled", label: "SMS xabarnomalar", desc: "Barcha SMS xabarnomalar" },
        {
          type: "toggle",
          key: "maintenance_mode",
          label: "Texnik ishlar rejimi",
          desc: "Yoqilganda foydalanuvchilar kirisha olmaydi",
          danger: true,
        },
      ],
    },
    {
      title: "Qo'llab-quvvatlash",
      icon: MessageSquare,
      color: "rose",
      fields: [
        { type: "input", key: "support_phone", label: "Qo'llab-quvvatlash telefoni", placeholder: "+998712345678" },
        { type: "input", key: "support_telegram", label: "Telegram", placeholder: "@gethelp_support" },
      ],
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ilova boshqaruvi</h1>
          <p className="text-muted-foreground text-sm">Platform sozlamalari va funksiyalar boshqaruvi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={saveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saqlanmoqda..." : "Barcha o'zgarishlarni saqlash"}
          </Button>
        </div>
      </div>

      {/* Maintenance mode warning */}
      {bool("maintenance_mode") && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Texnik ishlar rejimi faol!</p>
            <p className="text-xs text-red-600">Foydalanuvchilar ilovaga kira olmaydi. Ishlar tugagach o'chirib qo'ying.</p>
          </div>
        </div>
      )}

      {/* Quick status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Click", key: "click_enabled", icon: CreditCard },
          { label: "Payme", key: "payme_enabled", icon: CreditCard },
          { label: "SMS", key: "sms_enabled", icon: Bell },
          { label: "Ro'yhatdan o'tish", key: "registration_enabled", icon: Users },
        ].map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
              bool(item.key) ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
            }`}
            onClick={() => toggleSetting(item.key)}
          >
            <item.icon className={`h-4 w-4 ${bool(item.key) ? "text-emerald-600" : "text-gray-400"}`} />
            <span className="text-sm font-medium flex-1">{item.label}</span>
            {bool(item.key) ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />
            )}
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {featureSections.map((section, si) => (
          <Card key={si} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-${section.color}-50`}>
                  <section.icon className={`h-4 w-4 text-${section.color}-600`} />
                </div>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field, fi) => (
                  <div key={fi}>
                    {field.type === "toggle" ? (
                      <div className={`flex items-center justify-between p-3 rounded-lg border ${
                        (field as any).danger && bool(field.key) ? "bg-red-50 border-red-200" : "bg-muted/30"
                      }`}>
                        <div>
                          <p className={`text-sm font-medium ${(field as any).danger && bool(field.key) ? "text-red-700" : ""}`}>
                            {field.label}
                          </p>
                          {(field as any).desc && (
                            <p className="text-xs text-muted-foreground">{(field as any).desc}</p>
                          )}
                        </div>
                        <Switch
                          checked={bool(field.key)}
                          onCheckedChange={() => toggleSetting(field.key)}
                        />
                      </div>
                    ) : (
                      <div>
                        <Label className="text-xs">{field.label}</Label>
                        <Input
                          value={val(field.key)}
                          onChange={e => updateSetting(field.key, e.target.value)}
                          placeholder={(field as any).placeholder || ""}
                          className="mt-1 h-9"
                        />
                        {(field as any).hint && (
                          <p className="text-xs text-muted-foreground mt-1">{(field as any).hint}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Play Store / App Store links section */}
      <Card className="shadow-sm mt-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-indigo-600" />
            Ilova do'konlari
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg font-bold">G</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Google Play Store</p>
                  <p className="text-xs text-muted-foreground">Android ilovasi</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Tayyorlanmoqda</Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Versiya: {val("app_version_android") || "1.0.0"} •
                Majburiy yangilash: {bool("force_update_android") ? "Ha" : "Yo'q"}
              </p>
            </div>
            <div className="p-4 rounded-xl border bg-gradient-to-br from-gray-50 to-slate-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🍎</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Apple App Store</p>
                  <p className="text-xs text-muted-foreground">iOS ilovasi</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Tayyorlanmoqda</Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Versiya: {val("app_version_ios") || "1.0.0"} •
                Majburiy yangilash: {bool("force_update_ios") ? "Ha" : "Yo'q"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
