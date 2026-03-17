import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Puzzle, Bot, MapPin, MessageSquare, BarChart2, Shield,
  CreditCard, Truck, QrCode, Star, Bell, FileText, Zap,
  CheckCircle, Lock, Settings, Package, Globe, Camera,
} from "lucide-react";

type Plugin = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  color: string;
  enabled: boolean;
  locked: boolean;
  plan: "free" | "pro" | "enterprise";
  version: string;
  author: string;
};

const ALL_PLUGINS: Plugin[] = [
  {
    id: "ai-assistant",
    name: "AI Yordamchi",
    description: "ChatGPT yordamida savollaringizga javob bering, asbob tavsiyalari va platform boshqaruvi uchun sun'iy intellekt",
    category: "Intellekt",
    icon: Bot,
    color: "text-purple-500",
    enabled: true,
    locked: false,
    plan: "pro",
    version: "2.1.0",
    author: "GetHelp.uz",
  },
  {
    id: "gps-tracking",
    name: "GPS Monitoring",
    description: "Real-vaqtda asbob va transport vositalarini kuzatish. Geofence ogohlantirishlari va marshrutlash",
    category: "Kuzatuv",
    icon: MapPin,
    color: "text-green-500",
    enabled: true,
    locked: false,
    plan: "pro",
    version: "1.8.2",
    author: "GetHelp.uz",
  },
  {
    id: "sms-notifications",
    name: "SMS Bildirishnomalar",
    description: "Eskiz.uz orqali mijozlarga SMS yuborish. Shablon boshqaruvi va avtomatik eslatmalar",
    category: "Kommunikatsiya",
    icon: MessageSquare,
    color: "text-blue-500",
    enabled: true,
    locked: false,
    plan: "free",
    version: "3.0.1",
    author: "GetHelp.uz",
  },
  {
    id: "analytics-pro",
    name: "Kengaytirilgan Statistika",
    description: "Chuqur tahlil, daromad bashorati, mijozlar xulq-atvori va AI-ga asoslangan hisobotlar",
    category: "Tahlil",
    icon: BarChart2,
    color: "text-orange-500",
    enabled: false,
    locked: false,
    plan: "enterprise",
    version: "1.5.0",
    author: "GetHelp.uz",
  },
  {
    id: "esign",
    name: "Elektron Imzo",
    description: "Raqamli imzolar, PDF shartnomalar va yuridik kuchga ega hujjatlar yaratish tizimi",
    category: "Hujjatlar",
    icon: FileText,
    color: "text-teal-500",
    enabled: true,
    locked: false,
    plan: "free",
    version: "2.0.3",
    author: "GetHelp.uz",
  },
  {
    id: "delivery",
    name: "Yetkazib Berish",
    description: "Asboblarni mijozlarga yetkazib berish moduli. Haydovchi boshqaruvi va marshrutlash",
    category: "Logistika",
    icon: Truck,
    color: "text-yellow-500",
    enabled: true,
    locked: false,
    plan: "pro",
    version: "1.3.0",
    author: "GetHelp.uz",
  },
  {
    id: "qr-barcode",
    name: "QR/Shtrix Kod",
    description: "Asboblar uchun QR va shtrix kod generatsiyasi, skaner va inventarizatsiya boshqaruvi",
    category: "Inventar",
    icon: QrCode,
    color: "text-slate-500",
    enabled: true,
    locked: false,
    plan: "free",
    version: "2.2.1",
    author: "GetHelp.uz",
  },
  {
    id: "loyalty",
    name: "Sodiqlik Dasturi",
    description: "Ball to'plash, darajalar, sovg'alar va mijozlarni ushlab qolish mexanizmlari",
    category: "Marketing",
    icon: Star,
    color: "text-pink-500",
    enabled: true,
    locked: false,
    plan: "pro",
    version: "1.6.0",
    author: "GetHelp.uz",
  },
  {
    id: "push-notifications",
    name: "Push Bildirishnomalar",
    description: "Mobil ilovaga push-xabarlar yuborish. Segmentatsiya va A/B test qo'llab-quvvatlash",
    category: "Kommunikatsiya",
    icon: Bell,
    color: "text-red-500",
    enabled: false,
    locked: true,
    plan: "enterprise",
    version: "1.0.0",
    author: "GetHelp.uz",
  },
  {
    id: "payment-gateway",
    name: "To'lov Shlyuzi",
    description: "Click, Payme, Paynet va naqd to'lov integratsiyasi. Avtomatik hisob-kitob va qaytarma",
    category: "To'lov",
    icon: CreditCard,
    color: "text-emerald-500",
    enabled: true,
    locked: false,
    plan: "free",
    version: "3.1.2",
    author: "GetHelp.uz",
  },
  {
    id: "fraud-detection",
    name: "Firibgarlikni Aniqlash",
    description: "AI yordamida shubhali faoliyatni real-vaqtda aniqlash va bloklash tizimi",
    category: "Xavfsizlik",
    icon: Shield,
    color: "text-red-600",
    enabled: false,
    locked: true,
    plan: "enterprise",
    version: "0.9.0",
    author: "GetHelp.uz",
  },
  {
    id: "inventory-ai",
    name: "AI Inventar Tahlili",
    description: "Sun'iy intellekt yordamida zahirani optimallashtirish, muddatli bashorat va buyurtma avtomatizatsiyasi",
    category: "Intellekt",
    icon: Package,
    color: "text-indigo-500",
    enabled: false,
    locked: true,
    plan: "enterprise",
    version: "0.5.0",
    author: "GetHelp.uz",
  },
  {
    id: "multi-language",
    name: "Ko'p Tilli Qo'llab-quvvatlash",
    description: "O'zbek, Rus, Ingliz tillarida foydalanuvchi interfeysi. Avtomatik tarjima va lokalizatsiya",
    category: "Globallashuv",
    icon: Globe,
    color: "text-cyan-500",
    enabled: true,
    locked: false,
    plan: "pro",
    version: "1.1.0",
    author: "GetHelp.uz",
  },
  {
    id: "image-recognition",
    name: "Rasm Tahlili",
    description: "AI yordamida asbob shikastini aniqlash, sifat nazorati va katalog avtomatizatsiyasi",
    category: "Intellekt",
    icon: Camera,
    color: "text-violet-500",
    enabled: false,
    locked: true,
    plan: "enterprise",
    version: "0.3.0",
    author: "GetHelp.uz",
  },
];

const CATEGORIES = ["Barchasi", "Intellekt", "Kommunikatsiya", "Kuzatuv", "Hujjatlar", "Logistika", "Marketing", "To'lov", "Tahlil", "Inventar", "Xavfsizlik", "Globallashuv"];

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Bepul", color: "bg-green-100 text-green-700" },
  pro: { label: "Pro", color: "bg-blue-100 text-blue-700" },
  enterprise: { label: "Enterprise", color: "bg-purple-100 text-purple-700" },
};

export default function AdminPlugins() {
  const { toast } = useToast();
  const [plugins, setPlugins] = useState<Plugin[]>(ALL_PLUGINS);
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

  const togglePlugin = (id: string) => {
    const plugin = plugins.find(p => p.id === id);
    if (!plugin) return;
    if (plugin.locked) {
      toast({ title: "Qulfli plagin", description: "Bu plagin Enterprise rejasi talab qiladi", variant: "destructive" });
      return;
    }
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    const updated = plugins.find(p => p.id === id);
    toast({
      title: updated?.enabled ? "Plagin o'chirildi" : "Plagin yoqildi",
      description: plugin.name,
    });
  };

  const filtered = plugins.filter(p => activeCategory === "Barchasi" || p.category === activeCategory);
  const enabledCount = plugins.filter(p => p.enabled).length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Puzzle size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold">Plaginylar boshqaruvi</h1>
            <p className="text-muted-foreground">Platform kengaytmalari va qo'shimcha imkoniyatlar</p>
          </div>
        </div>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Jami plaginylar", value: plugins.length, icon: Puzzle, color: "text-primary" },
          { label: "Faol", value: enabledCount, icon: CheckCircle, color: "text-green-600" },
          { label: "O'chirilgan", value: plugins.length - enabledCount, icon: Zap, color: "text-orange-500" },
          { label: "Qulflangan", value: plugins.filter(p => p.locked).length, icon: Lock, color: "text-red-500" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <stat.icon size={18} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kategoriyalar */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat
                ? "bg-primary text-white shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Plaginylar royhati */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(plugin => {
          const Icon = plugin.icon;
          const planInfo = PLAN_LABELS[plugin.plan];
          return (
            <Card
              key={plugin.id}
              className={`transition-all hover:shadow-md cursor-pointer ${
                plugin.locked ? "opacity-70" : ""
              } ${plugin.enabled ? "border-primary/20 bg-primary/5" : ""}`}
              onClick={() => setSelectedPlugin(plugin)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      plugin.enabled ? "bg-primary/10" : "bg-secondary"
                    }`}>
                      {plugin.locked ? (
                        <Lock size={18} className="text-muted-foreground" />
                      ) : (
                        <Icon size={18} className={plugin.enabled ? "text-primary" : plugin.color} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{plugin.name}</p>
                      <p className="text-xs text-muted-foreground">v{plugin.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={plugin.enabled}
                      onCheckedChange={() => togglePlugin(plugin.id)}
                      disabled={plugin.locked}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{plugin.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planInfo.color}`}>
                      {planInfo.label}
                    </span>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {plugin.category}
                    </span>
                  </div>
                  {plugin.enabled && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle size={12} /> Faol
                    </span>
                  )}
                  {plugin.locked && (
                    <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                      <Lock size={12} /> Qulflangan
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plugin detail dialog */}
      <Dialog open={!!selectedPlugin} onOpenChange={v => !v && setSelectedPlugin(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlugin && (
                <>
                  <selectedPlugin.icon size={20} className={selectedPlugin.color} />
                  {selectedPlugin.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedPlugin && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary">
                <p className="text-sm">{selectedPlugin.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">Versiya</p>
                  <p className="font-semibold">v{selectedPlugin.version}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">Kategoriya</p>
                  <p className="font-semibold">{selectedPlugin.category}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">Reja</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_LABELS[selectedPlugin.plan].color}`}>
                    {PLAN_LABELS[selectedPlugin.plan].label}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary">
                  <p className="text-xs text-muted-foreground mb-1">Holat</p>
                  <p className={`font-semibold text-sm ${selectedPlugin.enabled ? "text-green-600" : "text-muted-foreground"}`}>
                    {selectedPlugin.locked ? "Qulflangan" : selectedPlugin.enabled ? "Faol" : "O'chirilgan"}
                  </p>
                </div>
              </div>
              {selectedPlugin.locked ? (
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2">
                  <Lock size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-700">Enterprise rejas kerak</p>
                    <p className="text-xs text-orange-600 mt-0.5">Bu plaginyni yoqish uchun Enterprise rejasiga o'ting</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedPlugin(null)}>
                    Yopish
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    variant={selectedPlugin.enabled ? "destructive" : "default"}
                    onClick={() => { togglePlugin(selectedPlugin.id); setSelectedPlugin(null); }}
                  >
                    <Settings size={16} />
                    {selectedPlugin.enabled ? "O'chirish" : "Yoqish"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
