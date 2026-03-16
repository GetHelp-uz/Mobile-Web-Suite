import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import {
  Wrench,
  LayoutDashboard,
  Hammer,
  Users,
  Building2,
  LogOut,
  Menu,
  QrCode,
  FileText,
  Settings,
  MessageSquare,
  Plug,
  Wallet,
  CalendarCheck,
  Star,
  TrendingUp,
  Gift,
  FolderOpen,
  Bell,
  ClipboardList,
  FileCheck,
  Tag,
  AlertTriangle,
  Truck,
  Heart,
  Award,
  Moon,
  Sun,
  Shield,
  Download,
  X,
  MapPin,
  Sparkles,
  BarChart2,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { theme, toggleTheme, isDark } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = {
    customer: [
      { name: "Asboblar", path: "/browse", icon: Wrench },
      { name: "Ijaralarim", path: "/my-rentals", icon: FileText },
      { name: "Bronlarim", path: "/bookings", icon: CalendarCheck },
      { name: "Loyihalarim", path: "/projects", icon: FolderOpen },
      { name: "Sevimlilar", path: "/favorites", icon: Heart },
      { name: "Loyallik", path: "/loyalty", icon: Award },
      { name: "AI Tavsiya", path: "/ai-suggest", icon: Sparkles },
      { name: "Chat", path: "/chat", icon: MessageSquare },
      { name: "Hamyon", path: "/wallet", icon: Wallet },
      { name: "Referal", path: "/referral", icon: Gift },
      { name: "Bildirishnomalar", path: "/notifications-center", icon: Bell },
    ],
    shop_owner: [
      { name: "Boshqaruv paneli", path: "/shop", icon: LayoutDashboard },
      { name: "Asboblarim", path: "/shop/tools", icon: Hammer },
      { name: "Bronlar", path: "/shop/bookings", icon: CalendarCheck },
      { name: "Texnik xizmat", path: "/shop/maintenance", icon: ClipboardList },
      { name: "Narx qoidalari", path: "/shop/pricing", icon: TrendingUp },
      { name: "Statistika", path: "/shop/stats", icon: BarChart2 },
      { name: "Zaxira", path: "/shop/inventory", icon: Package },
      { name: "Baholar", path: "/shop/ratings", icon: Star },
      { name: "Hujjatlar", path: "/shop/documents", icon: FileCheck },
      { name: "Promo kodlar", path: "/shop/promo-codes", icon: Tag },
      { name: "Xodim vazifalari", path: "/shop/worker-tasks", icon: Users },
      { name: "Shikast xabarlari", path: "/shop/damage-reports", icon: AlertTriangle },
      { name: "GPS Monitoring", path: "/shop/gps", icon: MapPin },
      { name: "Filiallar", path: "/shop/branches", icon: Building2 },
      { name: "Ta'minotchilar", path: "/shop/suppliers", icon: Truck },
      { name: "AI Tavsiya", path: "/ai-suggest", icon: Sparkles },
      { name: "Chat", path: "/chat", icon: MessageSquare },
      { name: "Hamyon", path: "/wallet", icon: Wallet },
      { name: "Bildirishnomalar", path: "/notifications-center", icon: Bell },
    ],
    worker: [
      { name: "QR Skaner", path: "/worker", icon: QrCode },
      { name: "Faol ijaralar", path: "/worker/rentals", icon: FileText },
      { name: "Bildirishnomalar", path: "/notifications-center", icon: Bell },
    ],
    super_admin: [
      { name: "Umumiy ko'rinish", path: "/admin", icon: LayoutDashboard },
      { name: "Do'konlar", path: "/admin/shops", icon: Building2 },
      { name: "Foydalanuvchilar", path: "/admin/users", icon: Users },
      { name: "Bildirishnomalar", path: "/admin/notifications", icon: Bell },
      { name: "Audit jurnali", path: "/admin/audit", icon: Shield },
      { name: "Ilova boshqaruvi", path: "/admin/app", icon: Settings },
      { name: "Integratsiyalar", path: "/admin/integrations", icon: Plug },
    ]
  };

  const exportMenuItems = user?.role === "shop_owner" ? [
    { name: "Ijaralar eksport", path: `/api/export/rentals?shopId=${user?.shopId}`, icon: Download, external: true },
    { name: "Asboblar eksport", path: `/api/export/tools?shopId=${user?.shopId}`, icon: Download, external: true },
  ] : [];

  const roleLabels: Record<string, string> = {
    customer: "Mijoz",
    shop_owner: "Do'kon egasi",
    worker: "Hodim",
    super_admin: "Super Admin",
  };

  const links = user ? navItems[user.role as keyof typeof navItems] ?? [] : [];

  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Hammer size={20} />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            ToolRent<span className="text-primary">.</span>
          </span>
        </div>
        <button onClick={toggleTheme} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors" title={isDark ? "Yorug' rejim" : "Qorang'i rejim"}>
          {isDark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-muted-foreground" />}
        </button>
      </div>

      <div className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const isActive = location === link.path || (link.path !== "/shop" && link.path !== "/admin" && location.startsWith(link.path));
          return (
            <Link key={link.path} href={link.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
              <link.icon size={18} className={cn(
                "transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
              )} />
              <span className="text-sm">{link.name}</span>
            </Link>
          );
        })}

        {exportMenuItems.length > 0 && (
          <div className="pt-2 mt-2 border-t border-border/40">
            <p className="px-4 py-1 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Eksport</p>
            {exportMenuItems.map(item => (
              <a key={item.path} href={`${baseUrl}${item.path}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 group text-muted-foreground hover:bg-secondary hover:text-foreground">
                <item.icon size={18} className="text-muted-foreground group-hover:text-green-500" />
                <span className="text-sm">{item.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-border/50">
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
            {user?.name?.charAt(0) || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.role ? (roleLabels[user.role] ?? user.role) : ""}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut size={18} />
          Chiqish
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop yon panel */}
      <aside className="w-full md:w-72 bg-card border-r border-border/50 flex-col shadow-xl md:shadow-none z-10 hidden md:flex">
        <SidebarContent />
      </aside>

      {/* Mobil sarlavha */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <Hammer size={16} />
          </div>
          <span className="font-display font-bold text-lg">ToolRent.</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
            {isDark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-muted-foreground" />}
          </button>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu />
          </Button>
        </div>
      </div>

      {/* Mobil menyu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col z-50 md:hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-bold text-lg">ToolRent.</span>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}><X size={18} /></Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarContent />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Asosiy kontent */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
