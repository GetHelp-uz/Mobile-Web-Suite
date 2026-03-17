import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Hammer, Lock, Phone, User, Building2, ArrowLeft, ScrollText, ExternalLink, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";

const OFERTA_TEXT = `TOOLRENT PLATFORMASI UCHUN OMMAVIY OFERTA SHARTLARI
VA SHAXSIY MA'LUMOTLARNI QAYTA ISHLASHGA ROZILIK

1. Umumiy qoidalar

Ushbu ommaviy oferta (keyingi o'rinlarda "Oferta") ToolRent platformasi orqali qurilish asbob-uskunalarini ijaraga berish xizmatidan foydalanish tartibini belgilaydi.

Platformada ro'yxatdan o'tgan foydalanuvchi (keyingi o'rinlarda "Mijoz") ushbu Oferta shartlari bilan tanishib chiqib, ularga to'liq rozilik bildirgan hisoblanadi.

2. Xizmat tavsifi

ToolRent platformasi mijozlarga quyidagi imkoniyatlarni taqdim etadi:
- qurilish asbob-uskunalarini tanlash
- uskunalarni ijaraga olish
- QR kod orqali uskunani olish va qaytarish
- onlayn to'lovlarni amalga oshirish (Click, Payme, Paynet)
- ijara tarixini kuzatish

3. Mijoz majburiyatlari

Mijoz quyidagilarni tasdiqlaydi va majburiyat sifatida qabul qiladi:
1. Ro'yxatdan o'tishda to'g'ri va haqqoniy ma'lumotlarni taqdim etish.
2. Platforma orqali olingan uskunalardan ehtiyotkorlik bilan foydalanish.
3. Uskunani uchinchi shaxslarga bermaslik.
4. Uskunani belgilangan muddatda qaytarish.
5. Uskunaga yetkazilgan har qanday zarar uchun javobgar bo'lish.

4. Depozit va to'lovlar

Ba'zi uskunalarni ijaraga olishda depozit (garov puli) talab qilinishi mumkin.
Mijoz quyidagilarga rozilik bildiradi: ijara to'lovini amalga oshirish, depozit qoldirish, uskuna shikastlangan yoki yo'qolgan taqdirda depozitdan zararni qoplash.

5. Javobgarlik

Agar mijoz tomonidan olingan uskuna shikastlansa, buzilsa yoki yo'qolsa, mijoz yetkazilgan zararni to'liq qoplash majburiyatini oladi. Platforma uskunaning noto'g'ri foydalanilishi natijasida yuzaga kelgan zarar uchun javobgar emas.

6. Shaxsiy ma'lumotlarni qayta ishlashga rozilik

Mijoz platformada ro'yxatdan o'tish jarayonida quyidagi shaxsiy ma'lumotlarini taqdim etadi: ism va familiya, telefon raqami, identifikatsiya ma'lumotlari, ijara tarixi, to'lov ma'lumotlari.

Mijoz ushbu ma'lumotlarning quyidagi maqsadlarda qayta ishlanishiga rozilik beradi: foydalanuvchini identifikatsiya qilish, xizmat ko'rsatish, to'lovlarni amalga oshirish, xavfsizlikni ta'minlash, mijozlarga xizmat sifatini yaxshilash.

7. Ma'lumotlarni himoya qilish

ToolRent platformasi mijozlarning shaxsiy ma'lumotlarini himoya qilish uchun zarur texnik va tashkiliy choralarni ko'radi. Mijoz ma'lumotlari uchinchi shaxslarga faqat qonunchilik talablariga muvofiq yoki to'lov tizimlari orqali tranzaksiyalarni amalga oshirish uchun taqdim etilishi mumkin.

8. Yakuniy qoidalar

ToolRent platformasi ushbu Oferta shartlariga o'zgartirish kiritish huquqiga ega. Yangilangan shartlar platformada e'lon qilingan paytdan boshlab kuchga kiradi. Platformadan foydalanishda davom etish foydalanuvchining yangilangan shartlarga roziligini anglatadi.`;

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [ofertaOpen, setOfertaOpen] = useState(false);

  const registerMutation = useRegister({
    mutation: {
      onSuccess: async (data) => {
        // Token'ni avval localStorage'ga saqlaymiz
        localStorage.setItem("tool_rent_token", data.token);

        // Do'kon nomini kiritgan bo'lsa, do'kon yaratamiz
        if (form.shopName && data.user) {
          try {
            await fetch("/api/shops", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
              },
              body: JSON.stringify({
                name: form.shopName,
                address: form.region || "O'zbekiston",
                phone: data.user.phone || form.phone,
                ownerId: data.user.id,
                commission: 10,
              }),
            });
          } catch (_) {}
        }

        // Hisobga kiramiz va yo'naltiramiz
        login(data.token, data.user);
        toast({ title: "Muvaffaqiyatli!", description: "Hisobingiz yaratildi. Xush kelibsiz!" });
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

              {/* Oferta roziligi */}
              <div className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer ${agreedToTerms ? "border-green-400 bg-green-50/60" : "border-border bg-secondary/40"}`}
                onClick={() => setAgreedToTerms(v => !v)}>
                <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${agreedToTerms ? "bg-green-500 border-green-500" : "border-muted-foreground"}`}>
                  {agreedToTerms && <Check size={12} strokeWidth={3} color="white" aria-label="Belgilandi" />}
                </div>
                <p className="text-sm leading-relaxed select-none">
                  Men{" "}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setOfertaOpen(true); }}
                    className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-0.5"
                  >
                    ToolRent platformasining ommaviy oferta shartlari
                    <ExternalLink size={12} />
                  </button>
                  {" "}bilan tanishdim va ularga roziman hamda shaxsiy ma'lumotlarimni qayta ishlashga rozilik bildiraman.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={registerMutation.isPending || !agreedToTerms}
              >
                {registerMutation.isPending ? "Ro'yhatdan o'tilmoqda..." : "Ro'yhatdan o'tish"}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>

      {/* Oferta matni dialogi */}
      <Dialog open={ofertaOpen} onOpenChange={setOfertaOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText size={20} /> Ommaviy Oferta Shartlari
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
              {OFERTA_TEXT}
            </pre>
          </div>
          <div className="pt-4 border-t flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setOfertaOpen(false)}>
              Yopish
            </Button>
            <Button className="flex-1 gap-2" onClick={() => { setAgreedToTerms(true); setOfertaOpen(false); }}>
              <Check size={16} strokeWidth={2.5} />
              Roziman va yopish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
