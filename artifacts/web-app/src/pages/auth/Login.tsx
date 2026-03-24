import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Hammer, Lock, Phone, ArrowLeft, User } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();
  
  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data: any) => {
        login(data.token, data.user);
        toast({
          title: "Xush kelibsiz!",
          description: `${data.user.name} sifatida kirdingiz`,
        });
      },
      onError: (error: any) => {
        toast({
          title: "Kirish muvaffaqiyatsiz",
          description: error.message || "Login yoki parol noto'g'ri",
          variant: "destructive",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { phone, password } });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Chap tomon - rasm */}
      <div className="hidden lg:flex flex-1 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Qurilish foni" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
        </div>
        <div className="z-10 text-primary-foreground p-12 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
              <Hammer size={32} className="text-white" />
            </div>
            <h1 className="text-5xl font-display font-bold mb-6 leading-tight">
              Keyingi loyihangizni <span className="text-accent">GetHelp.uz</span> bilan boshlang.
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              O'zbekistonda qurilish asbob-uskunalari ijarasining yetakchi platformasi.
            </p>
          </motion.div>
        </div>
      </div>

      {/* O'ng tomon - forma */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm">
            <ArrowLeft size={16} /> Bosh sahifaga qaytish
          </Link>

          <div className="lg:hidden w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-8 shadow-lg">
            <Hammer size={24} className="text-white" />
          </div>
          
          <h2 className="text-3xl font-display font-bold mb-2">Xush kelibsiz</h2>
          <p className="text-muted-foreground mb-8">Hisobingizga kirish uchun ma'lumotlaringizni kiriting</p>

          <Card className="p-8 shadow-xl border-border/50">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Telefon raqam yoki login</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    type="text" 
                    placeholder="+998 90 123 45 67 yoki username" 
                    className="pl-12"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Telefon raqam (998XXXXXXXXX) yoki username bilan kiring</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Parol</label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                    Parolni unutdingizmi?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Kirilmoqda..." : "Kirish"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex flex-col gap-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Hisobingiz yo'qmi?{" "}
                  <Link href="/register" className="text-primary font-semibold hover:underline">
                    Ro'yhatdan o'ting
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">
                  Parolni unutdingizmi?{" "}
                  <Link href="/forgot-password" className="text-primary font-semibold hover:underline">
                    Tiklash
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
