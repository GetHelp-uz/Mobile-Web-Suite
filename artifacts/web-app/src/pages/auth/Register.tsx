import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Hammer, Lock, Phone, User, Building2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useRegister, useCreateShop } from "@workspace/api-client-react";

const REGIONS = [
  "Toshkent shahri", "Toshkent viloyati", "Samarqand viloyati",
  "Buxoro viloyati", "Andijon viloyati", "Farg'ona viloyati",
  "Namangan viloyati", "Xorazm viloyati", "Qashqadaryo viloyati",
  "Surxondaryo viloyati", "Sirdaryo viloyati", "Jizzax viloyati",
  "Navoiy viloyati", "Qoraqalpog'iston Respublikasi",
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    shopName: "",
    region: "",
  });

  const createShop = useCreateShop({ mutation: {} });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: async (data) => {
        if (form.shopName && data.token && data.user) {
          try {
            await createShop.mutateAsync({
              data: {
                name: form.shopName,
                address: form.region || "O'zbekiston",
                phone: data.user.phone || form.phone,
                ownerId: data.user.id,
                commission: 10,
              }
            });
          } catch (_) {}
        }
        login(data.token, data.user);
        toast({ title: "Muvaffaqiyatli!", description: "Hisobingiz yaratildi. Xush kelibsiz!" });
        setLocation("/shop");
      },
      onError: (error: any) => {
        toast({ title: "Xatolik", description: error.message || "Ro'yhatdan o'tib bo'lmadi", variant: "destructive" });
      }
    }
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Xatolik", description: "Parollar mos kelmadi", variant: "destructive" });
      return;
    }
    registerMutation.mutate({
      data: {
        name: form.name,
        phone: form.phone,
        password: form.password,
        role: "shop_owner",
        region: form.region || undefined,
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Chap tomon */}
      <div className="hidden lg:flex flex-1 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Qurilish foni"
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-transparent" />
        </div>
        <div className="z-10 text-primary-foreground p-12 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
              <Hammer size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-display font-bold mb-4">Do'koningizni ToolRent'ga qo'shing</h1>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Minglab qurilish kompaniyalari bilan birga ishlang. Asboblaringizni ijaraga bering va daromad oling.
            </p>
          </motion.div>
        </div>
      </div>

      {/* O'ng tomon - forma */}
      <div className="flex-1 flex items-start justify-center p-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm">
            <ArrowLeft size={16} /> Bosh sahifaga qaytish
          </Link>

          <div className="lg:hidden w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-6 shadow-lg">
            <Hammer size={24} className="text-white" />
          </div>

          <h2 className="text-3xl font-display font-bold mb-2">Do'kon egasi sifatida ro'yhatdan o'ting</h2>
          <p className="text-muted-foreground mb-8">
            Allaqachon hisobingiz bormi?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">Kirish</Link>
          </p>

          <Card className="p-8 shadow-xl border-border/50">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold">To'liq ism *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input placeholder="Ism Familya" className="pl-12" value={form.name} onChange={set("name")} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Telefon raqam *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input placeholder="+998 90 123 45 67" className="pl-12" value={form.phone} onChange={set("phone")} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Do'kon nomi</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input placeholder="Masalan: Qurilish Asboblari Markazi" className="pl-12" value={form.shopName} onChange={set("shopName")} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Viloyat</label>
                <select
                  className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.region}
                  onChange={set("region")}
                >
                  <option value="">Viloyatni tanlang</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Parol *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input type="password" placeholder="Kamida 6 ta belgi" className="pl-12" value={form.password} onChange={set("password")} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Parolni tasdiqlang *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input type="password" placeholder="Parolni qayta kiriting" className="pl-12" value={form.confirmPassword} onChange={set("confirmPassword")} required />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Ro'yhatdan o'tilmoqda..." : "Ro'yhatdan o'tish"}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
