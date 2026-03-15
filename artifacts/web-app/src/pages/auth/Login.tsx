import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Hammer, Lock, Phone } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();
  
  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast({
          title: "Welcome back!",
          description: `Logged in as ${data.user.name}`,
        });
      },
      onError: (error: any) => {
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { phone, password } });
  };

  const DEMO_ACCOUNTS: Record<string, string> = {
    super_admin: "998901234567",
    shop_owner:  "998901111111",
    worker:      "998902222222",
    customer:    "998903333333",
  };

  const autofill = (role: string) => {
    setPhone(DEMO_ACCOUNTS[role] ?? "");
    setPassword("password123");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Image */}
      <div className="hidden lg:flex flex-1 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Construction background" 
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
              Build your next big project with <span className="text-accent">ToolRent.</span>
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              The premier platform for construction equipment rental in Uzbekistan. Safe, secure, and fully managed.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="lg:hidden w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-8 shadow-lg">
            <Hammer size={24} className="text-white" />
          </div>
          
          <h2 className="text-3xl font-display font-bold mb-2">Welcome Back</h2>
          <p className="text-muted-foreground mb-8">Enter your credentials to access your account</p>

          <Card className="p-8 shadow-xl border-border/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    type="text" 
                    placeholder="+998 90 123 45 67" 
                    className="pl-12"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold">Password</label>
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
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-center text-muted-foreground mb-4 font-medium">Demo Accounts (Click to autofill)</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => autofill('customer')}>Customer</Button>
                <Button variant="outline" size="sm" onClick={() => autofill('shop_owner')}>Shop Owner</Button>
                <Button variant="outline" size="sm" onClick={() => autofill('worker')}>Worker</Button>
                <Button variant="outline" size="sm" onClick={() => autofill('super_admin')}>Admin</Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
