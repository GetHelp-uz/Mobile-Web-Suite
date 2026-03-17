import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Hammer, Phone, ArrowLeft, ShieldCheck, KeyRound, Lock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const BASE = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

type Step = "phone" | "code" | "newpass" | "done";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  function startResendTimer() {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(v => {
        if (v <= 1) { clearInterval(interval); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const phoneClean = phone.replace(/\D/g, "");
      const normalized = phoneClean.startsWith("998") ? phoneClean : phoneClean.length === 9 ? `998${phoneClean}` : phoneClean;
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
      setStep("code");
      startResendTimer();
      toast({ title: "SMS yuborildi", description: "Telefoningizga 6 xonali kod yuborildi" });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast({ title: "Xatolik", description: "6 xonali kodni kiriting", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const phoneClean = phone.replace(/\D/g, "");
      const normalized = phoneClean.startsWith("998") ? phoneClean : phoneClean.length === 9 ? `998${phoneClean}` : phoneClean;
      const res = await fetch(`${BASE}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Noto'g'ri kod");
      setResetToken(data.resetToken);
      setStep("newpass");
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Xatolik", description: "Parol kamida 6 ta belgi bo'lishi kerak", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Xatolik", description: "Parollar mos kelmaydi", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const phoneClean = phone.replace(/\D/g, "");
      const normalized = phoneClean.startsWith("998") ? phoneClean : phoneClean.length === 9 ? `998${phoneClean}` : phoneClean;
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
      setStep("done");
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const STEPS = [
    { key: "phone", label: "Telefon", icon: Phone },
    { key: "code", label: "Kod", icon: ShieldCheck },
    { key: "newpass", label: "Yangi parol", icon: KeyRound },
  ];

  const stepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex flex-1 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Fon"
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
        </div>
        <div className="z-10 text-primary-foreground p-12 max-w-xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
              <Hammer size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-display font-bold mb-4">Parolni tiklash</h1>
            <p className="text-xl text-primary-foreground/80">
              SMS kod orqali parolingizni xavfsiz tarzda tiklang. Jarayon atigi 1 daqiqa oladi.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <Link href="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm">
            <ArrowLeft size={16} /> Kirish sahifasiga qaytish
          </Link>

          <div className="lg:hidden w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-6 shadow-lg">
            <Hammer size={24} className="text-white" />
          </div>

          <h2 className="text-3xl font-display font-bold mb-2">Parolni tiklash</h2>
          <p className="text-muted-foreground mb-6">SMS orqali yangi parol o'rnating</p>

          {step !== "done" && (
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const active = i === stepIndex;
                const done = i < stepIndex;
                return (
                  <div key={s.key} className="flex items-center gap-2 flex-1">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                      done ? "bg-green-500 text-white" : active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {done ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 ${done ? "bg-green-500" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Card className="p-8 shadow-xl border-border/50">
            <AnimatePresence mode="wait">
              {step === "phone" && (
                <motion.form key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSendCode} className="space-y-5">
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ro'yxatdan o'tganda foydalanilgan telefon raqamingizni kiriting. Shu raqamga tasdiqlash kodi yuboriladi.
                    </p>
                    <label className="text-sm font-semibold block mb-2">Telefon raqam</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        type="tel"
                        placeholder="+998 90 123 45 67"
                        className="pl-12"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Yuborilmoqda..." : "SMS Kod Yuborish"}
                  </Button>
                </motion.form>
              )}

              {step === "code" && (
                <motion.form key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleVerifyCode} className="space-y-5">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-semibold text-foreground">+{phone.replace(/\D/g, "")}</span> raqamiga 6 xonali kod yuborildi.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">Kod 10 daqiqa davomida amal qiladi.</p>
                    <label className="text-sm font-semibold block mb-2">Tasdiqlash kodi</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        type="text"
                        placeholder="123456"
                        className="pl-12 tracking-widest text-lg font-mono"
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Tekshirilmoqda..." : "Kodni Tasdiqlash"}
                  </Button>
                  <div className="text-center text-sm text-muted-foreground">
                    {resendTimer > 0 ? (
                      <span>Qayta yuborish: <span className="font-bold text-primary">{resendTimer}s</span></span>
                    ) : (
                      <button
                        type="button"
                        className="text-primary font-semibold hover:underline"
                        onClick={() => { setStep("phone"); setCode(""); }}
                      >
                        Qayta SMS yuborish
                      </button>
                    )}
                  </div>
                </motion.form>
              )}

              {step === "newpass" && (
                <motion.form key="newpass" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleResetPassword} className="space-y-5">
                  <p className="text-sm text-muted-foreground">Yangi parolingizni kiriting. Kamida 6 ta belgi bo'lishi kerak.</p>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Yangi parol</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pl-12"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Parolni tasdiqlang</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pl-12"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive mt-1">Parollar mos kelmaydi</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading || (!!confirmPassword && newPassword !== confirmPassword)}>
                    {loading ? "Saqlanmoqda..." : "Parolni Saqlash"}
                  </Button>
                </motion.form>
              )}

              {step === "done" && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={44} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold">Parol muvaffaqiyatli yangilandi!</h3>
                  <p className="text-muted-foreground text-sm">Endi yangi parolingiz bilan tizimga kirishingiz mumkin.</p>
                  <Button className="w-full" size="lg" onClick={() => navigate("/login")}>
                    Kirish sahifasiga o'tish
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
