import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Hammer, QrCode, Shield, TrendingUp, Users, Wrench, CheckCircle,
  Star, Phone, MapPin, ArrowRight, Building2, Search, Tag,
  Wifi, CreditCard, BarChart3, Zap, MessageCircle, Send,
  DollarSign, Globe, Lock, ChevronRight, Gift,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    subtitle: "Kichik do'konlar uchun",
    price: "0",
    trialDays: 14,
    priceAfter: "99 000",
    period: "oy",
    color: "border-border",
    badge: "14 kun bepul",
    badgeColor: "bg-green-500",
    cta: "Bepul boshlash",
    ctaVariant: "outline" as const,
    features: [
      "15 tagacha asbob",
      "2 ta hodim",
      "QR kod boshqaruvi",
      "Asosiy hisobot",
      "Mobil ilova",
      "Email qo'llab-quvvatlash",
    ],
    notIncluded: ["GPS tracking", "Kengaytirilgan analitika", "API integratsiya"],
  },
  {
    name: "Standart",
    subtitle: "O'rta do'konlar uchun",
    price: "199 000",
    trialDays: 14,
    priceAfter: null,
    period: "oy",
    color: "border-blue-400",
    badge: "14 kun bepul sinov",
    badgeColor: "bg-blue-500",
    cta: "14 kun bepul sinab ko'ring",
    ctaVariant: "default" as const,
    popular: true,
    features: [
      "50 tagacha asbob",
      "10 ta hodim",
      "QR + Barcode boshqaruvi",
      "Kengaytirilgan hisobot",
      "GPS mini qurilma qo'llovi",
      "Click/Payme/Paynet integratsiya",
      "Shartnomalar va imzo",
      "Prioritet qo'llab-quvvatlash",
    ],
    notIncluded: ["Cheksiz asbob", "Maxsus brending"],
  },
  {
    name: "Premium",
    subtitle: "Yirik do'kon zanjirlari",
    price: "399 000",
    trialDays: 14,
    priceAfter: null,
    period: "oy",
    color: "border-amber-400",
    badge: "14 kun bepul sinov",
    badgeColor: "bg-amber-500",
    cta: "Premium boshlash",
    ctaVariant: "default" as const,
    features: [
      "Cheksiz asbob va filiallar",
      "Cheksiz hodimlar",
      "QR + Barcode + GPS IoT",
      "Real-vaqt tracking",
      "Kengaytirilgan analitika va AI",
      "Maxsus brending",
      "API integratsiya",
      "Shaxsiy menejer",
      "SLA kafolatli qo'llab-quvvatlash",
    ],
    notIncluded: [],
  },
];

function PublicToolsSection() {
  const [tools, setTools] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${baseUrl}/api/tools?status=available&limit=8`);
        if (res.ok) {
          const d = await res.json();
          setTools(d.tools || []);
        }
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = tools.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="py-24 max-w-7xl mx-auto px-6" id="tools">
      <div className="text-center mb-10">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Hozir mavjud</Badge>
        <h2 className="text-4xl font-display font-bold mb-4">Ijaraga bo'sh asboblar</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Ro'yhatdan o'tmay ko'ring — kerakli asbobni topib, tezda ijara oling
        </p>
      </div>
      <div className="relative max-w-xl mx-auto mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Asbob nomi yoki toifasi..."
          className="pl-11 h-12 rounded-xl"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => <div key={i} className="h-60 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Asbob topilmadi</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {filtered.map(tool => (
            <Card key={tool.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-40 bg-secondary flex items-center justify-center overflow-hidden relative">
                <img
                  src={tool.imageUrl || `${import.meta.env.BASE_URL}images/placeholder-tool.png`}
                  alt={tool.name}
                  className="max-h-full object-contain p-4 group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-500 text-white text-xs border-0">Mavjud</Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-1 text-xs text-primary font-semibold mb-1">
                  <Tag size={11} /> {tool.category}
                </div>
                <h3 className="font-bold text-sm mb-1 line-clamp-2">{tool.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <MapPin size={11} /> {tool.shopName || "Do'kon"}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Kunlik</p>
                    <p className="font-bold text-primary">{formatCurrency(tool.pricePerDay)}</p>
                  </div>
                  <Link href="/register">
                    <Button size="sm" className="text-xs">Ijara olish</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="text-center">
        <Link href="/register">
          <Button size="lg" className="gap-2 h-12 px-8">
            Barcha asboblarni ko'rish <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navigatsiya ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Hammer size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl">GetHelp<span className="text-accent">.uz</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Xususiyatlar</a>
            <a href="#investment" className="hover:text-foreground transition-colors">Investitsiya</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Tariflar</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Aloqa</a>
          </div>
          <div className="flex items-center gap-2">
            <a href="tel:+998200059890" className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-1">
              <Phone size={14}/> +998 20 005 98 90
            </a>
            <Link href="/login"><Button variant="ghost" size="sm">Kirish</Button></Link>
            <Link href="/register"><Button size="sm" className="bg-accent hover:bg-accent/90 text-white">Bepul boshlash</Button></Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary text-white py-24 md:py-40">
        <div className="absolute inset-0 z-0">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-primary/60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="mb-6 bg-accent/90 text-white border-0 text-sm px-4 py-1.5 gap-1.5">
                <Zap size={13} fill="white"/> O'zbekiston #1 Qurilish Asbob Ijarasi Platformasi
              </Badge>
              <h1 className="text-5xl md:text-6xl font-display font-bold mb-6 leading-tight text-white drop-shadow-lg">
                Asboblarni ijara bering,<br />
                <span className="text-accent">daromad oling</span>
              </h1>
              <p className="text-xl text-white/85 max-w-2xl mb-10 leading-relaxed drop-shadow">
                GetHelp.uz orqali do'koningizni raqamlashtiring. QR kod, GPS tracking, to'lov integratsiyasi va real vaqt boshqaruvi.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-white h-14 px-8 text-lg gap-2 shadow-xl">
                    14 kun bepul boshlash <ArrowRight size={20} />
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button size="lg" variant="outline" className="border-2 border-white/60 text-white hover:bg-white/15 bg-white/5 h-14 px-8 text-lg backdrop-blur-sm">
                    Tariflarni ko'rish
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-white/70">
                <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-400"/> Kredit karta shart emas</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-400"/> 14 kun bepul</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-400"/> Bekor qilish bepul</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Statistika ──────────────────────────────────────────── */}
      <section className="py-14 bg-secondary/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "500+", label: "Faol do'kon" },
              { value: "12 000+", label: "Ro'yhatdan o'tgan mijoz" },
              { value: "45 000+", label: "Muvaffaqiyatli ijara" },
              { value: "98%", label: "Mijozlar mamnuniyati" },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <p className="text-4xl font-display font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Investitsiya bo'limi ─────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-blue-950 text-white" id="investment">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-500/20 text-amber-300 border-amber-500/30 px-4 py-1.5">
              <TrendingUp size={13} className="mr-1.5"/> Investitsiya imkoniyati
            </Badge>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-white">
              GetHelp.uz ga <span className="text-amber-400">investitsiya qiling</span>
            </h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              O'zbekistondagi qurilish sohasi yiliga 15–20% o'smoqda. GetHelp.uz bu bozorning raqamli kaliti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              { icon: Globe, title: "Bozor hajmi", value: "$2.4 mlrd", desc: "O'zbekiston qurilish bozori yillik hajmi", color: "text-blue-400" },
              { icon: TrendingUp, title: "O'sish sur'ati", value: "+18%", desc: "Yillik qurilish sohasi o'sishi (2024)", color: "text-green-400" },
              { icon: DollarSign, title: "ROI", value: "3x", desc: "Platformaning 3 yillik daromad ko'rsatkichi", color: "text-amber-400" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors">
                  <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-4 ${item.color}`}>
                    <item.icon size={24}/>
                  </div>
                  <p className={`text-3xl font-bold mb-2 ${item.color}`}>{item.value}</p>
                  <p className="font-semibold text-white mb-1">{item.title}</p>
                  <p className="text-white/60 text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Nima uchun GetHelp.uz?</h3>
              <div className="space-y-4">
                {[
                  { icon: Lock, title: "Tasdiqlangan biznes model", desc: "500+ faol do'kon, 45 000+ muvaffaqiyatli ijara — bozor talabini isbotladi" },
                  { icon: Zap, title: "Texnologik ustunlik", desc: "QR kod, GPS tracking, AI tavsiyalar, to'lov integratsiyasi — raqibsiz" },
                  { icon: Globe, title: "Kengayish potentsiali", desc: "Toshkentdan boshlagan, barcha viloyatlar va Markaziy Osiyo maqsad" },
                  { icon: Shield, title: "Skam emas", desc: "Ro'yhatdan o'tgan kompaniya, shaffof hisobotlar, audit mavjud" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <item.icon size={18} className="text-amber-400"/>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">{item.title}</p>
                      <p className="text-white/60 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                  <MessageCircle size={22} className="text-white"/>
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Investitsiya bo'yicha muloqot</p>
                  <p className="text-white/60 text-sm">Jamoa bilan to'g'ridan-to'g'ri bog'laning</p>
                </div>
              </div>
              <div className="space-y-4">
                <a href="tel:+998200059890" className="flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/15 transition-colors group">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Phone size={18} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-0.5">Telefon</p>
                    <p className="font-bold text-white group-hover:text-green-400 transition-colors">+998 20 005 98 90</p>
                  </div>
                  <ChevronRight size={16} className="text-white/40 ml-auto"/>
                </a>
                <a href="https://t.me/im_yakuboff98" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/15 transition-colors group">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Send size={18} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-0.5">Telegram</p>
                    <p className="font-bold text-white group-hover:text-blue-400 transition-colors">@im_yakuboff98</p>
                  </div>
                  <ChevronRight size={16} className="text-white/40 ml-auto"/>
                </a>
              </div>
              <p className="text-white/40 text-xs mt-4 text-center">
                Biz 24 soat ichida javob beramiz
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Xususiyatlar ────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-6" id="features">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Funksiyalar</Badge>
          <h2 className="text-4xl font-display font-bold mb-4">Nima uchun GetHelp.uz?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Qurilish asboblarini ijaraga berish uchun zarur bo'lgan hamma narsa bir platformada
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: QrCode, title: "QR + Barcode Boshqaruv", desc: "Har bir asbobga QR/barcode yopishtiring. Skaner qilishsa ijara avtomatik boshlanadi.", color: "bg-primary/10 text-primary" },
            { icon: Wifi, title: "GPS Tracking", desc: "Mini GPS va IoT qurilmalar orqali asboblarni real vaqtda nazorat qiling.", color: "bg-blue-500/10 text-blue-600" },
            { icon: Shield, title: "Depozit Himoyasi", desc: "Mijozdan olingan depozit xavfsiz saqlanadi. Asbob qaytarilganda avtomatik qaytariladi.", color: "bg-green-500/10 text-green-600" },
            { icon: BarChart3, title: "Real Vaqt Statistika", desc: "Kunlik, haftalik va oylik daromad, faol ijaralar va muddati o'tganlar.", color: "bg-accent/10 text-accent" },
            { icon: CreditCard, title: "O'zbek To'lov Tizimlari", desc: "Click, Payme, Paynet, Uzum Bank — mijozlar qulay usulda to'laydi.", color: "bg-orange-500/10 text-orange-600" },
            { icon: Users, title: "Hodimlar Boshqaruvi", desc: "Do'kon egasi xodimlarini qo'shadi va ularning ishini nazorat qiladi.", color: "bg-purple-500/10 text-purple-600" },
          ].map((feat, i) => (
            <motion.div key={feat.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-border/60">
                <CardContent className="p-7">
                  <div className={`w-12 h-12 rounded-2xl ${feat.color} flex items-center justify-center mb-5`}>
                    <feat.icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Public tools ────────────────────────────────────────── */}
      <div className="bg-secondary/20 border-y border-border">
        <PublicToolsSection />
      </div>

      {/* ── Tariflar ────────────────────────────────────────────── */}
      <section className="py-24 bg-background" id="pricing">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-500/10 text-green-700 border-green-200 px-4 py-1.5 gap-1.5">
              <Gift size={13}/> 14 kun bepul sinov — kredit karta shart emas
            </Badge>
            <h2 className="text-4xl font-display font-bold mb-4">Tariflar</h2>
            <p className="text-muted-foreground text-lg">Biznesingiz hajmiga mos tarif tanlang. Barcha tariflar uchun 14 kunlik bepul sinov.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className={`h-full border-2 ${plan.color} ${plan.popular ? 'shadow-xl shadow-blue-500/10 scale-105' : ''} relative overflow-hidden`}>
                  {plan.popular && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400"/>
                  )}
                  <CardContent className="p-7 flex flex-col h-full">
                    <div className="mb-5">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-xl font-display font-bold">{plan.name}</h3>
                        {plan.badge && (
                          <Badge className={`${plan.badgeColor} text-white border-0 text-xs`}>
                            {plan.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-primary">{plan.price}</span>
                        {plan.price !== "0" && <span className="text-muted-foreground font-medium"> so'm/{plan.period}</span>}
                      </div>
                      {plan.price === "0" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          14 kundan keyin: <strong>{plan.priceAfter} so'm/oy</strong>
                        </p>
                      )}
                      {plan.trialDays && plan.price !== "0" && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          ✓ Birinchi 14 kun bepul
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{f}</span>
                        </li>
                      ))}
                      {plan.notIncluded.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 opacity-40">
                          <div className="w-[15px] h-[15px] rounded-full border-2 border-current flex-shrink-0 mt-0.5"/>
                          <span className="text-sm line-through">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/register">
                      <Button
                        className="w-full"
                        variant={plan.ctaVariant}
                        size="lg"
                        style={plan.popular ? { background: "hsl(var(--primary))" } : {}}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Korporativ tarif kerakmi? <a href="tel:+998200059890" className="text-primary font-medium hover:underline">+998 20 005 98 90</a> ga qo'ng'iroq qiling
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Building2 size={48} className="mx-auto mb-6 opacity-80" />
            <h2 className="text-4xl font-display font-bold mb-4">Do'koningizni bugun raqamlashtiring</h2>
            <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              14 kun bepul sinab ko'ring. Kredit karta kerak emas. Istalgan vaqt bekor qilish mumkin.
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-accent hover:bg-accent/90 h-14 px-10 text-lg gap-2">
                Bepul boshlash <ArrowRight size={20} />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-border bg-card" id="contact">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <Hammer size={16} className="text-white" />
                </div>
                <span className="font-display font-bold text-lg">GetHelp<span className="text-accent">.uz</span></span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                O'zbekistondagi qurilish asboblarini ijaraga berish uchun eng zamonaviy raqamli platforma.
              </p>
              <div className="flex gap-3">
                <a href="tel:+998200059890" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Phone size={14} className="text-green-600"/>
                  </div>
                  +998 20 005 98 90
                </a>
              </div>
              <a href="https://t.me/im_yakuboff98" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Send size={14} className="text-blue-600"/>
                </div>
                @im_yakuboff98
              </a>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm">Platforma</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Xususiyatlar</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Tariflar</a></li>
                <li><a href="#investment" className="hover:text-foreground transition-colors">Investitsiya</a></li>
                <li><Link href="/register" className="hover:text-foreground transition-colors">Ro'yhatdan o'tish</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm">Kirish</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground transition-colors">Do'kon egasi</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Mijoz</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Usta / Ishchi</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© 2025 GetHelp.uz. Barcha huquqlar himoyalangan.</p>
            <div className="flex gap-4">
              <span>Maxfiylik siyosati</span>
              <span>Foydalanish shartlari</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
