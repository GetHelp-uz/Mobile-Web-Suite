import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hammer, QrCode, Shield, TrendingUp, Users, Wrench, CheckCircle, Star, Phone, MapPin, ArrowRight, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const plans = [
  {
    name: "Standart",
    price: "150 000",
    period: "oy",
    color: "border-border",
    badge: null,
    features: [
      "30 tagacha asbob",
      "3 ta hodim",
      "QR kod boshqaruvi",
      "Asosiy hisobot va statistika",
      "Mobil ilova kirishi",
    ],
  },
  {
    name: "Premium",
    price: "350 000",
    period: "oy",
    color: "border-primary",
    badge: "Mashhur",
    features: [
      "Cheksiz asbob",
      "20 ta hodim",
      "QR kod boshqaruvi",
      "Kengaytirilgan hisobot",
      "Prioritet qo'llab-quvvatlash",
      "Maxsus brending",
    ],
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigatsiya */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Hammer size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl">GetHelp.uz<span className="text-accent">.</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Kirish</Button>
            </Link>
            <Link href="/register">
              <Button>Ro'yhatdan o'tish</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground py-24 md:py-36">
        <div className="absolute inset-0 z-0 opacity-10">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-6 bg-accent text-white border-0 text-sm px-4 py-1.5">
              O'zbekiston #1 Qurilish Asbob Ijarasi Platformasi
            </Badge>
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              Asboblarni ijara bering,<br />
              <span className="text-accent">daromad oling</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl mx-auto mb-10 leading-relaxed">
              GetHelp.uz orqali do'koningizni raqamlashtiring. QR kod, to'lov integratsiyasi va real vaqt boshqaruvi bilan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-white h-14 px-8 text-lg gap-2">
                  Bepul boshlash <ArrowRight size={20} />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-14 px-8 text-lg">
                  Hisobga kirish
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Statistika */}
      <section className="py-12 bg-secondary/50 border-y border-border">
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

      {/* Xususiyatlar */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">Nima uchun GetHelp.uz?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Qurilish asboblarini ijaraga berish uchun zarur bo'lgan hamma narsa bir platformada
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: QrCode, title: "QR Kod Boshqaruvi", desc: "Har bir asbobga QR kod yopishtiring. Hodimlar skaner qilishsa, ijara avtomatik boshlanadi.", color: "bg-primary/10 text-primary" },
            { icon: Shield, title: "Depozit Himoyasi", desc: "Mijozdan olingan depozit xavfsiz saqlanadi. Asbob qaytarilganda avtomatik qaytariladi.", color: "bg-green-500/10 text-green-600" },
            { icon: TrendingUp, title: "Real Vaqt Statistika", desc: "Kunlik, haftalik va oylik daromad, faol ijaralar va muddati o'tganlar haqida to'liq hisobot.", color: "bg-accent/10 text-accent" },
            { icon: Phone, title: "O'zbek To'lov Tizimlari", desc: "Click, Payme, Paynet va naqd pul — mijozlar qulay usulda to'laydi.", color: "bg-blue-500/10 text-blue-600" },
            { icon: Users, title: "Hodimlar Boshqaruvi", desc: "Do'kon egasi xodimlarini qo'shadi va ularning ishini nazorat qiladi.", color: "bg-purple-500/10 text-purple-600" },
            { icon: MapPin, title: "Mintaqa Filtri", desc: "Mijozlar o'z viloyatidagi asboblarni ko'radi. Mahalliy bozorni ushlab turing.", color: "bg-orange-500/10 text-orange-600" },
          ].map((feat, i) => (
            <motion.div key={feat.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-2xl ${feat.color} flex items-center justify-center mb-6`}>
                    <feat.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Narxlar */}
      <section className="py-24 bg-secondary/30" id="pricing">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">Tariflar</h2>
            <p className="text-muted-foreground text-lg">Biznesingiz hajmiga mos tarif tanlang</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                <Card className={`h-full border-2 ${plan.color} ${plan.badge ? 'shadow-xl shadow-primary/10' : ''} relative overflow-hidden`}>
                  {plan.badge && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Star size={12} fill="currentColor" /> {plan.badge}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-display font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-5xl font-bold text-primary">{plan.price}</span>
                      <span className="text-muted-foreground font-medium"> so'm/{plan.period}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-3">
                          <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                          <span className="text-sm">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/register">
                      <Button className="w-full" variant={plan.badge ? 'default' : 'outline'} size="lg">
                        Boshlash
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Building2 size={48} className="mx-auto mb-6 opacity-80" />
            <h2 className="text-4xl font-display font-bold mb-4">Do'koningizni bugun raqamlashtiring</h2>
            <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              Minglab do'kon egalariga qo'shiling. Bepul sinab ko'ring, xursand bo'lasiz.
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-accent hover:bg-accent/90 h-14 px-10 text-lg gap-2">
                Ro'yhatdan o'tish <ArrowRight size={20} />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Hammer size={16} className="text-white" />
            </div>
            <span className="font-display font-bold">GetHelp.uz<span className="text-accent">.</span></span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 GetHelp.uz. Barcha huquqlar himoyalangan.</p>
        </div>
      </footer>
    </div>
  );
}
